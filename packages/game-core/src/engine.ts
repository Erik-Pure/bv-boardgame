import { generateLevels } from "./board.js";
import { createRng, pick, rollDie } from "./rng.js";
import { applyEffects } from "./cards/effects.js";
import { drawFromDeck, getCard } from "./cards/db.js";
import { MONSTERS, type MonsterId } from "./monsters.js";
import {
  handleCardConfirm,
  handleCardOption,
  enterMonsterCombatFromTile,
  resolveEventCardOnLand,
} from "./cards/runtime.js";
import { applyDamage, moveBonusSteps } from "./damage.js";
import { EQUIPMENT_CATALOG } from "./equipmentDefs.js";
import { pushSipNotice } from "./sipNotice.js";
import { formatSelfStatDeltas } from "./statDeltaText.js";
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

export function brewerLevel(p: Player): number {
  return 1 + Math.min(9, Math.floor(p.xp / 5));
}

function maxHpFor(p: Player): number {
  const arm = p.equipment.armor?.bonusHp ?? 0;
  return 10 + arm;
}

function weaponPower(p: Player): number {
  return (p.equipment.weapon?.power ?? 0) + (p.equipment.helmet?.combatBonus ?? 0);
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

const COMBAT_REWARD_ITEMS: ItemId[] = [
  "healing_potion",
  "sleep_potion",
  "sip_card",
  "weak_beer",
  "light_beer",
  "folk_beer",
  "tripwire",
  "beer_bomb",
  "beard_back",
  "hangover",
  "pretzel_snack",
  "coin_purse",
  "double_hops",
  "monster_hype",
  "yeast_sabotage",
  "beer_bro",
];

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
  player.inventory.push({
    instanceId: newItemInstanceId(rng),
    itemId,
  });
  log(state, `${player.name} hittar ett föremål efter segern mot ${sourceName}.`);
  return itemId;
}

