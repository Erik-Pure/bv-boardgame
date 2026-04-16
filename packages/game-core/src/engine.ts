import { generateLevels } from "./board.js";
import { createRng, pick, rollDie } from "./rng.js";
import { applyEffects } from "./cards/effects.js";
import { appendTextForGrantedItem, artKeyForGrantedItem } from "./cards/grantedItemText.js";
import type { EffectApplyOut } from "./cards/types.js";
import { drawFromDeck, getCard, itemDeckItemIds, itemDisplayTitle } from "./cards/db.js";
import { CANMAN_DRAWS_INITIAL, createItemInstance } from "./itemInstance.js";
import {
  FINAL_BOSS_IDS,
  MONSTERS,
  MONSTER_LOSS_SIP_FLAT,
  monsterNeedBonusForBoardLevel,
  type MonsterId,
} from "./monsters.js";
import {
  handleCardConfirm,
  handleCardOption,
  enterMonsterCombatFromTile,
  resolveEventCardOnLand,
  createFinalBossCombatPending,
} from "./cards/runtime.js";
import { applyDamage, moveBonusSteps } from "./damage.js";
import { clockwiseTileIndex, counterClockwiseTileIndex } from "./ringMovement.js";
import { EQUIPMENT_CATALOG, type EquipmentShopItem } from "./equipmentDefs.js";
import { pushPlayerNotice, pushSipNotice } from "./sipNotice.js";
import { formatSelfStatDeltas } from "./statDeltaText.js";
import { combatReactionsAllAnswered } from "./combatReactionPhase.js";
import { combatReactorsFor, playerCanCombatIntervene } from "./combatReactors.js";
import type {
  ApplyResult,
  ClientAction,
  CombatLoseSummary,
  CombatWinSummary,
  EquipmentSlot,
  GameState,
  ItemId,
  Pending,
  Player,
  ShopItem,
  Tile,
} from "./types.js";

const MAX_PLAYERS = 6;
/** `true`: boss-ruta utan klunk/pant-ingång (QA). Sätt `false` när balans ska gälla. */
const SKIP_BOSS_RESOURCE_GATE = true;
const COMBAT_REACTION_TIMEOUT_MS = 20_000;
const PLAYER_COLORS = [
  "#c41e3a",
  "#2563eb",
  "#16a34a",
  "#ca8a04",
  "#9333ea",
  "#db2777",
];

export function createEmptyLobby(roomCode: string): GameState {
  return {
    phase: "lobby",
    seed: 0,
    config: { turnSeconds: 60, gameMode: "bossKill" },
    roomCode,
    players: [],
    turnOrder: [],
    currentTurnIndex: 0,
    levels: [],
    pending: null,
    log: [],
    winnerId: null,
    winnerName: null,
    goldenBeerCarrierId: null,
    finalBossMonsterId: null,
    finalBossLivesRemaining: null,
    treasureTaken: {},
    lastDiceRoll: null,
    lastDiceRollerId: null,
    sipNotices: [],
  };
}

function log(state: GameState, message: string): void {
  state.log.push({ at: Date.now(), message });
  if (state.log.length > 200) state.log.shift();
}

/** +1 pant per Canman-instans i inventory per rörelsetärning; räknare på instansen, tom burk tas bort. */
function applyCanmanOnMovementRoll(state: GameState, player: Player): void {
  const inv = player.inventory ?? [];
  let goldAdd = 0;
  for (let i = 0; i < inv.length; ) {
    const inst = inv[i]!;
    if (inst.itemId !== "canman") {
      i++;
      continue;
    }
    let left = inst.canmanDrawsRemaining ?? CANMAN_DRAWS_INITIAL;
    if (left <= 0) {
      inv.splice(i, 1);
      continue;
    }
    goldAdd += 1;
    left -= 1;
    if (left <= 0) {
      inv.splice(i, 1);
      continue;
    }
    inst.canmanDrawsRemaining = left;
    i++;
  }
  player.inventory = inv;
  if (goldAdd > 0) {
    player.gold += goldAdd;
    log(state, `${player.name} får +${goldAdd} pant från Canman.`);
  }
}

/** Före våningsbyte: informera om lokalt monster-+ på målvåningen (styrkekrav endast där). */
function logMonsterScalePreviewForAscend(
  state: GameState,
  p: Player,
  targetLevelIndex: number,
  mode: "door" | "offer",
): void {
  const bonus = monsterNeedBonusForBoardLevel(targetLevelIndex);
  if (bonus <= 0) return;
  const floor = targetLevelIndex + 1;
  const line =
    mode === "offer"
      ? `Stiger ${p.name}: på våning ${floor} har monster +${bonus} på styrkekrav i strid (endast det planet).`
      : `Om ${p.name} stiger: på våning ${floor} har monster +${bonus} på styrkekrav i strid (endast det planet).`;
  log(state, line);
}

function logMonsterScaleAfterAscend(state: GameState, p: Player): void {
  const bonus = monsterNeedBonusForBoardLevel(p.levelIndex);
  if (bonus <= 0) return;
  log(
    state,
    `${p.name} är på våning ${p.levelIndex + 1} — monster där har +${bonus} på styrkekrav (andra våningar oförändrade).`,
  );
}

/** Minsta antal klunkar för bryggnivå 2, 3, … (därefter +10 per tröskel från 70). */
const BREWER_KLUNK_THRESHOLDS = [8, 16, 24, 35, 40, 50, 60] as const;

function brewerKlunkThreshold(thresholdIndex: number): number {
  if (thresholdIndex < BREWER_KLUNK_THRESHOLDS.length) {
    return BREWER_KLUNK_THRESHOLDS[thresholdIndex]!;
  }
  return 70 + (thresholdIndex - BREWER_KLUNK_THRESHOLDS.length) * 10;
}

function brewerLevelFromKlunkar(klunkar: number): number {
  const k = Math.max(0, Math.floor(klunkar));
  let level = 1;
  for (let i = 0; i < 10_000; i++) {
    const th = brewerKlunkThreshold(i);
    if (k < th) return level;
    level++;
  }
  return level;
}

/** Bryggnivå från totala klunkar (stigande trösklar). */
export function brewerLevel(p: Player): number {
  return brewerLevelFromKlunkar(p.klunkar);
}

/** 0–1: klunkar inom nuvarande bryggnivå mot nästa tröskel. */
export function brewerKlunkProgressRatio(klunkar: number): number {
  const k = Math.max(0, Math.floor(klunkar));
  const level = brewerLevelFromKlunkar(k);
  const prev = level <= 1 ? 0 : brewerKlunkThreshold(level - 2);
  const next = brewerKlunkThreshold(level - 1);
  if (next <= prev) return 1;
  return Math.max(0, Math.min(1, (k - prev) / (next - prev)));
}

export function levelUpCostsForTargetLevel(targetLevelIndex: number): { gold: number; sips: number } {
  const step = Math.max(0, targetLevelIndex - 1);
  return {
    /** Pant per nivåbyte: var tidigare 10 + step*5 (för lätt). */
    gold: 25 + step * 15,
    /** Klunkar: dubbelt mot tidigare 5 + step*3. */
    sips: 10 + step * 6,
  };
}

/**
 * Klunkväg upp på brädet (kravläge, förbrukar inte klunkar): antingen uppfyllt klunkantal
 * eller bryggnivå (samma trösklar som UI) ≥ målvåningens visningsnivå (target+1).
 * Första våningen: 10 klunkar _eller_ bryggnivå 2 (8+ klunkar) — i linje med headern.
 */
export function canAscendByKlunkRequirement(p: Player, targetLevelIndex: number): boolean {
  const costs = levelUpCostsForTargetLevel(targetLevelIndex);
  if (p.klunkar >= costs.sips) return true;
  return brewerLevel(p) >= targetLevelIndex + 1;
}

function maxHpFor(p: Player): number {
  const arm = p.equipment.armor?.bonusHp ?? 0;
  return 10 + arm;
}

function weaponPower(p: Player): number {
  return effectiveWeaponPower(p) + helmetAttackBonus(p) + (p.equipment.accessory?.combatBonus ?? 0);
}

function effectiveWeaponPower(p: Player): number {
  const w = p.equipment.weapon;
  if (!w) return 0;
  let pow = w.power ?? 0;
  if (typeof w.powerAtGold30 === "number" && p.gold >= 30) {
    pow = w.powerAtGold30;
  } else if (typeof w.powerAtGold20 === "number" && p.gold >= 20) {
    pow = w.powerAtGold20;
  } else if (typeof w.powerAtGold10 === "number" && p.gold >= 10) {
    pow = w.powerAtGold10;
  }
  if (typeof w.powerDynamicMax === "number") {
    pow = Math.min(pow, w.powerDynamicMax);
  }
  return pow;
}

function applyWeaponWinGoldBonus(winner: Player): number {
  const bonus = winner.equipment.weapon?.gainGoldOnWin ?? 0;
  if (bonus <= 0) return 0;
  winner.gold += bonus;
  return bonus;
}

function applyPerCombatAccessoryRewards(state: GameState, participantId: string) {
  const p = state.players.find((x) => x.id === participantId);
  if (!p) return;
  const acc = p.equipment.accessory;
  if (!acc) return;
  const goldGain = acc.gainGoldPerCombat ?? 0;
  const klunkGain = acc.gainKlunkPerCombat ?? 0;
  if (goldGain > 0) p.gold += goldGain;
  if (klunkGain > 0) p.klunkar += klunkGain;
  if (goldGain > 0 || klunkGain > 0) {
    log(
      state,
      `${p.name} får bonus per strid: ${goldGain > 0 ? `+${goldGain} pant` : ""}${
        goldGain > 0 && klunkGain > 0 ? " och " : ""
      }${klunkGain > 0 ? `+${klunkGain} klunk` : ""}.`,
    );
  }
}

function applyWeaponWinRandomDamage(params: {
  state: GameState;
  winner: Player;
  rng: () => number;
  log: (s: GameState, m: string) => void;
}): { targetName: string; damage: number } | null {
  const dmg = params.winner.equipment.weapon?.randomOtherDamageOnWin ?? 0;
  if (dmg <= 0) return null;
  const candidates = params.state.players.filter((p) => p.id !== params.winner.id && !p.eliminated && p.hp > 0);
  if (candidates.length === 0) return null;
  const target = pick(params.rng, candidates);
  const before = target.hp;
  applyDamage({ state: params.state, player: target, amount: dmg, source: "weaponWin", log: params.log });
  const applied = Math.max(0, before - target.hp);
  if (applied <= 0) return null;
  return { targetName: target.name, damage: applied };
}

function helmetAttackBonus(p: Player): number {
  const h = p.equipment.helmet;
  if (!h) return 0;
  let bonus = h.combatBonus ?? 0;
  const k = p.klunkar;
  if (typeof h.klunkAttackBonus20 === "number" && k >= 20) {
    bonus += h.klunkAttackBonus20;
  } else if (typeof h.klunkAttackBonus10 === "number" && k >= 10) {
    bonus += h.klunkAttackBonus10;
  }
  if (typeof h.klunkAttackBonusMax === "number") {
    return Math.min(bonus, h.klunkAttackBonusMax);
  }
  return bonus;
}

function penaltySipTotalForPlayer(p: Player, baseCount: number): number {
  const base = Math.max(0, Math.floor(baseCount));
  if (base <= 0) return 0;
  return base + (p.equipment.helmet?.penaltySipExtra ?? 0);
}

function isAfter2030(now = new Date()): boolean {
  const h = now.getHours();
  const m = now.getMinutes();
  return h > 20 || (h === 20 && m >= 30);
}

function applyAdjacentSplashDamage(state: GameState, attacker: Player, dmg: number): boolean {
  const level = state.levels[attacker.levelIndex];
  if (!level) return false;
  const n = level.tiles.length;
  const left = (attacker.tileIndex - 1 + n) % n;
  const right = (attacker.tileIndex + 1) % n;
  const adj = state.players.filter(
    (p) =>
      p.id !== attacker.id &&
      p.levelIndex === attacker.levelIndex &&
      (p.tileIndex === left || p.tileIndex === right),
  );
  for (const p of adj) {
    const before = p.hp;
    applyDamage({ state, player: p, amount: dmg, log });
    log(state, `${p.name} hamnar i stänket (HP ${before} → ${p.hp}).`);
  }
  return adj.length > 0;
}

function removeRandomEquipment(p: Player, rng: () => number): string | null {
  const slots: Array<"weapon" | "armor" | "helmet" | "accessory"> = ["weapon", "armor", "helmet", "accessory"];
  const have = slots.filter((s) => !!p.equipment[s]);
  if (have.length === 0) return null;
  const chosen = pick(rng, have);
  const prev = p.equipment[chosen];
  const label = prev?.name ?? chosen;
  p.equipment[chosen] = undefined;
  if (chosen === "armor") {
    p.maxHp = maxHpFor(p);
    if (p.hp > p.maxHp) p.hp = p.maxHp;
  }
  return label;
}

function randomEquippedSlot(p: Player, rng: () => number): "weapon" | "armor" | "helmet" | "accessory" | null {
  const slots: Array<"weapon" | "armor" | "helmet" | "accessory"> = ["weapon", "armor", "helmet", "accessory"];
  const have = slots.filter((s) => !!p.equipment[s]);
  if (have.length === 0) return null;
  return pick(rng, have);
}


const COMBAT_REWARD_ITEMS: ItemId[] = itemDeckItemIds();

const COMBAT_REWARD_EQUIPMENT_SLOTS: EquipmentSlot[] = ["weapon", "armor", "helmet", "accessory"];

function newItemInstanceId(rng: () => number): string {
  return `it_${Date.now()}_${Math.floor(rng() * 1_000_000_000)}`;
}

