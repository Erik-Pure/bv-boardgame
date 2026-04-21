import { generateLevels } from "./board.js";
import { createRng, fnv1a32, pick, rollDie, stableStringify } from "./rng.js";
import { applyEffects } from "./cards/effects.js";
import { appendTextForGrantedItem, artKeyForGrantedItem } from "./cards/grantedItemText.js";
import type { EffectApplyOut } from "./cards/types.js";
import { drawFromDeck, getCard, itemDeckItemIds, itemDisplayTitle } from "./cards/db.js";
import { CANMAN_DRAWS_INITIAL, createItemInstance } from "./itemInstance.js";
import {
  FINAL_BOSS_IDS,
  isFinalBossMonsterId,
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
import { effectiveWeaponPiecePower } from "./weaponPower.js";
import { clockwiseTileIndex, counterClockwiseTileIndex } from "./ringMovement.js";
import { EQUIPMENT_CATALOG, type EquipmentShopItem } from "./equipmentDefs.js";
import { beerCanBurkrustningBonusMaxHp, helmetAttackBonus } from "./beerCanEquipment.js";
import { pushPlayerNotice, pushSipNotice } from "./sipNotice.js";
import { formatSelfStatDeltas } from "./statDeltaText.js";
import { combatReactionsAllAnswered } from "./combatReactionPhase.js";
import { combatReactorsFor, playerCanCombatIntervene } from "./combatReactors.js";
import type {
  ApplyResult,
  ClientAction,
  CombatHelpContract,
  CombatLoseSummary,
  CombatWinSummary,
  EquipmentSlot,
  GameState,
  ItemId,
  Pending,
  Player,
  ShopItem,
  TableItemPlaySidePayload,
  Tile,
} from "./types.js";

const MAX_PLAYERS = 6;
/** Pant varje spelare har när spelet startar (efter lobby). */
const INITIAL_PLAYER_PANT = 5;
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
  if (state.logSeq == null) state.logSeq = state.log.length;
  state.logSeq += 1;
  state.log.push({ at: Date.now(), message });
  if (state.log.length > 200) state.log.shift();
}

/** Bräd-tv: lägg till spelat föremål (solfjäder tills rensning). */
function appendTableItemPlayReveal(
  next: GameState,
  itemId: ItemId,
  actorId: string,
  targetPlayerId: string | undefined,
  side?: TableItemPlaySidePayload,
): void {
  const list = next.tableItemPlayReveals ?? [];
  const seq = (list[list.length - 1]?.seq ?? 0) + 1;
  next.tableItemPlayReveals = [...list, { seq, itemId, actorId, targetPlayerId, ...side }];
}

function clearTableItemPlay(next: GameState): void {
  next.tableItemPlayReveals = undefined;
}

/** Bräd-tv: lägg till föremål i solfjäder under strid (följer med pending tills striden är slut). */
function appendCombatReactionItemPlay(
  next: GameState,
  itemId: ItemId,
  actorId: string,
  targetPlayerId: string | undefined,
  side?: TableItemPlaySidePayload,
): void {
  const p = next.pending;
  if (!p || p.type !== "combat") return;
  const n = (p.reactionItemPlays?.length ?? 0) + 1;
  p.reactionItemPlays = [
    ...(p.reactionItemPlays ?? []),
    { playSeq: n, itemId, actorId, targetPlayerId, ...side },
  ];
}

function notifyItemPlayForTableAfterUse(
  next: GameState,
  itemId: ItemId,
  actorId: string,
  targetPlayerId: string | undefined,
  inCombatReactions: boolean,
  side?: TableItemPlaySidePayload,
): void {
  if (inCombatReactions && next.pending?.type === "combat") {
    appendCombatReactionItemPlay(next, itemId, actorId, targetPlayerId, side);
    return;
  }
  appendTableItemPlayReveal(next, itemId, actorId, targetPlayerId, side);
}

const POSITIVE_HELP_ITEM_IDS: ReadonlySet<ItemId> = new Set([
  "light_beer",
  "folk_beer",
  "double_hops",
  "beer_bomb",
]);

const PVP_BEST_OF = 3;
const PVP_PRE_ROUND_ITEM_IDS: ReadonlySet<ItemId> = new Set([
  "weak_beer",
  "light_beer",
  "folk_beer",
  "tripwire",
  "double_hops",
  "beer_bomb",
  "hangover",
  "monster_hype",
  "beard_back",
]);

function playerHasPvpPreRoundItem(player: Player): boolean {
  return (player.inventory ?? []).some((it) => PVP_PRE_ROUND_ITEM_IDS.has(it.itemId));
}

/** Går till slag när båda är uttryckligen klara eller saknar PvB-föremål att spela i förberedelsen. */
function tryAdvancePvpPreRoundToRolls(state: GameState, pending: Extract<Pending, { type: "pvp" }>): void {
  if (pending.phase !== "preRoundItems") return;
  const attacker = state.players.find((p) => p.id === pending.attackerId);
  const defender = state.players.find((p) => p.id === pending.defenderId);
  if (!attacker || !defender) return;
  pending.roundItemReady ??= {};
  const attackerReady =
    pending.roundItemReady[pending.attackerId] === true || !playerHasPvpPreRoundItem(attacker);
  const defenderReady =
    pending.roundItemReady[pending.defenderId] === true || !playerHasPvpPreRoundItem(defender);
  if (attackerReady && defenderReady) {
    pending.phase = "awaitingRolls";
    pending.rolls = {};
    /** Låt `tableItemPlayReveals` vara kvar under `awaitingRolls` så bordets solfjäder visar alla spelade BvB-föremål tills båda slagit. Rensning sker i `pvpRoll` när båda tärningar finns. */
    log(state, "Båda PvP-spelare är redo — slagrundan startar.");
  }
}

/** Efter kortspel: om spelaren inte längre har PvB-föremål markeras de klara automatiskt. */
function maybePvpPreRoundAutoReadyAfterItemUse(state: GameState, playerId: string): void {
  const pending = state.pending;
  if (!pending || pending.type !== "pvp" || pending.phase !== "preRoundItems") return;
  if (playerId !== pending.attackerId && playerId !== pending.defenderId) return;
  const p = state.players.find((x) => x.id === playerId);
  if (!p) return;
  if (!playerHasPvpPreRoundItem(p)) {
    pending.roundItemReady ??= {};
    pending.roundItemReady[playerId] = true;
  }
  tryAdvancePvpPreRoundToRolls(state, pending);
}

function isPositiveHelpItemId(itemId: ItemId): boolean {
  return POSITIVE_HELP_ITEM_IDS.has(itemId);
}

function playerHasPositiveHelpItem(player: Player): boolean {
  return (player.inventory ?? []).some((it) => isPositiveHelpItemId(it.itemId));
}

function combatHelpCandidateIds(state: GameState, pending: Extract<Pending, { type: "combat" }>): string[] {
  return state.players
    .filter((pl) =>
      pl.id !== pending.attackerId &&
      pl.id !== pending.assistId &&
      !pl.eliminated &&
      pl.hp > 0 &&
      playerHasPositiveHelpItem(pl),
    )
    .map((pl) => pl.id);
}

function clearCombatHelpRequest(pending: Extract<Pending, { type: "combat" }>): void {
  pending.helpCandidateIds = undefined;
  pending.helpSelectedHelperId = undefined;
  pending.helpAccepted = undefined;
  pending.helpUsedPositiveItem = undefined;
  pending.helpContract = undefined;
}

function pvpWinsWithDefaults(pending: Extract<Pending, { type: "pvp" }>): { attacker: number; defender: number } {
  return pending.wins ?? { attacker: 0, defender: 0 };
}

function pvpRoundWithDefaults(pending: Extract<Pending, { type: "pvp" }>): number {
  return pending.roundNumber ?? pending.pvpRound ?? 1;
}

function initPvpPending(attackerId: string, defenderId: string): Extract<Pending, { type: "pvp" }> {
  return {
    type: "pvp",
    attackerId,
    defenderId,
    bestOf: PVP_BEST_OF,
    wins: { attacker: 0, defender: 0 },
    roundNumber: 1,
    pvpRound: 1,
    phase: "preRoundItems",
    roundItemReady: {},
    pvpAttackMods: {},
    rolls: {},
    roundResults: [],
  };
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
    /** Pant: 20 för första uppstigningen, 30 för nästa (och vidare). */
    gold: step === 0 ? 20 : 30,
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
  const helm = p.equipment.helmet?.bonusHp ?? 0;
  return 10 + arm + helm + beerCanBurkrustningBonusMaxHp(p);
}