function grantRandomCombatReward(state: GameState, player: Player, rng: () => number, sourceName: string): void {
  // Mix item cards with equipment. If equipment slot is occupied, fall back to an item card.
  const equipmentRoll = rng() < 0.35;
  if (equipmentRoll) {
    const slot = pick(rng, COMBAT_REWARD_EQUIPMENT_SLOTS);
    if (!player.equipment[slot]) {
      const pool = EQUIPMENT_CATALOG.filter((e) => e.slot === slot);
      if (pool.length > 0) {
        const eq = pick(rng, pool);
        if (slot === "weapon") {
          player.equipment.weapon = { name: eq.name, power: eq.power ?? 1 };
        } else if (slot === "armor") {
          player.equipment.armor = {
            name: eq.name,
            bonusHp: eq.bonusHp ?? 0,
            damageNegate: eq.damageNegate,
            negateAllOnce: eq.negateAllOnce,
          };
          player.maxHp = maxHpFor(player);
          player.hp = Math.min(player.hp, player.maxHp);
        } else if (slot === "helmet") {
          player.equipment.helmet = { name: eq.name, combatBonus: 1, damageNegate: eq.damageNegate };
        } else {
          player.equipment.accessory = { name: eq.name, damageNegate: eq.damageNegate, moveBonus: eq.moveBonus };
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
  /** Brewizard / Sourceress: true = take sip for reduced damage, false = full base damage */
  sipMitigation?: boolean,
): { damage: number; redirected: boolean } {
  if (monsterId === "beerwolf") return { damage: isAfter2030() ? 3 : 2, redirected: false };
  if (monsterId === "ipa_ssassin") return { damage: p.klunkar > 5 ? 3 : 1, redirected: false };
  if (monsterId === "brewizard") {
    const base = MONSTERS.find((m) => m.id === "brewizard")!.baseDamage;
    return sipMitigation === true
      ? { damage: Math.max(0, base - 3), redirected: false }
      : { damage: base, redirected: false };
  }
  if (monsterId === "sourceress") {
    const base = MONSTERS.find((m) => m.id === "sourceress")!.baseDamage;
    return sipMitigation === true
      ? { damage: Math.max(0, base - 2), redirected: false }
      : { damage: base, redirected: false };
  }
  if (monsterId === "beer_serker" && die === 1) return { damage: 3, redirected: true };
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
    choices: params.choices,
    combatWin: params.combatWin,
    combatLoss: params.combatLoss,
  };
}

/** Efter förlorat slag: skada, monster-effekter, förlustkort. `sipMitigation` gäller bara Brewizard/Sourceress. */
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
  },
  log: (s: GameState, m: string) => void,
  rng: () => number,
): void {
  const { p, tile, monsterId, die, pr, need, assistRoll, assistId } = ctx;
  const before = p.hp;
  const beforeSips = p.klunkar;
  const sipForMonster =
    monsterId === "brewizard" || monsterId === "sourceress" ? ctx.sipMitigation : undefined;
  const dmgOut = computeMonsterDamage(monsterId, p, die, sipForMonster);
  let redirectedTargetName: string | null = null;

  if (monsterId === "beer_serker" && dmgOut.redirected && next.players.length > 1) {
    const others = next.players.filter((x) => x.id !== p.id);
    const target = pick(rng, others);
    redirectedTargetName = target.name;
    const tb = target.hp;
    applyDamage({ state: next, player: target, amount: dmgOut.damage, log });
    log(next, `${p.name} slog 1 — Öl-bärsärken missar och träffar ${target.name} i stället (HP ${tb} → ${target.hp}).`);
  } else {
    applyDamage({ state: next, player: p, amount: dmgOut.damage, log });
  }
  if (assistId) {
    const bro = next.players.find((x) => x.id === assistId) ?? null;
    if (bro) {
      const bb = bro.hp;
      applyDamage({ state: next, player: bro, amount: dmgOut.damage, log });
      log(next, `${bro.name} takes the hit too (HP ${bb} → ${bro.hp}).`);
    }
  }

  const def = MONSTERS.find((m) => m.id === monsterId);
  const lossSips = def?.lossSipsOnLose ?? 0;
  if (lossSips > 0) {
    p.klunkar += lossSips;
    pushSipNotice(next, p.id, ctx.enemyName);
    if (assistId) {
      const bro = next.players.find((x) => x.id === assistId) ?? null;
      if (bro) {
        bro.klunkar += lossSips;
        pushSipNotice(next, bro.id, ctx.enemyName);
      }
    }
  }
  if (ctx.teamBattleRequired) {
    p.klunkar += 1;
    pushSipNotice(next, p.id, ctx.enemyName);
    if (assistId) {
      const bro = next.players.find((x) => x.id === assistId) ?? null;
      if (bro) {
        bro.klunkar += 1;
        pushSipNotice(next, bro.id, ctx.enemyName);
      }
    }
  }

  if ((monsterId === "brewizard" || monsterId === "sourceress") && ctx.sipMitigation) {
    p.klunkar += 1;
    pushSipNotice(next, p.id, ctx.enemyName);
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

  log(next, `${p.name} förlorar striden (slag ${pr}<${need}).`);
  const damageTaken = before - p.hp;
  const klunkGained = p.klunkar - beforeSips;
  showCard(next, {
    playerId: p.id,
    kind: "combat",
    cardId: "combat_lose",
    title: tile.type === "boss" ? `Boss: ${tile.bossName ?? "Okänd"}` : "Strid",
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
        ? `Öl-bärsärken slog om till: ${redirectedTargetName}.`
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
    next.pending = null;
    p.gold += rewardGold;
    let assistName: string | null = null;
    if (teamBattleRequired && assistId) {
      const mate = next.players.find((x) => x.id === assistId) ?? null;
      if (mate) {
        mate.gold += rewardGold;
        assistName = mate.name;
      }
    }
    p.xp += tile.type === "boss" ? 8 : 2;
    p.maxHp = maxHpFor(p);
    if (p.hp > p.maxHp) p.hp = p.maxHp;
    const attackerItemCount = rewardItems;
    let teammateItemCount = 0;
    if (attackerItemCount > 0) {
      for (let i = 0; i < attackerItemCount; i++) grantRandomCombatReward(next, p, rng, pending.enemyName);
      if (teamBattleRequired && assistId) {
        const mate = next.players.find((x) => x.id === assistId) ?? null;
        if (mate) {
          teammateItemCount = rewardItems;
          for (let i = 0; i < teammateItemCount; i++) grantRandomCombatReward(next, mate, rng, pending.enemyName);
        }
      }
    }
    if (teamBattleRequired && assistName) {
      log(
        next,
        `${p.name} och ${assistName} besegrar ${tile.bossName ?? "monstret"}! (+${rewardGold} pant var, slag ${pr}≥${need})`,
      );
    } else {
      log(next, `${p.name} besegrar ${tile.bossName ?? "monstret"}! (+${rewardGold} pant, slag ${pr}≥${need})`);
    }
    showCard(next, {
      playerId: p.id,
      kind: "combat",
      cardId: "combat_win",
      title: tile.type === "boss" ? `Boss: ${tile.bossName ?? "Okänd"}` : "Strid",
      text: "",
      combatWin: {
        winnerName: p.name,
        enemyName: pending.enemyName,
        rollTotal: pr,
        need,
        rewardGold,
        rewardItems,
        teammateName: assistName ?? undefined,
      },
    });
    if (tile.type === "boss") {
      if (next.config.gameMode === "goldenBeerEscape") {
        next.goldenBeerCarrierId = p.id;
        log(next, `${p.name} bär nu den gyllene ölen — tillbaka till start (ruta 1 på nivå 1)!`);
      } else {
        next.phase = "ended";
        next.winnerId = p.id;
        next.winnerName = p.name;
        log(next, `🏆 ${p.name} vinner genom att besegra bossen!`);
        next.pending = null;
      }
    }
  } else {
    const monsterId = pending.monsterId as MonsterId;
    if (monsterId === "brewizard" || monsterId === "sourceress") {
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
    gold: 5,
    klunkar: 0,
    hp: 10,
    maxHp: 10,
    xp: 0,
    equipment: {},
    inventory: [],
    nextMoveBonus: 0,
    skippedTurns: 0,
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
  next.phase = "playing";
  next.turnOrder = next.players.map((p) => p.id);
  next.currentTurnIndex = 0;
  for (const p of next.players) {
    p.levelIndex = 0;
    p.tileIndex = 0;
    p.hp = maxHpFor(p);
    p.maxHp = maxHpFor(p);
    p.nextMoveBonus = 0;
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

/** Exakt fyra varor i sortimentet: pool = mäskpaddel + burkrustning + läkning + två slumpade från katalogen, sedan slumpad delmängd (4 st). Köp per besök är obegränsat tills spelaren lämnar. Ingen nivå-tier — fast effekt, högre pris. */
function rollMerchantItems(rng: () => number): ShopItem[] {
  const items: ShopItem[] = [
    {
      id: "w",
      slot: "weapon",
      name: "Mäskpaddel",
      price: 14,
      power: 3,
    },
    {
      id: "a",
      slot: "armor",
      name: "Burkrustning",
      price: 16,
      bonusHp: 5,
    },
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
    items.push({
      id: it.id,
      slot: it.slot,
      name: it.name,
      price: it.price,
      bonusHp: it.bonusHp ?? 0,
      damageNegate: it.damageNegate,
      negateAllOnce: it.negateAllOnce,
      moveBonus: it.moveBonus,
    });
  }
  shuffleArrayInPlace(items, rng);
  return items.slice(0, 4);
}

function findOpponentOnTile(state: GameState, mover: Player): Player | null {
  const others = state.players.filter(
    (p) =>
      p.id !== mover.id &&
      p.levelIndex === mover.levelIndex &&
      p.tileIndex === mover.tileIndex,
  );
  if (others.length === 0) return null;
  for (const id of state.turnOrder) {
    const p = others.find((x) => x.id === id);
    if (p) return p;
  }
  return others[0] ?? null;
}

function resolvePvp(state: GameState, a: Player, b: Player, rng: () => number): Pending {
  // Legacy path (shouldn't be used after encounterChoice is introduced)
  const ad = rollDie(rng, 6);
  const bd = rollDie(rng, 6);
  const ar = ad + weaponPower(a);
  const br = bd + weaponPower(b);
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

function combatReactorsFor(state: GameState, attackerId: string, assistId?: string): string[] {
  return state.players
    .filter((x) => x.id !== attackerId && x.id !== assistId)
    .filter((x) =>
      (x.inventory ?? []).some((it) =>
        [
          "weak_beer",
          "light_beer",
          "folk_beer",
          "tripwire",
          "double_hops",
          "beer_bomb",
          "hangover",
          "beer_bro",
          "monster_hype",
          "yeast_sabotage",
        ].includes(String(it.itemId)),
      ),
    )
    .map((x) => x.id);
}

function resolveTileLanding(state: GameState, p: Player, rng: () => number): void {
  const level = state.levels[p.levelIndex];
  if (!level) return;
  const tile = level.tiles[p.tileIndex];
  if (!tile) return;

  const tkey = `${p.levelIndex}-${p.tileIndex}`;

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
      if (state.treasureTaken[tkey]) {
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
      state.treasureTaken[tkey] = true;
      const card = drawFromDeck("treasure", rng);
      const out = applyEffects({ state, player: p, effects: card.effects ?? [], rng });
      p.xp += 1;
      log(state, `${p.name} hittar skatt: +${out.gold ?? 0} pant.`);
      showCard(state, {
        playerId: p.id,
        kind: "treasure",
        cardId: card.id,
        title: card.title,
        text: card.text.replace("{gold}", String(out.gold ?? 0)),
        artKey: card.artKey,
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
        const ok = p.klunkar >= req.sips || p.gold >= req.gold;
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

      // Open a reaction window so other players can affect combat.
      const enemyName = tile.type === "boss" ? `Boss: ${tile.bossName ?? "Okänd"}` : "Monster";
      const reactors = state.players
        .filter((x) => x.id !== p.id)
        .filter((x) =>
          (x.inventory ?? []).some((it) =>
            [
              "weak_beer",
              "light_beer",
              "folk_beer",
              "tripwire",
              "double_hops",
              "beer_bomb",
              "hangover",
              "beer_bro",
              "monster_hype",
              "yeast_sabotage",
            ].includes(String(it.itemId)),
          ),
        )
        .map((x) => x.id);
      state.pending = {
        type: "combat",
        attackerId: p.id,
        levelIndex: p.levelIndex,
        tileIndex: p.tileIndex,
        monsterId: "boss",
        enemyName,
        need: tile.combatValue ?? 5,
        needMod: 0,
        baseDamage: 3,
        phase: "enemyIntro",
        attackMods: {},
        reactors,
        reacted: {},
      };
      log(state, `${p.name} möter ${enemyName}.`);
      return;
    }
    case "merchant": {
      state.pending = {
        type: "merchant",
        items: rollMerchantItems(rng),
        playerId: p.id,
      };
      log(state, `${p.name} träffar en handlare.`);
      return;
    }
    case "door": {
      const target = tile.doorTargetLevelIndex ?? p.levelIndex + 1;
      const costs = { gold: 10, sips: 5 };
      const canGold = p.gold >= costs.gold;
      const canSips = p.klunkar >= costs.sips;
      if (!canGold && !canSips) {
        log(state, `Dörren är låst — behöver ${costs.gold} pant eller ${costs.sips}+ klunkar.`);
        showCard(state, {
          playerId: p.id,
          kind: "event",
          cardId: "door_locked",
          title: "Dörren är låst",
          text: `Du behöver ${costs.gold} pant eller ${costs.sips}+ klunkar för att gå upp.`,
          artKey: "tile/door",
        });
        break;
      }
      state.pending = {
        type: "door",
        playerId: p.id,
        targetLevelIndex: target,
        costs,
      };
      log(state, `${p.name} kan gå till nivå ${target + 1} (betala ${costs.gold} pant eller ha ${costs.sips}+ klunkar).`);
      return;
    }
    default:
      break;
  }

  if (state.config.gameMode === "goldenBeerEscape" && state.goldenBeerCarrierId === p.id) {
    if (p.levelIndex === 0 && p.tileIndex === 0) {
      state.phase = "ended";
      state.winnerId = p.id;
      state.winnerName = p.name;
      log(state, `🏆 ${p.name} vinner genom att fly med den gyllene ölen!`);
    }
  }
}

function resolveLanding(state: GameState, p: Player, rng: () => number): void {
  const opp = findOpponentOnTile(state, p);
  if (opp) {
    state.pending = {
      type: "encounterChoice",
      moverId: p.id,
      opponentId: opp.id,
      phase: "choosePvpOrTile",
    };
    log(state, `${p.name} springer in i ${opp.name}. Välj PvP eller rutan.`);
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
      next.config.gameMode = action.gameMode;
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

  const cp = currentPlayer(next);
  if (!cp) return { state, events: [], error: "Ingen aktiv spelare" };

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
    const isYourTurn = cp.id === user.id;
    if (!isYourTurn && !inCombatReactions) {
      return { state, events: [], error: "Inte din tur" };
    }

    if (inst.itemId === "healing_potion") {
      const before = user.hp;
      user.hp = Math.min(user.maxHp, user.hp + 3);
      log(next, `${user.name} använder en läkedryck (+${user.hp - before} HP).`);
      inv.splice(idx, 1);
      user.inventory = inv;
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "sleep_potion") {
      const target = action.targetPlayerId ? next.players.find((p) => p.id === action.targetPlayerId) : null;
      if (!target) return { state, events: [], error: "Mål krävs" };
      if (target.id === user.id) return { state, events: [], error: "Du kan inte välja dig själv" };
      target.skippedTurns = (target.skippedTurns ?? 0) + 1;
      log(next, `${user.name} använder sömnmedel på ${target.name} (hoppar över nästa tur).`);
      inv.splice(idx, 1);
      user.inventory = inv;
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
      log(next, `${user.name} spelar Svag öl: −2 attack i striden.`);
      // Mark this reactor as having acted (so attacker can roll once everyone either acted or passed).
      pending.reacted ??= {};
      if (pending.reactors?.includes(user.id) && !pending.reacted[user.id]) {
        pending.reacted[user.id] = "intervened";
      }
      inv.splice(idx, 1);
      user.inventory = inv;
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
      log(next, `${user.name} spelar Lättöl: +1 attack i striden.`);
      pending.reacted ??= {};
      if (pending.reactors?.includes(user.id) && !pending.reacted[user.id]) pending.reacted[user.id] = "intervened";
      inv.splice(idx, 1);
      user.inventory = inv;
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
      log(next, `${user.name} spelar Folköl: +2 attack i striden.`);
      pending.reacted ??= {};
      if (pending.reactors?.includes(user.id) && !pending.reacted[user.id]) pending.reacted[user.id] = "intervened";
      inv.splice(idx, 1);
      user.inventory = inv;
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
      log(next, `${user.name} spelar Krokben: −1 attack i striden.`);
      pending.reacted ??= {};
      if (pending.reactors?.includes(user.id) && !pending.reacted[user.id]) pending.reacted[user.id] = "intervened";
      inv.splice(idx, 1);
      user.inventory = inv;
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
      log(next, `${user.name} spelar Dubbelhumle: +2 attack i striden.`);
      pending.reacted ??= {};
      if (pending.reactors?.includes(user.id) && !pending.reacted[user.id]) {
        pending.reacted[user.id] = "intervened";
      }
      inv.splice(idx, 1);
      user.inventory = inv;
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
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "beard_back") {
      if (!isYourTurn || next.pending) {
        return { state, events: [], error: "Kan bara användas innan du slår rörelsetärning" };
      }
      user.nextMoveBonus = (user.nextMoveBonus ?? 0) + 2;
      log(next, `${user.name} använder Skägget rakt bak: +2 steg på nästa rörelseslag.`);
      inv.splice(idx, 1);
      user.inventory = inv;
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
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "pretzel_snack") {
      const before = user.hp;
      user.hp = Math.min(user.maxHp, user.hp + 2);
      log(next, `${user.name} äter en brezel (+${user.hp - before} HP).`);
      inv.splice(idx, 1);
      user.inventory = inv;
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "coin_purse") {
      user.gold += 4;
      log(next, `${user.name} använder en penningpung (+4 pant).`);
      inv.splice(idx, 1);
      user.inventory = inv;
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
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "beer_bro") {
      const pending = next.pending;
      if (!pending || pending.type !== "combat" || pending.phase !== "reactions") {
        return { state, events: [], error: "Kan bara användas under stridsreaktioner" };
      }
      if (pending.assistId) return { state, events: [], error: "En Ölkompis hjälper redan" };
      pending.assistId = user.id;
      log(next, `${user.name} blir en Ölkompis och hänger på i striden!`);
      pending.reacted ??= {};
      if (pending.reactors?.includes(user.id) && !pending.reacted[user.id]) pending.reacted[user.id] = "intervened";
      inv.splice(idx, 1);
      user.inventory = inv;
      return { state: next, events: ["state"] };
    }

    return { state, events: [], error: "Okänt föremål" };
  }

  if (action.type === "combatRoll" && next.pending?.type === "combat" && next.pending.phase === "reactions") {
    const pending = next.pending;
    const isTeamBattle = !!pending.teamBattleRequired && !!pending.assistId;
    const canRollForTeam =
      action.playerId === pending.attackerId || (isTeamBattle && action.playerId === pending.assistId);
    if (!canRollForTeam) return { state, events: [], error: "Du är inte med i den här striden" };
    if (action.playerId !== cp.id && !(isTeamBattle && action.playerId === pending.assistId)) {
      return { state, events: [], error: "Inte din tur" };
    }
    // If there are eligible reactors, wait until everyone has either passed or intervened.
    const reactors = pending.reactors ?? [];
    const reacted = pending.reacted ?? {};
    const allDone = reactors.every((id) => reacted[id] === "pass");
    const reactionsTimedOut =
      (pending.reactionsDeadlineAt ?? 0) > 0 && Date.now() > (pending.reactionsDeadlineAt ?? 0);
    if (reactors.length > 0 && !allDone && !reactionsTimedOut) {
      return { state, events: [], error: "Waiting for other players" };
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
    const mod = pending.attackMods?.[roller.id] ?? 0;
    const die = rollDie(rng, 6);
    const total = die + weaponPower(roller) + mod;

    pending.teamRolls ??= {};
    if (pending.teamRolls[action.playerId]) return { state, events: [], error: "Du har redan slagit" };
    pending.teamRolls[action.playerId] = { die, total };

    if (isTeamBattle) {
      const aRoll = pending.teamRolls[pending.attackerId];
      const bRoll = pending.assistId ? pending.teamRolls[pending.assistId] : undefined;
      if (!aRoll || !bRoll) {
        return { state: next, events: ["state"] };
      }
    }

    const p = next.players.find((x) => x.id === pending.attackerId);
    if (!p) return { state, events: [], error: "Player not found" };
    const attackerRoll = pending.teamRolls[pending.attackerId]!;
    const assistId = pending.assistId;
    if (!isTeamBattle && assistId && !pending.teamRolls[assistId]) {
      const bro = next.players.find((x) => x.id === assistId) ?? null;
      if (bro) {
        const broMod = pending.attackMods?.[bro.id] ?? 0;
        const broDie = rollDie(rng, 6);
        pending.teamRolls[assistId] = { die: broDie, total: broDie + weaponPower(bro) + broMod };
      }
    }
    const assistRollObj = assistId ? pending.teamRolls[assistId] : undefined;
    const prBase = attackerRoll.total;
    const assistRoll = assistRollObj?.total ?? null;
    const previewBroDie = assistRollObj?.die ?? null;
    const pr = prBase + (assistRoll ?? 0);
    const need = pending.need + (pending.needMod ?? 0);

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
      previewBroDie,
      previewPrBase: prBase,
      previewAssistRoll: assistRoll,
      previewTotal: pr,
      previewNeed: need,
      previewWon: pr >= need,
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
    if (!next.pending && next.phase === "playing") advanceTurn(next);
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
      if (!next.pending && next.phase === "playing") advanceTurn(next);
      return { state: next, events: ["state"] };
    }
    next.pending = null;
    if (next.phase === "playing") advanceTurn(next);
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
        if (next.phase === "playing") advanceTurn(next);
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
    applyEffects({ state: next, player: p, effects: choice.effects ?? [], rng });
    log(next, `${p.name} chooses: ${choice.label}.`);

    // Uppdatera korttexten med resultat, och vänta på bekräftelse.
    next.pending = {
      ...pending,
      choices: undefined,
      text:
        `${def.text}\nChoice: ${choice.label}` +
        formatSelfStatDeltas(beforeGold, p.gold, beforeHp, p.hp, beforeKlunk, p.klunkar),
    };
    return { state: next, events: ["state"] };
  }

  if (action.type === "chooseEncounter" && next.pending?.type === "encounterChoice") {
    const pending = next.pending;
    if (action.playerId !== pending.moverId) {
      return { state, events: [], error: "Only the active player can choose" };
    }
    const mover = next.players.find((p) => p.id === pending.moverId);
    if (!mover) return { state, events: [], error: "Player not found" };
    const opp = next.players.find((p) => p.id === pending.opponentId);
    if (!opp) return { state, events: [], error: "Opponent not found" };

    if (action.choice === "tile") {
      log(next, `${mover.name} chooses the tile (no PvP).`);
      next.pending = null;
      resolveTileLanding(next, mover, rng);
      if (!next.pending && next.phase === "playing") advanceTurn(next);
      return { state: next, events: ["state"] };
    }

    log(next, `${mover.name} challenges ${opp.name} to PvP!`);
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
    const die = rollDie(rng, 6);
    const total = die + weaponPower(p);
    pending.rolls[action.playerId] = { die, total };
    log(next, `${p.name} rolls for PvP: ${die} (total ${total}).`);

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
      pending.winnerId = winner.id;
      pending.loserId = loser.id;
      pending.phase = "chooseLoot";
      pending.resolvedTotals = { attackerTotal: ar, defenderTotal: dr };
      log(next, `PvP: ${attacker.name} (${ar}) vs ${defender.name} (${dr}) — ${winner.name} vinner!`);
    }

    return { state: next, events: ["state"] };
  }

  if (action.type === "merchantBuy" && next.pending?.type === "merchant") {
    if (action.playerId !== next.pending.playerId) {
      return { state, events: [], error: "Inte din handlare" };
    }
    const p = next.players.find((x) => x.id === action.playerId);
    if (!p) return { state, events: [], error: "Player not found" };
    if (action.itemId === null) {
      log(next, `${p.name} leaves the merchant.`);
      next.pending = null;
      advanceTurn(next);
      return { state: next, events: ["state"] };
    }
    const item = next.pending.items.find((i) => i.id === action.itemId);
    if (!item) return { state, events: [], error: "Ogiltigt föremål" };
    if (p.gold < item.price) return { state, events: [], error: "För lite pant" };
    p.gold -= item.price;
    if (item.slot === "weapon") {
      p.equipment.weapon = { name: item.name, power: item.power ?? 1 };
    } else if (item.slot === "armor") {
      p.equipment.armor = {
        name: item.name,
        bonusHp: item.bonusHp ?? 0,
        damageNegate: item.damageNegate,
        negateAllOnce: item.negateAllOnce,
      };
      p.maxHp = maxHpFor(p);
      p.hp = Math.min(p.hp + 2, p.maxHp);
    } else if (item.slot === "helmet") {
      p.equipment.helmet = { name: item.name, combatBonus: 1, damageNegate: item.damageNegate };
    } else if (item.slot === "accessory") {
      p.equipment.accessory = { name: item.name, damageNegate: item.damageNegate, moveBonus: item.moveBonus };
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
      return { state, events: [], error: "Inte din dörr" };
    }
    const p = next.players.find((x) => x.id === action.playerId);
    if (!p) return { state, events: [], error: "Player not found" };
    const costs = next.pending.costs;
    if (action.method === "gold") {
      if (p.gold < costs.gold) return { state, events: [], error: "För lite pant" };
      p.gold -= costs.gold;
      p.levelIndex = next.pending.targetLevelIndex;
      p.tileIndex = 0;
      log(next, `${p.name} betalar ${costs.gold} pant och går upp till nivå ${p.levelIndex + 1}.`);
    } else if (action.method === "sips") {
      if (p.klunkar < costs.sips) return { state, events: [], error: "För få klunkar" };
      // Requirement-based: does not consume sips.
      p.levelIndex = next.pending.targetLevelIndex;
      p.tileIndex = 0;
      log(next, `${p.name} har ${p.klunkar} klunkar och går upp till nivå ${p.levelIndex + 1}.`);
    } else {
      log(next, `${p.name} stannar.`);
    }
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
    if (action.choice === "gold") {
      const steal = Math.min(5, loser.gold);
      loser.gold -= steal;
      winner.gold += steal;
      log(next, `${winner.name} tar ${steal} pant från ${loser.name}.`);
    } else if (action.choice === "sip") {
      loser.klunkar += 1;
      pushSipNotice(next, loser.id, winner.name);
      log(next, `${winner.name} ger ${loser.name} en straffklunk (+1 klunk).`);
    } else {
      const slot = action.choice;
      const validSlots = ["weapon", "armor", "helmet", "accessory"] as const;
      if (!validSlots.includes(slot as any)) {
        return { state, events: [], error: "Ogiltigt byte" };
      }
      const piece = loser.equipment[slot];
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
      } else {
        const steal = Math.min(3, loser.gold);
        loser.gold -= steal;
        winner.gold += steal;
        log(next, `${winner.name} hittade inget i den platsen — tar ${steal} pant i stället.`);
      }
    }
    next.pending = null;
    advanceTurn(next);
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

  const dice = rollDie(rng, 6);
  const bonus = moveBonusSteps(cp) + (cp.nextMoveBonus ?? 0);
  cp.nextMoveBonus = 0;
  const totalDice = dice + bonus;
  next.lastDiceRoll = totalDice;
  next.lastDiceRollerId = cp.id;
  const level = next.levels[cp.levelIndex];
  if (!level) return { state, events: [], error: "Level not found" };
  const n = level.tiles.length;
  const cw = (cp.tileIndex + totalDice) % n;
  const ccw = (cp.tileIndex - (totalDice % n) + n) % n;
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

function advanceTurn(state: GameState): void {
  if (state.phase !== "playing") return;
  for (let i = 0; i < state.turnOrder.length; i++) {
    state.currentTurnIndex = (state.currentTurnIndex + 1) % state.turnOrder.length;
    const n = currentPlayer(state);
    if (!n) continue;
    if ((n.skippedTurns ?? 0) > 0) {
      n.skippedTurns -= 1;
      log(state, `— ${n.name} skips a turn —`);
      continue;
    }
    log(state, `— ${n.name}'s turn —`);
    break;
  }
}