function grantRandomCombatRewardItem(
  state: GameState,
  player: Player,
  rng: () => number,
  sourceName: string,
): ItemId {
  const itemId = pick(rng, COMBAT_REWARD_ITEMS);
  player.inventory ??= [];
  player.inventory.push(createItemInstance(itemId, newItemInstanceId(rng)));
  log(state, `${player.name} hittar ett föremål efter segern mot ${sourceName}.`);
  return itemId;
}

function grantRandomCombatReward(
  state: GameState,
  player: Player,
  rng: () => number,
  sourceName: string,
  winMonsterId?: MonsterId,
): void {
  if (winMonsterId === "bottling_bot" && rng() < 0.5) {
    const rallySlots: Array<"weapon" | "helmet"> = [];
    if (!player.equipment.weapon) rallySlots.push("weapon");
    if (!player.equipment.helmet) rallySlots.push("helmet");
    if (rallySlots.length > 0) {
      const slot = pick(rng, rallySlots);
      if (slot === "weapon") {
        player.equipment.weapon = { name: "Robotarm", power: 0, pvpDieBonus: 1 };
        log(state, `${player.name} får Robotarm efter segern mot ${sourceName}!`);
      } else {
        player.equipment.helmet = { name: "Robothjälm", damageNegate: 1, combatBonus: 0 };
        log(state, `${player.name} får Robothjälm efter segern mot ${sourceName}!`);
      }
      return;
    }
  }
  // Mix item cards with equipment. If equipment slot is occupied, fall back to an item card.
  const equipmentRoll = rng() < 0.35;
  if (equipmentRoll) {
    const slot = pick(rng, COMBAT_REWARD_EQUIPMENT_SLOTS);
    if (!player.equipment[slot]) {
      const pool = EQUIPMENT_CATALOG.filter((e) => e.slot === slot);
      if (pool.length > 0) {
        const eq = pick(rng, pool);
        if (slot === "weapon") {
          player.equipment.weapon = {
            name: eq.name,
            power: eq.power ?? 1,
            sipAttackBonus: eq.sipAttackBonus,
            gainGoldOnWin: eq.gainGoldOnWin,
            powerAtGold10: eq.powerAtGold10,
            powerAtGold20: eq.powerAtGold20,
            powerAtGold30: eq.powerAtGold30,
            powerDynamicMax: eq.powerDynamicMax,
            randomOtherDamageOnWin: eq.randomOtherDamageOnWin,
          };
        } else if (slot === "armor") {
          player.equipment.armor = {
            name: eq.name,
            bonusHp: eq.bonusHp ?? 0,
            damageNegate: eq.damageNegate,
            bossDamageNegateBonus: eq.bossDamageNegateBonus,
            negateAllOnce: eq.negateAllOnce,
            pvpCannotBeChallenged: eq.pvpCannotBeChallenged,
            gainGoldOnDamageTaken: eq.gainGoldOnDamageTaken,
          };
          player.maxHp = maxHpFor(player);
          player.hp = Math.min(player.hp, player.maxHp);
        } else if (slot === "helmet") {
          player.equipment.helmet = {
            name: eq.name,
            combatBonus: eq.combatBonus ?? 0,
            damageNegate: eq.damageNegate,
            bossDamageNegateBonus: eq.bossDamageNegateBonus,
            negateAllOnce: eq.negateAllOnce,
            penaltySipExtra: eq.penaltySipExtra,
            klunkAttackBonus10: eq.klunkAttackBonus10,
            klunkAttackBonus20: eq.klunkAttackBonus20,
            klunkAttackBonusMax: eq.klunkAttackBonusMax,
          };
        } else {
          player.equipment.accessory = {
            name: eq.name,
            damageNegate: eq.damageNegate,
            combatBonus: eq.combatBonus,
            moveBonus: eq.moveBonus,
            gainGoldPerCombat: eq.gainGoldPerCombat,
            gainKlunkPerCombat: eq.gainKlunkPerCombat,
            preventTheft: eq.preventTheft,
            levelUpDiscountGold: eq.levelUpDiscountGold,
            canSkipMonsterEncounter: eq.canSkipMonsterEncounter,
          };
        }
        log(state, `${player.name} hittar utrustning efter segern mot ${sourceName}: ${eq.name}.`);
        return;
      }
    }
  }
  grantRandomCombatRewardItem(state, player, rng, sourceName);
}

function computeMonsterDamage(
  monsterId: MonsterId,
  p: Player,
  die: number,
  /** Kapten Interrobang / Sura bär: true = take sip for reduced damage, false = full base damage */
  sipMitigation?: boolean,
): { damage: number; redirected: boolean } {
  if (monsterId === "skum_banan") return { damage: isAfter2030() ? 3 : 2, redirected: false };
  if (monsterId === "folke_bengtsson") return { damage: p.klunkar > 5 ? 3 : 1, redirected: false };
  if (monsterId === "kapten_interrobang") {
    const base = MONSTERS.find((m) => m.id === "kapten_interrobang")!.baseDamage;
    return sipMitigation === true
      ? { damage: Math.max(0, base - 3), redirected: false }
      : { damage: base, redirected: false };
  }
  if (monsterId === "sura_bar") {
    const base = MONSTERS.find((m) => m.id === "sura_bar")!.baseDamage;
    return sipMitigation === true
      ? { damage: Math.max(0, base - 2), redirected: false }
      : { damage: base, redirected: false };
  }
  if (monsterId === "rabarbapappa" && die === 1) return { damage: 3, redirected: true };
  const def = MONSTERS.find((m) => m.id === monsterId);
  return { damage: def?.baseDamage ?? 3, redirected: false };
}

function showCard(
  state: GameState,
  params: {
    playerId: string;
    kind: "event" | "combat" | "rest" | "treasure" | "empty";
    cardId: string;
    title: string;
    text: string;
    artKey?: string;
    grantedItemId?: string;
    choices?: Array<{ id: string; label: string }>;
    combatWin?: CombatWinSummary;
    combatLoss?: CombatLoseSummary;
  },
): void {
  state.pending = {
    type: "card",
    playerId: params.playerId,
    cardId: params.cardId,
    kind: params.kind,
    title: params.title,
    text: params.text,
    artKey: params.artKey,
    grantedItemId: params.grantedItemId,
    choices: params.choices,
    combatWin: params.combatWin,
    combatLoss: params.combatLoss,
  };
}

type InvOrEquipTarget =
  | { kind: "inv"; player: Player; index: number }
  | { kind: "eq"; player: Player; slot: EquipmentSlot };

/** Slumpa bort ett föremål eller en utrustning hos valfri spelare (Onda bryggverket). */
function destroyOneRandomItemOrEquipmentGlobally(
  state: GameState,
  rng: () => number,
  logFn: (s: GameState, m: string) => void,
): void {
  const opts: InvOrEquipTarget[] = [];
  const slots: EquipmentSlot[] = ["weapon", "armor", "helmet", "accessory"];
  for (const pl of state.players) {
    if (pl.eliminated) continue;
    const inv = pl.inventory ?? [];
    for (let i = 0; i < inv.length; i++) opts.push({ kind: "inv", player: pl, index: i });
    for (const slot of slots) {
      if (pl.equipment[slot]) opts.push({ kind: "eq", player: pl, slot });
    }
  }
  if (opts.length === 0) {
    logFn(state, "Inget föremål eller utrustning att förstöra för Onda bryggverkets straff.");
    return;
  }
  const o = pick(rng, opts);
  if (o.kind === "inv") {
    const inv = o.player.inventory ?? [];
    const removed = inv.splice(o.index, 1)[0];
    o.player.inventory = inv;
    logFn(
      state,
      `${o.player.name} tappar ett föremål${removed ? ` (${itemDisplayTitle(removed.itemId)})` : ""} — Onda bryggverket.`,
    );
  } else {
    const slot = o.slot;
    const piece = o.player.equipment[slot]!;
    o.player.equipment[slot] = undefined as any;
    if (slot === "armor") {
      o.player.maxHp = maxHpFor(o.player);
      if (o.player.hp > o.player.maxHp) o.player.hp = o.player.maxHp;
    }
    logFn(state, `${o.player.name} tappar utrustning: ${piece.name ?? slot} (Onda bryggverket).`);
  }
}

/** Extra slutboss-straff vid förlust (parti / global slump). */
function applySlutbossLossPartyEffects(
  state: GameState,
  monsterId: MonsterId,
  enemyName: string,
  rng: () => number,
  logFn: (s: GameState, m: string) => void,
): void {
  if (monsterId === "store_narcissius") {
    for (const pl of state.players) {
      if (pl.eliminated) continue;
      pl.gold = Math.max(0, pl.gold - 1);
    }
    logFn(state, "Alla spelare tappar 1 pant (Den store narcissus).");
  } else if (monsterId === "oldomaren") {
    for (const pl of state.players) {
      if (pl.eliminated) continue;
      const gain = penaltySipTotalForPlayer(pl, 1);
      pl.klunkar += gain;
      pushSipNotice(state, pl.id, enemyName, gain);
    }
    logFn(state, "Alla spelare tar 1 klunk (Öldomaren).");
  } else if (monsterId === "onda_bryggverket") {
    destroyOneRandomItemOrEquipmentGlobally(state, rng, logFn);
  }
}

/** Efter förlorat slag: skada, monster-effekter, förlustkort. `sipMitigation` gäller bara Kapten Interrobang/Sura bär. */
function applyCombatLoss(
  next: GameState,
  ctx: {
    p: Player;
    tile: Tile;
    monsterId: MonsterId;
    die: number;
    pr: number;
    need: number;
    assistRoll: number | null;
    assistId?: string;
    teamBattleRequired?: boolean;
    enemyName: string;
    sipMitigation: boolean;
    /** Minst en spelart6 var 1 — förlust oavsett total mot styrka. */
    critFailOnOne?: boolean;
  },
  log: (s: GameState, m: string) => void,
  rng: () => number,
): void {
  const { p, tile, monsterId, die, pr, need, assistRoll, assistId } = ctx;
  const before = p.hp;
  const beforeSips = p.klunkar;
  const sipForMonster =
    monsterId === "kapten_interrobang" || monsterId === "sura_bar" ? ctx.sipMitigation : undefined;
  const dmgOut = computeMonsterDamage(monsterId, p, die, sipForMonster);
  const isBossHit = tile.type === "boss";
  let redirectedTargetName: string | null = null;

  if (monsterId === "rabarbapappa" && dmgOut.redirected && next.players.length > 1) {
    const others = next.players.filter((x) => x.id !== p.id);
    const target = pick(rng, others);
    redirectedTargetName = target.name;
    const tb = target.hp;
    applyDamage({ state: next, player: target, amount: dmgOut.damage, log });
    log(next, `${p.name} slog 1 — Rabarbapappan missar och träffar ${target.name} i stället (HP ${tb} → ${target.hp}).`);
  } else {
    applyDamage({ state: next, player: p, amount: dmgOut.damage, isBossHit, log });
  }
  if (assistId) {
    const bro = next.players.find((x) => x.id === assistId) ?? null;
    if (bro) {
      const bb = bro.hp;
      applyDamage({ state: next, player: bro, amount: dmgOut.damage, isBossHit, log });
      log(next, `${bro.name} takes the hit too (HP ${bb} → ${bro.hp}).`);
    }
  }

  const def = MONSTERS.find((m) => m.id === monsterId);
  const lossSips = (def?.lossSipsOnLose ?? 0) + MONSTER_LOSS_SIP_FLAT;
  /** En körad per mottagare — annars visar straffklunk-modalen bara första posten (fel antal vid team battle +1). */
  const totalLossSips = lossSips + (ctx.teamBattleRequired ? 1 : 0);
  p.klunkar += penaltySipTotalForPlayer(p, totalLossSips);
  pushSipNotice(next, p.id, ctx.enemyName, totalLossSips);
  if (assistId) {
    const bro = next.players.find((x) => x.id === assistId) ?? null;
    if (bro) {
      bro.klunkar += penaltySipTotalForPlayer(bro, totalLossSips);
      pushSipNotice(next, bro.id, ctx.enemyName, totalLossSips);
    }
  }

  if ((monsterId === "kapten_interrobang" || monsterId === "sura_bar") && ctx.sipMitigation) {
    p.klunkar += 1;
    pushSipNotice(next, p.id, ctx.enemyName, 1);
  }
  let lostEquipmentName: string | undefined;
  if (monsterId === "keg_lifter") {
    const lost = removeRandomEquipment(p, rng);
    if (lost) {
      lostEquipmentName = lost;
      log(next, `${p.name} tappar ett slumpmässigt utrustat föremål: ${lost}.`);
    }
  }
  const imperialAdjacentSplash =
    monsterId === "imperial_dragon_stout" ? applyAdjacentSplashDamage(next, p, 1) : false;

  applySlutbossLossPartyEffects(next, monsterId, ctx.enemyName, rng, log);

  log(
    next,
    ctx.critFailOnOne
      ? `${p.name} förlorar striden (etta på t6 — kritisk miss; totalt ${pr} mot styrka ${need}).`
      : `${p.name} förlorar striden (slag ${pr}<${need}).`,
  );
  const damageTaken = before - p.hp;
  const klunkGained = p.klunkar - beforeSips;
  showCard(next, {
    playerId: p.id,
    kind: "combat",
    cardId: "combat_lose",
    title: tile.type === "boss" ? `Boss: ${tile.bossName ?? "Okänd"}` : "Dålig batch",
    text: "",
    combatLoss: {
      playerName: p.name,
      enemyName: ctx.enemyName,
      rollTotal: pr,
      need,
      damage: damageTaken,
      klunkGained,
      assistRollNote:
        assistRoll !== null ? `Ölkompis-slag inkluderat: +${assistRoll}.` : undefined,
      redirectNote: redirectedTargetName
        ? `Rabarbapappan slog om till: ${redirectedTargetName}.`
        : undefined,
      lostEquipmentName,
      imperialAdjacentSplash: imperialAdjacentSplash ? true : undefined,
    },
  });
}