/** Sätter utrustning från affär/skatt-byte (samma fält som `merchantBuy`). */
function equipShopLikeItemToPlayer(p: Player, item: ShopItem): void {
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
      pvpDieBonus: item.pvpDieBonus,
      gainGoldOnDamageTaken: item.gainGoldOnDamageTaken,
      healHpPerTurn: item.healHpPerTurn,
    };
    p.maxHp = maxHpFor(p);
    p.hp = Math.min(p.hp + 2, p.maxHp);
  } else if (item.slot === "helmet") {
    p.equipment.helmet = {
      name: item.name,
      bonusHp: item.bonusHp ?? 0,
      combatBonus: item.combatBonus ?? 0,
      damageNegate: item.damageNegate,
      bossDamageNegateBonus: item.bossDamageNegateBonus,
      negateAllOnce: item.negateAllOnce,
      penaltySipExtra: item.penaltySipExtra,
      klunkAttackBonus10: item.klunkAttackBonus10,
      klunkAttackBonus20: item.klunkAttackBonus20,
      klunkAttackBonusMax: item.klunkAttackBonusMax,
      pvpDieBonus: item.pvpDieBonus,
    };
    p.maxHp = maxHpFor(p);
    const helmHp = item.bonusHp ?? 0;
    if (helmHp > 0) p.hp = Math.min(p.hp + helmHp, p.maxHp);
    else p.hp = Math.min(p.hp, p.maxHp);
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
      pvpDieBonus: item.pvpDieBonus,
    };
  }
}

/** +HP vid turstart för rustning med {@link ArmorPiece.healHpPerTurn} (t.ex. Öltunna). */
function applyArmorHealHpPerTurnAtTurnStart(state: GameState, player: Player): void {
  const h = player.equipment.armor?.healHpPerTurn;
  if (!h || h <= 0) return;
  if (player.eliminated || player.hp <= 0) return;
  if (player.hp >= player.maxHp) return;
  const gain = Math.min(h, player.maxHp - player.hp);
  if (gain <= 0) return;
  player.hp += gain;
  log(
    state,
    `${player.name} får +${gain} HP från ${player.equipment.armor?.name ?? "rustningen"} (turstart).`,
  );
}

function weaponPower(p: Player): number {
  return effectiveWeaponPower(p) + helmetAttackBonus(p) + (p.equipment.accessory?.combatBonus ?? 0);
}

/** BvB-tärning: endast utrustningsdelars `pvpDieBonus` (vapen, rustning, hjälm, tillbehör) — inga vanliga monster-attribut. */
function pvpRollStrengthBonus(p: Player): number {
  const e = p.equipment;
  return (
    (e.weapon?.pvpDieBonus ?? 0) +
    (e.armor?.pvpDieBonus ?? 0) +
    (e.helmet?.pvpDieBonus ?? 0) +
    (e.accessory?.pvpDieBonus ?? 0)
  );
}

function effectiveWeaponPower(p: Player): number {
  return effectiveWeaponPiecePower(p.equipment.weapon, p.gold);
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
            pvpDieBonus: eq.pvpDieBonus,
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
            pvpDieBonus: eq.pvpDieBonus,
            gainGoldOnDamageTaken: eq.gainGoldOnDamageTaken,
            healHpPerTurn: eq.healHpPerTurn,
          };
          player.maxHp = maxHpFor(player);
          player.hp = Math.min(player.hp, player.maxHp);
        } else if (slot === "helmet") {
          player.equipment.helmet = {
            name: eq.name,
            bonusHp: eq.bonusHp ?? 0,
            combatBonus: eq.combatBonus ?? 0,
            damageNegate: eq.damageNegate,
            bossDamageNegateBonus: eq.bossDamageNegateBonus,
            negateAllOnce: eq.negateAllOnce,
            penaltySipExtra: eq.penaltySipExtra,
            klunkAttackBonus10: eq.klunkAttackBonus10,
            klunkAttackBonus20: eq.klunkAttackBonus20,
            klunkAttackBonusMax: eq.klunkAttackBonusMax,
            pvpDieBonus: eq.pvpDieBonus,
          };
          player.maxHp = maxHpFor(player);
          player.hp = Math.min(player.hp, player.maxHp);
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
            pvpDieBonus: eq.pvpDieBonus,
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
  const levelDmg = monsterNeedBonusForBoardLevel(p.levelIndex);
  let raw: number;
  let redirected = false;
  if (monsterId === "skum_banan") {
    raw = isAfter2030() ? 3 : 2;
  } else if (monsterId === "folke_bengtsson") {
    raw = p.klunkar > 5 ? 3 : 1;
  } else if (monsterId === "kapten_interrobang") {
    const base = MONSTERS.find((m) => m.id === "kapten_interrobang")!.baseDamage;
    raw = sipMitigation === true ? Math.max(0, base - 3) : base;
  } else if (monsterId === "sura_bar") {
    const base = MONSTERS.find((m) => m.id === "sura_bar")!.baseDamage;
    raw = sipMitigation === true ? Math.max(0, base - 2) : base;
  } else if (monsterId === "rabarbapappa" && die === 1) {
    raw = 3;
    redirected = true;
  } else {
    const def = MONSTERS.find((m) => m.id === monsterId);
    raw = def?.baseDamage ?? 3;
  }
  return { damage: raw + levelDmg, redirected };
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
    equipmentReplaceOffer?: { slot: EquipmentSlot; catalogId: string; newName: string };
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
    equipmentReplaceOffer: params.equipmentReplaceOffer,
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

/**
 * Kritisk miss (auto-förlust oavsett total mot styrka): solo räcker etta på t6.
 * Med två stridsslag (t.ex. Ölkompis eller lagkamrat) krävs att båda tärningarna är 1.
 */
function combatCritFailFromDice(
  assistId: string | undefined,
  attackerDie: number,
  broDie: number | null | undefined,
): boolean {
  if (assistId) return attackerDie === 1 && broDie === 1;
  return attackerDie === 1;
}

/** Efter förlorat slag: skada, monster-effekter, förlustkort. `sipMitigation` gäller bara Kapten Interrobang/Sura bär. */
/** Efter förlorad monsterstrid: skakad öl ger en hopptur med status "Öl i ögat" (FIFO). */
function applyYeastSabotageAfterMonsterLoss(
  next: GameState,
  yeastSabotageVictimId: string | undefined,
  enemyName: string,
): void {
  if (!yeastSabotageVictimId) return;
  const victim = next.players.find((x) => x.id === yeastSabotageVictimId);
  if (!victim || victim.eliminated) return;
  victim.skippedTurns = (victim.skippedTurns ?? 0) + 1;
  victim.skipTurnReasons ??= [];
  victim.skipTurnReasons.push("oil");
  log(
    next,
    `${victim.name} har öl i ögat efter förlusten mot ${enemyName} och står över nästa tur.`,
  );
}

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
    /** Etta solo, eller båda ettor med assist — förlust oavsett total mot styrka. */
    critFailOnOne?: boolean;
    /** Pip-vapen: valfri straffklunk togs före tärningsslaget. */
    weaponSipBeforeRoll?: boolean;
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
    const dmgTarget = computeMonsterDamage(monsterId, target, die, sipForMonster);
    applyDamage({ state: next, player: target, amount: dmgTarget.damage, log });
    log(next, `${p.name} slog 1 — Rabarbapappan missar och träffar ${target.name} i stället (HP ${tb} → ${target.hp}).`);
  } else {
    applyDamage({ state: next, player: p, amount: dmgOut.damage, isBossHit, log });
  }
  if (assistId) {
    const bro = next.players.find((x) => x.id === assistId) ?? null;
    if (bro) {
      const dmgBro = computeMonsterDamage(monsterId, bro, die, sipForMonster);
      const bb = bro.hp;
      applyDamage({ state: next, player: bro, amount: dmgBro.damage, isBossHit, log });
      log(next, `${bro.name} takes the hit too (HP ${bb} → ${bro.hp}).`);
    }
  }

  const def = MONSTERS.find((m) => m.id === monsterId);
  const lossSips = (def?.lossSipsOnLose ?? 0) + MONSTER_LOSS_SIP_FLAT;
  /** En körad per mottagare — annars visar straffklunk-modalen bara första posten (fel antal vid team battle +1). */
  const totalLossSips = lossSips + (ctx.teamBattleRequired ? 1 : 0);
  const mitigationKlunk =
    (monsterId === "kapten_interrobang" || monsterId === "sura_bar") && ctx.sipMitigation ? 1 : 0;
  const primaryLossApplied = penaltySipTotalForPlayer(p, totalLossSips);
  p.klunkar += primaryLossApplied;
  if (mitigationKlunk) p.klunkar += mitigationKlunk;
  /** Straffklunk-modal: inkludera klunken från pip-vapen före slaget i visat antal. */
  const sipNoticeKlunks =
    primaryLossApplied + mitigationKlunk + (ctx.weaponSipBeforeRoll ? 1 : 0);
  pushSipNotice(next, p.id, ctx.enemyName, sipNoticeKlunks);
  if (assistId) {
    const bro = next.players.find((x) => x.id === assistId) ?? null;
    if (bro) {
      bro.klunkar += penaltySipTotalForPlayer(bro, totalLossSips);
      pushSipNotice(next, bro.id, ctx.enemyName, totalLossSips);
    }
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
      ? assistId
        ? `${p.name} förlorar striden (båda slog 1 — kritisk miss; totalt ${pr} mot styrka ${need}).`
        : `${p.name} förlorar striden (etta på t6 — kritisk miss; totalt ${pr} mot styrka ${need}).`
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
      straffKlunkFromWeaponSip: ctx.weaponSipBeforeRoll ? 1 : undefined,
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
  const critFailOnOne = combatCritFailFromDice(
    assistId,
    pending.previewDie ?? 1,
    pending.previewBroDie,
  );

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
    const helpMate =
      pending.helpAccepted && pending.helpSelectedHelperId
        ? (next.players.find((x) => x.id === pending.helpSelectedHelperId) ?? null)
        : null;
    const helpContract = pending.helpAccepted ? pending.helpContract : undefined;
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
    let attackerItemCount = rewardItems;
    let helperItemCount = 0;
    if (helpMate && helpContract === "pant") {
      const transfer = Math.max(0, Math.min(rewardGold, p.gold));
      if (transfer > 0) {
        p.gold -= transfer;
        helpMate.gold += transfer;
        log(next, `${helpMate.name} hjälpte till och får pantbelöningen (${transfer}) enligt överenskommelsen.`);
      }
    } else if (helpMate && helpContract === "treasure") {
      attackerItemCount = 0;
      helperItemCount = rewardItems;
      log(next, `${helpMate.name} hjälpte till och får skatten enligt överenskommelsen.`);
    } else if (helpMate && helpContract === "split") {
      const helperGold = Math.floor(rewardGold / 2);
      const attackerGold = rewardGold - helperGold;
      const currentAttackerReward = Math.max(0, Math.min(rewardGold, p.gold));
      if (currentAttackerReward > attackerGold) {
        const transfer = currentAttackerReward - attackerGold;
        p.gold -= transfer;
        helpMate.gold += transfer;
      }
      helperItemCount = Math.floor(rewardItems / 2);
      attackerItemCount = rewardItems - helperItemCount;
      log(next, `${p.name} och ${helpMate.name} delar vinsten lika enligt överenskommelsen.`);
    }
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
    if (helperItemCount > 0 && helpMate) {
      for (let i = 0; i < helperItemCount; i++) {
        grantRandomCombatReward(next, helpMate, rng, pending.enemyName, winMonsterId);
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
        weaponSipBeforeRoll: pending.previewUsedSipWeaponBonus === true,
      },
      log,
      rng,
    );
    applyYeastSabotageAfterMonsterLoss(next, pending.yeastSabotageVictimId, pending.enemyName);
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
    p.gold = INITIAL_PLAYER_PANT;
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
  clearTableItemPlay(next);
  log(next, `— Bryggmästarens väg börjar! (seed ${seed}) —`);
  if (bossMonster) {
    log(
      next,
      `Slutboss ${bossMonster.name} — tre liv, vinn tre rundor.`,
    );
  }
  const cur = currentPlayer(next);
  if (cur) {
    log(next, `${cur.name}s tur. Slå tärningen.`);
    applyArmorHealHpPerTurnAtTurnStart(next, cur);
  }
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
    healHpPerTurn: eq.healHpPerTurn,
  };
}

/** Exakt fyra varor visas: pool = mäskpaddel + burkrustning + Helande brygd + två slumpade från katalogen (utan redan fasta ew_padel/ea_can_armor). Köp per besök tills spelaren lämnar. */
const MERCHANT_SHELF_SLOTS = 4;

/** Redan garanterade hyllplatser — får inte förekomma bland de två slumpade katalograderna. */
const MERCHANT_FIXED_CATALOG_IDS = new Set(["ew_padel", "ea_can_armor"]);

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
      name: "Helande brygd",
      price: 8,
      healAmount: 3,
    },
  ];
  const catalog = EQUIPMENT_CATALOG.filter((e) => !MERCHANT_FIXED_CATALOG_IDS.has(e.id));
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
  const ar = ad + pvpRollStrengthBonus(a);
  const br = bd + pvpRollStrengthBonus(b);
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
      const out: EffectApplyOut = {};
      applyEffects({ state, player: p, effects: card.effects ?? [], rng, out });
      const grantedText = appendTextForGrantedItem(out);
      log(state, `${p.name} vilar på bryggeriet (+${out.heal ?? 0} HP, max ${p.maxHp}).`);
      showCard(state, {
        playerId: p.id,
        kind: "rest",
        cardId: card.id,
        title: card.title,
        text:
          card.text +
          grantedText +
          formatSelfStatDeltas(beforeGold, p.gold, beforeHp, p.hp, beforeKlunk, p.klunkar),
        artKey: artKeyForGrantedItem(out, card.artKey) ?? card.artKey,
        grantedItemId: out.grantedItemId,
        equipmentReplaceOffer: out.equipmentReplaceOffer,
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
      const grantedText = appendTextForGrantedItem(effectOut);
      const shouldReplaceBodyWithGrantedText = card.id === "treasure_item_random" && grantedText.length > 0;
      p.xp += 1;
      log(state, `${p.name} hittar skatt: +${out.gold ?? 0} pant.`);
      showCard(state, {
        playerId: p.id,
        kind: "treasure",
        cardId: card.id,
        title: card.title,
        text:
          shouldReplaceBodyWithGrantedText
            ? grantedText.trimStart()
            : card.text.replace("{gold}", String(out.gold ?? 0)) + grantedText,
        artKey: artKeyForGrantedItem(effectOut, card.artKey) ?? card.artKey,
        grantedItemId: effectOut.grantedItemId,
        equipmentReplaceOffer: effectOut.equipmentReplaceOffer,
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
  const logEntropy = state.logSeq ?? state.log.length;
  const base = (state.seed + Math.imul(logEntropy, 997)) >>> 0;
  const actionMix = fnv1a32(stableStringify(action));
  const rng = createRng((base ^ actionMix) >>> 0);
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
      victim.skipTurnReasons = undefined;
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

  if (action.type === "combatRequestHelp" && next.pending?.type === "combat" && next.pending.phase === "reactions") {
    const pending = next.pending;
    if (action.playerId !== pending.attackerId) {
      return { state, events: [], error: "Bara angriparen kan be om hjälp" };
    }
    if (pending.teamBattleRequired || isFinalBossMonsterId(pending.monsterId as MonsterId)) {
      return { state, events: [], error: "Hjälp kan bara begäras i vanliga monsterstrider" };
    }
    const everyoneDone = combatReactionsAllAnswered(pending.reactors ?? [], pending.reacted);
    const reactionDeadlineAt = pending.reactionsDeadlineAt ?? 0;
    const reactionClosed = reactionDeadlineAt > 0 && Date.now() > reactionDeadlineAt;
    if (!everyoneDone && !reactionClosed) {
      return { state, events: [], error: "Vänta tills ingripandefasen är klar" };
    }
    const candidateIds = combatHelpCandidateIds(next, pending);
    if (candidateIds.length === 0) {
      return { state, events: [], error: "Ingen spelare kan hjälpa till just nu" };
    }
    pending.helpCandidateIds = candidateIds;
    pending.helpSelectedHelperId = undefined;
    pending.helpAccepted = undefined;
    pending.helpUsedPositiveItem = undefined;
    pending.helpContract = undefined;
    pending.phase = "helpChooseHelper";
    log(next, `${next.players.find((p) => p.id === action.playerId)?.name ?? "Angriparen"} ber om hjälp.`);
    return { state: next, events: ["state"] };
  }

  // Idempotens: extra klick när hjälpfasen redan öppnats ska inte ge fallback-felet
  // "Avsluta nuvarande val först".
  if (
    action.type === "combatRequestHelp" &&
    next.pending?.type === "combat" &&
    (next.pending.phase === "helpChooseHelper" ||
      next.pending.phase === "helpAwaitDecision" ||
      next.pending.phase === "helpAwaitCard")
  ) {
    return { state: next, events: ["state"] };
  }

  if (
    action.type === "combatChooseHelper" &&
    next.pending?.type === "combat" &&
    next.pending.phase === "helpChooseHelper"
  ) {
    const pending = next.pending;
    if (action.playerId !== pending.attackerId) {
      return { state, events: [], error: "Bara angriparen kan välja hjälpare" };
    }
    const candidateIds = pending.helpCandidateIds ?? combatHelpCandidateIds(next, pending);
    if (!candidateIds.includes(action.helperId)) {
      return { state, events: [], error: "Ogiltig hjälpare" };
    }
    pending.helpCandidateIds = candidateIds;
    pending.helpSelectedHelperId = action.helperId;
    pending.helpAccepted = undefined;
    pending.helpUsedPositiveItem = undefined;
    pending.helpContract = undefined;
    pending.phase = "helpAwaitDecision";
    const helperName = next.players.find((p) => p.id === action.helperId)?.name ?? "okänd";
    log(next, `${next.players.find((p) => p.id === action.playerId)?.name ?? "Angriparen"} frågar ${helperName} om hjälp.`);
    return { state: next, events: ["state"] };
  }

  if (
    action.type === "combatHelperDecision" &&
    next.pending?.type === "combat" &&
    next.pending.phase === "helpAwaitDecision"
  ) {
    const pending = next.pending;
    if (!pending.helpSelectedHelperId || action.playerId !== pending.helpSelectedHelperId) {
      return { state, events: [], error: "Inte du som ska svara på hjälpförfrågan" };
    }
    const helper = next.players.find((p) => p.id === action.playerId);
    if (!helper) return { state, events: [], error: "Spelaren hittades inte" };
    if (action.decision === "decline") {
      log(next, `${helper.name} avböjer att hjälpa till.`);
      pending.helpSelectedHelperId = undefined;
      pending.helpAccepted = false;
      pending.helpUsedPositiveItem = undefined;
      pending.helpContract = undefined;
      pending.phase = "reactions";
      return { state: next, events: ["state"] };
    }
    if (!playerHasPositiveHelpItem(helper)) {
      return { state, events: [], error: "Du har inga positiva hjälpkort att spela" };
    }
    pending.helpAccepted = true;
    pending.helpUsedPositiveItem = false;
    pending.helpContract = action.decision as CombatHelpContract;
    pending.phase = "helpAwaitCard";
    log(next, `${helper.name} accepterar att hjälpa till (${action.decision}).`);
    return { state: next, events: ["state"] };
  }

  if (action.type === "useItem") {
    const user = next.players.find((p) => p.id === action.playerId);
    if (!user) return { state, events: [], error: "Spelaren hittades inte" };
    const inv = user.inventory ?? [];
    const idx = inv.findIndex((it) => it.instanceId === action.instanceId);
    if (idx < 0) return { state, events: [], error: "Föremålet hittades inte" };
    const inst = inv[idx]!;

    // Allow item usage on your turn, during combat reactions, or as accepted helper.
    const combatPending = next.pending?.type === "combat" ? next.pending : null;
    const pvpPending = next.pending?.type === "pvp" ? next.pending : null;
    const inCombatReactions = combatPending?.phase === "reactions";
    const inCombatHelpAwaitCard = combatPending?.phase === "helpAwaitCard";
    const inCombatItemWindow = inCombatReactions || inCombatHelpAwaitCard;
    const inCombatTableFan = inCombatItemWindow;
    const inPvpPreRoundItems =
      pvpPending?.phase === "preRoundItems" &&
      (action.playerId === pvpPending.attackerId || action.playerId === pvpPending.defenderId);
    const reactionDeadlineAt =
      inCombatReactions && combatPending ? (combatPending.reactionsDeadlineAt ?? 0) : 0;
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
    if (inCombatHelpAwaitCard) {
      if (!combatPending || action.playerId !== combatPending.helpSelectedHelperId || combatPending.helpAccepted !== true) {
        return { state, events: [], error: "Endast vald hjälpare kan spela kort nu" };
      }
      if (combatPending.helpUsedPositiveItem) {
        return { state, events: [], error: "Du har redan hjälpt till i denna strid" };
      }
      if (!isPositiveHelpItemId(inst.itemId)) {
        return { state, events: [], error: "Du måste spela ett positivt hjälpkort" };
      }
    }
    const isYourTurn = cp.id === user.id;
    if (!isYourTurn && !inCombatItemWindow && !inPvpPreRoundItems) {
      return { state, events: [], error: "Inte din tur" };
    }
    if (inPvpPreRoundItems && !PVP_PRE_ROUND_ITEM_IDS.has(inst.itemId)) {
      return { state, events: [], error: "Det kortet kan inte spelas i BvB före rundan." };
    }

    if (inst.itemId === "healing_potion") {
      const before = user.hp;
      user.hp = Math.min(user.maxHp, user.hp + 3);
      log(next, `${user.name} använder en helande brygd (+${user.hp - before} HP).`);
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      notifyItemPlayForTableAfterUse(next, "healing_potion", user.id, undefined, inCombatTableFan);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "sleep_potion") {
      const target = action.targetPlayerId ? next.players.find((p) => p.id === action.targetPlayerId) : null;
      if (!target) return { state, events: [], error: "Mål krävs" };
      if (target.id === user.id) return { state, events: [], error: "Du kan inte välja dig själv" };
      target.skippedTurns = (target.skippedTurns ?? 0) + 1;
      target.skipTurnReasons ??= [];
      target.skipTurnReasons.push("normal");
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
      notifyItemPlayForTableAfterUse(next, "sleep_potion", user.id, target.id, inCombatTableFan);
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
      notifyItemPlayForTableAfterUse(next, "sip_card", user.id, target.id, inCombatTableFan);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "weak_beer") {
      const pending = next.pending;
      const isPvpPreRound = pending?.type === "pvp" && pending.phase === "preRoundItems";
      if (!pending || (pending.type !== "combat" && !isPvpPreRound) || (pending.type === "combat" && pending.phase !== "reactions")) {
        return { state, events: [], error: "Kan bara användas under stridsreaktioner" };
      }
      let targetId: string;
      if (isPvpPreRound && pending.type === "pvp") {
        targetId = action.targetPlayerId ?? (user.id === pending.attackerId ? pending.defenderId : pending.attackerId);
        if (targetId !== pending.attackerId && targetId !== pending.defenderId) {
          return { state, events: [], error: "Ogiltigt PvP-mål" };
        }
        pending.pvpAttackMods ??= {};
        pending.pvpAttackMods[targetId] = (pending.pvpAttackMods[targetId] ?? 0) - 2;
        pending.roundItemReady ??= {};
        pending.roundItemReady[user.id] = false;
        log(next, `${user.name} spelar Druckit för mycket: −2 attack i BvB-ronden.`);
      } else {
        const combatPending = pending as Extract<Pending, { type: "combat" }>;
        targetId = action.targetPlayerId ?? combatPending.attackerId;
        combatPending.attackMods ??= {};
        combatPending.attackMods[targetId] = (combatPending.attackMods[targetId] ?? 0) - 2;
        log(next, `${user.name} spelar Druckit för mycket: −2 attack i striden.`);
        // Mark this reactor as having acted (so attacker can roll once everyone either acted or passed).
        combatPending.reacted ??= {};
        if (combatPending.reactors?.includes(user.id) && !combatPending.reacted[user.id]) {
          combatPending.reacted[user.id] = "intervened";
        }
      }
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      notifyItemPlayForTableAfterUse(next, "weak_beer", user.id, targetId, inCombatTableFan || isPvpPreRound);
      if (isPvpPreRound) maybePvpPreRoundAutoReadyAfterItemUse(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "light_beer") {
      const pending = next.pending;
      const isHelpCardPhase = pending?.type === "combat" && pending.phase === "helpAwaitCard";
      const isPvpPreRound = pending?.type === "pvp" && pending.phase === "preRoundItems";
      if (
        !pending ||
        (!isPvpPreRound && (pending.type !== "combat" || (pending.phase !== "reactions" && !isHelpCardPhase)))
      ) {
        return { state, events: [], error: "Kan bara användas under stridsreaktioner" };
      }
      let targetId: string;
      if (isPvpPreRound && pending.type === "pvp") {
        targetId = action.targetPlayerId ?? user.id;
        if (targetId !== pending.attackerId && targetId !== pending.defenderId) {
          return { state, events: [], error: "Ogiltigt PvP-mål" };
        }
        pending.pvpAttackMods ??= {};
        pending.pvpAttackMods[targetId] = (pending.pvpAttackMods[targetId] ?? 0) + 1;
        pending.roundItemReady ??= {};
        pending.roundItemReady[user.id] = false;
        log(next, `${user.name} spelar Energidryck: +1 attack i BvB-ronden.`);
      } else {
        const combatPending = pending as Extract<Pending, { type: "combat" }>;
        targetId = isHelpCardPhase ? combatPending.attackerId : (action.targetPlayerId ?? combatPending.attackerId);
        combatPending.attackMods ??= {};
        combatPending.attackMods[targetId] = (combatPending.attackMods[targetId] ?? 0) + 1;
        log(next, `${user.name} spelar Energidryck: +1 attack i striden.`);
        combatPending.reacted ??= {};
        if (combatPending.reactors?.includes(user.id) && !combatPending.reacted[user.id]) {
          combatPending.reacted[user.id] = "intervened";
        }
      }
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      if (!isPvpPreRound && isHelpCardPhase) {
        pending.helpUsedPositiveItem = true;
        pending.phase = "reactions";
      }
      notifyItemPlayForTableAfterUse(next, "light_beer", user.id, targetId, inCombatTableFan || isPvpPreRound);
      if (isPvpPreRound) maybePvpPreRoundAutoReadyAfterItemUse(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "folk_beer") {
      const pending = next.pending;
      const isHelpCardPhase = pending?.type === "combat" && pending.phase === "helpAwaitCard";
      const isPvpPreRound = pending?.type === "pvp" && pending.phase === "preRoundItems";
      if (
        !pending ||
        (!isPvpPreRound && (pending.type !== "combat" || (pending.phase !== "reactions" && !isHelpCardPhase)))
      ) {
        return { state, events: [], error: "Kan bara användas under stridsreaktioner" };
      }
      let targetId: string;
      if (isPvpPreRound && pending.type === "pvp") {
        targetId = action.targetPlayerId ?? user.id;
        if (targetId !== pending.attackerId && targetId !== pending.defenderId) {
          return { state, events: [], error: "Ogiltigt PvP-mål" };
        }
        pending.pvpAttackMods ??= {};
        pending.pvpAttackMods[targetId] = (pending.pvpAttackMods[targetId] ?? 0) + 2;
        pending.roundItemReady ??= {};
        pending.roundItemReady[user.id] = false;
        log(next, `${user.name} spelar 8-bit beer: +2 attack i BvB-ronden.`);
      } else {
        const combatPending = pending as Extract<Pending, { type: "combat" }>;
        targetId = isHelpCardPhase ? combatPending.attackerId : (action.targetPlayerId ?? combatPending.attackerId);
        combatPending.attackMods ??= {};
        combatPending.attackMods[targetId] = (combatPending.attackMods[targetId] ?? 0) + 2;
        log(next, `${user.name} spelar 8-bit beer: +2 attack i striden.`);
        combatPending.reacted ??= {};
        if (combatPending.reactors?.includes(user.id) && !combatPending.reacted[user.id]) {
          combatPending.reacted[user.id] = "intervened";
        }
      }
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      if (!isPvpPreRound && isHelpCardPhase) {
        pending.helpUsedPositiveItem = true;
        pending.phase = "reactions";
      }
      notifyItemPlayForTableAfterUse(next, "folk_beer", user.id, targetId, inCombatTableFan || isPvpPreRound);
      if (isPvpPreRound) maybePvpPreRoundAutoReadyAfterItemUse(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "tripwire") {
      const pending = next.pending;
      const isPvpPreRound = pending?.type === "pvp" && pending.phase === "preRoundItems";
      if (!pending || (pending.type !== "combat" && !isPvpPreRound) || (pending.type === "combat" && pending.phase !== "reactions")) {
        return { state, events: [], error: "Kan bara användas under stridsreaktioner" };
      }
      let targetId: string;
      if (isPvpPreRound && pending.type === "pvp") {
        targetId = action.targetPlayerId ?? (user.id === pending.attackerId ? pending.defenderId : pending.attackerId);
        if (targetId !== pending.attackerId && targetId !== pending.defenderId) {
          return { state, events: [], error: "Ogiltigt PvP-mål" };
        }
        pending.pvpAttackMods ??= {};
        pending.pvpAttackMods[targetId] = (pending.pvpAttackMods[targetId] ?? 0) - 1;
        pending.roundItemReady ??= {};
        pending.roundItemReady[user.id] = false;
        log(next, `${user.name} spelar Halt golv: −1 attack i BvB-ronden.`);
      } else {
        const combatPending = pending as Extract<Pending, { type: "combat" }>;
        targetId = action.targetPlayerId ?? combatPending.attackerId;
        combatPending.attackMods ??= {};
        combatPending.attackMods[targetId] = (combatPending.attackMods[targetId] ?? 0) - 1;
        log(next, `${user.name} spelar Halt golv: −1 attack i striden.`);
        combatPending.reacted ??= {};
        if (combatPending.reactors?.includes(user.id) && !combatPending.reacted[user.id]) {
          combatPending.reacted[user.id] = "intervened";
        }
      }
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      notifyItemPlayForTableAfterUse(next, "tripwire", user.id, targetId, inCombatTableFan || isPvpPreRound);
      if (isPvpPreRound) maybePvpPreRoundAutoReadyAfterItemUse(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "double_hops") {
      const pending = next.pending;
      const isHelpCardPhase = pending?.type === "combat" && pending.phase === "helpAwaitCard";
      const isPvpPreRound = pending?.type === "pvp" && pending.phase === "preRoundItems";
      if (
        !pending ||
        (!isPvpPreRound && (pending.type !== "combat" || (pending.phase !== "reactions" && !isHelpCardPhase)))
      ) {
        return { state, events: [], error: "Kan bara användas under stridsreaktioner" };
      }
      let targetId: string;
      if (isPvpPreRound && pending.type === "pvp") {
        targetId = action.targetPlayerId ?? user.id;
        if (targetId !== pending.attackerId && targetId !== pending.defenderId) {
          return { state, events: [], error: "Ogiltigt PvP-mål" };
        }
        pending.pvpAttackMods ??= {};
        pending.pvpAttackMods[targetId] = (pending.pvpAttackMods[targetId] ?? 0) + 2;
        pending.roundItemReady ??= {};
        pending.roundItemReady[user.id] = false;
        log(next, `${user.name} spelar En hjälpande hand: +2 attack i BvB-ronden.`);
      } else {
        const combatPending = pending as Extract<Pending, { type: "combat" }>;
        targetId = isHelpCardPhase ? combatPending.attackerId : (action.targetPlayerId ?? combatPending.attackerId);
        combatPending.attackMods ??= {};
        combatPending.attackMods[targetId] = (combatPending.attackMods[targetId] ?? 0) + 2;
        log(next, `${user.name} spelar En hjälpande hand: +2 attack i striden.`);
        combatPending.reacted ??= {};
        if (combatPending.reactors?.includes(user.id) && !combatPending.reacted[user.id]) {
          combatPending.reacted[user.id] = "intervened";
        }
      }
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      if (!isPvpPreRound && isHelpCardPhase) {
        pending.helpUsedPositiveItem = true;
        pending.phase = "reactions";
      }
      notifyItemPlayForTableAfterUse(next, "double_hops", user.id, targetId, inCombatTableFan || isPvpPreRound);
      if (isPvpPreRound) maybePvpPreRoundAutoReadyAfterItemUse(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "beer_bomb") {
      const pending = next.pending;
      const isHelpCardPhase = pending?.type === "combat" && pending.phase === "helpAwaitCard";
      const isPvpPreRound = pending?.type === "pvp" && pending.phase === "preRoundItems";
      if (
        !pending ||
        (!isPvpPreRound && (pending.type !== "combat" || (pending.phase !== "reactions" && !isHelpCardPhase)))
      ) {
        return { state, events: [], error: "Kan bara användas under stridsreaktioner" };
      }
      let targetId: string;
      if (isPvpPreRound && pending.type === "pvp") {
        targetId = action.targetPlayerId ?? user.id;
        if (targetId !== pending.attackerId && targetId !== pending.defenderId) {
          return { state, events: [], error: "Ogiltigt PvP-mål" };
        }
        pending.pvpAttackMods ??= {};
        pending.pvpAttackMods[targetId] = (pending.pvpAttackMods[targetId] ?? 0) + 3;
        pending.roundItemReady ??= {};
        pending.roundItemReady[user.id] = false;
        log(next, `${user.name} spelar Ölbomb: +3 attack i BvB-ronden.`);
      } else {
        const combatPending = pending as Extract<Pending, { type: "combat" }>;
        targetId = isHelpCardPhase ? combatPending.attackerId : (action.targetPlayerId ?? combatPending.attackerId);
        combatPending.attackMods ??= {};
        combatPending.attackMods[targetId] = (combatPending.attackMods[targetId] ?? 0) + 3;
        log(next, `${user.name} spelar Ölbomb: +3 attack i striden.`);
        combatPending.reacted ??= {};
        if (combatPending.reactors?.includes(user.id) && !combatPending.reacted[user.id]) {
          combatPending.reacted[user.id] = "intervened";
        }
      }
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      if (!isPvpPreRound && isHelpCardPhase) {
        pending.helpUsedPositiveItem = true;
        pending.phase = "reactions";
      }
      notifyItemPlayForTableAfterUse(next, "beer_bomb", user.id, targetId, inCombatTableFan || isPvpPreRound);
      if (isPvpPreRound) maybePvpPreRoundAutoReadyAfterItemUse(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "beard_back") {
      const inCombatReaction =
        next.pending?.type === "combat" &&
        next.pending.phase === "reactions" &&
        (next.pending.attackerId === user.id || next.pending.assistId === user.id);
      const inPvpPreRoundWindow =
        next.pending?.type === "pvp" &&
        next.pending.phase === "preRoundItems" &&
        (next.pending.attackerId === user.id || next.pending.defenderId === user.id);
      const inPvpRollWindow =
        next.pending?.type === "pvp" &&
        next.pending.phase === "awaitingRolls" &&
        (next.pending.attackerId === user.id || next.pending.defenderId === user.id);
      if (!inCombatReaction && !inPvpPreRoundWindow && !inPvpRollWindow) {
        return { state, events: [], error: "Kan bara användas när du ska slå i strid" };
      }
      user.nextCombatAttackDiceDouble = true;
      log(next, `${user.name} använder Skägget rakt bak: nästa stridsslag räknas dubbelt.`);
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      if (inCombatReaction) {
        notifyItemPlayForTableAfterUse(next, "beard_back", user.id, undefined, true);
      } else if (inPvpPreRoundWindow && next.pending?.type === "pvp") {
        next.pending.roundItemReady ??= {};
        next.pending.roundItemReady[user.id] = false;
        appendTableItemPlayReveal(next, "beard_back", user.id, undefined);
      } else if (inPvpRollWindow) {
        appendTableItemPlayReveal(next, "beard_back", user.id, undefined);
      }
      if (inPvpPreRoundWindow) maybePvpPreRoundAutoReadyAfterItemUse(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "hangover") {
      const pending = next.pending;
      const isPvpPreRound = pending?.type === "pvp" && pending.phase === "preRoundItems";
      if (!pending || (pending.type !== "combat" && !isPvpPreRound) || (pending.type === "combat" && pending.phase !== "reactions")) {
        return { state, events: [], error: "Kan bara användas under stridsreaktioner" };
      }
      let targetId: string;
      if (isPvpPreRound && pending.type === "pvp") {
        targetId = action.targetPlayerId ?? (user.id === pending.attackerId ? pending.defenderId : pending.attackerId);
        if (targetId !== pending.attackerId && targetId !== pending.defenderId) {
          return { state, events: [], error: "Ogiltigt PvP-mål" };
        }
        pending.pvpAttackMods ??= {};
        pending.pvpAttackMods[targetId] = (pending.pvpAttackMods[targetId] ?? 0) - 3;
        pending.roundItemReady ??= {};
        pending.roundItemReady[user.id] = false;
        log(next, `${user.name} spelar Baksmälla: −3 attack i BvB-ronden.`);
      } else {
        const combatPending = pending as Extract<Pending, { type: "combat" }>;
        targetId = action.targetPlayerId ?? combatPending.attackerId;
        combatPending.attackMods ??= {};
        combatPending.attackMods[targetId] = (combatPending.attackMods[targetId] ?? 0) - 3;
        log(next, `${user.name} spelar Baksmälla: −3 attack i striden.`);
        combatPending.reacted ??= {};
        if (combatPending.reactors?.includes(user.id) && !combatPending.reacted[user.id]) {
          combatPending.reacted[user.id] = "intervened";
        }
      }
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      notifyItemPlayForTableAfterUse(next, "hangover", user.id, targetId, inCombatTableFan || isPvpPreRound);
      if (isPvpPreRound) maybePvpPreRoundAutoReadyAfterItemUse(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "pretzel_snack") {
      const before = user.hp;
      user.hp = Math.min(user.maxHp, user.hp + 2);
      log(next, `${user.name} äter en pretzel (+${user.hp - before} HP).`);
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      notifyItemPlayForTableAfterUse(next, "pretzel_snack", user.id, undefined, inCombatTableFan);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "coin_purse") {
      user.gold += 4;
      log(next, `${user.name} använder en pantpåse (+4 pant).`);
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      notifyItemPlayForTableAfterUse(next, "coin_purse", user.id, undefined, inCombatTableFan);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "monster_hype") {
      const pending = next.pending;
      const isPvpPreRound = pending?.type === "pvp" && pending.phase === "preRoundItems";
      if (!pending || (pending.type !== "combat" && !isPvpPreRound) || (pending.type === "combat" && pending.phase !== "reactions")) {
        return { state, events: [], error: "Kan bara användas under stridsreaktioner" };
      }
      let targetId: string;
      if (isPvpPreRound && pending.type === "pvp") {
        targetId = action.targetPlayerId ?? (user.id === pending.attackerId ? pending.defenderId : pending.attackerId);
        if (targetId !== pending.attackerId && targetId !== pending.defenderId) {
          return { state, events: [], error: "Ogiltigt PvP-mål" };
        }
        pending.pvpAttackMods ??= {};
        pending.pvpAttackMods[targetId] = (pending.pvpAttackMods[targetId] ?? 0) - 2;
        pending.roundItemReady ??= {};
        pending.roundItemReady[user.id] = false;
        log(next, `${user.name} spelar Okontrollerad jäsning: −2 attack i BvB-ronden.`);
      } else {
        const combatPending = pending as Extract<Pending, { type: "combat" }>;
        targetId = action.targetPlayerId ?? combatPending.attackerId;
        combatPending.attackMods ??= {};
        combatPending.attackMods[targetId] = (combatPending.attackMods[targetId] ?? 0) - 2;
        log(next, `${user.name} spelar Okontrollerad jäsning: −2 attack i striden.`);
        combatPending.reacted ??= {};
        if (combatPending.reactors?.includes(user.id) && !combatPending.reacted[user.id]) {
          combatPending.reacted[user.id] = "intervened";
        }
      }
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      notifyItemPlayForTableAfterUse(next, "monster_hype", user.id, targetId, inCombatTableFan || isPvpPreRound);
      if (isPvpPreRound) maybePvpPreRoundAutoReadyAfterItemUse(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "yeast_sabotage") {
      const pending = next.pending;
      if (!pending || pending.type !== "combat" || pending.phase !== "reactions") {
        return { state, events: [], error: "Kan bara användas under stridsreaktioner" };
      }
      const targetId = action.targetPlayerId ?? pending.attackerId;
      pending.yeastSabotageVictimId = targetId;
      pending.attackMods ??= {};
      pending.attackMods[targetId] = (pending.attackMods[targetId] ?? 0) - 1;
      log(next, `${user.name} spelar Skakad öl: −1 attack i striden.`);
      pending.reacted ??= {};
      if (pending.reactors?.includes(user.id) && !pending.reacted[user.id]) pending.reacted[user.id] = "intervened";
      inv.splice(idx, 1);
      user.inventory = inv;
      markCombatReactorUsedItemIfNeeded(next, user.id);
      notifyItemPlayForTableAfterUse(next, "yeast_sabotage", user.id, targetId, inCombatTableFan);
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
      notifyItemPlayForTableAfterUse(next, "beer_bro", user.id, broId, inCombatTableFan);
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
      notifyItemPlayForTableAfterUse(next, "split_the_g", user.id, target.id, inCombatTableFan);
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
      notifyItemPlayForTableAfterUse(next, "lengraddad", user.id, target.id, inCombatTableFan);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "not_my_round") {
      const target = action.targetPlayerId ? next.players.find((p) => p.id === action.targetPlayerId) : null;
      if (!target) return { state, events: [], error: "Mål krävs" };
      if (target.id === user.id) return { state, events: [], error: "Du kan inte välja dig själv" };
      if (target.equipment.accessory?.preventTheft) {
        return { state, events: [], error: `${target.name} kan inte bli bestulen.` };
      }
      let stealSide: TableItemPlaySidePayload | undefined;
      if ((target.inventory ?? []).length > 0) {
        const ti = Math.floor(rng() * target.inventory.length);
        const stolen = target.inventory.splice(ti, 1)[0]!;
        stealSide = { sideInventoryItemId: stolen.itemId };
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
        stealSide = { sideEquipmentSlot: slot, sideEquipmentName: piece.name ?? String(slot) };
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
          target.maxHp = maxHpFor(target);
          if (target.hp > target.maxHp) target.hp = target.maxHp;
          user.equipment.helmet = { ...(piece as any) };
          user.maxHp = maxHpFor(user);
          if (user.hp > user.maxHp) user.hp = user.maxHp;
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
      notifyItemPlayForTableAfterUse(next, "not_my_round", user.id, target.id, inCombatTableFan, stealSide);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "spill_intentional") {
      const target = action.targetPlayerId ? next.players.find((p) => p.id === action.targetPlayerId) : null;
      if (!target) return { state, events: [], error: "Mål krävs" };
      if (target.id === user.id) return { state, events: [], error: "Du kan inte välja dig själv" };
      let spillSide: TableItemPlaySidePayload | undefined;
      if ((target.inventory ?? []).length > 0) {
        const ti = Math.floor(rng() * target.inventory.length);
        const ruined = target.inventory.splice(ti, 1)[0]!;
        spillSide = { sideInventoryItemId: ruined.itemId };
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
        spillSide = { sideEquipmentSlot: slot, sideEquipmentName: piece.name ?? String(slot) };
        target.equipment[slot] = undefined as any;
        if (slot === "armor" || slot === "helmet") {
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
      notifyItemPlayForTableAfterUse(next, "spill_intentional", user.id, target.id, inCombatTableFan, spillSide);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "early_night") {
      const pending = next.pending;
      if (!pending || pending.type !== "combat" || (pending.phase !== "enemyIntro" && pending.phase !== "reactions")) {
        return { state, events: [], error: "Kan bara användas under ett pågående monstermöte" };
      }
      if (pending.attackerId !== user.id) return { state, events: [], error: "Endast angriparen kan skippa mötet" };
      log(next, `${user.name} spelar Vaska och skippar monstret.`);
      inv.splice(idx, 1);
      user.inventory = inv;
      appendCombatReactionItemPlay(next, "early_night", user.id, undefined);
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
    const critFailOnOne = combatCritFailFromDice(assistId, attackerRoll.die, previewBroDie);

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
      reactionItemPlays: pending.reactionItemPlays,
      yeastSabotageVictimId: pending.yeastSabotageVictimId,
      teamBattleRequired: pending.teamBattleRequired,
      teamBattleBonusGold: pending.teamBattleBonusGold,
      rewardGold: pending.rewardGold,
      rewardItems: pending.rewardItems,
      assistId: pending.assistId,
      helpCandidateIds: pending.helpCandidateIds,
      helpSelectedHelperId: pending.helpSelectedHelperId,
      helpContract: pending.helpContract,
      helpAccepted: pending.helpAccepted,
      helpUsedPositiveItem: pending.helpUsedPositiveItem,
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
      previewUsedSipWeaponBonus: sipBonus > 0 && action.useSipWeaponBonus === true,
      previewSipWeaponBonusValue: sipBoost > 0 ? sipBonus : undefined,
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
    const critFailOnOneMit = combatCritFailFromDice(
      pending.assistId,
      pending.previewDie ?? 1,
      pending.previewBroDie,
    );
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
        weaponSipBeforeRoll: pending.previewUsedSipWeaponBonus === true,
      },
      log,
      rng,
    );
    applyYeastSabotageAfterMonsterLoss(next, pending.yeastSabotageVictimId, pending.enemyName);
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

    clearTableItemPlay(next);
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
    if (action.playerId !== cp.id) {
      return { state, events: [], error: "Inte din tur" };
    }
    if (pending.choices && pending.choices.length > 0) {
      return { state, events: [], error: "Välj ett alternativ först" };
    }
    const replaceOffer = pending.equipmentReplaceOffer;
    const handled = handleCardConfirm({ state: next, pending, rng, log });
    if (handled.handled) {
      next.pending = handled.startCombat ?? null;
      if (!next.pending && replaceOffer && next.phase === "playing") {
        next.pending = {
          type: "equipmentReplaceOffer",
          playerId: pending.playerId,
          slot: replaceOffer.slot,
          catalogId: replaceOffer.catalogId,
          newName: replaceOffer.newName,
        };
      }
      if (!next.pending && next.phase === "playing") {
        queueFirstBrewerDownIfNeeded(next);
        if (!next.pending) endTurnOrOfferLevelUp(next, pending.playerId);
      }
      return { state: next, events: ["state"] };
    }
    next.pending = null;
    if (pending.cardId === "event_apocalypse") {
      const drawer = next.players.find((x) => x.id === pending.playerId);
      const from = drawer ? `${drawer.name} (Apocalypse)` : "Apocalypse";
      for (const pl of next.players) {
        pushSipNotice(next, pl.id, from);
      }
    }
    if (replaceOffer && next.phase === "playing") {
      next.pending = {
        type: "equipmentReplaceOffer",
        playerId: pending.playerId,
        slot: replaceOffer.slot,
        catalogId: replaceOffer.catalogId,
        newName: replaceOffer.newName,
      };
      return { state: next, events: ["state"] };
    }
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
    if (action.playerId !== cp.id) {
      return { state, events: [], error: "Inte din tur" };
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
        const replaceOffer = pending.equipmentReplaceOffer;
        if (replaceOffer && next.phase === "playing") {
          next.pending = {
            type: "equipmentReplaceOffer",
            playerId: pending.playerId,
            slot: replaceOffer.slot,
            catalogId: replaceOffer.catalogId,
            newName: replaceOffer.newName,
          };
        } else {
          next.pending = null;
        }
        if (!next.pending && next.phase === "playing") {
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
      equipmentReplaceOffer: effectOutFallback.equipmentReplaceOffer ?? pending.equipmentReplaceOffer,
      text:
        `${def.text}\nVal: ${choice.label}` +
        appendTextForGrantedItem(effectOutFallback) +
        formatSelfStatDeltas(beforeGold, p.gold, beforeHp, p.hp, beforeKlunk, p.klunkar),
    };
    return { state: next, events: ["state"] };
  }

  if (action.type === "equipmentReplaceDecision" && next.pending?.type === "equipmentReplaceOffer") {
    const erPending = next.pending;
    if (action.playerId !== erPending.playerId) {
      return { state, events: [], error: "Inte ditt val" };
    }
    if (action.playerId !== cp.id) {
      return { state, events: [], error: "Inte din tur" };
    }
    const p = next.players.find((x) => x.id === action.playerId);
    if (!p) return { state, events: [], error: "Player not found" };
    const turnPid = erPending.playerId;
    if (action.accept) {
      const eq = EQUIPMENT_CATALOG.find((e) => e.id === erPending.catalogId);
      if (!eq || eq.slot !== erPending.slot) {
        return { state, events: [], error: "Ogiltig utrustning" };
      }
      const item = catalogEquipmentToMerchantShopItem(eq, eq.id);
      equipShopLikeItemToPlayer(p, item);
      log(next, `${p.name} byter ut ${erPending.slot} mot ${erPending.newName}.`);
    } else {
      log(next, `${p.name} behåller sin nuvarande utrustning och lämnar ${erPending.newName}.`);
    }
    next.pending = null;
    if (next.phase === "playing") {
      queueFirstBrewerDownIfNeeded(next);
      if (!next.pending) endTurnOrOfferLevelUp(next, turnPid);
    }
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
      clearTableItemPlay(next);
      next.pending = initPvpPending(mover.id, opp.id);
      tryAdvancePvpPreRoundToRolls(next, next.pending);
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
    clearTableItemPlay(next);
    next.pending = initPvpPending(mover.id, opp.id);
    tryAdvancePvpPreRoundToRolls(next, next.pending);
    return { state: next, events: ["state"] };
  }

  if (action.type === "pvpRoundReady" && next.pending?.type === "pvp" && next.pending.phase === "preRoundItems") {
    const pending = next.pending;
    const isParticipant = action.playerId === pending.attackerId || action.playerId === pending.defenderId;
    if (!isParticipant) return { state, events: [], error: "You are not part of this PvP" };
    pending.roundItemReady ??= {};
    pending.roundItemReady[action.playerId] = action.ready;
    tryAdvancePvpPreRoundToRolls(next, pending);
    return { state: next, events: ["state"] };
  }

  if (action.type === "pvpRoundRevealAck" && next.pending?.type === "pvp") {
    if (next.pending.phase !== "roundReveal") {
      return { state: next, events: ["state"] };
    }
    const pending = next.pending;
    const isParticipant = action.playerId === pending.attackerId || action.playerId === pending.defenderId;
    if (!isParticipant) return { state, events: [], error: "You are not part of this PvP" };
    pending.roundRevealAcked ??= {};
    pending.roundRevealAcked[action.playerId] = true;
    const aAck = pending.roundRevealAcked[pending.attackerId] === true;
    const dAck = pending.roundRevealAcked[pending.defenderId] === true;
    if (!aAck || !dAck) return { state: next, events: ["state"] };

    const lead = pending.roundRevealLead;
    const savedNextRound = pending.nextRoundNumber;
    pending.roundRevealAcked = undefined;
    pending.roundRevealLead = undefined;
    pending.nextRoundNumber = undefined;

    if (lead === "chooseLoot") {
      pending.phase = "chooseLoot";
      pending.rolls = {};
    } else if (lead === "nextRound") {
      const nr = savedNextRound ?? (pvpRoundWithDefaults(pending) + 1);
      pending.phase = "preRoundItems";
      pending.roundNumber = nr;
      pending.pvpRound = nr;
      pending.rolls = {};
      pending.roundItemReady = {};
      pending.pvpAttackMods = {};
      pending.winnerId = undefined;
      pending.loserId = undefined;
      pending.resolvedTotals = undefined;
      tryAdvancePvpPreRoundToRolls(next, pending);
    }
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
    const pvpMod = pending.pvpAttackMods?.[action.playerId] ?? 0;
    const total = dieContribution + pvpRollStrengthBonus(p) + pvpMod;
    pending.rolls[action.playerId] = { die: rawDie, total };
    log(
      next,
      `${p.name} rolls for PvP: ${rawDie}${attackDoubled ? ` (dubblat till ${dieContribution} i total)` : ""}${pvpMod !== 0 ? ` (PvP-mod ${pvpMod > 0 ? `+${pvpMod}` : pvpMod})` : ""} (total ${total}).`,
    );

    const a = pending.rolls[pending.attackerId];
    const d = pending.rolls[pending.defenderId];
    if (a && d) {
      clearTableItemPlay(next);
      const ar = a.total;
      const dr = d.total;
      const currentRound = pvpRoundWithDefaults(pending);
      pending.roundResults ??= [];
      if (ar === dr) {
        pending.roundResults.push({
          round: currentRound,
          attackerTotal: ar,
          defenderTotal: dr,
          tie: true,
        });
        pending.phase = "preRoundItems";
        pending.rolls = {};
        pending.roundItemReady = {};
        pending.pvpAttackMods = {};
        pending.resolvedTotals = { attackerTotal: ar, defenderTotal: dr };
        log(
          next,
          `PvP: Lika (${ar})! Spela kort och gör er redo för omslag (rond ${currentRound}).`,
        );
        tryAdvancePvpPreRoundToRolls(next, pending);
        return { state: next, events: ["state"] };
      }
      const attacker = next.players.find((x) => x.id === pending.attackerId)!;
      const defender = next.players.find((x) => x.id === pending.defenderId)!;
      const attackerWins = ar >= dr;
      const winner = attackerWins ? attacker : defender;
      const loser = attackerWins ? defender : attacker;
      const pvpWeaponBonusGold = applyWeaponWinGoldBonus(winner);
      const pvpWeaponRandomDamage = applyWeaponWinRandomDamage({ state: next, winner, rng, log });
      const wins = pvpWinsWithDefaults(pending);
      if (attackerWins) wins.attacker += 1;
      else wins.defender += 1;
      pending.wins = wins;
      pending.roundResults.push({
        round: currentRound,
        attackerTotal: ar,
        defenderTotal: dr,
        winnerId: winner.id,
      });
      pending.winnerId = winner.id;
      pending.loserId = loser.id;
      pending.resolvedTotals = { attackerTotal: ar, defenderTotal: dr };
      const winnerWins = winner.id === pending.attackerId ? wins.attacker : wins.defender;
      const neededWins = Math.floor((pending.bestOf ?? PVP_BEST_OF) / 2) + 1;
      log(
        next,
        `PvP: ${attacker.name} (${ar}) vs ${defender.name} (${dr}) — ${winner.name} vinner ronden (${wins.attacker}-${wins.defender}).`,
      );
      pending.roundRevealAcked = {};
      if (winnerWins >= neededWins) {
        pending.phase = "roundReveal";
        pending.roundRevealLead = "chooseLoot";
        pending.nextRoundNumber = undefined;
        log(next, `${winner.name} vinner matchen i BvB (${wins.attacker}-${wins.defender})! Bekräfta resultatet på mobilen.`);
      } else {
        const nextRound = currentRound + 1;
        pending.phase = "roundReveal";
        pending.roundRevealLead = "nextRound";
        pending.nextRoundNumber = nextRound;
        log(next, `BvB: Bekräfta rondresultatet på mobilen innan rond ${nextRound}.`);
      }
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
    if (item.slot === "weapon" || item.slot === "armor" || item.slot === "helmet" || item.slot === "accessory") {
      equipShopLikeItemToPlayer(p, item);
    } else if (item.slot === "heal") {
      p.inventory ??= [];
      p.inventory.push(createItemInstance("healing_potion", newItemInstanceId(rng)));
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
      if (theftBlocked) {
        return { state, events: [], error: "Kan inte ta utrustning från denna bryggare (skydd mot byte)." };
      }
      const piece = loser.equipment[slot];
      if (piece) {
        loser.equipment[slot] = undefined;
        if (slot === "armor" || slot === "helmet") {
          loser.maxHp = maxHpFor(loser);
          if (loser.hp > loser.maxHp) loser.hp = loser.maxHp;
        }
        if (slot === "weapon") {
          winner.equipment.weapon = { ...piece } as typeof winner.equipment.weapon;
        } else if (slot === "armor") {
          winner.equipment.armor = { ...piece } as typeof winner.equipment.armor;
          winner.maxHp = maxHpFor(winner);
          if (winner.hp > winner.maxHp) winner.hp = winner.maxHp;
        } else if (slot === "helmet") {
          winner.equipment.helmet = { ...piece } as typeof winner.equipment.helmet;
          winner.maxHp = maxHpFor(winner);
          if (winner.hp > winner.maxHp) winner.hp = winner.maxHp;
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

  clearTableItemPlay(next);
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
      if (n.skipTurnReasons && n.skipTurnReasons.length > 0) n.skipTurnReasons.shift();
      log(state, `— ${n.name} skips a turn —`);
      continue;
    }
    log(state, `— ${n.name}'s turn —`);
    applyArmorHealHpPerTurnAtTurnStart(state, n);
    maybeCreateLevelUpOffer(state, n, false);
    break;
  }
}