/** Tillämpa skada/guld och visa kort efter att klienten bekräftat tärningsresultatet. */
function finalizeCombatAfterRollPreview(
  next: GameState,
  pending: Extract<Pending, { type: "combat" }> & { phase: "rollPreview" },
  rng: () => number,
): void {
  const p = next.players.find((x) => x.id === pending.attackerId);
  const die = pending.previewDie ?? 1;
  const pr = pending.previewTotal ?? 0;
  const need = pending.previewNeed ?? 0;
  const assistRoll = pending.previewAssistRoll ?? null;
  const assistId = pending.assistId;
  const teamBattleRequired = !!pending.teamBattleRequired;
  const rewardGold = pending.rewardGold ?? 4;
  const rewardItems = pending.rewardItems ?? 1;
  const previewWon = pending.previewWon ?? false;
  const critFailOnOne =
    (pending.previewDie ?? 1) === 1 ||
    (pending.previewBroDie != null && pending.previewBroDie === 1);

  if (!p) {
    next.pending = null;
    return;
  }

  const tile = next.levels[pending.levelIndex]?.tiles?.[pending.tileIndex];
  if (!tile || (tile.type !== "combat" && tile.type !== "boss")) {
    next.pending = null;
    return;
  }

  if (previewWon) {
    if (tile.type === "boss") {
      const prevLives = next.finalBossLivesRemaining ?? 3;
      const newLives = prevLives - 1;
      next.finalBossLivesRemaining = newLives;
      if (newLives > 0) {
        next.pending = null;
        const bd = MONSTERS.find((m) => m.id === next.finalBossMonsterId);
        log(
          next,
          `${p.name} vinner en runda mot slutbossen! ${newLives} liv kvar (slag ${pr}≥${need}).`,
        );
        showCard(next, {
          playerId: p.id,
          kind: "combat",
          cardId: "boss_round_win",
          title: "Runda vunnet!",
          text: `Slutbossen har ${newLives} liv kvar. Bekräfta för att gå vidare till nästa runda.`,
          artKey: bd?.artKey ?? "combat/boss",
        });
        return;
      }
    }

    next.pending = null;
    p.gold += rewardGold;
    const attackerWeaponBonusGold = applyWeaponWinGoldBonus(p);
    const attackerWeaponRandomDamage = applyWeaponWinRandomDamage({ state: next, winner: p, rng, log });
    const assistMate = assistId ? (next.players.find((x) => x.id === assistId) ?? null) : null;
    const assistName = assistMate?.name ?? null;
    if (teamBattleRequired && assistMate) {
      assistMate.gold += rewardGold;
    }
    if (attackerWeaponBonusGold > 0) {
      log(
        next,
        `${p.name} får +${attackerWeaponBonusGold} pant från ${p.equipment.weapon?.name ?? "vapnet"} efter vinsten.`,
      );
    }
    if (attackerWeaponRandomDamage) {
      log(
        next,
        `${p.name}s ${p.equipment.weapon?.name ?? "vapen"} träffar slumpmässigt: ${attackerWeaponRandomDamage.targetName} tar ${attackerWeaponRandomDamage.damage} skada.`,
      );
    }
    p.xp += tile.type === "boss" ? 8 : 2;
    p.maxHp = maxHpFor(p);
    if (p.hp > p.maxHp) p.hp = p.maxHp;
    const attackerItemCount = rewardItems;
    const winMonsterId = pending.monsterId as MonsterId | undefined;
    if (attackerItemCount > 0) {
      for (let i = 0; i < attackerItemCount; i++) {
        grantRandomCombatReward(next, p, rng, pending.enemyName, winMonsterId);
      }
      if (assistMate) {
        for (let i = 0; i < attackerItemCount; i++) {
          grantRandomCombatReward(next, assistMate, rng, pending.enemyName, winMonsterId);
        }
      }
    }

    let randomOtherSipRecipientName: string | undefined;
    if (tile.type !== "boss") {
      const winMonsterId = pending.monsterId as MonsterId;
      const winDef = MONSTERS.find((m) => m.id === winMonsterId);
      const sipCount = winDef?.winRandomOtherSips ?? 0;
      if (sipCount > 0) {
        const exclude = new Set<string>([p.id]);
        if (assistId) exclude.add(assistId);
        for (let s = 0; s < sipCount; s++) {
          const candidates = next.players.filter(
            (pl) => pl.hp > 0 && !pl.eliminated && !exclude.has(pl.id),
          );
          if (candidates.length === 0) break;
          const victim = pick(rng, candidates);
          const sipGain = penaltySipTotalForPlayer(victim, 1);
          victim.klunkar += sipGain;
          pushSipNotice(next, victim.id, p.name, sipGain);
          randomOtherSipRecipientName = victim.name;
        }
        if (randomOtherSipRecipientName) {
          log(
            next,
            `${randomOtherSipRecipientName} får straffklunk (${p.name} vann mot ${pending.enemyName}).`,
          );
        }
      }
    }

    if (teamBattleRequired && assistName) {
      log(
        next,
        `${p.name} och ${assistName} besegrar ${tile.bossName ?? "monstret"}! (+${rewardGold} pant var, slag ${pr}≥${need})`,
      );
    } else if (assistName && attackerItemCount > 0) {
      log(
        next,
        `${p.name} besegrar ${tile.bossName ?? "monstret"}! (+${rewardGold} pant, slag ${pr}≥${need}) ${assistName} får lika många skatter (${attackerItemCount}).`,
      );
    } else {
      log(next, `${p.name} besegrar ${tile.bossName ?? "monstret"}! (+${rewardGold} pant, slag ${pr}≥${need})`);
    }
    /** Slutboss: ingen "Batch räddad"-modal — spelet går direkt till resultat (mobil + bord). */
    if (tile.type !== "boss") {
      showCard(next, {
        playerId: p.id,
        kind: "combat",
        cardId: "combat_win",
        title: "Dålig batch",
        text: "",
        combatWin: {
          winnerName: p.name,
          enemyName: pending.enemyName,
          rollTotal: pr,
          need,
          rewardGold,
          rewardItems,
          teammateName: assistName ?? undefined,
          randomOtherSipRecipientName,
        },
      });
    }
    if (tile.type === "boss") {
      next.phase = "ended";
      next.winnerId = p.id;
      next.winnerName = p.name;
      log(next, `🏆 ${p.name} har besegrat slutbossen och vinner spelet!`);
      next.goldenBeerCarrierId = p.id;
      log(next, `${p.name} får den gyllene ölen!`);
    }
  } else {
    const monsterId = pending.monsterId as MonsterId;
    if (monsterId === "kapten_interrobang" || monsterId === "sura_bar") {
      next.pending = { ...pending, phase: "chooseHitMitigation" };
      return;
    }
    next.pending = null;
    applyCombatLoss(
      next,
      {
        p,
        tile,
        monsterId,
        die,
        pr,
        need,
        assistRoll,
        assistId,
        teamBattleRequired,
        enemyName: pending.enemyName,
        sipMitigation: false,
        critFailOnOne,
      },
      log,
      rng,
    );
  }
}

function currentPlayer(state: GameState): Player | null {
  const id = state.turnOrder[state.currentTurnIndex];
  return state.players.find((p) => p.id === id) ?? null;
}

function canOfferLevelUp(state: GameState, p: Player): {
  targetLevelIndex: number;
  costs: { gold: number; sips: number };
} | null {
  const targetLevelIndex = p.levelIndex + 1;
  if (targetLevelIndex >= state.levels.length) return null;
  const baseCosts = levelUpCostsForTargetLevel(targetLevelIndex);
  const discount = p.equipment.accessory?.levelUpDiscountGold ?? 0;
  const costs = { ...baseCosts, gold: Math.max(0, baseCosts.gold - Math.max(0, discount)) };
  /** Nivåval efter tur: klunkantal eller bryggnivå (samma som UI). Dörren kan fortfarande öppnas med pant. */
  if (!canAscendByKlunkRequirement(p, targetLevelIndex)) return null;
  return { targetLevelIndex, costs };
}

function maybeCreateLevelUpOffer(state: GameState, p: Player, deferTurnAdvance = false): boolean {
  if (state.pending || state.phase !== "playing") return false;
  const offer = canOfferLevelUp(state, p);
  if (!offer) return false;
  state.pending = {
    type: "levelUpOffer",
    playerId: p.id,
    targetLevelIndex: offer.targetLevelIndex,
    costs: offer.costs,
    deferTurnAdvance,
  };
  log(
    state,
    `${p.name} har tillräckligt med klunkar för nivå ${offer.targetLevelIndex + 1} och kan välja att stiga direkt.`,
  );
  logMonsterScalePreviewForAscend(state, p, offer.targetLevelIndex, "offer");
  return true;
}

function endTurnOrOfferLevelUp(state: GameState, activePlayerId: string): void {
  if (state.phase !== "playing") return;
  const cp = currentPlayer(state);
  if (!cp || cp.id !== activePlayerId) {
    advanceTurn(state);
    return;
  }
  if (maybeCreateLevelUpOffer(state, cp, true)) return;
  advanceTurn(state);
}

function cloneState(s: GameState): GameState {
  // Node/TS-lib kan sakna structuredClone beroende på target/lib.
  return JSON.parse(JSON.stringify(s)) as GameState;
}

export function lobbyAddPlayer(
  state: GameState,
  opts: { id: string; name: string; isHost: boolean },
): ApplyResult {
  const next = cloneState(state);
  if (next.players.length >= MAX_PLAYERS) {
    return { state, events: [], error: "Lobby full" };
  }
  const color = PLAYER_COLORS[next.players.length % PLAYER_COLORS.length]!;
  const p: Player = {
    id: opts.id,
    name: opts.name.trim() || "Bryggare",
    color,
    isHost: opts.isHost,
    ready: false,
    levelIndex: 0,
    tileIndex: 0,
    gold: 0,
    klunkar: 0,
    hp: 10,
    maxHp: 10,
    xp: 0,
    equipment: {},
    inventory: [],
    nextMoveBonus: 0,
    nextCombatModifier: 0,
    skippedTurns: 0,
    eliminated: false,
  };
  next.players.push(p);
  log(next, `${p.name} gick med i lobbyn.`);
  return { state: next, events: ["lobbyUpdate"] };
}

export function startGame(
  state: GameState,
  hostPlayerId: string,
  seed: number,
): ApplyResult {
  const next = cloneState(state);
  if (next.phase !== "lobby") {
    return { state, events: [], error: "Spelet har redan startat" };
  }
  const host = next.players.find((p) => p.id === hostPlayerId);
  if (!host?.isHost) return { state, events: [], error: "Bara värden kan starta" };
  if (next.players.length < 2) {
    return { state, events: [], error: "Minst 2 spelare krävs" };
  }
  const readyCount = next.players.filter((p) => p.ready).length;
  if (!host.ready) {
    return { state, events: [], error: "Värden måste vara redo" };
  }
  if (readyCount !== next.players.length) {
    return { state, events: [], error: "Alla spelare måste vara redo" };
  }
  next.seed = seed;
  next.levels = generateLevels(seed);
  const bossRng = createRng(seed ^ 0x9e3779b9);
  const pickedBoss = FINAL_BOSS_IDS[Math.floor(bossRng() * FINAL_BOSS_IDS.length)]!;
  next.finalBossMonsterId = pickedBoss;
  next.finalBossLivesRemaining = 3;
  const bossMonster = MONSTERS.find((m) => m.id === pickedBoss);
  if (bossMonster) {
    for (const lvl of next.levels) {
      for (const t of lvl.tiles) {
        if (t.type === "boss") {
          t.combatValue = bossMonster.strength;
          t.bossName = bossMonster.name;
        }
      }
    }
  }
  next.phase = "playing";
  next.turnOrder = next.players.map((p) => p.id);
  next.currentTurnIndex = 0;
  for (const p of next.players) {
    p.levelIndex = 0;
    p.tileIndex = 0;
    p.hp = maxHpFor(p);
    p.maxHp = maxHpFor(p);
    p.nextMoveBonus = 0;
    p.nextCombatModifier = 0;
    p.eliminated = false;
  }
  next.pending = null;
  next.winnerId = null;
  next.winnerName = null;
  next.goldenBeerCarrierId = null;
  next.treasureTaken = {};
  next.lastDiceRoll = null;
  next.lastDiceRollerId = null;
  next.sipNotices = [];
  log(next, `— Bryggmästarens väg börjar! (seed ${seed}) —`);
  if (bossMonster) {
    log(
      next,
      `Slutboss ${bossMonster.name} — tre liv, vinn tre rundor.`,
    );
  }
  const cur = currentPlayer(next);
  if (cur) log(next, `${cur.name}s tur. Slå tärningen.`);
  return { state: next, events: ["gameStarted"] };
}

function shuffleArrayInPlace<T>(arr: T[], rng: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = t;
  }
}

function catalogEquipmentToMerchantShopItem(eq: EquipmentShopItem, itemId: string): ShopItem {
  return {
    id: itemId,
    slot: eq.slot,
    name: eq.name,
    price: eq.price,
    bonusHp: eq.bonusHp ?? 0,
    damageNegate: eq.damageNegate,
    bossDamageNegateBonus: eq.bossDamageNegateBonus,
    negateAllOnce: eq.negateAllOnce,
    pvpCannotBeChallenged: eq.pvpCannotBeChallenged,
    gainGoldOnDamageTaken: eq.gainGoldOnDamageTaken,
    combatBonus: eq.combatBonus,
    penaltySipExtra: eq.penaltySipExtra,
    klunkAttackBonus10: eq.klunkAttackBonus10,
    klunkAttackBonus20: eq.klunkAttackBonus20,
    klunkAttackBonusMax: eq.klunkAttackBonusMax,
    moveBonus: eq.moveBonus,
    gainGoldPerCombat: eq.gainGoldPerCombat,
    gainKlunkPerCombat: eq.gainKlunkPerCombat,
    preventTheft: eq.preventTheft,
    levelUpDiscountGold: eq.levelUpDiscountGold,
    canSkipMonsterEncounter: eq.canSkipMonsterEncounter,
    power: eq.power,
    sipAttackBonus: eq.sipAttackBonus,
    pvpDieBonus: eq.pvpDieBonus,
    gainGoldOnWin: eq.gainGoldOnWin,
    powerAtGold10: eq.powerAtGold10,
    powerAtGold20: eq.powerAtGold20,
    powerAtGold30: eq.powerAtGold30,
    powerDynamicMax: eq.powerDynamicMax,
    randomOtherDamageOnWin: eq.randomOtherDamageOnWin,
  };
}

/** Exakt fyra varor visas: pool = mäskpaddel + burkrustning + läkning + två slumpade från katalogen (5 st), sedan `slice(0, 4)` efter blandning. Köp per besök tills spelaren lämnar. */
const MERCHANT_SHELF_SLOTS = 4;

function rollMerchantItems(rng: () => number): ShopItem[] {
  const padel = EQUIPMENT_CATALOG.find((e) => e.id === "ew_padel");
  const burkrustning = EQUIPMENT_CATALOG.find((e) => e.id === "ea_can_armor");
  if (!padel || !burkrustning) {
    throw new Error("EQUIPMENT_CATALOG saknar ew_padel eller ea_can_armor (Panta burkar)");
  }
  const items: ShopItem[] = [
    catalogEquipmentToMerchantShopItem(padel, "w"),
    catalogEquipmentToMerchantShopItem(burkrustning, "a"),
    {
      id: "h",
      slot: "heal",
      name: "Första hjälpen-lager",
      price: 8,
      healAmount: 4,
    },
  ];
  const catalog = [...EQUIPMENT_CATALOG];
  shuffleArrayInPlace(catalog, rng);
  for (const it of catalog.slice(0, 2)) {
    items.push(catalogEquipmentToMerchantShopItem(it, it.id));
  }
  shuffleArrayInPlace(items, rng);
  return items.slice(0, MERCHANT_SHELF_SLOTS);
}

function findOpponentsOnTile(state: GameState, mover: Player): Player[] {
  const others = state.players.filter(
    (p) =>
      p.id !== mover.id &&
      !p.eliminated &&
      p.levelIndex === mover.levelIndex &&
      p.tileIndex === mover.tileIndex,
  );
  if (others.length === 0) return [];
  const rank = new Map(state.turnOrder.map((id, i) => [id, i]));
  return [...others].sort((a, b) => {
    const ra = rank.get(a.id) ?? 999;
    const rb = rank.get(b.id) ?? 999;
    return ra - rb;
  });
}

function canChallengeInPvp(defender: Player): boolean {
  if (!defender) return false;
  return defender.equipment.armor?.pvpCannotBeChallenged !== true;
}

function resolvePvp(state: GameState, a: Player, b: Player, rng: () => number): Pending {
  // Legacy path (shouldn't be used after encounterChoice is introduced)
  const ad = rollDie(rng, 6);
  const bd = rollDie(rng, 6);
  const ar = ad + weaponPower(a) + (a.equipment.weapon?.pvpDieBonus ?? 0);
  const br = bd + weaponPower(b) + (b.equipment.weapon?.pvpDieBonus ?? 0);
  const attackerWins = ar >= br;
  const winner = attackerWins ? a : b;
  const loser = attackerWins ? b : a;
  log(state, `PvP: ${a.name} (${ar}) vs ${b.name} (${br}) — ${winner.name} vinner!`);
  return {
    type: "pvp",
    attackerId: a.id,
    defenderId: b.id,
    phase: "chooseLoot",
    winnerId: winner.id,
    loserId: loser.id,
    rolls: {
      [a.id]: { die: ad, total: ar },
      [b.id]: { die: bd, total: br },
    },
  };
}

/** Reaktor som använder *vilket* föremål som helst under reaktionsfasen måste markeras så angriparen får slå. */
function markCombatReactorUsedItemIfNeeded(state: GameState, reactorId: string): void {
  const pending = state.pending;
  if (!pending || pending.type !== "combat" || pending.phase !== "reactions") return;
  if (!pending.reactors?.includes(reactorId)) return;
  pending.reacted ??= {};
  if (pending.reacted[reactorId] === "pass" || pending.reacted[reactorId] === "intervened") return;
  pending.reacted[reactorId] = "intervened";
}

function resolveTileLanding(state: GameState, p: Player, rng: () => number): void {
  const level = state.levels[p.levelIndex];
  if (!level) return;
  const tile = level.tiles[p.tileIndex];
  if (!tile) return;

  switch (tile.type) {
    case "empty":
      log(state, `${p.name} hamnar på en lugn ruta.`);
      showCard(state, {
        playerId: p.id,
        kind: "empty",
        cardId: "tile_empty",
        title: "Lugn ruta",
        text: "Inget särskilt händer. Du tar ett andetag och ser dig omkring.",
        artKey: "tile/empty",
      });
      break;
    case "rest": {
      const card = drawFromDeck("rest", rng);
      const beforeHp = p.hp;
      const beforeGold = p.gold;
      const beforeKlunk = p.klunkar;
      const out = applyEffects({ state, player: p, effects: card.effects ?? [], rng });
      log(state, `${p.name} vilar på bryggeriet (+${out.heal ?? 0} HP, max ${p.maxHp}).`);
      showCard(state, {
        playerId: p.id,
        kind: "rest",
        cardId: card.id,
        title: card.title,
        text: card.text + formatSelfStatDeltas(beforeGold, p.gold, beforeHp, p.hp, beforeKlunk, p.klunkar),
        artKey: card.artKey,
      });
      break;
    }
    case "treasure": {
      // Skattrutor kan besökas flera gånger; ibland är gömman redan tom.
      if (rng() < 0.1) {
        log(state, "Gömman är redan plundrad.");
        showCard(state, {
          playerId: p.id,
          kind: "treasure",
          cardId: "treasure_empty",
          title: "Tom gömma",
          text: "Någon hann före. Det finns inget kvar.",
          artKey: "tile/treasure-empty",
        });
        break;
      }
      const card = drawFromDeck("treasure", rng);
      const effectOut: EffectApplyOut = {};
      const out = applyEffects({
        state,
        player: p,
        effects: card.effects ?? [],
        rng,
        out: effectOut,
      });
      p.xp += 1;
      log(state, `${p.name} hittar skatt: +${out.gold ?? 0} pant.`);
      showCard(state, {
        playerId: p.id,
        kind: "treasure",
        cardId: card.id,
        title: card.title,
        text:
          card.text.replace("{gold}", String(out.gold ?? 0)) + appendTextForGrantedItem(effectOut),
        artKey: artKeyForGrantedItem(effectOut, card.artKey) ?? card.artKey,
        grantedItemId: effectOut.grantedItemId,
      });
      break;
    }
    case "event": {
      const card = drawFromDeck("event", rng);
      resolveEventCardOnLand({ state, player: p, card, rng, log, showCard });
      break;
    }
    case "combat":
    case "boss": {
      if (tile.type === "boss") {
        const req = { sips: 10, gold: 20 };
        const ok =
          SKIP_BOSS_RESOURCE_GATE || p.klunkar >= req.sips || p.gold >= req.gold;
        if (!ok) {
          log(
            state,
            `${p.name} är inte redo att möta bossen — behöver ${req.sips}+ klunkar eller ${req.gold}+ pant.`,
          );
          showCard(state, {
            playerId: p.id,
            kind: "combat",
            cardId: "boss_gate",
            title: `Boss: ${tile.bossName ?? "Okänd"}`,
            text: `Du är inte redo.\nKrav: ${req.sips}+ klunkar ELLER ${req.gold}+ pant.\nDu har: ${p.klunkar} klunkar och ${p.gold} pant.`,
            artKey: "combat/boss",
          });
          break;
        }
      }

      if (tile.type === "combat") {
        enterMonsterCombatFromTile(state, p, rng, log, showCard);
        return;
      }

      const pendingBoss = createFinalBossCombatPending(state, p);
      if (!pendingBoss) {
        log(state, `${p.name} kan inte möta slutbossen (konfigurationsfel).`);
        break;
      }
      state.pending = pendingBoss;
      const lives = state.finalBossLivesRemaining ?? 3;
      log(
        state,
        `${p.name} möter slutbossen ${tile.bossName ?? pendingBoss.enemyName} (${lives} liv kvar).`,
      );
      return;
    }
    case "merchant": {
      state.pending = {
        type: "merchant",
        items: rollMerchantItems(rng),
        playerId: p.id,
      };
      log(state, `${p.name} kommer till Panta burkar.`);
      return;
    }
    case "door": {
      const target = tile.doorTargetLevelIndex ?? p.levelIndex + 1;
      const baseCosts = levelUpCostsForTargetLevel(target);
      const discount = p.equipment.accessory?.levelUpDiscountGold ?? 0;
      const costs = { ...baseCosts, gold: Math.max(0, baseCosts.gold - Math.max(0, discount)) };
      const canGold = p.gold >= costs.gold;
      const canSips = canAscendByKlunkRequirement(p, target);
      if (!canGold && !canSips) {
        log(
          state,
          `${p.name} når inte nästa nivå — behöver ${costs.gold} pant eller ${costs.sips}+ klunkar.`,
        );
        showCard(state, {
          playerId: p.id,
          kind: "event",
          cardId: "door_locked",
          title: "Nivån är stängd",
          text: `Som bryggmästare behöver du ${costs.gold} pant eller minst ${costs.sips} klunkar för att stiga till nästa våning.`,
          artKey: "tile/levelup",
        });
        break;
      }
      state.pending = {
        type: "door",
        playerId: p.id,
        targetLevelIndex: target,
        costs,
      };
      log(
        state,
        `${p.name} kan stiga till nivå ${target + 1} som bryggmästare (${costs.gold} pant eller ${costs.sips}+ klunkar).`,
      );
      logMonsterScalePreviewForAscend(state, p, target, "door");
      return;
    }
    default:
      break;
  }

}

function resolveLanding(state: GameState, p: Player, rng: () => number): void {
  const opps = findOpponentsOnTile(state, p);
  if (opps.length > 0) {
    const curTile = state.levels[p.levelIndex]?.tiles[p.tileIndex];
    state.pending = {
      type: "encounterChoice",
      moverId: p.id,
      opponentIds: opps.map((x) => x.id),
      phase: "choosePvpOrTile",
      tileType: curTile?.type ?? "empty",
    };
    const names = opps.map((x) => x.name).join(", ");
    log(
      state,
      opps.length === 1
        ? `${p.name} springer in i ${names}. Välj BvB eller rutan.`
        : `${p.name} möter ${names} på rutan. Välj BvB eller rutan.`,
    );
    return;
  }
  resolveTileLanding(state, p, rng);
}

export function applyAction(state: GameState, action: ClientAction): ApplyResult {
  const rng = createRng(state.seed + state.log.length * 997 + action.type.length);
  const next = cloneState(state);
  const events: string[] = [];

  if (next.phase === "lobby") {
    if (action.type === "setReady") {
      const p = next.players.find((x) => x.id === action.playerId);
      if (!p) return { state, events: [], error: "Okänd spelare" };
      p.ready = action.ready;
      log(next, `${p.name} är ${p.ready ? "redo" : "inte redo"}.`);
      return { state: next, events: ["lobbyUpdate"] };
    }
    if (action.type === "setConfig") {
      const p = next.players.find((x) => x.id === action.playerId);
      if (!p?.isHost) return { state, events: [], error: "Endast värd" };
      next.config.turnSeconds = Math.min(120, Math.max(30, action.turnSeconds));
      return { state: next, events: ["lobbyUpdate"] };
    }
    return { state, events: [], error: "Ogiltig lobby-åtgärd" };
  }

  if (next.phase === "ended") {
    return { state, events: [], error: "Spelet är slut" };
  }

  if (action.type === "sipNoticeAck") {
    const list = next.sipNotices ?? [];
    const idx = list.findIndex((n) => n.recipientId === action.playerId);
    if (idx < 0) return { state, events: [], error: "Ingen straffklunk att stänga" };
    next.sipNotices = [...list.slice(0, idx), ...list.slice(idx + 1)];
    return { state: next, events: ["state"] };
  }

  if (action.type === "brewerDownChoice" && next.pending?.type === "brewerDown") {
    const pending = next.pending;
    if (action.playerId !== pending.playerId) {
      return { state, events: [], error: "Bara den stupade bryggaren kan välja" };
    }
    const victim = next.players.find((x) => x.id === pending.playerId);
    if (!victim) return { state, events: [], error: "Spelaren finns inte" };
    if (victim.eliminated) {
      next.pending = null;
      queueFirstBrewerDownIfNeeded(next);
      return { state: next, events: ["state"] };
    }
    if (action.choice === "retry") {
      victim.eliminated = false;
      victim.levelIndex = 0;
      victim.tileIndex = 0;
      victim.gold = 0;
      victim.klunkar = 0;
      victim.equipment = {};
      victim.inventory = [];
      victim.nextMoveBonus = 0;
      victim.nextCombatModifier = 0;
      victim.nextCombatAttackDiceDouble = undefined;
      victim.skippedTurns = 0;
      victim.maxHp = 10;
      victim.hp = victim.maxHp;
      log(next, `${victim.name} startar om på nytt: tillbaka till start, utan utrustning/föremål, 0 pant och 0 klunkar.`);
      next.pending = null;
      queueFirstBrewerDownIfNeeded(next);
      if (!next.pending && next.phase === "playing") endTurnOrOfferLevelUp(next, victim.id);
      return { state: next, events: ["state"] };
    }
    victim.eliminated = true;
    victim.hp = 0;
    removePlayerFromTurnOrderAfterElimination(next, victim.id);
    log(next, `${victim.name} ger upp och lämnar bryggeriet.`);
    next.pending = null;
    queueFirstBrewerDownIfNeeded(next);
    if (!next.pending && next.phase === "playing") {
      const nx = currentPlayer(next);
      if (nx) {
        log(next, `— ${nx.name}s tur —`);
        maybeCreateLevelUpOffer(next, nx, false);
      }
    }
    return { state: next, events: ["state"] };
  }

  if (next.phase === "playing" && next.pending?.type === "brewerDown") {
    return { state, events: [], error: "Väntar på att stupad bryggare väljer …" };
  }

  const cp = currentPlayer(next);
  if (!cp) return { state, events: [], error: "Ingen aktiv spelare" };

  if (
    action.type === "skipMonsterEncounter" &&
    next.pending?.type === "combat" &&
    (next.pending.phase === "enemyIntro" || next.pending.phase === "reactions")
  ) {
    const pending = next.pending;
    if (action.playerId !== pending.attackerId) return { state, events: [], error: "Endast angriparen kan välja" };
    if (action.playerId !== cp.id) return { state, events: [], error: "Inte din tur" };
    const p = next.players.find((x) => x.id === pending.attackerId);
    if (!p) return { state, events: [], error: "Player not found" };
    if (p.equipment.accessory?.canSkipMonsterEncounter !== true) {
      return { state, events: [], error: "Du kan inte undvika monsterstrider utan rätt accessoar" };
    }
    log(next, `${p.name} undviker monstermötet (${pending.enemyName}).`);
    next.pending = null;
    endTurnOrOfferLevelUp(next, p.id);
    return { state: next, events: ["state"] };
  }

  if (action.type === "combatIntroAck" && next.pending?.type === "combat" && next.pending.phase === "enemyIntro") {
    const pending = next.pending;
    if (action.playerId !== pending.attackerId) return { state, events: [], error: "Endast angriparen kan fortsätta" };
    if (action.playerId !== cp.id) return { state, events: [], error: "Inte din tur" };
    pending.phase = "reactions";
    pending.reactionsDeadlineAt = Date.now() + COMBAT_REACTION_TIMEOUT_MS;
    pending.teamRolls = {};
    const reactors = pending.reactors ?? [];
    if (reactors.length > 0) {
      log(next, `Strid: andra kan spela föremål innan slaget.`);
    }
    return { state: next, events: ["state"] };
  }

  if (action.type === "chooseCombatTeammate" && next.pending?.type === "combat" && next.pending.phase === "chooseTeammate") {
    const pending = next.pending;
    if (action.playerId !== pending.attackerId) return { state, events: [], error: "Only attacker can choose teammate" };
    if (action.playerId !== cp.id) return { state, events: [], error: "Inte din tur" };
    const teammate = next.players.find((x) => x.id === action.teammateId);
    if (!teammate) return { state, events: [], error: "Teammate not found" };
    if (teammate.id === pending.attackerId) return { state, events: [], error: "Du kan inte välja dig själv" };
    pending.assistId = teammate.id;
    pending.reactors = combatReactorsFor(next, pending.attackerId, teammate.id);
    pending.reacted = {};
    pending.phase = "enemyIntro";
    const attacker = next.players.find((x) => x.id === pending.attackerId);
    log(next, `${attacker?.name ?? "Angriparen"} väljer ${teammate.name} som medkämpe i team battle.`);
    return { state: next, events: ["state"] };
  }

  if (action.type === "combatReact" && next.pending?.type === "combat" && next.pending.phase === "reactions") {
    const pending = next.pending;
    if ((pending.reactionsDeadlineAt ?? 0) > 0 && Date.now() > (pending.reactionsDeadlineAt ?? 0)) {
      return { state, events: [], error: "Reaktionsfönstret har stängt" };
    }
    const reactorPl = next.players.find((x) => x.id === action.playerId);
    if (!reactorPl) return { state, events: [], error: "Spelaren hittades inte" };
    if (!playerCanCombatIntervene(reactorPl)) {
      return { state, events: [], error: "Du kan inte ingripa när du är ute ur spelet" };
    }
    if (!pending.reactors.includes(action.playerId)) {
      return { state, events: [], error: "Du kan inte reagera här" };
    }
    pending.reacted ??= {};
    if (action.choice === "pass") {
      if (pending.reacted[action.playerId] === "pass") {
        return { state, events: [], error: "Du har redan gjort inget" };
      }
      pending.reacted[action.playerId] = "pass";
      const p = next.players.find((x) => x.id === action.playerId);
      if (p) log(next, `${p.name} gör inget.`);
      return { state: next, events: ["state"] };
    }
    // "intervene": player may play one or many cards before choosing "gör inget".
    const p = next.players.find((x) => x.id === action.playerId);
    if (p) log(next, `${p.name} ingriper.`);
    return { state: next, events: ["state"] };
  }

  if (action.type === "useItem") {
    const user = next.players.find((p) => p.id === action.playerId);
    if (!user) return { state, events: [], error: "Spelaren hittades inte" };
    const inv = user.inventory ?? [];
    const idx = inv.findIndex((it) => it.instanceId === action.instanceId);
    if (idx < 0) return { state, events: [], error: "Föremålet hittades inte" };
    const inst = inv[idx]!;

    // Allow item usage on your turn, or during combat reactions.
    const inCombatReactions = next.pending?.type === "combat" && next.pending.phase === "reactions";
    const reactionDeadlineAt =
      inCombatReactions && next.pending?.type === "combat" ? (next.pending.reactionsDeadlineAt ?? 0) : 0;
    if (
      inCombatReactions &&
      reactionDeadlineAt > 0 &&
      Date.now() > reactionDeadlineAt
    ) {
      return { state, events: [], error: "Reaktionsfönstret har stängt" };
    }
    if (inCombatReactions && !playerCanCombatIntervene(user)) {
      return { state, events: [], error: "Du kan inte ingripa när du är ute ur spelet" };
    }
    const isYourTurn = cp.id === user.id;
    if (!isYourTurn && !inCombatReactions) {
      return { state, events: [], error: "Inte din tur" };
    }

    if (inst.itemId === "healing_potion") {
      const before = user.hp;
      user.hp = Math.min(user.maxHp, user.hp + 3);
      log(next, `${user.name} använder en helande brygd (+${user.hp - before} HP).`);
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "sleep_potion") {
      const target = action.targetPlayerId ? next.players.find((p) => p.id === action.targetPlayerId) : null;
      if (!target) return { state, events: [], error: "Mål krävs" };
      if (target.id === user.id) return { state, events: [], error: "Du kan inte välja dig själv" };
      target.skippedTurns = (target.skippedTurns ?? 0) + 1;
      log(next, `${user.name} använder sömnmedel på ${target.name} (hoppar över nästa tur).`);
      pushPlayerNotice(
        next,
        target.id,
        user.name,
        "Sömnmedel",
        `${user.name} spelade Sömnmedel på dig. Du hoppar över din nästa tur.`,
      );
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "sip_card") {
      const target = action.targetPlayerId ? next.players.find((p) => p.id === action.targetPlayerId) : null;
      if (!target) return { state, events: [], error: "Mål krävs" };
      if (target.id === user.id) return { state, events: [], error: "Du kan inte välja dig själv" };
      target.klunkar += 1;
      pushSipNotice(next, target.id, user.name);
      log(next, `${user.name} ger ${target.name} en straffklunk (+1 klunk).`);
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "weak_beer") {
      const pending = next.pending;
      if (!pending || pending.type !== "combat" || pending.phase !== "reactions") {
        return { state, events: [], error: "Kan bara användas under stridsreaktioner" };
      }
      const targetId = action.targetPlayerId ?? pending.attackerId;
      pending.attackMods ??= {};
      pending.attackMods[targetId] = (pending.attackMods[targetId] ?? 0) - 2;
      log(next, `${user.name} spelar Druckit för mycket: −2 attack i striden.`);
      // Mark this reactor as having acted (so attacker can roll once everyone either acted or passed).
      pending.reacted ??= {};
      if (pending.reactors?.includes(user.id) && !pending.reacted[user.id]) {
        pending.reacted[user.id] = "intervened";
      }
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "light_beer") {
      const pending = next.pending;
      if (!pending || pending.type !== "combat" || pending.phase !== "reactions") {
        return { state, events: [], error: "Kan bara användas under stridsreaktioner" };
      }
      const targetId = action.targetPlayerId ?? pending.attackerId;
      pending.attackMods ??= {};
      pending.attackMods[targetId] = (pending.attackMods[targetId] ?? 0) + 1;
      log(next, `${user.name} spelar Energidryck: +1 attack i striden.`);
      pending.reacted ??= {};
      if (pending.reactors?.includes(user.id) && !pending.reacted[user.id]) pending.reacted[user.id] = "intervened";
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "folk_beer") {
      const pending = next.pending;
      if (!pending || pending.type !== "combat" || pending.phase !== "reactions") {
        return { state, events: [], error: "Kan bara användas under stridsreaktioner" };
      }
      const targetId = action.targetPlayerId ?? pending.attackerId;
      pending.attackMods ??= {};
      pending.attackMods[targetId] = (pending.attackMods[targetId] ?? 0) + 2;
      log(next, `${user.name} spelar 8-bit beer: +2 attack i striden.`);
      pending.reacted ??= {};
      if (pending.reactors?.includes(user.id) && !pending.reacted[user.id]) pending.reacted[user.id] = "intervened";
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "tripwire") {
      const pending = next.pending;
      if (!pending || pending.type !== "combat" || pending.phase !== "reactions") {
        return { state, events: [], error: "Kan bara användas under stridsreaktioner" };
      }
      const targetId = action.targetPlayerId ?? pending.attackerId;
      pending.attackMods ??= {};
      pending.attackMods[targetId] = (pending.attackMods[targetId] ?? 0) - 1;
      log(next, `${user.name} spelar Halt golv: −1 attack i striden.`);
      pending.reacted ??= {};
      if (pending.reactors?.includes(user.id) && !pending.reacted[user.id]) pending.reacted[user.id] = "intervened";
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "double_hops") {
      const pending = next.pending;
      if (!pending || pending.type !== "combat" || pending.phase !== "reactions") {
        return { state, events: [], error: "Kan bara användas under stridsreaktioner" };
      }
      const targetId = action.targetPlayerId ?? pending.attackerId;
      pending.attackMods ??= {};
      pending.attackMods[targetId] = (pending.attackMods[targetId] ?? 0) + 2;
      log(next, `${user.name} spelar En hjälpande hand: +2 attack i striden.`);
      pending.reacted ??= {};
      if (pending.reactors?.includes(user.id) && !pending.reacted[user.id]) {
        pending.reacted[user.id] = "intervened";
      }
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "beer_bomb") {
      const pending = next.pending;
      if (!pending || pending.type !== "combat" || pending.phase !== "reactions") {
        return { state, events: [], error: "Kan bara användas under stridsreaktioner" };
      }
      const targetId = action.targetPlayerId ?? pending.attackerId;
      pending.attackMods ??= {};
      pending.attackMods[targetId] = (pending.attackMods[targetId] ?? 0) + 3;
      log(next, `${user.name} spelar Ölbomb: +3 attack i striden.`);
      pending.reacted ??= {};
      if (pending.reactors?.includes(user.id) && !pending.reacted[user.id]) pending.reacted[user.id] = "intervened";
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "beard_back") {
      const inCombatReaction =
        next.pending?.type === "combat" &&
        next.pending.phase === "reactions" &&
        (next.pending.attackerId === user.id || next.pending.assistId === user.id);
      const inPvpRollWindow =
        next.pending?.type === "pvp" &&
        next.pending.phase === "awaitingRolls" &&
        (next.pending.attackerId === user.id || next.pending.defenderId === user.id);
      if (!inCombatReaction && !inPvpRollWindow) {
        return { state, events: [], error: "Kan bara användas när du ska slå i strid" };
      }
      user.nextCombatAttackDiceDouble = true;
      log(next, `${user.name} använder Skägget rakt bak: nästa stridsslag räknas dubbelt.`);
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "hangover") {
      const pending = next.pending;
      if (!pending || pending.type !== "combat" || pending.phase !== "reactions") {
        return { state, events: [], error: "Kan bara användas under stridsreaktioner" };
      }
      const targetId = action.targetPlayerId ?? pending.attackerId;
      pending.attackMods ??= {};
      pending.attackMods[targetId] = (pending.attackMods[targetId] ?? 0) - 3;
      log(next, `${user.name} spelar Baksmälla: −3 attack i striden.`);
      pending.reacted ??= {};
      if (pending.reactors?.includes(user.id) && !pending.reacted[user.id]) pending.reacted[user.id] = "intervened";
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "pretzel_snack") {
      const before = user.hp;
      user.hp = Math.min(user.maxHp, user.hp + 2);
      log(next, `${user.name} äter en pretzel (+${user.hp - before} HP).`);
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "coin_purse") {
      user.gold += 4;
      log(next, `${user.name} använder en pantpåse (+4 pant).`);
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "monster_hype") {
      const pending = next.pending;
      if (!pending || pending.type !== "combat" || pending.phase !== "reactions") {
        return { state, events: [], error: "Kan bara användas under stridsreaktioner" };
      }
      pending.needMod = (pending.needMod ?? 0) + 2;
      log(next, `${user.name} hajpar fienden: +2 styrka.`);
      pending.reacted ??= {};
      if (pending.reactors?.includes(user.id) && !pending.reacted[user.id]) pending.reacted[user.id] = "intervened";
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "yeast_sabotage") {
      const pending = next.pending;
      if (!pending || pending.type !== "combat" || pending.phase !== "reactions") {
        return { state, events: [], error: "Kan bara användas under stridsreaktioner" };
      }
      pending.needMod = (pending.needMod ?? 0) - 2;
      log(next, `${user.name} saboterar monstret: −2 styrka.`);
      pending.reacted ??= {};
      if (pending.reactors?.includes(user.id) && !pending.reacted[user.id]) pending.reacted[user.id] = "intervened";
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "beer_bro") {
      const pending = next.pending;
      if (!pending || pending.type !== "combat" || pending.phase !== "reactions") {
        return { state, events: [], error: "Kan bara användas under stridsreaktioner" };
      }
      if (pending.assistId) return { state, events: [], error: "En Ölkompis hjälper redan" };
      const broId = action.targetPlayerId;
      if (!broId || broId === pending.attackerId) {
        return { state, events: [], error: "Välj en annan spelare som Ölkompis" };
      }
      const bro = next.players.find((x) => x.id === broId) ?? null;
      if (!bro) return { state, events: [], error: "Spelaren finns inte" };
      pending.assistId = broId;
      log(next, `${user.name} drar med ${bro.name} som Ölkompis i striden!`);
      pending.reactors = combatReactorsFor(next, pending.attackerId, bro.id);
      const reacted = { ...(pending.reacted ?? {}) };
      for (const rid of Object.keys(reacted)) {
        if (!pending.reactors.includes(rid)) delete reacted[rid];
      }
      pending.reacted = reacted;
      if (pending.reactors?.includes(user.id) && !pending.reacted[user.id]) pending.reacted[user.id] = "intervened";
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      return { state: next, events: ["state"] };
    }


    if (inst.itemId === "split_the_g") {
      const target = action.targetPlayerId ? next.players.find((p) => p.id === action.targetPlayerId) : null;
      if (!target) return { state, events: [], error: "Mål krävs" };
      if (target.id === user.id) return { state, events: [], error: "Du kan inte välja dig själv" };
      if (target.equipment.accessory?.preventTheft) {
        return { state, events: [], error: `${target.name} kan inte bli bestulen.` };
      }
      const steal = Math.floor((target.gold ?? 0) / 2);
      target.gold -= steal;
      user.gold += steal;
      log(next, `${user.name} spelar Split the G och tar ${steal} pant från ${target.name}.`);
      pushPlayerNotice(
        next,
        target.id,
        user.name,
        "Split the G",
        `${user.name} tog ${steal} pant från dig med Split the G.`,
      );
      inv.splice(idx, 1);
      user.inventory = inv;
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "lengraddad") {
      const target = action.targetPlayerId ? next.players.find((p) => p.id === action.targetPlayerId) : null;
      if (!target) return { state, events: [], error: "Mål krävs" };
      if (target.id === user.id) return { state, events: [], error: "Du kan inte välja dig själv" };
      target.nextCombatModifier = (target.nextCombatModifier ?? 0) - 2;
      log(next, `${user.name} spelar Lengräddad på ${target.name}: nästa strid −2 i attack.`);
      pushPlayerNotice(
        next,
        target.id,
        user.name,
        "Lengräddad",
        `${user.name} spelade Lengräddad på dig. Din nästa strid får −2 attack.`,
      );
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "not_my_round") {
      const target = action.targetPlayerId ? next.players.find((p) => p.id === action.targetPlayerId) : null;
      if (!target) return { state, events: [], error: "Mål krävs" };
      if (target.id === user.id) return { state, events: [], error: "Du kan inte välja dig själv" };
      if (target.equipment.accessory?.preventTheft) {
        return { state, events: [], error: `${target.name} kan inte bli bestulen.` };
      }
      if ((target.inventory ?? []).length > 0) {
        const ti = Math.floor(rng() * target.inventory.length);
        const stolen = target.inventory.splice(ti, 1)[0]!;
        user.inventory ??= [];
        user.inventory.push(stolen);
        log(next, `${user.name} stjäl ${itemDisplayTitle(stolen.itemId)} från ${target.name}.`);
        pushPlayerNotice(
          next,
          target.id,
          user.name,
          "En enkel stöld",
          `${user.name} stal ${itemDisplayTitle(stolen.itemId)} från dig.`,
        );
      } else {
        const slot = randomEquippedSlot(target, rng);
        if (!slot) return { state, events: [], error: "Målet har inget att stjäla" };
        const piece = target.equipment[slot]!;
        target.equipment[slot] = undefined as any;
        if (slot === "armor") {
          target.maxHp = maxHpFor(target);
          if (target.hp > target.maxHp) target.hp = target.maxHp;
          user.equipment.armor = { ...(piece as any) };
          user.maxHp = maxHpFor(user);
          if (user.hp > user.maxHp) user.hp = user.maxHp;
        } else if (slot === "weapon") {
          user.equipment.weapon = { ...(piece as any) };
        } else if (slot === "helmet") {
          user.equipment.helmet = { ...(piece as any) };
        } else {
          user.equipment.accessory = { ...(piece as any) };
        }
        log(next, `${user.name} stjäl ${piece.name ?? slot} (${slot}) från ${target.name}.`);
        pushPlayerNotice(
          next,
          target.id,
          user.name,
          "En enkel stöld",
          `${user.name} stal ${piece.name ?? slot} från dig.`,
        );
      }
      inv.splice(idx, 1);
      user.inventory = inv;
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "spill_intentional") {
      const target = action.targetPlayerId ? next.players.find((p) => p.id === action.targetPlayerId) : null;
      if (!target) return { state, events: [], error: "Mål krävs" };
      if (target.id === user.id) return { state, events: [], error: "Du kan inte välja dig själv" };
      if ((target.inventory ?? []).length > 0) {
        const ti = Math.floor(rng() * target.inventory.length);
        const ruined = target.inventory.splice(ti, 1)[0]!;
        log(next, `${user.name} spiller med flit och förstör ${itemDisplayTitle(ruined.itemId)} hos ${target.name}.`);
        pushPlayerNotice(
          next,
          target.id,
          user.name,
          "Spilla med flit",
          `${user.name} förstörde ${itemDisplayTitle(ruined.itemId)} hos dig.`,
        );
      } else {
        const slot = randomEquippedSlot(target, rng);
        if (!slot) return { state, events: [], error: "Målet har inget att förstöra" };
        const piece = target.equipment[slot]!;
        target.equipment[slot] = undefined as any;
        if (slot === "armor") {
          target.maxHp = maxHpFor(target);
          if (target.hp > target.maxHp) target.hp = target.maxHp;
        }
        log(next, `${user.name} spiller med flit och förstör ${piece.name ?? slot} hos ${target.name}.`);
        pushPlayerNotice(
          next,
          target.id,
          user.name,
          "Spilla med flit",
          `${user.name} förstörde ${piece.name ?? slot} hos dig.`,
        );
      }
      inv.splice(idx, 1);
      user.inventory = inv;
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "early_night") {
      const pending = next.pending;
      if (!pending || pending.type !== "combat" || (pending.phase !== "enemyIntro" && pending.phase !== "reactions")) {
        return { state, events: [], error: "Kan bara användas under ett pågående monstermöte" };
      }
      if (pending.attackerId !== user.id) return { state, events: [], error: "Endast angriparen kan skippa mötet" };
      log(next, `${user.name} spelar Vaska direkt och skippar monstret.`);
      inv.splice(idx, 1);
      user.inventory = inv;
      next.pending = null;
      endTurnOrOfferLevelUp(next, user.id);
      return { state: next, events: ["state"] };
    }

    return { state, events: [], error: "Okänt föremål" };
  }

  if (action.type === "combatRoll" && next.pending?.type === "combat" && next.pending.phase === "reactions") {
    const pending = next.pending;
    const assistId = pending.assistId;
    const needsAssistRoll = !!assistId;
    const canRollForTeam =
      action.playerId === pending.attackerId || (needsAssistRoll && action.playerId === assistId);
    if (!canRollForTeam) return { state, events: [], error: "Du är inte med i den här striden" };
    if (action.playerId !== cp.id && !(needsAssistRoll && action.playerId === assistId)) {
      return { state, events: [], error: "Inte din tur" };
    }
    // If there are eligible reactors, wait until everyone has either passed or slutfört ingripande (kort).
    const reactors = pending.reactors ?? [];
    const reacted = pending.reacted ?? {};
    const allDone = combatReactionsAllAnswered(reactors, reacted);
    const reactionsTimedOut =
      (pending.reactionsDeadlineAt ?? 0) > 0 && Date.now() > (pending.reactionsDeadlineAt ?? 0);
    if (reactors.length > 0 && !allDone && !reactionsTimedOut) {
      return { state, events: [], error: "Väntar på att alla reaktioner är klara (ingrip eller gör inget)." };
    }
    if (reactors.length > 0 && !allDone && reactionsTimedOut) {
      log(next, "Reaktionsfönstret tog slut — striden fortsätter.");
    }
    const tile = next.levels[pending.levelIndex]?.tiles?.[pending.tileIndex];
    if (!tile || (tile.type !== "combat" && tile.type !== "boss")) {
      next.pending = null;
      return { state: next, events: ["state"] };
    }

    const roller = next.players.find((x) => x.id === action.playerId);
    if (!roller) return { state, events: [], error: "Player not found" };
    const tempMod = roller.nextCombatModifier ?? 0;
    roller.nextCombatModifier = 0;
    const mod = (pending.attackMods?.[roller.id] ?? 0) + tempMod;
    const rawDie = rollDie(rng, 6);
    const attackDoubled = roller.nextCombatAttackDiceDouble === true;
    if (attackDoubled) {
      roller.nextCombatAttackDiceDouble = false;
    }
    const dieContribution = attackDoubled ? rawDie * 2 : rawDie;
    let sipBoost = 0;
    const sipBonus = roller.equipment.weapon?.sipAttackBonus ?? 0;
    if (sipBonus > 0) {
      if (typeof action.useSipWeaponBonus !== "boolean") {
        return {
          state,
          events: [],
          error: "Välj om du vill ta en straffklunk för extra vapenstyrka innan du slår.",
        };
      }
      if (action.useSipWeaponBonus) {
        roller.klunkar += 1;
        sipBoost = sipBonus;
        log(
          next,
          `${roller.name} tar en straffklunk med ${roller.equipment.weapon?.name ?? "vapnet"}: +${sipBonus} attack.`,
        );
      }
    }
    const total = dieContribution + weaponPower(roller) + mod + sipBoost;

    pending.teamRolls ??= {};
    if (pending.teamRolls[action.playerId]) return { state, events: [], error: "Du har redan slagit" };
    pending.teamRolls[action.playerId] = {
      die: rawDie,
      total,
      attackDiceDoubled: attackDoubled || undefined,
    };

    if (needsAssistRoll) {
      const aRoll = pending.teamRolls[pending.attackerId];
      const bRoll = assistId ? pending.teamRolls[assistId] : undefined;
      if (!aRoll || !bRoll) {
        return { state: next, events: ["state"] };
      }
    }

    const attackerRoll = pending.teamRolls[pending.attackerId]!;
    const assistRollObj = assistId ? pending.teamRolls[assistId] : undefined;
    const prBase = attackerRoll.total;
    const assistRoll = assistRollObj?.total ?? null;
    const previewBroDie = assistRollObj?.die ?? null;
    const pr = prBase + (assistRoll ?? 0);
    const need = pending.need + (pending.needMod ?? 0);
    /** Kritisk miss: spelarnas t6 får inte vara 1 — då förlorar de oavsett total mot styrka. */
    const critFailOnOne =
      attackerRoll.die === 1 || (previewBroDie !== null && previewBroDie === 1);

    // Per-strid bonus (accessoarer): tillämpas exakt en gång när striden låser till preview.
    applyPerCombatAccessoryRewards(next, pending.attackerId);
    if (assistId) applyPerCombatAccessoryRewards(next, assistId);

    next.pending = {
      type: "combat",
      phase: "rollPreview",
      attackerId: pending.attackerId,
      levelIndex: pending.levelIndex,
      tileIndex: pending.tileIndex,
      monsterId: pending.monsterId,
      enemyName: pending.enemyName,
      need: pending.need,
      needMod: pending.needMod,
      baseDamage: pending.baseDamage,
      lossSipsOnLose: pending.lossSipsOnLose,
      attackMods: pending.attackMods,
      teamBattleRequired: pending.teamBattleRequired,
      teamBattleBonusGold: pending.teamBattleBonusGold,
      rewardGold: pending.rewardGold,
      rewardItems: pending.rewardItems,
      assistId: pending.assistId,
      teamRolls: undefined,
      reactors: [],
      reacted: {},
      reactionsDeadlineAt: undefined,
      enemyArtKey: pending.enemyArtKey,
      enemyIntroText: pending.enemyIntroText,
      previewDie: attackerRoll.die,
      previewAttackDiceDoubled: attackerRoll.attackDiceDoubled || undefined,
      previewBroDie,
      previewBroAttackDiceDoubled: assistRollObj?.attackDiceDoubled || undefined,
      previewPrBase: prBase,
      previewAssistRoll: assistRoll,
      previewTotal: pr,
      previewNeed: need,
      previewWon: !critFailOnOne && pr >= need,
    };

    return { state: next, events: ["state"] };
  }

  if (action.type === "combatRollAck" && next.pending?.type === "combat" && next.pending.phase === "rollPreview") {
    const pending = next.pending;
    if (action.playerId !== pending.attackerId) return { state, events: [], error: "Only attacker can continue" };
    if (action.playerId !== cp.id) return { state, events: [], error: "Inte din tur" };
    finalizeCombatAfterRollPreview(
      next,
      pending as Extract<Pending, { type: "combat" }> & { phase: "rollPreview" },
      rng,
    );
    return { state: next, events: ["state"] };
  }

  if (
    action.type === "chooseCombatHitMitigation" &&
    next.pending?.type === "combat" &&
    next.pending.phase === "chooseHitMitigation"
  ) {
    const pending = next.pending;
    if (action.playerId !== pending.attackerId) return { state, events: [], error: "Only attacker can choose" };
    if (action.playerId !== cp.id) return { state, events: [], error: "Inte din tur" };
    if (action.choice !== "sip" && action.choice !== "no_sip") return { state, events: [], error: "Ogiltigt val" };
    const p = next.players.find((x) => x.id === pending.attackerId);
    const tile = next.levels[pending.levelIndex]?.tiles?.[pending.tileIndex];
    if (!p || !tile || (tile.type !== "combat" && tile.type !== "boss")) {
      next.pending = null;
      return { state: next, events: ["state"] };
    }
    const sipMitigation = action.choice === "sip";
    log(
      next,
      sipMitigation
        ? `${p.name} drinks to soften ${pending.enemyName}'s hit.`
        : `${p.name} takes the full force of ${pending.enemyName}'s attack (no sip).`,
    );
    next.pending = null;
    const critFailOnOneMit =
      (pending.previewDie ?? 1) === 1 ||
      (pending.previewBroDie != null && pending.previewBroDie === 1);
    applyCombatLoss(
      next,
      {
        p,
        tile,
        monsterId: pending.monsterId as MonsterId,
        die: pending.previewDie ?? 1,
        pr: pending.previewTotal ?? 0,
        need: pending.previewNeed ?? 0,
        assistRoll: pending.previewAssistRoll ?? null,
        assistId: pending.assistId,
        teamBattleRequired: pending.teamBattleRequired,
        enemyName: pending.enemyName,
        sipMitigation,
        critFailOnOne: critFailOnOneMit,
      },
      log,
      rng,
    );
    return { state: next, events: ["state"] };
  }

  if (action.type === "chooseMove" && next.pending?.type === "moveChoice") {
    const pending = next.pending;
    if (action.playerId !== pending.playerId) {
      return { state, events: [], error: "Inte ditt val" };
    }
    if (action.playerId !== cp.id) {
      return { state, events: [], error: "Inte din tur" };
    }
    const opt = pending.options.find((o) => o.dir === action.dir);
    if (!opt) return { state, events: [], error: "Ogiltigt val" };

    const p = next.players.find((x) => x.id === action.playerId);
    if (!p) return { state, events: [], error: "Player not found" };

    p.levelIndex = opt.target.levelIndex;
    p.tileIndex = opt.target.tileIndex;
    log(next, `${p.name} moves ${action.dir === "cw" ? "right" : "left"} to tile ${p.tileIndex + 1}.`);
    next.pending = null;

    resolveLanding(next, p, rng);
    if (!next.pending && next.phase === "playing") endTurnOrOfferLevelUp(next, p.id);
    return { state: next, events: ["state"] };
  }

  if (action.type === "confirmCard" && next.pending?.type === "card") {
    const pending = next.pending;
    if (action.playerId !== pending.playerId) {
      return { state, events: [], error: "Inte ditt kort" };
    }
    if (pending.choices && pending.choices.length > 0) {
      return { state, events: [], error: "Välj ett alternativ först" };
    }
    const handled = handleCardConfirm({ state: next, pending, rng, log });
    if (handled.handled) {
      next.pending = handled.startCombat ?? null;
      if (!next.pending && next.phase === "playing") {
        queueFirstBrewerDownIfNeeded(next);
        if (!next.pending) endTurnOrOfferLevelUp(next, pending.playerId);
      }
      return { state: next, events: ["state"] };
    }
    next.pending = null;
    if (next.phase === "playing") {
      queueFirstBrewerDownIfNeeded(next);
      if (!next.pending) endTurnOrOfferLevelUp(next, pending.playerId);
    }
    return { state: next, events: ["state"] };
  }

  if (action.type === "chooseCardOption" && next.pending?.type === "card") {
    const pending = next.pending;
    if (action.playerId !== pending.playerId) {
      return { state, events: [], error: "Inte ditt kort" };
    }
    const p = next.players.find((x) => x.id === action.playerId);
    if (!p) return { state, events: [], error: "Player not found" };
    const optRes = handleCardOption({ state: next, player: p, pending, choiceId: action.choiceId, rng, log });
    if (optRes.handled) {
      if (optRes.error) return { state, events: [], error: optRes.error };
      if (optRes.startCombat) {
        next.pending = optRes.startCombat;
        return { state: next, events: ["state"] };
      }
      if (optRes.completeCard) {
        next.pending = null;
        if (next.phase === "playing") {
          queueFirstBrewerDownIfNeeded(next);
          if (!next.pending) endTurnOrOfferLevelUp(next, pending.playerId);
        }
        return { state: next, events: ["state"] };
      }
      return { state: next, events: ["state"] };
    }
    const def = getCard(pending.cardId);
    const choice = def.choices?.find((c) => c.id === action.choiceId);
    if (!choice) return { state, events: [], error: "Ogiltigt val" };

    const beforeHp = p.hp;
    const beforeGold = p.gold;
    const beforeKlunk = p.klunkar;
    const effectOutFallback: EffectApplyOut = {};
    applyEffects({ state: next, player: p, effects: choice.effects ?? [], rng, out: effectOutFallback });
    log(next, `${p.name} chooses: ${choice.label}.`);

    // Uppdatera korttexten med resultat, och vänta på bekräftelse.
    next.pending = {
      ...pending,
      choices: undefined,
      artKey: artKeyForGrantedItem(effectOutFallback, pending.artKey) ?? pending.artKey,
      grantedItemId: effectOutFallback.grantedItemId ?? pending.grantedItemId,
      text:
        `${def.text}\nChoice: ${choice.label}` +
        appendTextForGrantedItem(effectOutFallback) +
        formatSelfStatDeltas(beforeGold, p.gold, beforeHp, p.hp, beforeKlunk, p.klunkar),
    };
    return { state: next, events: ["state"] };
  }

  if (action.type === "chooseEncounter" && next.pending?.type === "encounterChoice") {
    const pending = next.pending;
    if (pending.phase !== "choosePvpOrTile") {
      return { state, events: [], error: "Ogiltigt mötesläge" };
    }
    if (action.playerId !== pending.moverId) {
      return { state, events: [], error: "Only the active player can choose" };
    }
    const mover = next.players.find((p) => p.id === pending.moverId);
    if (!mover) return { state, events: [], error: "Player not found" };

    if (action.choice === "tile") {
      log(next, `${mover.name} väljer att lösa rutan (ingen BvB).`);
      next.pending = null;
      resolveTileLanding(next, mover, rng);
      if (!next.pending && next.phase === "playing") endTurnOrOfferLevelUp(next, mover.id);
      return { state: next, events: ["state"] };
    }

    if (action.choice !== "pvp") {
      return { state, events: [], error: "Ogiltigt mötesval" };
    }

    const eligibleOpponentIds = pending.opponentIds.filter((oppId) => {
      const opp = next.players.find((p) => p.id === oppId);
      return !!opp && canChallengeInPvp(opp);
    });
    if (eligibleOpponentIds.length === 0) {
      return { state, events: [], error: "Ingen giltig motståndare för BvB på rutan" };
    }
    if (pending.opponentIds.length === 0) {
      return { state, events: [], error: "Ingen motståndare på rutan" };
    }

    if (eligibleOpponentIds.length === 1) {
      const oppId = eligibleOpponentIds[0]!;
      const opp = next.players.find((p) => p.id === oppId);
      if (!opp) return { state, events: [], error: "Opponent not found" };
      log(next, `${mover.name} utmanar ${opp.name} till BvB!`);
      next.pending = {
        type: "pvp",
        attackerId: mover.id,
        defenderId: opp.id,
        pvpRound: 1,
        phase: "awaitingRolls",
        rolls: {},
      };
      return { state: next, events: ["state"] };
    }

    next.pending = { ...pending, phase: "choosePvpOpponent", opponentIds: eligibleOpponentIds };
    log(next, `${mover.name} väljer BvB — välj motståndare.`);
    return { state: next, events: ["state"] };
  }

  if (action.type === "choosePvpOpponent" && next.pending?.type === "encounterChoice") {
    const pending = next.pending;
    if (pending.phase !== "choosePvpOpponent") {
      return { state, events: [], error: "Välj BvB i mötesmenyn först" };
    }
    if (action.playerId !== pending.moverId) {
      return { state, events: [], error: "Only the active player can choose" };
    }
    if (!pending.opponentIds.includes(action.opponentId)) {
      return { state, events: [], error: "Ogiltig motståndare" };
    }
    const mover = next.players.find((p) => p.id === pending.moverId);
    const opp = next.players.find((p) => p.id === action.opponentId);
    if (!mover || !opp) return { state, events: [], error: "Spelare hittades inte" };

    if (!canChallengeInPvp(opp)) {
      return { state, events: [], error: `${opp.name} kan inte utmanas till BvB just nu` };
    }
    log(next, `${mover.name} utmanar ${opp.name} till BvB!`);
    next.pending = {
      type: "pvp",
      attackerId: mover.id,
      defenderId: opp.id,
      pvpRound: 1,
      phase: "awaitingRolls",
      rolls: {},
    };
    return { state: next, events: ["state"] };
  }

  if (action.type === "pvpRoll" && next.pending?.type === "pvp" && next.pending.phase === "awaitingRolls") {
    const pending = next.pending;
    const isParticipant = action.playerId === pending.attackerId || action.playerId === pending.defenderId;
    if (!isParticipant) return { state, events: [], error: "You are not part of this PvP" };
    pending.rolls ??= {};
    if (pending.rolls[action.playerId]) return { state, events: [], error: "You already rolled" };

    const p = next.players.find((x) => x.id === action.playerId);
    if (!p) return { state, events: [], error: "Player not found" };
    const rawDie = rollDie(rng, 6);
    const attackDoubled = p.nextCombatAttackDiceDouble === true;
    if (attackDoubled) {
      p.nextCombatAttackDiceDouble = false;
    }
    const dieContribution = attackDoubled ? rawDie * 2 : rawDie;
    const pvpWeaponExtra = p.equipment.weapon?.pvpDieBonus ?? 0;
    const total = dieContribution + weaponPower(p) + pvpWeaponExtra;
    pending.rolls[action.playerId] = { die: rawDie, total };
    log(
      next,
      `${p.name} rolls for PvP: ${rawDie}${attackDoubled ? ` (dubblat till ${dieContribution} i total)` : ""} (total ${total}).`,
    );

    const a = pending.rolls[pending.attackerId];
    const d = pending.rolls[pending.defenderId];
    if (a && d) {
      const ar = a.total;
      const dr = d.total;
      if (ar === dr) {
        const nextRound = (pending.pvpRound ?? 1) + 1;
        pending.pvpRound = nextRound;
        pending.rolls = {};
        log(
          next,
          `PvP: Lika (${ar})! Slå om — rond ${nextRound}.`,
        );
        return { state: next, events: ["state"] };
      }
      const attacker = next.players.find((x) => x.id === pending.attackerId)!;
      const defender = next.players.find((x) => x.id === pending.defenderId)!;
      const attackerWins = ar >= dr;
      const winner = attackerWins ? attacker : defender;
      const loser = attackerWins ? defender : attacker;
      const pvpWeaponBonusGold = applyWeaponWinGoldBonus(winner);
      const pvpWeaponRandomDamage = applyWeaponWinRandomDamage({ state: next, winner, rng, log });
      pending.winnerId = winner.id;
      pending.loserId = loser.id;
      pending.phase = "chooseLoot";
      pending.resolvedTotals = { attackerTotal: ar, defenderTotal: dr };
      log(next, `PvP: ${attacker.name} (${ar}) vs ${defender.name} (${dr}) — ${winner.name} vinner!`);
      if (pvpWeaponBonusGold > 0) {
        log(
          next,
          `${winner.name} får +${pvpWeaponBonusGold} pant från ${winner.equipment.weapon?.name ?? "vapnet"} efter vinsten.`,
        );
      }
      if (pvpWeaponRandomDamage) {
        log(
          next,
          `${winner.name}s ${winner.equipment.weapon?.name ?? "vapen"} träffar slumpmässigt: ${pvpWeaponRandomDamage.targetName} tar ${pvpWeaponRandomDamage.damage} skada.`,
        );
      }
    }

    return { state: next, events: ["state"] };
  }

  if (action.type === "merchantBuy" && next.pending?.type === "merchant") {
    if (action.playerId !== next.pending.playerId) {
      return { state, events: [], error: "Inte du som är vid Panta burkar" };
    }
    const p = next.players.find((x) => x.id === action.playerId);
    if (!p) return { state, events: [], error: "Player not found" };
    if (action.itemId === null) {
      log(next, `${p.name} lämnar Panta burkar.`);
      next.pending = null;
      endTurnOrOfferLevelUp(next, p.id);
      return { state: next, events: ["state"] };
    }
    const item = next.pending.items.find((i) => i.id === action.itemId);
    if (!item) return { state, events: [], error: "Ogiltigt föremål" };
    if (p.gold < item.price) return { state, events: [], error: "För lite pant" };
    p.gold -= item.price;
    if (item.slot === "weapon") {
      p.equipment.weapon = {
        name: item.name,
        power: item.power ?? 1,
        sipAttackBonus: item.sipAttackBonus,
        pvpDieBonus: item.pvpDieBonus,
        gainGoldOnWin: item.gainGoldOnWin,
        powerAtGold10: item.powerAtGold10,
        powerAtGold20: item.powerAtGold20,
        powerAtGold30: item.powerAtGold30,
        powerDynamicMax: item.powerDynamicMax,
        randomOtherDamageOnWin: item.randomOtherDamageOnWin,
      };
    } else if (item.slot === "armor") {
      p.equipment.armor = {
        name: item.name,
        bonusHp: item.bonusHp ?? 0,
        damageNegate: item.damageNegate,
        bossDamageNegateBonus: item.bossDamageNegateBonus,
        negateAllOnce: item.negateAllOnce,
        pvpCannotBeChallenged: item.pvpCannotBeChallenged,
        gainGoldOnDamageTaken: item.gainGoldOnDamageTaken,
      };
      p.maxHp = maxHpFor(p);
      p.hp = Math.min(p.hp + 2, p.maxHp);
    } else if (item.slot === "helmet") {
      p.equipment.helmet = {
        name: item.name,
        combatBonus: item.combatBonus ?? 0,
        damageNegate: item.damageNegate,
        bossDamageNegateBonus: item.bossDamageNegateBonus,
        negateAllOnce: item.negateAllOnce,
        penaltySipExtra: item.penaltySipExtra,
        klunkAttackBonus10: item.klunkAttackBonus10,
        klunkAttackBonus20: item.klunkAttackBonus20,
        klunkAttackBonusMax: item.klunkAttackBonusMax,
      };
    } else if (item.slot === "accessory") {
      p.equipment.accessory = {
        name: item.name,
        damageNegate: item.damageNegate,
        combatBonus: item.combatBonus,
        moveBonus: item.moveBonus,
        gainGoldPerCombat: item.gainGoldPerCombat,
        gainKlunkPerCombat: item.gainKlunkPerCombat,
        preventTheft: item.preventTheft,
        levelUpDiscountGold: item.levelUpDiscountGold,
        canSkipMonsterEncounter: item.canSkipMonsterEncounter,
      };
    } else if (item.slot === "heal") {
      p.hp = Math.min(p.maxHp, p.hp + (item.healAmount ?? 4));
    } else if (item.slot === "gold") {
      p.gold += item.goldAmount ?? 0;
    }
    log(next, `${p.name} buys ${item.name} (${item.price}g).`);
    // Keep merchant open so player can buy multiple things before leaving explicitly.
    return { state: next, events: ["state"] };
  }

  if (action.type === "useDoor" && next.pending?.type === "door") {
    if (action.playerId !== next.pending.playerId) {
      return { state, events: [], error: "Inte din tur att välja nivå" };
    }
    const p = next.players.find((x) => x.id === action.playerId);
    if (!p) return { state, events: [], error: "Player not found" };
    const costs = next.pending.costs;
    if (action.method === "gold") {
      if (p.gold < costs.gold) return { state, events: [], error: "För lite pant" };
      p.gold -= costs.gold;
      p.levelIndex = next.pending.targetLevelIndex;
      p.tileIndex = 0;
      log(next, `${p.name} betalar ${costs.gold} pant och stiger till nivå ${p.levelIndex + 1} som bryggmästare.`);
    } else if (action.method === "sips") {
      if (!canAscendByKlunkRequirement(p, next.pending.targetLevelIndex)) {
        return { state, events: [], error: "För få klunkar / för låg bryggnivå" };
      }
      // Requirement-based: does not consume sips.
      p.levelIndex = next.pending.targetLevelIndex;
      p.tileIndex = 0;
      log(next, `${p.name} har ${p.klunkar} klunkar och stiger till nivå ${p.levelIndex + 1} som bryggmästare.`);
    } else {
      log(next, `${p.name} stannar.`);
    }
    if (action.method === "gold" || action.method === "sips") {
      logMonsterScaleAfterAscend(next, p);
    }
    next.pending = null;
    endTurnOrOfferLevelUp(next, p.id);
    return { state: next, events: ["state"] };
  }

  if (action.type === "levelUpDecision" && next.pending?.type === "levelUpOffer") {
    const pending = next.pending;
    if (action.playerId !== pending.playerId) {
      return { state, events: [], error: "Inte du som väljer nivåuppstigning" };
    }
    const p = next.players.find((x) => x.id === action.playerId);
    if (!p) return { state, events: [], error: "Player not found" };
    if (action.choice === "stay") {
      log(next, `${p.name} stannar kvar och kan gå upp via nivå-rutan senare.`);
      next.pending = null;
      if (pending.deferTurnAdvance) advanceTurn(next);
      return { state: next, events: ["state"] };
    }
    const costs = pending.costs;
    const canBySips = canAscendByKlunkRequirement(p, pending.targetLevelIndex);
    const canByGold = p.gold >= costs.gold;
    if (!canBySips && !canByGold) {
      return { state, events: [], error: "Du uppfyller inte längre kraven för nivå upp" };
    }
    if (canBySips) {
      // Requirement-based path: klunkar förbrukas inte.
      p.levelIndex = pending.targetLevelIndex;
      p.tileIndex = 0;
      log(next, `${p.name} använder sin bryggarerfarenhet och stiger till nivå ${p.levelIndex + 1}.`);
    } else {
      p.gold -= costs.gold;
      p.levelIndex = pending.targetLevelIndex;
      p.tileIndex = 0;
      log(
        next,
        `${p.name} använder sin bryggarerfarenhet och ${costs.gold} pant för att stiga till nivå ${p.levelIndex + 1}.`,
      );
    }
    logMonsterScaleAfterAscend(next, p);
    next.pending = null;
    advanceTurn(next);
    return { state: next, events: ["state"] };
  }

  if (action.type === "pvpLootChoice" && next.pending?.type === "pvp" && next.pending.phase === "chooseLoot") {
    const pending = next.pending;
    if (action.playerId !== pending.winnerId) {
      return { state, events: [], error: "Only the winner can choose loot" };
    }
    const winner = next.players.find((x) => x.id === pending.winnerId);
    const loser = next.players.find((x) => x.id === pending.loserId);
    if (!winner || !loser) return { state, events: [], error: "Player not found" };
    const theftBlocked = loser.equipment.accessory?.preventTheft === true;
    if (action.choice === "gold") {
      if (theftBlocked) {
        log(next, `${winner.name} kan inte stjäla från ${loser.name}.`);
      } else {
      const steal = Math.min(5, loser.gold);
      loser.gold -= steal;
      winner.gold += steal;
      log(next, `${winner.name} tar ${steal} pant från ${loser.name}.`);
      pushPlayerNotice(
        next,
        loser.id,
        winner.name,
        "Du förlorade duellen",
        `${winner.name} tog ${steal} pant från dig efter duellen.`,
        "duel_loss",
      );
      }
    } else if (action.choice === "sip") {
      const gain = penaltySipTotalForPlayer(loser, 1);
      loser.klunkar += gain;
      pushSipNotice(next, loser.id, winner.name, gain);
      log(next, `${winner.name} ger ${loser.name} en straffklunk (+1 klunk).`);
    } else if (action.choice === "damage") {
      const beforeHp = loser.hp;
      applyDamage({ state: next, player: loser, amount: 2, source: "pvp", log });
      log(next, `${winner.name} ger ${loser.name} 2 skada i PvP (HP ${beforeHp} → ${loser.hp}).`);
      pushPlayerNotice(
        next,
        loser.id,
        winner.name,
        "Du förlorade duellen",
        `${winner.name} gav dig 2 skada efter duellen (HP ${beforeHp} → ${loser.hp}).`,
        "duel_loss",
      );
    } else {
      const slot = action.choice;
      const validSlots = ["weapon", "armor", "helmet", "accessory"] as const;
      if (!validSlots.includes(slot as any)) {
        return { state, events: [], error: "Ogiltigt byte" };
      }
      const piece = loser.equipment[slot];
      if (theftBlocked) {
        log(next, `${winner.name} kan inte stjäla från ${loser.name}.`);
        next.pending = null;
        if (next.phase === "playing") {
          queueFirstBrewerDownIfNeeded(next);
          if (!next.pending) endTurnOrOfferLevelUp(next, winner.id);
        }
        return { state: next, events: ["state"] };
      }
      if (piece) {
        loser.equipment[slot] = undefined;
        if (slot === "weapon") {
          winner.equipment.weapon = { ...piece } as typeof winner.equipment.weapon;
        } else if (slot === "armor") {
          winner.equipment.armor = { ...piece } as typeof winner.equipment.armor;
          winner.maxHp = maxHpFor(winner);
          if (winner.hp > winner.maxHp) winner.hp = winner.maxHp;
        } else if (slot === "helmet") {
          winner.equipment.helmet = { ...piece } as typeof winner.equipment.helmet;
        } else {
          winner.equipment.accessory = { ...piece } as typeof winner.equipment.accessory;
        }
        log(next, `${winner.name} takes ${slot} from ${loser.name}.`);
        pushPlayerNotice(
          next,
          loser.id,
          winner.name,
          "Du förlorade duellen",
          `${winner.name} tog din ${piece.name ?? slot} efter duellen.`,
          "duel_loss",
        );
      } else {
        if (theftBlocked) {
          log(next, `${winner.name} kan inte stjäla från ${loser.name}.`);
        } else {
        const steal = Math.min(3, loser.gold);
        loser.gold -= steal;
        winner.gold += steal;
        log(next, `${winner.name} hittade inget i den platsen — tar ${steal} pant i stället.`);
        pushPlayerNotice(
          next,
          loser.id,
          winner.name,
          "Du förlorade duellen",
          `${winner.name} valde en tom plats och tog ${steal} pant från dig i stället.`,
          "duel_loss",
        );
        }
      }
    }
    next.pending = null;
    if (next.phase === "playing") {
      queueFirstBrewerDownIfNeeded(next);
      if (!next.pending) endTurnOrOfferLevelUp(next, winner.id);
    }
    return { state: next, events: ["state"] };
  }

  if (next.pending) {
    return { state, events: [], error: "Avsluta nuvarande val först" };
  }

  if (action.type !== "rollMove") {
    return { state, events: [], error: "Ogiltig handling" };
  }

  if (action.playerId !== cp.id) {
    return { state, events: [], error: "Inte din tur" };
  }

  if (cp.eliminated || cp.hp <= 0) {
    return { state, events: [], error: "Ingen HP kvar — välj på stupad bryggare-kortet först" };
  }

  applyCanmanOnMovementRoll(next, cp);

  const dice = rollDie(rng, 6);
  const bonus = moveBonusSteps(cp) + (cp.nextMoveBonus ?? 0);
  cp.nextMoveBonus = 0;
  const totalDice = dice + bonus;
  next.lastDiceRoll = totalDice;
  next.lastDiceRollerId = cp.id;
  const level = next.levels[cp.levelIndex];
  if (!level) return { state, events: [], error: "Level not found" };
  const n = level.tiles.length;
  const cw = clockwiseTileIndex(cp.tileIndex, totalDice, n);
  const ccw = counterClockwiseTileIndex(cp.tileIndex, totalDice, n);
  const cwTile = level.tiles[cw]!;
  const ccwTile = level.tiles[ccw]!;
  log(next, `${cp.name} slår ${dice}${bonus ? ` (+${bonus})` : ""}. Välj en riktning.`);
  next.pending = {
    type: "moveChoice",
    playerId: cp.id,
    die: totalDice,
    baseDie: dice,
    from: { levelIndex: cp.levelIndex, tileIndex: cp.tileIndex },
    options: [
      {
        dir: "cw",
        target: { levelIndex: cp.levelIndex, tileIndex: cw },
        tileType: cwTile.type,
        label: `Tile ${cw + 1} (${cwTile.type})`,
      },
      {
        dir: "ccw",
        target: { levelIndex: cp.levelIndex, tileIndex: ccw },
        tileType: ccwTile.type,
        label: `Tile ${ccw + 1} (${ccwTile.type})`,
      },
    ],
  };

  return { state: next, events: ["state"] };
}

function queueFirstBrewerDownIfNeeded(state: GameState): void {
  if (endGameIfSingleBrewerAlive(state)) return;
  if (state.pending) return;
  const victim = state.players.find((pl) => pl.hp <= 0 && !pl.eliminated);
  if (!victim) return;
  state.pending = { type: "brewerDown", playerId: victim.id };
  log(state, `${victim.name} har ingen HP kvar — stupad bryggare.`);
}

function removePlayerFromTurnOrderAfterElimination(state: GameState, removedId: string): void {
  const order = state.turnOrder;
  const remIdx = order.indexOf(removedId);
  if (remIdx === -1) return;
  const oldCur = state.currentTurnIndex;
  const filtered = order.filter((id) => id !== removedId);
  state.turnOrder = filtered;
  if (filtered.length === 0) {
    state.phase = "ended";
    state.winnerId = null;
    state.winnerName = null;
    log(state, "Ingen bryggmästare kvar — spelet slutar.");
    return;
  }
  if (remIdx < oldCur) {
    state.currentTurnIndex = oldCur - 1;
  } else if (remIdx === oldCur) {
    state.currentTurnIndex = oldCur % filtered.length;
  }
  if (state.currentTurnIndex >= filtered.length) state.currentTurnIndex = 0;
  endGameIfSingleBrewerAlive(state);
}

function endGameIfSingleBrewerAlive(state: GameState): boolean {
  if (state.phase !== "playing") return false;
  /** Matchen avgörs av "ge upp" (eliminated), inte tillfällig HP 0 före stupad-bryggare-valet. */
  const remaining = state.players.filter((p) => !p.eliminated);
  if (remaining.length === 1) {
    const winner = remaining[0]!;
    state.phase = "ended";
    state.pending = null;
    state.winnerId = winner.id;
    state.winnerName = winner.name;
    log(state, `🏆 ${winner.name} är sista bryggaren kvar i spelet och vinner!`);
    return true;
  }
  if (remaining.length === 0) {
    state.phase = "ended";
    state.pending = null;
    state.winnerId = null;
    state.winnerName = null;
    log(state, "Ingen bryggare kvar i spelet — spelet slutar oavgjort.");
    return true;
  }
  return false;
}

function advanceTurn(state: GameState): void {
  if (state.phase !== "playing") return;
  const anyAlive = state.turnOrder.some((id) => {
    const pl = state.players.find((p) => p.id === id);
    return pl && !pl.eliminated;
  });
  if (!anyAlive) return;
  for (let i = 0; i < state.turnOrder.length; i++) {
    state.currentTurnIndex = (state.currentTurnIndex + 1) % state.turnOrder.length;
    const n = currentPlayer(state);
    if (!n) continue;
    if (n.eliminated) {
      continue;
    }
    if ((n.skippedTurns ?? 0) > 0) {
      n.skippedTurns -= 1;
      log(state, `— ${n.name} skips a turn —`);
      continue;
    }
    log(state, `— ${n.name}'s turn —`);
    maybeCreateLevelUpOffer(state, n, false);
    break;
  }
}
