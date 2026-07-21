import {
  isValidPlayerAvatar,
  normalizePlayerAvatar,
  randomPlayerAvatar,
  type PlayerAvatar,
} from "./avatar.js";
import { findBossTileIndexInLevel, generateLevels } from "./board.js";
import { DEV_QUICK_BOSS_TEST } from "./devBossTest.js";
import { brewerLevelFromXp, xpThresholdForBrewerLevel } from "./brewerXp.js";
import { dismissInvalidLevelUpOffersForPlayer } from "./levelUpOffer.js";
import { createRng, fnv1a32, pick, rollDie, stableStringify } from "./rng.js";
import { applyEffects, tryGrantRandomEquipmentOrOffer } from "./cards/effects.js";
import { appendTextForGrantedItem, artKeyForGrantedItem } from "./cards/grantedItemText.js";
import type { EffectApplyOut } from "./cards/types.js";
import {
  allCards,
  drawFromDeck,
  getCard,
  itemDeckItemIdsForRandomGrant,
  itemDisplayTitle,
} from "./cards/db.js";
import { CANMAN_DRAWS_INITIAL, createItemInstance } from "./itemInstance.js";
import {
  FINAL_BOSS_IDS,
  FINAL_BOSS_LIFE_TOTAL,
  isFinalBossMonsterId,
  isStandardMonsterId,
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
import {
  monsterCombatEquipmentAttackBonus,
  pvpEquipmentDieBonusTotal,
  sipWeaponExtraAttackCosts,
} from "./weaponPower.js";
import { clockwiseTileIndex, counterClockwiseTileIndex } from "./ringMovement.js";
import { EQUIPMENT_CATALOG, type EquipmentShopItem } from "./equipmentDefs.js";
import { playerMaxHpFromBase } from "./playerMaxHp.js";
import {
  applyBrewerPerkChoice,
  availableBrewerPerkChoices,
  consumeExhaustedBrewerPerkLevels,
  isBrewerPerkChoiceAvailable,
  normalizeBrewerPerkProgress,
  resetBrewerPerkProgress,
  finishBrewerPerkChoicePrompt,
  pendingBelongsToPlayer,
  recordBrewerLevelUpsAfterXp,
  tryOpenBrewerPerkChoice,
} from "./brewerPerk.js";
import { grantKlunkWithXp } from "./klunkGrant.js";
import { effectiveMerchantBuyPrice } from "./merchantBuyPrice.js";
import {
  combatItemToMerchantShopItem,
  filterMerchantSellableCombatItems,
  isLastBoardLevel,
  START_COMBAT_BUFF_ITEM_IDS,
  START_COMBAT_DEBUFF_ITEM_IDS,
  taproomKeyAllowedInMerchant,
  taproomKeyMerchantShopItem,
} from "./merchantCombatItems.js";
import {
  PLASTBACK_ACCESSORY_NAME,
  TOM_FLASKA_CATALOG_ID,
  TOM_FLASKA_WEAPON_NAME,
  equipTomFlaskaFromPlastback,
  initPlastbackPack,
  plastbackAccessorySellPant,
  plastbackPackRemainingCount,
  syncPlastbackEmptyBottleSynergy,
  onPlayerEquipmentSlotCleared,
  takePlastbackPackBottle,
} from "./plastbackSynergy.js";
import {
  flushPenaltySipQueue,
  mergePenaltySipQueue,
  playerHasPendingSipNotice,
  pushPlayerNotice,
  pushSipNotice,
  recordKlunkBurstForSipNoticeAck,
  weaponBoostPenaltySipNoticeBody,
} from "./sipNotice.js";
import { formatSelfStatDeltas } from "./statDeltaText.js";
import {
  LOG_MESSAGE_KEYS,
  pushLogEntry,
} from "./logMessages.js";
import { combatReactionsAllAnswered } from "./combatReactionPhase.js";
import { combatReactorsFor, playerCanCombatIntervene } from "./combatReactors.js";
import {
  attackerCannotSelfNegativeCombatItem,
  lengraddadBlockedForCombatParticipant,
} from "./combatItemRestrictions.js";
import { combatItemAttackModForBoardLevel } from "./combatItemMods.js";
import { pendingAllowsShortcutTaproom } from "./canUseItem.js";
import { SHORTCUT_TELEPORT_GOLD_COST } from "./shortcutDisplayCost.js";
import {
  isPositiveHelpItemId,
  playerHasPvpPreRoundItem,
  PVP_PRE_ROUND_ITEM_IDS,
  PVP_ROLL_PHASE_ITEM_IDS,
} from "./itemRules.js";
import { flatItemUseAmount, playerTotalItemCardBonus } from "./itemCardBonus.js";
import {
  EMOTE_COOLDOWN_MS,
  isEmoteId,
  prunePlayerEmoteBursts,
} from "./emotes.js";
import {
  errorIfInactiveOtherPlayerTarget,
  isPlayerActiveInMatch,
  isPlayerOnBoard,
} from "./playerParticipation.js";
import {
  autoPassReactorsWithoutPlayableItems,
  beginCombatReactionsPhase,
  itemPlayGoldCost,
  effectiveItemPlayGoldCost,
  playerHasFreeInventoryItemPlay,
  playerHasCombatReactionPlayableItem,
} from "./combatReactionAutopass.js";
import type {
  Accessory,
  ApplyResult,
  ArmorPiece,
  ClientAction,
  CombatHelpContract,
  CombatLoseSummary,
  CombatWinSummary,
  EquipmentSlot,
  GameState,
  Helmet,
  ItemId,
  Pending,
  PenaltySipQueueEntry,
  Player,
  PlayerEmoteBurst,
  ShopItem,
  TableItemPlaySidePayload,
  Tile,
  Weapon,
} from "./types.js";
import { CONFIG_NUMERIC, clampConfigNumber } from "./configConstraints.js";
import {
  bumpKnockdown,
  DEFAULT_PLAYER_SESSION_STATS,
  ensurePlayerStats,
  recordHelpedCombatWin,
  recordItemConsumed,
  recordMonsterCombatDiceRoll,
  recordMonsterCombatLoss,
  recordMonsterCombatWin,
  recordPantSpent,
  recordPvpDiceRoll,
  recordPvpMatchOutcome,
} from "./sessionStats.js";

const MAX_PLAYERS = 8;
/** `true`: boss-ruta utan klunk/pant-ingång (QA). Sätt `false` när balans ska gälla. */
const SKIP_BOSS_RESOURCE_GATE = true;
const PLAYER_COLORS = [
  "#c41e3a",
  "#2563eb",
  "#16a34a",
  "#ca8a04",
  "#9333ea",
  "#db2777",
  "#ea580c",
  "#0891b2",
];
const DRAWABLE_CARD_ID_SET = new Set(
  allCards()
    .filter((card) => card.kind === "item" || card.kind === "event" || card.kind === "rest" || card.kind === "treasure" || card.kind === "empty")
    .map((card) => card.id),
);
const DEFAULT_CONFIG: GameState["config"] = {
  turnSeconds: CONFIG_NUMERIC.turnSeconds.default,
  reactionSeconds: CONFIG_NUMERIC.reactionSeconds.default,
  gameMode: "bossKill",
  difficulty: "folkol",
  hardcore: false,
  allowLateJoin: false,
  clearPlayersOnRematch: false,
  boardSize: "default",
  levelCount: 3,
  maxHp: CONFIG_NUMERIC.maxHp.default,
  startPant: CONFIG_NUMERIC.startPant.default,
  wakeLockBeforeStart: false,
  disabledCardIds: [],
  cardCover: "card1",
};

function normalizeConfig(state: GameState): void {
  state.config = {
    ...DEFAULT_CONFIG,
    ...state.config,
  };
  state.config.turnSeconds = clampConfigNumber("turnSeconds", state.config.turnSeconds);
  state.config.reactionSeconds = clampConfigNumber("reactionSeconds", state.config.reactionSeconds);
  state.config.levelCount = Math.max(1, Math.min(5, Math.floor(Number(state.config.levelCount || 3))));
  state.config.maxHp = clampConfigNumber("maxHp", state.config.maxHp);
  state.config.startPant = clampConfigNumber("startPant", state.config.startPant);
  if (!["lattol", "folkol", "starkol", "imperial"].includes(state.config.difficulty)) {
    state.config.difficulty = "folkol";
  }
  if (!["default", "large", "xlarge"].includes(state.config.boardSize)) {
    state.config.boardSize = "default";
  }
  const rawCover = String(state.config.cardCover ?? "").trim();
  const mappedLegacyCover =
    rawCover === "default" ? "card1" : rawCover === "alt1" ? "card2" : rawCover === "alt2" ? "card3" : rawCover;
  state.config.cardCover = mappedLegacyCover.length > 0 ? mappedLegacyCover.slice(0, 64) : "card1";
  state.config.hardcore = !!state.config.hardcore;
  state.config.allowLateJoin = !!state.config.allowLateJoin;
  state.config.clearPlayersOnRematch = !!state.config.clearPlayersOnRematch;
  state.config.wakeLockBeforeStart = !!state.config.wakeLockBeforeStart;
  state.config.disabledCardIds = Array.from(
    new Set((state.config.disabledCardIds ?? []).filter((id) => typeof id === "string" && DRAWABLE_CARD_ID_SET.has(id))),
  );
  for (const p of state.players) {
    if (!isValidPlayerAvatar(p.avatar)) {
      p.avatar = randomPlayerAvatar();
    } else {
      p.avatar = normalizePlayerAvatar(p.avatar);
    }
    normalizeBrewerPerkProgress(p);
  }
}

/** Efter snapshot/omstart/reconnect: synka perk/nivå-prompts med faktiskt läge. */
function reconcilePlayingPersonalPrompts(state: GameState): void {
  for (const p of state.players) {
    dismissInvalidLevelUpOffersForPlayer(state, p.id);
    if ((p.pendingBrewerPerkLevels ?? 0) <= 0) {
      if (
        state.offTurnPersonalPending?.type === "brewerPerkChoice" &&
        state.offTurnPersonalPending.playerId === p.id
      ) {
        state.offTurnPersonalPending = null;
      }
      if (state.pending?.type === "brewerPerkChoice" && state.pending.playerId === p.id) {
        finishBrewerPerkChoicePrompt(state, p.id);
      }
    }
  }
  for (const p of state.players) {
    if ((p.pendingBrewerPerkLevels ?? 0) > 0) {
      tryOpenBrewerPerkChoice(state, p.id);
    }
  }
  queueFirstBrewerDownIfNeeded(state);
  surfacePersonalPromptsForActivePlayer(state);
}

/** Normalisera inläst/sparad state (config, avatar, perk-prompts). */
export function normalizeLoadedGameState(state: GameState): void {
  normalizeConfig(state);
  if (state.gameStartedAt == null && (state.phase === "playing" || state.phase === "ended")) {
    const startLine = state.log.find((e) => e.message.includes("börjar!"));
    if (startLine) state.gameStartedAt = startLine.at;
  }
  if (state.phase === "playing") {
    reconcilePlayingPersonalPrompts(state);
  }
}

export function createEmptyLobby(roomCode: string): GameState {
  return {
    phase: "lobby",
    seed: 0,
    config: { ...DEFAULT_CONFIG },
    roomCode,
    players: [],
    turnOrder: [],
    currentTurnIndex: 0,
    levels: [],
    pending: null,
    log: [],
    winnerId: null,
    winnerName: null,
    gameStartedAt: null,
    goldenBeerCarrierId: null,
    finalBossMonsterId: null,
    finalBossLivesRemaining: null,
    bossFinaleExitStartedAt: null,
    treasureTaken: {},
    lastDiceRoll: null,
    lastDiceRollerId: null,
    sipNotices: [],
    playerEmoteBursts: [],
    playerKlunkBursts: [],
    combatEquipReplaceQueue: undefined,
  };
}

/** Efter avslutat parti: lobby med samma config/rumkod; rensar frivilligt lämnade spöken. */
export function returnToLobby(state: GameState): ApplyResult {
  if (state.phase !== "ended") {
    return { state, events: [], error: "Spelet är inte slut" };
  }
  const next = cloneState(state);
  const config = { ...next.config, disabledCardIds: [...(next.config.disabledCardIds ?? [])] };
  let players: Player[] = [];
  if (!config.clearPlayersOnRematch) {
    const kept = next.players.filter((p) => !p.leftVoluntarily);
    players = kept.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      avatar: p.avatar,
      isHost: p.isHost,
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
      stats: { ...DEFAULT_PLAYER_SESSION_STATS },
    }));
    const hostIdx = players.findIndex((p) => p.isHost);
    const soleHostIdx = hostIdx >= 0 ? hostIdx : 0;
    for (let i = 0; i < players.length; i++) {
      players[i]!.isHost = i === soleHostIdx;
    }
  }

  next.phase = "lobby";
  next.seed = 0;
  next.config = config;
  next.players = players;
  next.turnOrder = [];
  next.currentTurnIndex = 0;
  next.levels = [];
  next.pending = null;
  next.deferredPending = undefined;
  next.offTurnPersonalPending = undefined;
  next.winnerId = null;
  next.winnerName = null;
  next.gameStartedAt = null;
  next.goldenBeerCarrierId = null;
  next.finalBossMonsterId = null;
  next.finalBossLivesRemaining = null;
  next.bossFinaleExitStartedAt = null;
  next.treasureTaken = {};
  next.landingBypassEncounter = undefined;
  next.lastDiceRoll = null;
  next.lastDiceRollerId = null;
  next.sipNotices = [];
  next.tableItemPlayReveals = [];
  next.playerEmoteBursts = [];
  next.playerKlunkBursts = [];
  next.combatEquipReplaceQueue = undefined;
  next.stolenEquipmentEscrow = undefined;
  log(next, "Nytt spel — tillbaka till lobbyn med samma inställningar.", {
    key: LOG_MESSAGE_KEYS.gameReturnedToLobby,
  });
  return { state: next, events: ["lobbyUpdate"] };
}

function log(
  state: GameState,
  message: string,
  meta?: { key?: string; params?: Record<string, string | number> },
): void {
  pushLogEntry(state, { message, key: meta?.key, params: meta?.params });
}

/** Nästa t6 för spelaren: ev. fast sida från «Ett sjätte ölsinne», annars slump. */
function rollD6WithOptionalSixSense(player: Player, rng: () => number): { die: number; forced: boolean } {
  const f = player.nextForcedDieFace;
  if (typeof f === "number" && f >= 1 && f <= 6 && Number.isInteger(f)) {
    player.nextForcedDieFace = undefined;
    return { die: f, forced: true };
  }
  return { die: rollDie(rng, 6), forced: false };
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
  // OBS: undefined-fält försvinner i JSON och kan då inte "rensa" klientens tidigare värde vid stateDelta-merge.
  next.tableItemPlayReveals = [];
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

export const PVP_BEST_OF = 1;
/** Max pant vinnaren kan ta från förloraren vid BvB-byte (choice `gold`). */
export const PVP_LOOT_MAX_PANT = 10;

export function pvpLootPantStealAmount(loserGold: number): number {
  return Math.min(PVP_LOOT_MAX_PANT, Math.max(0, Math.floor(loserGold)));
}
/** Helande föremål som får spelas utan tur (ej under stupad bryggare / strid / BvB där charity blockeras nedan). */
const HEALING_ANYTIME_ITEM_IDS: ReadonlySet<ItemId> = new Set(["healing_potion", "pretzel_snack", "charity"]);

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
    log(state, "Båda duellanterna är redo — slagrundan startar.", {
      key: LOG_MESSAGE_KEYS.pvpDuelReady,
    });
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

/** Sant om spelaren kan spela minst ett positivt hjälpkort (pantkostnad räknas, t.ex. Manopositiv/Get Lucky). */
function playerHasPlayablePositiveHelpItem(player: Player): boolean {
  const inv = player.inventory ?? [];
  for (const it of inv) {
    if (!isPositiveHelpItemId(it.itemId)) continue;
    const cost = effectiveItemPlayGoldCost(player, it.itemId);
    if (cost > 0 && player.gold < cost) continue;
    return true;
  }
  return false;
}

function combatHelpCandidateIds(state: GameState, pending: Extract<Pending, { type: "combat" }>): string[] {
  return state.players
    .filter((pl) =>
      pl.id !== pending.attackerId &&
      pl.id !== pending.assistId &&
      !pl.eliminated &&
      pl.hp > 0 &&
      playerHasPlayablePositiveHelpItem(pl),
    )
    .map((pl) => pl.id);
}

function clearCombatHelpRequest(pending: Extract<Pending, { type: "combat" }>): void {
  pending.helpCandidateIds = undefined;
  pending.helpSelectedHelperId = undefined;
  pending.helpAccepted = undefined;
  pending.helpUsedPositiveItem = undefined;
  pending.helpContract = undefined;
  pending.helpProposedContract = undefined;
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
    log(state, `${player.name} får +${goldAdd} pant från Canman.`, {
      key: LOG_MESSAGE_KEYS.playerCanmanGold,
      params: { name: player.name, amount: goldAdd },
    });
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
      ? `Stiger ${p.name}: på våning ${floor} har dåliga batcher +${bonus} på styrkekrav i strid (endast det planet).`
      : `Om ${p.name} stiger: på våning ${floor} har dåliga batcher +${bonus} på styrkekrav i strid (endast det planet).`;
  log(state, line);
}

function logMonsterScaleAfterAscend(state: GameState, p: Player): void {
  const bonus = monsterNeedBonusForBoardLevel(p.levelIndex);
  if (bonus <= 0) return;
  log(
    state,
    `${p.name} är på våning ${p.levelIndex + 1} — dåliga batcher där har +${bonus} på styrkekrav (andra våningar oförändrade).`,
  );
}

/** Bryggnivåindex från XP (0-baserad, där UI visar +1). */
export function brewerLevel(p: Player): number {
  return brewerLevelFromXp(p.xp);
}

/** 0–1 progression inom aktuell bryggnivå enligt explicita XP-trösklar. */
export function brewerKlunkProgressRatio(xp: number): number {
  const totalXp = Math.max(0, Math.floor(xp));
  const lvl = brewerLevelFromXp(totalXp);
  const atLevelStart = xpThresholdForBrewerLevel(lvl);
  const atLevelEnd = xpThresholdForBrewerLevel(lvl + 1);
  const stepNeed = Math.max(1, atLevelEnd - atLevelStart);
  if (stepNeed <= 0) return 1;
  return Math.max(0, Math.min(1, (totalXp - atLevelStart) / stepNeed));
}

export function levelUpCostsForTargetLevel(targetLevelIndex: number): { gold: number; sips: number } {
  const step = Math.max(0, targetLevelIndex - 1);
  return {
    /** Pantkostnad: avstängd (nivå upp kostar 0). */
    gold: 0,
    /** Klunkar: dubbelt mot tidigare 5 + step*3. */
    sips: 10 + step * 6,
  };
}

/**
 * Klunkväg upp på brädet (kravläge, förbrukar inte klunkar): antingen uppfyllt klunkantal
 * eller bryggnivå (samma trösklar som UI) ≥ målvåningens visningsnivå (target+1).
 * Första våningen: 10 klunkar _eller_ bryggnivå 2 (8+ klunkar) — i linje med headern.
 */
export function canAscendByKlunkRequirement(_p: Player, _targetLevelIndex: number): boolean {
  return false;
}

function grantXp(state: GameState, p: Player, amount: number): number {
  const add = Math.max(0, Math.floor(amount));
  if (add <= 0) return 0;
  const xpBefore = p.xp;
  p.xp += add;
  recordBrewerLevelUpsAfterXp(state, p, xpBefore);
  return add;
}

function maxHpFor(state: GameState, p: Player): number {
  return playerMaxHpFromBase(state.config.maxHp, p);
}

function syncDynamicMaxHp(state: GameState): void {
  for (const p of state.players) {
    const nextMaxHp = maxHpFor(state, p);
    if (p.maxHp !== nextMaxHp) p.maxHp = nextMaxHp;
    if (p.hp > p.maxHp) p.hp = p.maxHp;
  }
}

/** Sätter utrustning från affär/skatt-byte (samma fält som `merchantBuy`). */
function equipShopLikeItemToPlayer(p: Player, item: ShopItem, baseMaxHp: number): void {
  if (item.slot === "weapon") {
    p.equipment.weapon = {
      name: item.name,
      power: item.power ?? 1,
      sipAttackBonus: item.sipAttackBonus,
      sipWeaponBonusGoldCost: item.sipWeaponBonusGoldCost,
      sipWeaponBonusKlunks: item.sipWeaponBonusKlunks,
      pvpDieBonus: item.pvpDieBonus,
      gainGoldOnWin: item.gainGoldOnWin,
      powerAtGold10: item.powerAtGold10,
      powerAtGold20: item.powerAtGold20,
      powerAtGold30: item.powerAtGold30,
      powerDynamicMax: item.powerDynamicMax,
      randomOtherDamageOnWin: item.randomOtherDamageOnWin,
      breakOnWin: item.breakOnWin,
      breakWinsRemaining: item.breakWinsRemaining,
      monsterLossSipReduction: item.monsterLossSipReduction,
      freeInventoryItemPlay: item.freeInventoryItemPlay,
    };
  } else if (item.slot === "armor") {
    p.equipment.armor = {
      name: item.name,
      bonusHp: item.bonusHp ?? 0,
      combatBonus: item.combatBonus ?? 0,
      damageNegate: item.damageNegate,
      bossDamageNegateBonus: item.bossDamageNegateBonus,
      negateAllOnce: item.negateAllOnce,
      pvpCannotBeChallenged: item.pvpCannotBeChallenged,
      pvpDieBonus: item.pvpDieBonus,
      gainGoldOnDamageTaken: item.gainGoldOnDamageTaken,
      healHpPerTurn: item.healHpPerTurn,
      itemCardBonus: item.itemCardBonus,
    };
    p.maxHp = playerMaxHpFromBase(baseMaxHp, p);
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
      itemCardBonus: item.itemCardBonus,
    };
    p.maxHp = playerMaxHpFromBase(baseMaxHp, p);
    const helmHp = item.bonusHp ?? 0;
    if (helmHp > 0) p.hp = Math.min(p.hp + helmHp, p.maxHp);
    else p.hp = Math.min(p.hp, p.maxHp);
  } else if (item.slot === "accessory") {
    p.equipment.accessory = {
      name: item.name,
      damageNegate: item.damageNegate,
      combatBonus: item.combatBonus,
      penaltySipExtra: item.penaltySipExtra,
      moveBonus: item.moveBonus,
      gainGoldPerCombat: item.gainGoldPerCombat,
      gainKlunkPerCombat: item.gainKlunkPerCombat,
      gainGoldPerPenaltyKlunk: item.gainGoldPerPenaltyKlunk,
      preventTheft: item.preventTheft,
      levelUpDiscountGold: item.levelUpDiscountGold,
      canSkipMonsterEncounter: item.canSkipMonsterEncounter,
      pvpDieBonus: item.pvpDieBonus,
      ignoreCombatCritFailOnOne: item.ignoreCombatCritFailOnOne,
      deathContinueCost: item.deathContinueCost,
      merchantDiscountGold: item.merchantDiscountGold,
      itemCardBonus: item.itemCardBonus,
    };
    if (item.name === PLASTBACK_ACCESSORY_NAME) initPlastbackPack(p.equipment.accessory);
  }
  syncPlastbackEmptyBottleSynergy(p);
}

/** Kopiera inkommen pjäs (stöld/PvP) till slot utan affär-/hels-specialfall */
function assignEquipmentPieceFromLoot(
  state: GameState,
  p: Player,
  slot: EquipmentSlot,
  piece: Weapon | ArmorPiece | Helmet | Accessory,
): void {
  const baseMaxHp = state.config.maxHp;
  if (slot === "weapon") {
    p.equipment.weapon = { ...(piece as Weapon) };
  } else if (slot === "armor") {
    p.equipment.armor = { ...(piece as ArmorPiece) };
    p.maxHp = playerMaxHpFromBase(baseMaxHp, p);
    if (p.hp > p.maxHp) p.hp = p.maxHp;
  } else if (slot === "helmet") {
    p.equipment.helmet = { ...(piece as Helmet) };
    p.maxHp = playerMaxHpFromBase(baseMaxHp, p);
    if (p.hp > p.maxHp) p.hp = p.maxHp;
  } else {
    p.equipment.accessory = { ...(piece as Accessory) };
    if (
      p.equipment.accessory.name === PLASTBACK_ACCESSORY_NAME &&
      p.equipment.accessory.plastbackPackRemaining == null
    ) {
      initPlastbackPack(p.equipment.accessory);
    }
  }
  syncPlastbackEmptyBottleSynergy(p);
}

function cloneEquipmentIncomingPiece(
  piece: Weapon | ArmorPiece | Helmet | Accessory,
): Weapon | ArmorPiece | Helmet | Accessory {
  return JSON.parse(JSON.stringify(piece)) as Weapon | ArmorPiece | Helmet | Accessory;
}

function setStolenEquipmentEscrow(
  state: GameState,
  thiefId: string,
  victimId: string,
  slot: EquipmentSlot,
  piece: Weapon | ArmorPiece | Helmet | Accessory,
): void {
  state.stolenEquipmentEscrow = {
    thiefId,
    victimId,
    slot,
    piece: cloneEquipmentIncomingPiece(piece),
    pieceName: piece.name ?? String(slot),
  };
}

function clearStolenEquipmentEscrow(state: GameState): void {
  state.stolenEquipmentEscrow = undefined;
}

/** Stulen utrustning som tjuven inte tar emot försvinner — lämnas aldrig tillbaka till offret. */
function discardStolenEquipmentEscrow(state: GameState, thiefName?: string): boolean {
  const esc = state.stolenEquipmentEscrow;
  if (!esc) return false;
  const thief = state.players.find((p) => p.id === esc.thiefId);
  const who = thiefName ?? thief?.name ?? "Spelaren";
  log(state, `${who} behåller sin gamla utrustning — ${esc.pieceName} förstörs.`);
  clearStolenEquipmentEscrow(state);
  return true;
}

function finishStealEquipmentReplaceDecision(
  state: GameState,
  thiefId: string,
  accept: boolean,
  offer: {
    slot: EquipmentSlot;
    newName: string;
    incomingPiece?: Weapon | ArmorPiece | Helmet | Accessory;
    returnVictimId?: string;
  },
): void {
  const esc = state.stolenEquipmentEscrow;
  const thief = state.players.find((p) => p.id === thiefId);
  if (esc && esc.thiefId === thiefId) {
    if (accept && thief) {
      assignEquipmentPieceFromLoot(state, thief, esc.slot, esc.piece);
      log(state, `${thief.name} byter ut sin ${esc.slot} mot ${esc.pieceName} (stöld).`);
    } else {
      discardStolenEquipmentEscrow(state, thief?.name);
      return;
    }
    clearStolenEquipmentEscrow(state);
    return;
  }
  if (accept && thief && offer.incomingPiece) {
    assignEquipmentPieceFromLoot(state, thief, offer.slot, offer.incomingPiece);
    log(state, `${thief.name} tar emot ${offer.newName} och kastar sin gamla ${offer.slot}-utrustning.`);
  } else if (!accept && offer.incomingPiece) {
    log(
      state,
      `${thief?.name ?? "Spelaren"} behåller sin gamla utrustning — ${offer.newName} förstörs.`,
    );
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
  return monsterCombatEquipmentAttackBonus(p);
}

function applyWeaponWinGoldBonus(winner: Player): number {
  const bonus = winner.equipment.weapon?.gainGoldOnWin ?? 0;
  if (bonus <= 0) return 0;
  winner.gold += bonus;
  return bonus;
}

function breakWeaponAfterWin(winner: Player): string | null {
  const w = winner.equipment.weapon;
  if (!w) return null;
  syncPlastbackEmptyBottleSynergy(winner);
  if (!w.breakOnWin) return null;
  const name = w.name;
  if (w.breakWinsRemaining != null) {
    w.breakWinsRemaining -= 1;
    if (w.breakWinsRemaining > 0) return null;
    winner.equipment.weapon = undefined;
    return name;
  }
  winner.equipment.weapon = undefined;
  return name;
}

function breakCombatWinParticipantWeapons(
  state: GameState,
  attackerId: string,
  assistId?: string,
): void {
  for (const id of [attackerId, assistId]) {
    if (!id) continue;
    const participant = state.players.find((x) => x.id === id);
    if (!participant) continue;
    const brokenWeaponName = breakWeaponAfterWin(participant);
    if (brokenWeaponName) {
      log(state, `${participant.name}s ${brokenWeaponName} går sönder efter vinsten.`);
    }
  }
}

function applyPerCombatAccessoryRewards(state: GameState, participantId: string) {
  const p = state.players.find((x) => x.id === participantId);
  if (!p) return;
  const acc = p.equipment.accessory;
  if (!acc) return;
  const goldGain = acc.gainGoldPerCombat ?? 0;
  const klunkGain = acc.gainKlunkPerCombat ?? 0;
  if (goldGain > 0) p.gold += goldGain;
  if (klunkGain > 0) grantKlunkWithXp(state, p, klunkGain, { penaltyStraff: false });
  if (goldGain > 0 || klunkGain > 0) {
    log(
      state,
      `${p.name} får bonus per strid: ${goldGain > 0 ? `+${goldGain} pant` : ""}${
        goldGain > 0 && klunkGain > 0 ? " och " : ""
      }${klunkGain > 0 ? `+${klunkGain} klunk` : ""}.`,
    );
  }
}

function applyPerCombatWeaponEconomy(state: GameState, participant: Player): void {
  const weaponName = participant.equipment.weapon?.name;
  if (weaponName !== "Burksvärd") return;
  const before = participant.gold;
  participant.gold = Math.max(0, participant.gold - 1);
  const spent = before - participant.gold;
  if (spent > 0) {
    recordPantSpent(state, participant.id, spent);
    log(state, `${participant.name} tappar 1 pant från Burksvärdets stridskostnad.`);
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

export function penaltySipTotalForPlayer(p: Player, baseCount: number): number {
  const base = Math.max(0, Math.floor(baseCount));
  if (base <= 0) return 0;
  return base + (p.equipment.helmet?.penaltySipExtra ?? 0) + (p.equipment.accessory?.penaltySipExtra ?? 0);
}

function isAfter2030(now = new Date()): boolean {
  const h = now.getHours();
  const m = now.getMinutes();
  return h > 20 || (h === 20 && m >= 30);
}

/** Stoorn (imperial_dragon_stout): vid monsterförlust tar övriga spelare på samma våning 1 skada vardera. */
function applySameLevelSplashDamage(state: GameState, loser: Player, dmg: number): boolean {
  const targets = state.players.filter(
    (pl) =>
      pl.id !== loser.id &&
      pl.levelIndex === loser.levelIndex &&
      !pl.eliminated &&
      !pl.leftVoluntarily,
  );
  for (const pl of targets) {
    const before = pl.hp;
    applyDamage({ state, player: pl, amount: dmg, log });
    log(state, `${pl.name} drabbas av Stoorns stänk på samma våning (HP ${before} → ${pl.hp}).`);
  }
  return targets.length > 0;
}

function removeRandomEquipment(p: Player, rng: () => number, baseMaxHp: number): string | null {
  const slots: Array<"weapon" | "armor" | "helmet" | "accessory"> = ["weapon", "armor", "helmet", "accessory"];
  const have = slots.filter((s) => !!p.equipment[s]);
  if (have.length === 0) return null;
  const chosen = pick(rng, have);
  const prev = p.equipment[chosen];
  const label = prev?.name ?? chosen;
  p.equipment[chosen] = undefined;
  if (chosen === "armor") {
    p.maxHp = playerMaxHpFromBase(baseMaxHp, p);
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


function newItemInstanceId(rng: () => number): string {
  return `it_${Date.now()}_${Math.floor(rng() * 1_000_000_000)}`;
}

function grantStartingCombatItemsForPlayer(state: GameState, player: Player, rng: () => number): void {
  const buffId = pick(rng, START_COMBAT_BUFF_ITEM_IDS);
  const debuffId = pick(rng, START_COMBAT_DEBUFF_ITEM_IDS);
  player.inventory ??= [];
  player.inventory.push(createItemInstance(buffId, newItemInstanceId(rng)));
  player.inventory.push(createItemInstance(debuffId, newItemInstanceId(rng)));
  log(
    state,
    `${player.name} får startföremål: ${itemDisplayTitle(buffId)} (+ i strid) och ${itemDisplayTitle(debuffId)} (− i strid).`,
  );
}

function grantStartingCombatItems(state: GameState, seed: number): void {
  let i = 0;
  for (const p of state.players) {
    const rng = createRng(seed ^ (0x5f3759df + i * 0x9e3779b9));
    i += 1;
    grantStartingCombatItemsForPlayer(state, p, rng);
  }
}

function grantRandomCombatRewardItem(
  state: GameState,
  player: Player,
  rng: () => number,
  sourceName: string,
): string {
  const disabledCardIds = new Set(state.config.disabledCardIds ?? []);
  const itemId = pick(
    rng,
    itemDeckItemIdsForRandomGrant(disabledCardIds, state.levels.length, player.levelIndex),
  );
  player.inventory ??= [];
  player.inventory.push(createItemInstance(itemId, newItemInstanceId(rng)));
  log(state, `${player.name} hittar ett föremål efter segern mot ${sourceName}.`);
  return itemDisplayTitle(itemId);
}

type CombatRewardGrant = {
  title: string;
  replaceOffer?: { slot: EquipmentSlot; catalogId: string; newName: string };
};

function enqueueCombatEquipReplaceOffer(
  state: GameState,
  playerId: string,
  offer: { slot: EquipmentSlot; catalogId: string; newName: string },
): void {
  const q = state.combatEquipReplaceQueue ?? [];
  q.push({ playerId, ...offer });
  state.combatEquipReplaceQueue = q;
}

function playerHasQueuedCombatLoot(state: GameState, playerId: string): boolean {
  return !!state.combatEquipReplaceQueue?.some((e) => e.playerId === playerId);
}

/** På aktiv spelares tur: deras stridsbyte ska ligga först i kön. */
function promoteQueuedCombatLootForPlayer(state: GameState, playerId: string): void {
  const q = state.combatEquipReplaceQueue;
  if (!q?.length || q[0]!.playerId === playerId) return;
  const mine = q.filter((e) => e.playerId === playerId);
  if (!mine.length) return;
  const rest = q.filter((e) => e.playerId !== playerId);
  state.combatEquipReplaceQueue = [...mine, ...rest];
}

/** Efter turskifte: visa stridsbyte på tur innan rörelsetärning. */
function surfaceActivePlayerCombatLoot(state: GameState): void {
  if (state.phase !== "playing") return;
  const cur = currentPlayer(state);
  if (!cur) return;
  promoteQueuedCombatLootForPlayer(state, cur.id);
  const promoteOffTurnForCurrent = () => {
    const off = state.offTurnPersonalPending;
    if (
      off?.type === "equipmentReplaceOffer" &&
      off.fromCombatLoot === true &&
      off.playerId === cur.id &&
      !state.pending
    ) {
      state.pending = off;
      state.offTurnPersonalPending = null;
      return true;
    }
    return false;
  };
  if (promoteOffTurnForCurrent()) return;
  if (!state.pending && !state.offTurnPersonalPending) {
    drainNextCombatEquipReplace(state);
    promoteOffTurnForCurrent();
  }
  surfacePersonalPromptsForActivePlayer(state);
}

/** Vid turskifte: visa bryggbonus / nivåval innan rörelsetärning. */
function surfacePersonalPromptsForActivePlayer(state: GameState): void {
  if (state.phase !== "playing") return;
  const cur = currentPlayer(state);
  if (!cur) return;
  const off = state.offTurnPersonalPending;
  if (
    off &&
    off.playerId === cur.id &&
    (off.type === "brewerPerkChoice" || off.type === "levelUpOffer")
  ) {
    if (!state.pending) {
      state.pending = off;
      state.offTurnPersonalPending = null;
    } else if (
      state.pending.type !== "brewerPerkChoice" &&
      state.pending.type !== "levelUpOffer" &&
      pendingBelongsToPlayer(state.pending, cur.id)
    ) {
      tryOpenBrewerPerkChoice(state, cur.id, log);
    }
  }
  if ((cur.pendingBrewerPerkLevels ?? 0) > 0) {
    tryOpenBrewerPerkChoice(state, cur.id, log);
  }
}

/** Innan rörelsetärning: städa stale perk/nivå-prompter utan att flytta off-turn nivåval till pending. */
function clearTurnStartPromptsBeforeRoll(state: GameState, playerId: string): void {
  const p = state.players.find((x) => x.id === playerId);
  if (!p) return;
  dismissInvalidLevelUpOffersForPlayer(state, playerId);
  if ((p.pendingBrewerPerkLevels ?? 0) <= 0) {
    if (
      state.offTurnPersonalPending?.type === "brewerPerkChoice" &&
      state.offTurnPersonalPending.playerId === playerId
    ) {
      state.offTurnPersonalPending = null;
    }
    if (state.pending?.type === "brewerPerkChoice" && state.pending.playerId === playerId) {
      finishBrewerPerkChoicePrompt(state, playerId);
    }
  } else {
    tryOpenBrewerPerkChoice(state, playerId, log);
  }
}

function drainNextCombatEquipReplace(next: GameState): void {
  if (next.stolenEquipmentEscrow) discardStolenEquipmentEscrow(next);
  const q = next.combatEquipReplaceQueue;
  if (!q?.length) {
    next.combatEquipReplaceQueue = undefined;
    return;
  }
  const head = q[0]!;
  next.combatEquipReplaceQueue = q.length > 1 ? q.slice(1) : undefined;
  next.offTurnPersonalPending = {
    type: "equipmentReplaceOffer",
    playerId: head.playerId,
    slot: head.slot,
    catalogId: head.catalogId,
    newName: head.newName,
    fromCombatLoot: true,
  };
}

function grantRandomCombatReward(
  state: GameState,
  player: Player,
  rng: () => number,
  sourceName: string,
  winMonsterId?: MonsterId,
): CombatRewardGrant {
  if (winMonsterId === "bottling_bot" && rng() < 0.5) {
    const rallySlots: Array<"weapon" | "helmet"> = [];
    if (!player.equipment.weapon) rallySlots.push("weapon");
    if (!player.equipment.helmet) rallySlots.push("helmet");
    if (rallySlots.length > 0) {
      const slot = pick(rng, rallySlots);
      if (slot === "weapon") {
        player.equipment.weapon = { name: "Robotarm", power: 0, pvpDieBonus: 1 };
        log(state, `${player.name} får Robotarm efter segern mot ${sourceName}!`);
        return { title: "Robotarm" };
      }
      player.equipment.helmet = { name: "Robothjälm", damageNegate: 1, combatBonus: 0 };
      log(state, `${player.name} får Robothjälm efter segern mot ${sourceName}!`);
      return { title: "Robothjälm" };
    }
  }
  if (winMonsterId === "rabarbar" && rng() < 0.5) {
    const rabarbarSlots: Array<"weapon" | "helmet"> = [];
    if (!player.equipment.weapon) rabarbarSlots.push("weapon");
    if (!player.equipment.helmet) rabarbarSlots.push("helmet");
    if (rabarbarSlots.length > 0) {
      const slot = pick(rng, rabarbarSlots);
      if (slot === "weapon") {
        player.equipment.weapon = { name: "Rabarbersvärd", power: 3 };
        log(state, `${player.name} får Rabarbersvärd efter segern mot ${sourceName}!`);
        return { title: "Rabarbersvärd" };
      }
      player.equipment.helmet = { name: "Körsbärshjälm", pvpDieBonus: 3, combatBonus: 0 };
      log(state, `${player.name} får Körsbärshjälm efter segern mot ${sourceName}!`);
      return { title: "Körsbärshjälm" };
    }
  }
  const equipmentRoll = rng() < 0.45;
  if (equipmentRoll) {
    const equipRoll = tryGrantRandomEquipmentOrOffer(player, rng, state.config.maxHp);
    if (equipRoll?.kind === "equipped") {
      log(state, `${player.name} hittar utrustning efter segern mot ${sourceName}: ${equipRoll.name}.`);
      return { title: equipRoll.name };
    }
    if (equipRoll?.kind === "offer") {
      log(
        state,
        `${player.name} hittar utrustning efter segern mot ${sourceName}: ${equipRoll.name} (byte erbjuds).`,
      );
      return {
        title: equipRoll.name,
        replaceOffer: {
          slot: equipRoll.slot,
          catalogId: equipRoll.catalogId,
          newName: equipRoll.name,
        },
      };
    }
  }
  return { title: grantRandomCombatRewardItem(state, player, rng, sourceName) };
}

export function computeMonsterDamage(
  monsterId: MonsterId,
  p: Player,
  die: number,
  /** Kapten Interrobang / Sura bär: true = take sip for reduced damage, false = full base damage */
  sipMitigation?: boolean,
): { damage: number; redirected: boolean } {
  const levelDmg = isStandardMonsterId(monsterId) ? monsterNeedBonusForBoardLevel(p.levelIndex) : 0;
  const def = MONSTERS.find((m) => m.id === monsterId);
  let raw: number;
  let redirected = false;
  if (monsterId === "skum_banan") {
    const base = def?.baseDamage ?? 2;
    raw = isAfter2030() ? base + 1 : base;
  } else if (monsterId === "folke_bengtsson") {
    raw = p.klunkar > 5 ? 3 : 1;
  } else if (monsterId === "kapten_interrobang") {
    const base = def?.baseDamage ?? 3;
    raw = sipMitigation === true ? Math.max(0, base - 3) : base;
  } else if (monsterId === "transporter") {
    if (sipMitigation === true) {
      return { damage: 0, redirected: false };
    }
    const base = def?.baseDamage ?? 3;
    raw = base;
  } else if (monsterId === "sura_bar") {
    const base = def?.baseDamage ?? 3;
    raw = sipMitigation === true ? Math.max(0, base - 2) : base;
  } else if (monsterId === "rabarbapappa" && die === 1) {
    raw = 3;
    redirected = true;
  } else {
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
    bossFinalWin?: { winnerName: string; bossName: string; roundLabel: string };
    equipmentReplaceOffer?: { slot: EquipmentSlot; catalogId?: string; newName: string };
    queuedPenaltySipNotices?: PenaltySipQueueEntry[];
    tableOutcomes?: import("./eventTableOutcomes.js").EventTableOutcome[];
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
    bossFinalWin: params.bossFinalWin,
    equipmentReplaceOffer: params.equipmentReplaceOffer,
    queuedPenaltySipNotices: params.queuedPenaltySipNotices,
    tableOutcomes: params.tableOutcomes,
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
      o.player.maxHp = maxHpFor(state, o.player);
      if (o.player.hp > o.player.maxHp) o.player.hp = o.player.maxHp;
    }
    onPlayerEquipmentSlotCleared(o.player, slot);
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
      const before = pl.gold;
      pl.gold = Math.max(0, pl.gold - 1);
      recordPantSpent(state, pl.id, before - pl.gold);
    }
    logFn(state, "Alla spelare tappar 1 pant (Den store narcissus).");
  } else if (monsterId === "oldomaren") {
    for (const pl of state.players) {
      if (pl.eliminated) continue;
      const gain = penaltySipTotalForPlayer(pl, 1);
      grantKlunkWithXp(state, pl, gain, { penaltyStraff: true });
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
  attackerIgnoresCritFailOnOne = false,
  broIgnoresCritFailOnOne = false,
): boolean {
  if (assistId) {
    if (attackerIgnoresCritFailOnOne || broIgnoresCritFailOnOne) return false;
    return attackerDie === 1 && broDie === 1;
  }
  if (attackerIgnoresCritFailOnOne) return false;
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
    /** Stridshjälp (positiva kort): samma HP-/klunk-risk som ölkompis vid förlust; aldrig samma id som assistId. */
    helpMateId?: string;
    teamBattleRequired?: boolean;
    enemyName: string;
    sipMitigation: boolean;
    /** Etta solo, eller båda ettor med assist — förlust oavsett total mot styrka. */
    critFailOnOne?: boolean;
    /** Pip-vapen: valfri straffklunk togs före tärningsslaget. */
    weaponSipBeforeRoll?: boolean;
    /** Klunk(ar) som redan tilldelats för vapen-sip (visas separat på förlustkortet). */
    weaponSipKlunkCost?: number;
    /** Straffklunk-notiser (vapen-klunk) efter att förlustkortet bekräftats. */
    queuedPenaltySipNotices?: PenaltySipQueueEntry[];
    /** Get Lucky: spelare med dubbel HP-skada vid förlust i denna strid. */
    getLuckyRiskPlayerIds?: string[];
  },
  log: (s: GameState, m: string) => void,
  rng: () => number,
): void {
  const { p, tile, monsterId, die, pr, need, assistRoll, assistId } = ctx;
  let assistImpactPlayerId: string | undefined;
  let assistHpLost = 0;
  let assistKlunksGained = 0;
  let helpMateImpactPlayerId: string | undefined;
  let helpMateHpLost = 0;
  let helpMateKlunksGained = 0;
  recordMonsterCombatLoss(next, p.id, assistId);
  const before = p.hp;
  const beforeSips = p.klunkar;
  const sipForMonster =
    monsterId === "kapten_interrobang" || monsterId === "sura_bar" || monsterId === "transporter"
      ? ctx.sipMitigation
      : undefined;
  const dmgOut = computeMonsterDamage(monsterId, p, die, sipForMonster);
  const isBossHit = tile.type === "boss";
  let redirectedTargetName: string | null = null;
  let attackerRawDamage = 0;
  let attackerBlockedDamage = 0;

  if (monsterId === "rabarbapappa" && dmgOut.redirected && next.players.length > 1) {
    const others = next.players.filter((x) => x.id !== p.id && isPlayerActiveInMatch(x));
    if (others.length > 0) {
      const target = pick(rng, others);
      redirectedTargetName = target.name;
      const tb = target.hp;
      const dmgTarget = computeMonsterDamage(monsterId, target, die, sipForMonster);
      applyDamage({ state: next, player: target, amount: dmgTarget.damage, log });
      log(next, `${p.name} slog 1 — Rabarbapappan missar och träffar ${target.name} i stället (HP ${tb} → ${target.hp}).`);
    } else {
      const attackerDamageDoubled = ctx.getLuckyRiskPlayerIds?.includes(p.id) ?? false;
      const attackerDamage = attackerDamageDoubled ? dmgOut.damage * 2 : dmgOut.damage;
      attackerRawDamage = Math.max(0, Math.floor(attackerDamage));
      const attackerDamageResult = applyDamage({ state: next, player: p, amount: attackerDamage, isBossHit, log });
      attackerBlockedDamage = attackerDamageResult.prevented;
      if (attackerDamageDoubled) {
        log(next, `${p.name} pressade med Get Lucky och tar dubbel HP-skada (${attackerDamage}).`);
      }
      log(next, `${p.name} slog 1 — Rabarbapappan missar men ingen annan aktiv spelare finns att träffa.`);
    }
  } else {
    const attackerDamageDoubled = ctx.getLuckyRiskPlayerIds?.includes(p.id) ?? false;
    const attackerDamage = attackerDamageDoubled ? dmgOut.damage * 2 : dmgOut.damage;
    attackerRawDamage = Math.max(0, Math.floor(attackerDamage));
    const attackerDamageResult = applyDamage({ state: next, player: p, amount: attackerDamage, isBossHit, log });
    attackerBlockedDamage = attackerDamageResult.prevented;
    if (attackerDamageDoubled) {
      log(next, `${p.name} pressade med Get Lucky och tar dubbel HP-skada (${attackerDamage}).`);
    } else if (assistId && before !== p.hp) {
      log(next, `${p.name} tar skada (HP ${before} → ${p.hp}).`);
    }
  }
  if (assistId) {
    const bro = next.players.find((x) => x.id === assistId) ?? null;
    if (bro) {
      const dmgBro = computeMonsterDamage(monsterId, bro, die, sipForMonster);
      const bb = bro.hp;
      const assistDamageDoubled = ctx.getLuckyRiskPlayerIds?.includes(bro.id) ?? false;
      const assistDamage = assistDamageDoubled ? dmgBro.damage * 2 : dmgBro.damage;
      applyDamage({ state: next, player: bro, amount: assistDamage, isBossHit, log });
      assistImpactPlayerId = bro.id;
      assistHpLost = Math.max(0, bb - bro.hp);
      if (assistDamageDoubled) {
        log(next, `${bro.name} pressade med Get Lucky och tar dubbel HP-skada (${assistDamage}).`);
      } else if (bb !== bro.hp) {
        log(next, `${bro.name} tar också skada (HP ${bb} → ${bro.hp}).`);
      }
    }
  }
  if (ctx.helpMateId && ctx.helpMateId !== assistId) {
    const hm = next.players.find((x) => x.id === ctx.helpMateId) ?? null;
    if (hm) {
      const dmgHm = computeMonsterDamage(monsterId, hm, die, sipForMonster);
      const hh = hm.hp;
      const helpDamageDoubled = ctx.getLuckyRiskPlayerIds?.includes(hm.id) ?? false;
      const helpDamage = helpDamageDoubled ? dmgHm.damage * 2 : dmgHm.damage;
      applyDamage({ state: next, player: hm, amount: helpDamage, isBossHit, log });
      helpMateImpactPlayerId = hm.id;
      helpMateHpLost = Math.max(0, hh - hm.hp);
      if (helpDamageDoubled) {
        log(next, `${hm.name} pressade med Get Lucky och tar dubbel HP-skada (${helpDamage}).`);
      } else if (hh !== hm.hp) {
        log(next, `${hm.name} tar skada som hjälpare (HP ${hh} → ${hm.hp}).`);
      }
    }
  }

  const def = MONSTERS.find((m) => m.id === monsterId);
  const lossSips = (def?.lossSipsOnLose ?? 0) + MONSTER_LOSS_SIP_FLAT;
  /** En körad per mottagare — annars visar straffklunk-modalen bara första posten (fel antal vid team battle +1). */
  const totalLossSipsBeforeReduction = lossSips + (ctx.teamBattleRequired ? 1 : 0);
  const primaryWeaponReduction = Math.max(0, Math.floor(p.equipment.weapon?.monsterLossSipReduction ?? 0));
  const totalLossSips = Math.max(0, totalLossSipsBeforeReduction - primaryWeaponReduction);
  if (primaryWeaponReduction > 0 && totalLossSipsBeforeReduction > totalLossSips) {
    pushLogEntry(next, {
      message: `${p.name}s ${p.equipment.weapon?.name ?? "vapen"} mildrar straffklunken vid förlust (−${primaryWeaponReduction}).`,
      key: LOG_MESSAGE_KEYS.combatWeaponSipReduction,
      params: {
        name: p.name,
        weaponName: p.equipment.weapon?.name ?? "vapen",
        reduction: primaryWeaponReduction,
      },
    });
  }
  const mitigationKlunk = monsterId === "sura_bar" && ctx.sipMitigation ? 1 : 0;
  const primaryLossApplied = penaltySipTotalForPlayer(p, totalLossSips);
  grantKlunkWithXp(next, p, primaryLossApplied, { penaltyStraff: true });
  if (mitigationKlunk) grantKlunkWithXp(next, p, mitigationKlunk, { penaltyStraff: true });
  const sipNoticeKlunks = primaryLossApplied + mitigationKlunk;
  pushSipNotice(next, p.id, ctx.enemyName, sipNoticeKlunks);
  if (assistId) {
    const bro = next.players.find((x) => x.id === assistId) ?? null;
    if (bro) {
      const broKlunksBeforeLoss = bro.klunkar;
      const broWeaponReduction = Math.max(0, Math.floor(bro.equipment.weapon?.monsterLossSipReduction ?? 0));
      const broTotalLossSips = Math.max(0, totalLossSipsBeforeReduction - broWeaponReduction);
      if (broWeaponReduction > 0 && totalLossSipsBeforeReduction > broTotalLossSips) {
        pushLogEntry(next, {
          message: `${bro.name}s ${bro.equipment.weapon?.name ?? "vapen"} mildrar straffklunken vid förlust (−${broWeaponReduction}).`,
          key: LOG_MESSAGE_KEYS.combatWeaponSipReduction,
          params: {
            name: bro.name,
            weaponName: bro.equipment.weapon?.name ?? "vapen",
            reduction: broWeaponReduction,
          },
        });
      }
      const broLossApplied = penaltySipTotalForPlayer(bro, broTotalLossSips);
      grantKlunkWithXp(next, bro, broLossApplied, { penaltyStraff: true });
      pushSipNotice(next, bro.id, ctx.enemyName, broLossApplied);
      assistKlunksGained = Math.max(0, bro.klunkar - broKlunksBeforeLoss);
    }
  }
  if (ctx.helpMateId && ctx.helpMateId !== assistId) {
    const hm = next.players.find((x) => x.id === ctx.helpMateId) ?? null;
    if (hm) {
      const hmKlunksBeforeLoss = hm.klunkar;
      const hmWeaponReduction = Math.max(0, Math.floor(hm.equipment.weapon?.monsterLossSipReduction ?? 0));
      const hmTotalLossSips = Math.max(0, totalLossSipsBeforeReduction - hmWeaponReduction);
      if (hmWeaponReduction > 0 && totalLossSipsBeforeReduction > hmTotalLossSips) {
        pushLogEntry(next, {
          message: `${hm.name}s ${hm.equipment.weapon?.name ?? "vapen"} mildrar straffklunken vid förlust (−${hmWeaponReduction}).`,
          key: LOG_MESSAGE_KEYS.combatWeaponSipReduction,
          params: {
            name: hm.name,
            weaponName: hm.equipment.weapon?.name ?? "vapen",
            reduction: hmWeaponReduction,
          },
        });
      }
      const hmLossApplied = penaltySipTotalForPlayer(hm, hmTotalLossSips);
      grantKlunkWithXp(next, hm, hmLossApplied, { penaltyStraff: true });
      pushSipNotice(next, hm.id, ctx.enemyName, hmLossApplied);
      helpMateKlunksGained = Math.max(0, hm.klunkar - hmKlunksBeforeLoss);
    }
  }
  let lostEquipmentName: string | undefined;
  if (monsterId === "keg_lifter") {
    const lost = removeRandomEquipment(p, rng, next.config.maxHp);
    if (lost) {
      lostEquipmentName = lost;
      log(next, `${p.name} tappar ett slumpmässigt utrustat föremål: ${lost}.`);
    }
  }
  const imperialSameLevelSplash =
    monsterId === "imperial_dragon_stout" ? applySameLevelSplashDamage(next, p, 1) : false;

  if (monsterId === "demonkrigare") {
    const candidates = next.players.filter((pl) => pl.id !== p.id && !pl.eliminated && pl.hp > 0);
    if (candidates.length > 0) {
      const target = pick(rng, candidates);
      const beforeHeal = target.hp;
      target.hp = Math.min(target.maxHp, target.hp + 3);
      log(
        next,
        `Demonkrigaren hånskrattar: ${target.name} läker ${target.hp - beforeHeal} HP efter ${p.name}s förlust.`,
      );
    }
  } else if (monsterId === "busiga_buskar") {
    const candidates = next.players.filter((pl) => pl.id !== p.id && !pl.eliminated && pl.hp > 0);
    if (candidates.length > 0) {
      const minGold = Math.min(...candidates.map((pl) => pl.gold));
      const poorest = candidates.filter((pl) => pl.gold === minGold);
      const target = pick(rng, poorest);
      const transfer = Math.min(5, p.gold);
      if (transfer > 0) {
        p.gold -= transfer;
        target.gold += transfer;
      }
      log(next, `${p.name} ger ${transfer} pant till ${target.name} (minst pant) efter buskarnas förluststraff.`);
    }
  } else if (monsterId === "solen") {
    p.skippedTurns = (p.skippedTurns ?? 0) + 1;
    p.skipTurnReasons ??= [];
    p.skipTurnReasons.push("normal");
    log(next, `${p.name} får solen i ögonen efter förlusten och står över nästa tur.`);
  }
  if (monsterId === "enhorningsryttare") {
    const pantLoss = Math.min(10, p.gold);
    p.gold -= pantLoss;
    recordPantSpent(next, p.id, pantLoss);
    log(next, `${p.name} tappar ${pantLoss} pant efter förlusten mot Enhörningsryttare.`);
  }

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
  const totalKlunkDelta = p.klunkar - beforeSips;
  const weaponSipCost = Math.max(0, Math.floor(ctx.weaponSipKlunkCost ?? 0));
  const klunkGained = Math.max(0, totalKlunkDelta - weaponSipCost);
  showCard(next, {
    playerId: p.id,
    kind: "combat",
    cardId: "combat_lose",
    title: tile.type === "boss" ? `Boss: ${tile.bossName ?? "Okänd"}` : "Dålig batch",
    text: "",
    queuedPenaltySipNotices: ctx.queuedPenaltySipNotices,
    combatLoss: {
      playerName: p.name,
      enemyName: ctx.enemyName,
      rollTotal: pr,
      need,
      rawDamage: redirectedTargetName ? 0 : attackerRawDamage,
      blockedDamage: redirectedTargetName ? 0 : attackerBlockedDamage,
      damage: damageTaken,
      klunkGained,
      straffKlunkFromWeaponSip: weaponSipCost > 0 ? weaponSipCost : undefined,
      assistRollNote:
        assistRoll !== null ? `Ölkompis-slag inkluderat: +${assistRoll}.` : undefined,
      redirectNote: redirectedTargetName
        ? `Rabarbapappan slog om till: ${redirectedTargetName}.`
        : undefined,
      lostEquipmentName,
      imperialSameLevelSplash: imperialSameLevelSplash ? true : undefined,
      ...(assistImpactPlayerId
        ? {
            assistPartnerImpact: {
              playerId: assistImpactPlayerId,
              hpLost: assistHpLost,
              klunksGained: assistKlunksGained,
            },
          }
        : {}),
      ...(helpMateImpactPlayerId
        ? {
            helpMateImpact: {
              playerId: helpMateImpactPlayerId,
              hpLost: helpMateHpLost,
              klunksGained: helpMateKlunksGained,
            },
          }
        : {}),
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
  const attackerIgnoresCritFailOnOne = p?.equipment.accessory?.ignoreCombatCritFailOnOne === true;
  const broIgnoresCritFailOnOne =
    assistId != null
      ? (next.players.find((x) => x.id === assistId)?.equipment.accessory?.ignoreCombatCritFailOnOne ?? false)
      : false;
  const critFailOnOne = combatCritFailFromDice(
    assistId,
    pending.previewDie ?? 1,
    pending.previewBroDie,
    attackerIgnoresCritFailOnOne,
    broIgnoresCritFailOnOne,
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

  const assistRollStat =
    assistId != null && typeof pending.previewAssistRoll === "number"
      ? pending.previewAssistRoll
      : undefined;
  const attackerRollStat =
    pending.previewPrBase ??
    (assistRollStat !== undefined ? pr - assistRollStat : pr);
  recordMonsterCombatDiceRoll(
    next,
    p.id,
    assistId,
    die,
    pending.previewBroDie ?? null,
    attackerRollStat,
    assistRollStat,
  );

  applyPerCombatWeaponEconomy(next, p);
  const assistMateForWeaponCost = assistId ? (next.players.find((x) => x.id === assistId) ?? null) : null;
  if (assistMateForWeaponCost) applyPerCombatWeaponEconomy(next, assistMateForWeaponCost);

  if (previewWon) {
    if (tile.type === "boss") {
      const prevLives = next.finalBossLivesRemaining ?? 3;
      const newLives = prevLives - 1;
      next.finalBossLivesRemaining = newLives;
      if (newLives > 0) {
        breakCombatWinParticipantWeapons(next, p.id, assistId);
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
        recordMonsterCombatWin(next, p.id, assistId);
        if (
          !teamBattleRequired &&
          pending.helpAccepted &&
          pending.helpSelectedHelperId
        ) {
          recordHelpedCombatWin(next, pending.helpSelectedHelperId);
        }
        return;
      }
    }

    next.pending = null;
    p.gold += rewardGold;
    const attackerWeaponBonusGold = applyWeaponWinGoldBonus(p);
    const attackerWeaponRandomDamage = applyWeaponWinRandomDamage({ state: next, winner: p, rng, log });
    const assistMate = assistId ? (next.players.find((x) => x.id === assistId) ?? null) : null;
    const helpMate =
      !teamBattleRequired && pending.helpAccepted && pending.helpSelectedHelperId
        ? (next.players.find((x) => x.id === pending.helpSelectedHelperId) ?? null)
        : null;
    const helpContract = !teamBattleRequired && pending.helpAccepted ? pending.helpContract : undefined;
    recordMonsterCombatWin(next, p.id, assistId);
    if (helpMate) recordHelpedCombatWin(next, helpMate.id);
    const assistName = assistMate?.name ?? null;
    if (teamBattleRequired && assistMate) {
      assistMate.gold += rewardGold;
    }
    if (pending.monsterId === "cowboys") {
      const beforeHp = p.hp;
      p.hp = Math.min(p.maxHp, p.hp + 5);
      log(next, `${p.name} får +${p.hp - beforeHp} HP från Cowboys-segern.`);
      if (assistMate) {
        const beforeAssistHp = assistMate.hp;
        assistMate.hp = Math.min(assistMate.maxHp, assistMate.hp + 5);
        log(next, `${assistMate.name} får +${assistMate.hp - beforeAssistHp} HP från Cowboys-segern.`);
      }
    }
    if (attackerWeaponBonusGold > 0) {
      log(
        next,
        `${p.name} får +${attackerWeaponBonusGold} pant från ${p.equipment.weapon?.name ?? "vapnet"} efter vinsten.`,
        {
          key: LOG_MESSAGE_KEYS.playerWeaponWinGold,
          params: {
            name: p.name,
            amount: attackerWeaponBonusGold,
            weaponName: p.equipment.weapon?.name ?? "vapnet",
          },
        },
      );
    }
    if (attackerWeaponRandomDamage) {
      log(
        next,
        `${p.name}s ${p.equipment.weapon?.name ?? "vapen"} träffar slumpmässigt: ${attackerWeaponRandomDamage.targetName} tar ${attackerWeaponRandomDamage.damage} skada.`,
      );
    }
    breakCombatWinParticipantWeapons(next, p.id, assistId);
    const fallbackRewardXp =
      pending.monsterId && pending.monsterId !== "boss"
        ? (MONSTERS.find((m) => m.id === (pending.monsterId as MonsterId))?.rewardXp ?? 0)
        : 0;
    const rewardXp = Math.max(0, Math.floor(pending.rewardXp ?? fallbackRewardXp));
    grantXp(next, p, rewardXp);
    if (teamBattleRequired && assistMate) {
      grantXp(next, assistMate, rewardXp);
    }
    p.maxHp = maxHpFor(next, p);
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
    const attackerGrantedRewardTitles: string[] = [];
    const beerBroGrantedRewardTitles: string[] = [];
    const helpMateGrantedRewardTitles: string[] = [];
    const applyCombatRewardGrant = (recipient: Player, titles: string[]) => {
      const grant = grantRandomCombatReward(next, recipient, rng, pending.enemyName, winMonsterId);
      titles.push(grant.title);
      if (grant.replaceOffer) {
        enqueueCombatEquipReplaceOffer(next, recipient.id, grant.replaceOffer);
      }
    };
    if (attackerItemCount > 0) {
      for (let i = 0; i < attackerItemCount; i++) {
        applyCombatRewardGrant(p, attackerGrantedRewardTitles);
      }
      if (assistMate) {
        for (let i = 0; i < attackerItemCount; i++) {
          applyCombatRewardGrant(assistMate, beerBroGrantedRewardTitles);
        }
      }
    }
    if (helperItemCount > 0 && helpMate) {
      for (let i = 0; i < helperItemCount; i++) {
        applyCombatRewardGrant(helpMate, helpMateGrantedRewardTitles);
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
          grantKlunkWithXp(next, victim, sipGain, { penaltyStraff: true });
          pushSipNotice(next, victim.id, p.name, sipGain);
          randomOtherSipRecipientName = victim.name;
        }
        if (randomOtherSipRecipientName) {
          log(
            next,
            `${randomOtherSipRecipientName} får straffklunk (${p.name} vann mot ${pending.enemyName}).`,
            {
              key: LOG_MESSAGE_KEYS.combatWinRandomSip,
              params: {
                recipient: randomOtherSipRecipientName,
                winner: p.name,
                enemyName: pending.enemyName,
              },
            },
          );
        }
      }
    }

    if (teamBattleRequired && assistName) {
      log(
        next,
        `${p.name} och ${assistName} besegrar ${tile.bossName ?? "den dåliga batchen"}! (+${rewardGold} pant var, slag ${pr}≥${need})`,
      );
    } else if (assistName && attackerItemCount > 0) {
      log(
        next,
        `${p.name} besegrar ${tile.bossName ?? "den dåliga batchen"}! (+${rewardGold} pant, slag ${pr}≥${need}) ${assistName} får lika många skatter (${attackerItemCount}).`,
      );
    } else {
      log(next, `${p.name} besegrar ${tile.bossName ?? "den dåliga batchen"}! (+${rewardGold} pant, slag ${pr}≥${need})`);
    }
    /** Slutboss: ingen "Batch räddad"-modal — spelet går direkt till resultat (mobil + bord). */
    if (tile.type !== "boss") {
      showCard(next, {
        playerId: p.id,
        kind: "combat",
        cardId: "combat_win",
        title: "Dålig batch",
        text: "",
        queuedPenaltySipNotices: pending.previewDeferredSipWeaponPenalties,
        combatWin: {
          winnerName: p.name,
          enemyName: pending.enemyName,
          rollTotal: pr,
          need,
          rewardGold,
          rewardItems,
          rewardXp,
          teammateName: assistName ?? undefined,
          randomOtherSipRecipientName,
          ...(attackerGrantedRewardTitles.length > 0 ? { grantedRewardTitles: attackerGrantedRewardTitles } : {}),
          ...(beerBroGrantedRewardTitles.length > 0 && assistMate
            ? {
                beerBroGrantedRewardTitles,
                assistPlayerId: assistMate.id,
              }
            : {}),
          ...(helpMateGrantedRewardTitles.length > 0 && helpMate
            ? {
                helpMateGrantedRewardTitles,
                helpMatePlayerId: helpMate.id,
              }
            : {}),
        },
      });
    }
    if (tile.type === "boss") {
      const bd = MONSTERS.find((m) => m.id === next.finalBossMonsterId);
      showCard(next, {
        playerId: p.id,
        kind: "combat",
        cardId: "boss_final_win",
        title: "Slutbossen besegrad!",
        text: `${p.name} vinner spelet!`,
        artKey: bd?.artKey ?? "combat/boss",
        bossFinalWin: {
          winnerName: p.name,
          bossName: tile.bossName ?? bd?.name ?? "Slutbossen",
          roundLabel: `RUNDA ${FINAL_BOSS_LIFE_TOTAL} AV ${FINAL_BOSS_LIFE_TOTAL}`,
        },
      });
      log(next, `🏆 ${p.name} har besegrat slutbossen!`);
      return;
    }
  } else {
    const monsterId = pending.monsterId as MonsterId;
    if (monsterId === "kapten_interrobang" || monsterId === "sura_bar" || monsterId === "transporter") {
      next.pending = { ...pending, phase: "chooseHitMitigation" };
      return;
    }
    next.pending = null;
    const helpMateIdOnLoss =
      !teamBattleRequired && pending.helpAccepted === true && pending.helpSelectedHelperId
        ? pending.helpSelectedHelperId
        : undefined;
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
        helpMateId: helpMateIdOnLoss,
        teamBattleRequired,
        enemyName: pending.enemyName,
        sipMitigation: false,
        critFailOnOne,
        weaponSipBeforeRoll: pending.previewUsedSipWeaponBonus === true,
        weaponSipKlunkCost: (pending.previewDeferredSipWeaponPenalties ?? [])
          .filter((e) => e.recipientId === p.id)
          .reduce((s, e) => s + Math.max(1, Math.floor(e.klunkCount)), 0),
        queuedPenaltySipNotices: pending.previewDeferredSipWeaponPenalties,
        getLuckyRiskPlayerIds: pending.getLuckyRiskPlayerIds,
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

/** Bryggbonus / nivåval som väntar på aktiv spelare (även i offTurnPersonalPending). */
function personalTurnPromptBlocksActingPlayer(
  state: GameState,
  actingPlayerId: string,
): boolean {
  const off = state.offTurnPersonalPending;
  if (
    off &&
    off.playerId === actingPlayerId &&
    (off.type === "brewerPerkChoice" || off.type === "levelUpOffer")
  ) {
    return true;
  }
  const p = state.pending;
  if (p?.type === "brewerPerkChoice" && p.playerId === actingPlayerId) return true;
  if (p?.type === "levelUpOffer" && p.playerId === actingPlayerId) return true;
  const pl = state.players.find((x) => x.id === actingPlayerId);
  if (pl && (pl.pendingBrewerPerkLevels ?? 0) > 0) return true;
  return false;
}

/** Nivå-upp / bryggarperk utanför tur ska inte blockera andra spelares handlingar. */
function pendingBlocksPlayer(state: GameState, actingPlayerId: string): boolean {
  if (playerHasQueuedCombatLoot(state, actingPlayerId)) return true;
  if (personalTurnPromptBlocksActingPlayer(state, actingPlayerId)) return true;
  const off = state.offTurnPersonalPending;
  if (
    off?.type === "equipmentReplaceOffer" &&
    off.fromCombatLoot === true &&
    off.playerId === actingPlayerId
  ) {
    return true;
  }
  const p = state.pending;
  if (!p) return false;
  if (
    (p.type === "levelUpOffer" || p.type === "brewerPerkChoice") &&
    p.playerId !== actingPlayerId
  ) {
    return false;
  }
  if (
    p.type === "equipmentReplaceOffer" &&
    p.fromCombatLoot === true &&
    p.playerId !== actingPlayerId
  ) {
    return false;
  }
  return true;
}

function canOfferLevelUp(state: GameState, p: Player): {
  targetLevelIndex: number;
  costs: { gold: number; sips: number };
} | null {
  const targetLevelIndex = p.levelIndex + 1;
  if (targetLevelIndex >= state.levels.length) return null;
  const baseCosts = levelUpCostsForTargetLevel(targetLevelIndex);
  const costs = baseCosts;
  // Mappad bryggnivå: L1 nås vid gamla L4, L2 vid gamla L8, …
  const requiredBrewerLevel = targetLevelIndex;
  if (brewerLevel(p) < requiredBrewerLevel) return null;
  return { targetLevelIndex, costs };
}

function maybeCreateLevelUpOffer(
  state: GameState,
  p: Player,
  deferTurnAdvance = false,
  offTurn = false,
): boolean {
  if (state.phase !== "playing") return false;
  dismissInvalidLevelUpOffersForPlayer(state, p.id);
  if ((p.pendingBrewerPerkLevels ?? 0) > 0) return false;
  if (offTurn) {
    if (state.offTurnPersonalPending) return false;
  } else if (state.pending) {
    return false;
  }
  const offer = canOfferLevelUp(state, p);
  if (!offer) return false;
  const prompt = {
    type: "levelUpOffer" as const,
    playerId: p.id,
    targetLevelIndex: offer.targetLevelIndex,
    costs: offer.costs,
    deferTurnAdvance,
  };
  if (offTurn) {
    state.offTurnPersonalPending = prompt;
  } else {
    state.pending = prompt;
  }
  log(
    state,
    `${p.name} har nått bryggnivå ${brewerLevel(p)} och kan stiga till nivå ${offer.targetLevelIndex + 1}.`,
  );
  logMonsterScalePreviewForAscend(state, p, offer.targetLevelIndex, "offer");
  return true;
}

/** Erbjud bryggbonus / nivåval efter stängd straffklunk-modal. */
function tryPersonalPromptsAfterSipAck(state: GameState, playerId: string): void {
  if (tryOpenBrewerPerkChoice(state, playerId, log, { offTurn: true })) return;
  tryOfferLevelUpAfterSipAck(state, playerId);
}

/** Erbjud nivåval efter straffklunk (även utanför tur — turen har redan gått vidare). */
function tryOfferLevelUpAfterSipAck(state: GameState, playerId: string): void {
  if (state.phase !== "playing") return;
  if (playerHasPendingSipNotice(state, playerId)) return;
  const turnId = state.turnOrder[state.currentTurnIndex];
  const offTurn = turnId !== playerId;
  if (offTurn) {
    if (state.offTurnPersonalPending) return;
  } else if (state.pending) {
    return;
  }
  const p = state.players.find((x) => x.id === playerId);
  if (!p || !canOfferLevelUp(state, p)) return;
  maybeCreateLevelUpOffer(state, p, false, offTurn);
}

/** Bryggbonus / nivåupp efter avslutad tur — blockerar inte nästa spelare (straffklunk köas separat). */
function offerPostTurnPrompts(state: GameState, playerId: string): void {
  if (tryOpenBrewerPerkChoice(state, playerId, log, { offTurn: true })) return;
  if (playerHasPendingSipNotice(state, playerId)) return;
  const p = state.players.find((x) => x.id === playerId);
  if (!p) return;
  const onOwnTurn = state.turnOrder[state.currentTurnIndex] === playerId;
  maybeCreateLevelUpOffer(state, p, false, !onOwnTurn);
}

function endTurnOrOfferLevelUp(state: GameState, activePlayerId: string): void {
  if (state.phase !== "playing") return;
  // Solfjädern ska inte leva kvar när vi går vidare i turn flow.
  clearTableItemPlay(state);
  const cp = currentPlayer(state);
  if (!cp || cp.id !== activePlayerId) {
    advanceTurn(state);
    return;
  }
  advanceTurn(state);
  offerPostTurnPrompts(state, activePlayerId);
}

function cloneState(s: GameState): GameState {
  // Node/TS-lib kan sakna structuredClone beroende på target/lib.
  return JSON.parse(JSON.stringify(s)) as GameState;
}

export function lobbyAddPlayer(
  state: GameState,
  opts: { id: string; name: string; isHost: boolean; avatar?: PlayerAvatar },
): ApplyResult {
  const next = cloneState(state);
  if (next.players.length >= MAX_PLAYERS) {
    return { state, events: [], error: "Lobbyn är full" };
  }
  const color = PLAYER_COLORS[next.players.length % PLAYER_COLORS.length]!;
  const p: Player = {
    id: opts.id,
    name: opts.name.trim() || "Bryggare",
    color,
    avatar: opts.avatar ? normalizePlayerAvatar(opts.avatar) : randomPlayerAvatar(),
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
    stats: { ...DEFAULT_PLAYER_SESSION_STATS },
  };
  next.players.push(p);
  log(next, `${p.name} gick med i lobbyn.`, {
    key: LOG_MESSAGE_KEYS.lobbyPlayerJoined,
    params: { name: p.name },
  });
  return { state: next, events: ["lobbyUpdate"] };
}

/** Ny spelare under pågående match (require `config.allowLateJoin` på servern). */
export function playingAddPlayer(
  state: GameState,
  opts: { id: string; name: string; avatar?: PlayerAvatar },
): ApplyResult {
  const next = cloneState(state);
  normalizeConfig(next);
  if (next.phase !== "playing") {
    return { state, events: [], error: "Spelet pågår inte" };
  }
  if (next.players.length >= MAX_PLAYERS) {
    return { state, events: [], error: "Lobbyn är full" };
  }
  const color = PLAYER_COLORS[next.players.length % PLAYER_COLORS.length]!;
  const baseMaxHp = next.config.maxHp;
  const p: Player = {
    id: opts.id,
    name: opts.name.trim() || "Bryggare",
    color,
    avatar: opts.avatar ? normalizePlayerAvatar(opts.avatar) : randomPlayerAvatar(),
    isHost: false,
    ready: true,
    levelIndex: 0,
    tileIndex: 0,
    gold: next.config.startPant,
    klunkar: 0,
    hp: baseMaxHp,
    maxHp: baseMaxHp,
    xp: 0,
    equipment: {},
    inventory: [],
    nextMoveBonus: 0,
    nextCombatModifier: 0,
    skippedTurns: 0,
    eliminated: false,
    stats: { ...DEFAULT_PLAYER_SESSION_STATS },
  };
  next.players.push(p);
  next.turnOrder.push(p.id);
  const itemRng = createRng((next.seed ^ fnv1a32(p.id) ^ 0x5f3759df) >>> 0);
  grantStartingCombatItemsForPlayer(next, p, itemRng);
  log(next, `${p.name} hoppade in i spelet.`, {
    key: LOG_MESSAGE_KEYS.playingPlayerJoined,
    params: { name: p.name },
  });
  return { state: next, events: ["playerJoined"] };
}

export function startGame(
  state: GameState,
  hostPlayerId: string,
  seed: number,
): ApplyResult {
  const next = cloneState(state);
  normalizeConfig(next);
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
  next.levels = generateLevels(seed, next.players.length, {
    levelCount: next.config.levelCount,
    boardSize: next.config.boardSize,
  });
  const bossRng = createRng(seed ^ 0x9e3779b9);
  const pickedBoss = FINAL_BOSS_IDS[Math.floor(bossRng() * FINAL_BOSS_IDS.length)]!;
  next.finalBossMonsterId = pickedBoss;
  next.finalBossLivesRemaining = DEV_QUICK_BOSS_TEST.enabled
    ? DEV_QUICK_BOSS_TEST.bossLives
    : 3;
  const bossMonster = MONSTERS.find((m) => m.id === pickedBoss);
  if (bossMonster) {
    for (const lvl of next.levels) {
      for (const t of lvl.tiles) {
        if (t.type === "boss") {
          t.combatValue = DEV_QUICK_BOSS_TEST.enabled
            ? DEV_QUICK_BOSS_TEST.bossCombatValue
            : bossMonster.strength;
          t.bossName = bossMonster.name;
        }
      }
    }
  }
  next.phase = "playing";
  next.gameStartedAt = Date.now();
  next.turnOrder = next.players.map((p) => p.id);
  next.currentTurnIndex = 0;
  for (const p of next.players) {
    p.levelIndex = 0;
    p.tileIndex = 0;
    p.gold = next.config.startPant;
    const baseMaxHp = next.config.maxHp;
    p.maxHp = baseMaxHp;
    p.hp = baseMaxHp;
    p.nextMoveBonus = 0;
    p.nextCombatModifier = 0;
    p.eliminated = false;
    p.inventory = [];
    p.stats = { ...DEFAULT_PLAYER_SESSION_STATS };
  }
  grantStartingCombatItems(next, seed);
  next.pending = null;
  next.winnerId = null;
  next.winnerName = null;
  next.goldenBeerCarrierId = null;
  next.bossFinaleExitStartedAt = null;
  next.treasureTaken = {};
  next.lastDiceRoll = null;
  next.lastDiceRollerId = null;
  next.sipNotices = [];
  next.playerEmoteBursts = [];
  next.playerKlunkBursts = [];
  next.combatEquipReplaceQueue = undefined;
  clearTableItemPlay(next);
  log(next, `— Bryggmästarnas Mästare börjar! (seed ${seed}) —`, {
    key: LOG_MESSAGE_KEYS.gameStarted,
    params: { seed },
  });
  if (bossMonster) {
    const lives = next.finalBossLivesRemaining ?? 3;
    const roundsWord = lives === 1 ? "runda" : "rundor";
    log(
      next,
      DEV_QUICK_BOSS_TEST.enabled
        ? `[DEV] Snabb boss-test: ${DEV_QUICK_BOSS_TEST.bossTilesOnLevel0} boss på våning 1, ${lives} liv, styrka ${DEV_QUICK_BOSS_TEST.bossCombatValue}. Slutboss ${bossMonster.name}.`
        : `Slutboss ${bossMonster.name} — ${lives} liv, vinn ${lives} ${roundsWord}.`,
      DEV_QUICK_BOSS_TEST.enabled
        ? undefined
        : {
            key: LOG_MESSAGE_KEYS.gameFinalBossIntro,
            params: { bossName: bossMonster.name, lives },
          },
    );
  }
  const cur = currentPlayer(next);
  if (cur) {
    log(next, `${cur.name}s tur. Slå tärningen.`, {
      key: LOG_MESSAGE_KEYS.turnRollDice,
      params: { name: cur.name },
    });
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
    gainGoldPerPenaltyKlunk: eq.gainGoldPerPenaltyKlunk,
    preventTheft: eq.preventTheft,
    levelUpDiscountGold: eq.levelUpDiscountGold,
    canSkipMonsterEncounter: eq.canSkipMonsterEncounter,
    ignoreCombatCritFailOnOne: eq.ignoreCombatCritFailOnOne,
    deathContinueCost: eq.deathContinueCost,
    merchantDiscountGold: eq.merchantDiscountGold,
    power: eq.power,
    sipAttackBonus: eq.sipAttackBonus,
    sipWeaponBonusGoldCost: eq.sipWeaponBonusGoldCost,
    sipWeaponBonusKlunks: eq.sipWeaponBonusKlunks,
    pvpDieBonus: eq.pvpDieBonus,
    gainGoldOnWin: eq.gainGoldOnWin,
    powerAtGold10: eq.powerAtGold10,
    powerAtGold20: eq.powerAtGold20,
    powerAtGold30: eq.powerAtGold30,
    powerDynamicMax: eq.powerDynamicMax,
    randomOtherDamageOnWin: eq.randomOtherDamageOnWin,
    breakOnWin: eq.breakOnWin,
    monsterLossSipReduction: eq.monsterLossSipReduction,
    freeInventoryItemPlay: eq.freeInventoryItemPlay,
    healHpPerTurn: eq.healHpPerTurn,
    itemCardBonus: eq.itemCardBonus,
  };
}

/** Exakt fyra varor visas: Helande brygd + tre slumpade från hela utrustningskatalogen. Köp per besök tills spelaren lämnar. */
const MERCHANT_SHELF_SLOTS = 4;
const MERCHANT_PRICE_MULTIPLIER = 1.1;
export const MERCHANT_REROLL_GOLD_COST = 5;
const SKIP_MONSTER_ENCOUNTER_GOLD_COST = 2;

function shortcutItemGoldCostForTargetLevel(targetLevelIndex: number): number {
  const levelNumber = Math.max(1, Math.floor(targetLevelIndex) + 1);
  return Math.max(0, levelNumber * 10);
}


function clearPendingSupersededByFloorTravel(state: GameState, userId: string): void {
  dismissInvalidLevelUpOffersForPlayer(state, userId);
  const pe = state.pending;
  if (!pe) return;
  if (pe.type === "merchant" && pe.playerId === userId) state.pending = null;
  else if (pe.type === "moveChoice" && pe.playerId === userId) state.pending = null;
  else if (pe.type === "encounterChoice" && pe.moverId === userId) state.pending = null;
}

/** Pant för Genväg resp. Taproom på angiven våningsindex (även teleport till boss på sista nivån). */
function shortcutTaproomGoldCostForFloor(levelIndex: number, itemId: ItemId): number {
  const base = shortcutItemGoldCostForTargetLevel(levelIndex);
  return itemId === "taproom_key" ? Math.max(0, base - 10) : base;
}

function merchantAdjustedPrice(item: ShopItem, levelIndex = 0): number {
  if (item.slot === "heal") return item.price;
  const base = Math.max(1, Math.ceil(item.price * MERCHANT_PRICE_MULTIPLIER));
  const level = Math.max(0, Math.floor(levelIndex));
  if (item.slot === "inventory" || item.slot === "gold") {
    return Math.max(1, Math.ceil(base * (1 + level * 0.15)));
  }
  return base;
}

export function rollMerchantItems(
  rng: () => number,
  disabledCardIds?: ReadonlySet<string>,
  playerLevelIndex = 0,
  levelsLength?: number,
): ShopItem[] {
  const items: ShopItem[] = [
    {
      id: "h",
      slot: "heal",
      name: "Helande brygd",
      price: 5,
      healAmount: 3,
    },
  ];
  const catalog = [...merchantEquipmentPoolForLevel(playerLevelIndex)];
  shuffleArrayInPlace(catalog, rng);
  for (const it of catalog.slice(0, 2)) {
    const shopItem = catalogEquipmentToMerchantShopItem(it, it.id);
    items.push({ ...shopItem, price: merchantAdjustedPrice(shopItem, playerLevelIndex) });
  }
  const combatPool = filterMerchantSellableCombatItems(disabledCardIds);
  if (combatPool.length > 0) {
    items.push(combatItemToMerchantShopItem(pick(rng, combatPool)));
  } else if (catalog[2]) {
    const shopItem = catalogEquipmentToMerchantShopItem(catalog[2], catalog[2].id);
    items.push({ ...shopItem, price: merchantAdjustedPrice(shopItem, playerLevelIndex) });
  }
  shuffleArrayInPlace(items, rng);
  const shelf = items.slice(0, MERCHANT_SHELF_SLOTS);
  if (
    isLastBoardLevel(playerLevelIndex, levelsLength) &&
    taproomKeyAllowedInMerchant(disabledCardIds)
  ) {
    shelf.push(taproomKeyMerchantShopItem());
  }
  return shelf;
}

function findOpponentsOnTile(state: GameState, mover: Player): Player[] {
  const others = state.players.filter(
    (p) =>
      p.id !== mover.id &&
      isPlayerActiveInMatch(p) &&
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
  const ar = ad + pvpEquipmentDieBonusTotal(a);
  const br = bd + pvpEquipmentDieBonusTotal(b);
  const attackerWins = ar >= br;
  const winner = attackerWins ? a : b;
  const loser = attackerWins ? b : a;
  log(state, `BvB: ${a.name} (${ar}) vs ${b.name} (${br}) — ${winner.name} vinner!`, {
    key: LOG_MESSAGE_KEYS.pvpMatchResult,
    params: { a: a.name, ar, b: b.name, br, winner: winner.name },
  });
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

/** Reaktor som har spelat sitt sista ingripandekort blir automatiskt klar/pass. */
function markCombatReactorUsedItemIfNeeded(state: GameState, reactorId: string): void {
  const pending = state.pending;
  if (!pending || pending.type !== "combat" || pending.phase !== "reactions") return;
  if (!pending.reactors?.includes(reactorId)) return;
  const reactor = state.players.find((p) => p.id === reactorId);
  if (!reactor) return;
  pending.reacted ??= {};
  if (pending.reacted[reactorId] === "pass") return;
  if (playerHasCombatReactionPlayableItem(reactor, pending)) {
    delete pending.reacted[reactorId];
    return;
  }
  pending.reacted[reactorId] = "pass";
}

function applyPlayableItemAttackMod(
  state: GameState,
  user: Player,
  targetId: string,
  itemId: string,
): number {
  const pending = state.pending;
  const mod = combatItemAttackModForBoardLevel(
    itemId,
    user.levelIndex,
    playerTotalItemCardBonus(user),
  );
  if (mod == null || mod === 0) return 0;
  if (pending?.type === "pvp" && pending.phase === "preRoundItems") {
    pending.pvpAttackMods ??= {};
    pending.pvpAttackMods[targetId] = (pending.pvpAttackMods[targetId] ?? 0) + mod;
    return mod;
  }
  if (pending?.type === "combat") {
    pending.attackMods ??= {};
    pending.attackMods[targetId] = (pending.attackMods[targetId] ?? 0) + mod;
    return mod;
  }
  return 0;
}

function merchantEquipmentPoolForLevel(levelIndex: number) {
  const level = Math.max(0, Math.floor(levelIndex));
  const maxPrice = level <= 0 ? 10 : level === 1 ? 12 : level === 2 ? 16 : 99;
  const minPrice = level >= 2 ? 6 : 0;
  const filtered = EQUIPMENT_CATALOG.filter((eq) => eq.price >= minPrice && eq.price <= maxPrice);
  return filtered.length >= 2 ? filtered : [...EQUIPMENT_CATALOG];
}

function rollSingleMerchantShelfItem(
  rng: () => number,
  disabledCardIds: ReadonlySet<string> | undefined,
  levelIndex: number,
  existingIds: ReadonlySet<string>,
  levelsLength?: number,
): ShopItem | null {
  const roll = rng();
  if (roll < 0.25) {
    const id = "h-rest";
    if (existingIds.has(id)) return null;
    return { id, slot: "heal", name: "Helande brygd", price: 5, healAmount: 3 };
  }
  if (roll < 0.65) {
    const pool = merchantEquipmentPoolForLevel(levelIndex).filter((eq) => !existingIds.has(eq.id));
    if (pool.length === 0) return null;
    const it = pick(rng, pool);
    const shopItem = catalogEquipmentToMerchantShopItem(it, it.id);
    const priced = { ...shopItem, price: merchantAdjustedPrice(shopItem, levelIndex) };
    return priced;
  }
  if (
    isLastBoardLevel(levelIndex, levelsLength) &&
    taproomKeyAllowedInMerchant(disabledCardIds)
  ) {
    const suffix = Math.floor(rng() * 1e6);
    const id = `c-taproom_key-${suffix}`;
    if (existingIds.has(id)) return null;
    return taproomKeyMerchantShopItem(suffix);
  }
  const combatPool = filterMerchantSellableCombatItems(disabledCardIds);
  if (combatPool.length > 0) {
    const itemId = pick(rng, combatPool);
    const shopItem = combatItemToMerchantShopItem(itemId);
    const id = `c-${itemId}-${Math.floor(rng() * 1e6)}`;
    if (existingIds.has(id)) return null;
    return { ...shopItem, id, price: shopItem.price };
  }
  return null;
}

function resolveTileLanding(state: GameState, p: Player, rng: () => number): void {
  // Ny tile-upplösning/strid ska börja med tom solfjäder.
  clearTableItemPlay(state);
  const level = state.levels[p.levelIndex];
  if (!level) return;
  const tile = level.tiles[p.tileIndex];
  if (!tile) return;

  switch (tile.type) {
    case "empty":
      log(state, `${p.name} hamnar på en lugn ruta.`, {
        key: LOG_MESSAGE_KEYS.tileEmpty,
        params: { name: p.name },
      });
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
      const disabledCardIds = new Set(state.config.disabledCardIds ?? []);
      const card = drawFromDeck("rest", rng, disabledCardIds);
      const beforeHp = p.hp;
      const beforeGold = p.gold;
      const beforeKlunk = p.klunkar;
      const out: EffectApplyOut = {};
      applyEffects({ state, player: p, effects: card.effects ?? [], rng, out });
      const grantedText = appendTextForGrantedItem(out);
      log(state, `${p.name} vilar på bryggeriet (+${out.heal ?? 0} HP, max ${p.maxHp}).`, {
        key: LOG_MESSAGE_KEYS.tileRestHeal,
        params: { name: p.name, heal: out.heal ?? 0, maxHp: p.maxHp },
      });
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
        log(state, "Gömman är redan plundrad.", {
          key: LOG_MESSAGE_KEYS.tileTreasureAlreadyTaken,
        });
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
      const disabledCardIds = new Set(state.config.disabledCardIds ?? []);
      const card = drawFromDeck("treasure", rng, disabledCardIds);
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
      log(state, `${p.name} hittar skatt: +${out.gold ?? 0} pant.`, {
        key: LOG_MESSAGE_KEYS.tileTreasureFound,
        params: { name: p.name, gold: out.gold ?? 0 },
      });
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
      const disabledCardIds = new Set(state.config.disabledCardIds ?? []);
      const card = drawFromDeck("event", rng, disabledCardIds);
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
        log(state, `${p.name} kan inte möta slutbossen (konfigurationsfel).`, {
          key: LOG_MESSAGE_KEYS.tileBossConfigError,
          params: { name: p.name },
        });
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
      const disabledCardIds = new Set(state.config.disabledCardIds ?? []);
      state.pending = {
        type: "merchant",
        items: rollMerchantItems(rng, disabledCardIds, p.levelIndex, state.levels.length),
        playerId: p.id,
      };
      log(state, `${p.name} kommer till Panta burkar.`, {
        key: LOG_MESSAGE_KEYS.tileMerchant,
        params: { name: p.name },
      });
      return;
    }
    case "door":
      log(state, `${p.name} hittar en gammal nivå-ruta men den är avstängd i detta läge.`, {
        key: LOG_MESSAGE_KEYS.tileOldLevelDisabled,
        params: { name: p.name },
      });
      break;
    default:
      break;
  }

}

function resolveLanding(state: GameState, p: Player, rng: () => number): void {
  const bypassEncounter = state.landingBypassEncounter === true;
  state.landingBypassEncounter = undefined;
  if (!bypassEncounter) {
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
        opps.length === 1
          ? {
              key: LOG_MESSAGE_KEYS.encounterOneOpponent,
              params: { name: p.name, opponents: names },
            }
          : {
              key: LOG_MESSAGE_KEYS.encounterMultiOpponent,
              params: { name: p.name, opponents: names },
            },
      );
      return;
    }
  }
  resolveTileLanding(state, p, rng);
}

export function applyAction(state: GameState, action: ClientAction): ApplyResult {
  if (action.type === "returnToLobby") {
    return returnToLobby(state);
  }
  const logEntropy = state.logSeq ?? state.log.length;
  const base = (state.seed + Math.imul(logEntropy, 997)) >>> 0;
  const actionMix = fnv1a32(stableStringify(action));
  const rng = createRng((base ^ actionMix) >>> 0);
  const next = cloneState(state);
  normalizeConfig(next);
  // Keep dynamic equipment thresholds (e.g. Legendarisk Burkhjälm from nivå 4) in sync.
  syncDynamicMaxHp(next);
  const events: string[] = [];

  if (next.phase === "lobby") {
    if (action.type === "setAvatar") {
      const p = next.players.find((x) => x.id === action.playerId);
      if (!p) return { state, events: [], error: "Okänd spelare" };
      if (!isValidPlayerAvatar(action.avatar)) {
        return { state, events: [], error: "Ogiltig avatar" };
      }
      p.avatar = normalizePlayerAvatar(action.avatar);
      if (p.ready) {
        p.ready = false;
        log(next, `${p.name} ändrade avatar och är inte redo.`, {
          key: LOG_MESSAGE_KEYS.lobbyAvatarChanged,
          params: { name: p.name },
        });
      }
      return { state: next, events: ["lobbyUpdate"] };
    }
    if (action.type === "setReady") {
      const p = next.players.find((x) => x.id === action.playerId);
      if (!p) return { state, events: [], error: "Okänd spelare" };
      p.ready = action.ready;
      log(next, `${p.name} är ${p.ready ? "redo" : "inte redo"}.`, {
        key: p.ready ? LOG_MESSAGE_KEYS.lobbyReady : LOG_MESSAGE_KEYS.lobbyNotReady,
        params: { name: p.name },
      });
      return { state: next, events: ["lobbyUpdate"] };
    }
    if (action.type === "setConfig") {
      const p = next.players.find((x) => x.id === action.playerId);
      if (!p?.isHost) return { state, events: [], error: "Endast värd" };
      if (typeof action.turnSeconds === "number") {
        next.config.turnSeconds = clampConfigNumber("turnSeconds", action.turnSeconds);
      }
      if (typeof action.reactionSeconds === "number" && Number.isFinite(action.reactionSeconds)) {
        next.config.reactionSeconds = clampConfigNumber("reactionSeconds", action.reactionSeconds);
      }
      if (
        action.difficulty === "lattol" ||
        action.difficulty === "folkol" ||
        action.difficulty === "starkol" ||
        action.difficulty === "imperial"
      ) {
        next.config.difficulty = action.difficulty;
      }
      if (typeof action.hardcore === "boolean") {
        next.config.hardcore = action.hardcore;
      }
      if (typeof action.allowLateJoin === "boolean") {
        next.config.allowLateJoin = action.allowLateJoin;
      }
      if (typeof action.clearPlayersOnRematch === "boolean") {
        next.config.clearPlayersOnRematch = action.clearPlayersOnRematch;
      }
      if (action.boardSize === "default" || action.boardSize === "large" || action.boardSize === "xlarge") {
        next.config.boardSize = action.boardSize;
      }
      if (typeof action.levelCount === "number" && Number.isFinite(action.levelCount)) {
        next.config.levelCount = Math.max(1, Math.min(5, Math.floor(action.levelCount)));
      }
      if (typeof action.maxHp === "number" && Number.isFinite(action.maxHp)) {
        next.config.maxHp = clampConfigNumber("maxHp", action.maxHp);
      }
      if (typeof action.startPant === "number" && Number.isFinite(action.startPant)) {
        next.config.startPant = clampConfigNumber("startPant", action.startPant);
      }
      if (typeof action.wakeLockBeforeStart === "boolean") {
        next.config.wakeLockBeforeStart = action.wakeLockBeforeStart;
      }
      if (Array.isArray(action.disabledCardIds)) {
        next.config.disabledCardIds = Array.from(
          new Set(
            action.disabledCardIds.filter(
              (id) => typeof id === "string" && id.trim().length > 0 && DRAWABLE_CARD_ID_SET.has(id),
            ),
          ),
        );
      }
      if (typeof action.cardCover === "string" && action.cardCover.trim().length > 0) {
        next.config.cardCover = action.cardCover.trim().slice(0, 64);
      }
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
    const dismissed = list[idx]!;
    recordKlunkBurstForSipNoticeAck(next, dismissed);
    next.sipNotices = [...list.slice(0, idx), ...list.slice(idx + 1)];
    tryPersonalPromptsAfterSipAck(next, action.playerId);
    return { state: next, events: ["state"] };
  }

  if (action.type === "sendEmote") {
    if (next.phase !== "playing") {
      return { state, events: [], error: "Emotes kan bara skickas under spelet" };
    }
    const sender = next.players.find((x) => x.id === action.playerId);
    if (!sender) return { state, events: [], error: "Spelaren hittades inte" };
    if (!isPlayerOnBoard(sender)) {
      return { state, events: [], error: "Du kan inte skicka emotes nu." };
    }
    if (!isEmoteId(action.emoteId)) {
      return { state, events: [], error: "Okänd emote" };
    }
    const now = Date.now();
    const pruned = prunePlayerEmoteBursts(next.playerEmoteBursts ?? [], now);
    const lastFromSender = pruned
      .filter((b) => b.playerId === action.playerId)
      .reduce<PlayerEmoteBurst | null>((best, b) => (!best || b.at > best.at ? b : best), null);
    if (lastFromSender && now - lastFromSender.at < EMOTE_COOLDOWN_MS) {
      return { state, events: [], error: "Vänta lite innan nästa emote." };
    }
    next.playerEmoteBursts = prunePlayerEmoteBursts(
      [...pruned, { playerId: action.playerId, emoteId: action.emoteId, at: now }],
      now,
    );
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
    const insuranceCost = Math.max(0, victim.equipment.accessory?.deathContinueCost ?? 0);
    if (action.choice === "insuredContinue") {
      if (insuranceCost <= 0) {
        return { state, events: [], error: "Du har ingen aktiv livförsäkring." };
      }
      if (victim.gold < insuranceCost) {
        return { state, events: [], error: `Du behöver ${insuranceCost} pant för att använda Livförsäkring.` };
      }
      const victimGoldBeforeIns = victim.gold;
      victim.gold = Math.max(0, victim.gold - insuranceCost);
      recordPantSpent(next, victim.id, victimGoldBeforeIns - victim.gold);
      victim.eliminated = false;
      victim.hp = victim.maxHp;
      log(next, `${victim.name} använder Livförsäkring och betalar ${insuranceCost} pant för att fortsätta med fullt liv.`, {
        key: LOG_MESSAGE_KEYS.playerInsurance,
        params: { name: victim.name, cost: insuranceCost },
      });
      next.pending = null;
      queueFirstBrewerDownIfNeeded(next);
      if (!next.pending && next.phase === "playing") endTurnOrOfferLevelUp(next, victim.id);
      return { state: next, events: ["state"] };
    }
    if (action.choice === "retry" && !next.config.hardcore) {
      const preservedStats = { ...ensurePlayerStats(victim) };
      victim.eliminated = false;
      victim.levelIndex = 0;
      victim.tileIndex = 0;
      victim.xp = 0;
      victim.gold = next.config.startPant;
      victim.klunkar = 0;
      victim.equipment = {};
      victim.inventory = [];
      /** Omstart från början: permanenta bryggnivå-buffar (attack/sköld/BvB/HP/föremål) nollställs med XP:n. */
      resetBrewerPerkProgress(victim);
      finishBrewerPerkChoicePrompt(next, victim.id);
      {
        const pi = Math.max(0, next.players.findIndex((x) => x.id === victim.id));
        const kd = ensurePlayerStats(victim).knockdownCount;
        const retryRng = createRng(
          (next.seed ^
            (0x5f3759df + pi * 0x9e3779b9) ^
            (kd * 0x7f4a7c15) ^
            0x52657479) >>>
            0,
        );
        grantStartingCombatItemsForPlayer(next, victim, retryRng);
      }
      victim.nextMoveBonus = 0;
      victim.nextCombatModifier = 0;
      victim.nextCombatAttackDiceDouble = undefined;
      victim.skippedTurns = 0;
      victim.skipTurnReasons = undefined;
      victim.maxHp = next.config.maxHp;
      victim.hp = victim.maxHp;
      victim.stats = preservedStats;
      /** Straffklunk-modalen köas vid förlust före stupad-bryggare — efter omstart ska den inte visas (klunkar nollställds). */
      next.sipNotices = (next.sipNotices ?? []).filter((n) => n.recipientId !== victim.id);
      log(
        next,
        `${victim.name} startar om på nytt: tillbaka till start, utan utrustning och bryggnivå-bonusar, nya startföremål som vid spelstart, ${victim.gold} pant och 0 klunkar.`,
      );
      next.pending = null;
      queueFirstBrewerDownIfNeeded(next);
      if (!next.pending && next.phase === "playing") endTurnOrOfferLevelUp(next, victim.id);
      return { state: next, events: ["state"] };
    }
    victim.eliminated = true;
    victim.hp = 0;
    removePlayerFromTurnOrderAfterElimination(next, victim.id);
    log(next, `${victim.name} ger upp och lämnar bryggeriet.`, {
      key: LOG_MESSAGE_KEYS.playerGaveUp,
      params: { name: victim.name },
    });
    next.pending = null;
    queueFirstBrewerDownIfNeeded(next);
    if (!next.pending && next.phase === "playing") {
      const nx = currentPlayer(next);
      if (nx) {
        log(next, `— ${nx.name}s tur —`, {
          key: LOG_MESSAGE_KEYS.turnChanged,
          params: { name: nx.name },
        });
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
    if (!p) return { state, events: [], error: "Spelaren hittades inte" };
    if (p.equipment.accessory?.canSkipMonsterEncounter !== true) {
      return { state, events: [], error: "Du kan inte undvika dåliga batcher utan rätt accessoar" };
    }
    if (p.gold < SKIP_MONSTER_ENCOUNTER_GOLD_COST) {
      return { state, events: [], error: `Du behöver ${SKIP_MONSTER_ENCOUNTER_GOLD_COST} pant för att undvika batchmötet.` };
    }
    p.gold -= SKIP_MONSTER_ENCOUNTER_GOLD_COST;
    recordPantSpent(next, p.id, SKIP_MONSTER_ENCOUNTER_GOLD_COST);
    log(next, `${p.name} undviker batchmötet (${pending.enemyName}) — ingen XP, ingen loot (−${SKIP_MONSTER_ENCOUNTER_GOLD_COST} pant).`, {
      key: LOG_MESSAGE_KEYS.combatSkipEncounter,
      params: { name: p.name, enemyName: pending.enemyName, cost: SKIP_MONSTER_ENCOUNTER_GOLD_COST },
    });
    next.pending = null;
    endTurnOrOfferLevelUp(next, p.id);
    return { state: next, events: ["state"] };
  }

  if (action.type === "combatIntroAck" && next.pending?.type === "combat" && next.pending.phase === "enemyIntro") {
    const pending = next.pending;
    if (action.playerId !== pending.attackerId) return { state, events: [], error: "Endast angriparen kan fortsätta" };
    if (action.playerId !== cp.id) return { state, events: [], error: "Inte din tur" };
    beginCombatReactionsPhase(next, pending);
    const reactors = pending.reactors ?? [];
    if (reactors.length > 0) {
      log(next, `Strid: andra kan spela föremål innan slaget.`, {
        key: LOG_MESSAGE_KEYS.combatReactionsOpen,
      });
    }
    return { state: next, events: ["state"] };
  }

  if (action.type === "chooseCombatTeammate" && next.pending?.type === "combat" && next.pending.phase === "chooseTeammate") {
    const pending = next.pending;
    if (action.playerId !== pending.attackerId) return { state, events: [], error: "Endast angriparen kan välja medkämpe" };
    if (action.playerId !== cp.id) return { state, events: [], error: "Inte din tur" };
    const teammate = next.players.find((x) => x.id === action.teammateId);
    if (!teammate) return { state, events: [], error: "Medkämpen hittades inte" };
    if (teammate.id === pending.attackerId) return { state, events: [], error: "Du kan inte välja dig själv" };
    if (!isPlayerActiveInMatch(teammate)) {
      return { state, events: [], error: "Medkämpen är ute ur spelet" };
    }
    pending.assistId = teammate.id;
    pending.reactors = combatReactorsFor(next, pending.attackerId, teammate.id);
    pending.reacted = {};
    pending.phase = "enemyIntro";
    const attacker = next.players.find((x) => x.id === pending.attackerId);
    log(next, `${attacker?.name ?? "Angriparen"} väljer ${teammate.name} som medkämpe i lagstrid.`, {
      key: LOG_MESSAGE_KEYS.combatChooseTeammate,
      params: { attacker: attacker?.name ?? "Angriparen", teammate: teammate.name },
    });
    return { state: next, events: ["state"] };
  }

  if (action.type === "combatReact" && next.pending?.type === "combat" && next.pending.phase === "reactions") {
    const pending = next.pending;
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
      if (p) {
        log(next, `${p.name} gör inget.`, {
          key: LOG_MESSAGE_KEYS.combatNoAction,
          params: { name: p.name },
        });
      }
      return { state: next, events: ["state"] };
    }
    // "intervene": player may play one or many cards before choosing "gör inget".
    const p = next.players.find((x) => x.id === action.playerId);
    if (p) {
      log(next, `${p.name} ingriper.`, {
        key: LOG_MESSAGE_KEYS.combatIntervene,
        params: { name: p.name },
      });
    }
    return { state: next, events: ["state"] };
  }

  if (action.type === "combatRequestHelp" && next.pending?.type === "combat" && next.pending.phase === "reactions") {
    const pending = next.pending;
    if (action.playerId !== pending.attackerId) {
      return { state, events: [], error: "Bara angriparen kan be om hjälp" };
    }
    if (pending.teamBattleRequired || isFinalBossMonsterId(pending.monsterId as MonsterId)) {
      return { state, events: [], error: "Hjälp kan bara begäras i vanliga batchstrider" };
    }
    autoPassReactorsWithoutPlayableItems(next, pending);
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
    log(next, `${next.players.find((p) => p.id === action.playerId)?.name ?? "Angriparen"} ber om hjälp.`, {
      key: LOG_MESSAGE_KEYS.combatHelpRequest,
      params: { name: next.players.find((p) => p.id === action.playerId)?.name ?? "Angriparen" },
    });
    return { state: next, events: ["state"] };
  }

  // Idempotens: extra klick när hjälpfasen redan öppnats ska inte ge fallback-felet
  // "Avsluta nuvarande val först".
  if (
    action.type === "combatRequestHelp" &&
    next.pending?.type === "combat" &&
    (next.pending.phase === "helpChooseHelper" ||
      next.pending.phase === "helpAwaitDecision" ||
      next.pending.phase === "helpAwaitRequesterDecision" ||
      next.pending.phase === "helpAwaitCard")
  ) {
    return { state: next, events: ["state"] };
  }

  if (
    action.type === "combatCancelHelpRequest" &&
    next.pending?.type === "combat" &&
    (next.pending.phase === "helpChooseHelper" ||
      next.pending.phase === "helpAwaitDecision" ||
      next.pending.phase === "helpAwaitRequesterDecision" ||
      next.pending.phase === "helpAwaitCard")
  ) {
    const pending = next.pending;
    if (action.playerId !== pending.attackerId) {
      return { state, events: [], error: "Bara angriparen kan avbryta hjälpbegäran" };
    }
    pending.helpCandidateIds = undefined;
    pending.helpSelectedHelperId = undefined;
    pending.helpAccepted = undefined;
    pending.helpUsedPositiveItem = undefined;
    pending.helpContract = undefined;
    pending.helpProposedContract = undefined;
    pending.phase = "reactions";
    log(next, `${next.players.find((p) => p.id === action.playerId)?.name ?? "Angriparen"} avbröt hjälpbegäran.`, {
      key: LOG_MESSAGE_KEYS.combatHelpCancelled,
      params: { name: next.players.find((p) => p.id === action.playerId)?.name ?? "Angriparen" },
    });
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
    pending.helpProposedContract = undefined;
    pending.phase = "helpAwaitDecision";
    const helperName = next.players.find((p) => p.id === action.helperId)?.name ?? "okänd";
    log(next, `${next.players.find((p) => p.id === action.playerId)?.name ?? "Angriparen"} frågar ${helperName} om hjälp.`, {
      key: LOG_MESSAGE_KEYS.combatHelpAsk,
      params: {
        attacker: next.players.find((p) => p.id === action.playerId)?.name ?? "Angriparen",
        helper: helperName,
      },
    });
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
      log(next, `${helper.name} avböjer att hjälpa till.`, {
        key: LOG_MESSAGE_KEYS.combatHelpDeclined,
        params: { name: helper.name },
      });
      pending.helpSelectedHelperId = undefined;
      pending.helpAccepted = false;
      pending.helpUsedPositiveItem = undefined;
      pending.helpContract = undefined;
      pending.helpProposedContract = undefined;
      pending.phase = "reactions";
      return { state: next, events: ["state"] };
    }
    if (!playerHasPlayablePositiveHelpItem(helper)) {
      return { state, events: [], error: "Du har inget positivt hjälpkort du kan spela nu (t.ex. för lite pant)." };
    }
    if (action.decision === "free") {
      pending.helpAccepted = true;
      pending.helpUsedPositiveItem = false;
      pending.helpContract = "free";
      pending.helpProposedContract = undefined;
      pending.phase = "helpAwaitCard";
      log(next, `${helper.name} accepterar att hjälpa till (free).`);
      return { state: next, events: ["state"] };
    }
    pending.helpAccepted = undefined;
    pending.helpUsedPositiveItem = undefined;
    pending.helpContract = undefined;
    pending.helpProposedContract = action.decision;
    pending.phase = "helpAwaitRequesterDecision";
    log(next, `${helper.name} vill hjälpa till mot ersättning (${action.decision}) och väntar på svar.`);
    return { state: next, events: ["state"] };
  }

  if (
    action.type === "combatHelpRequesterDecision" &&
    next.pending?.type === "combat" &&
    next.pending.phase === "helpAwaitRequesterDecision"
  ) {
    const pending = next.pending;
    if (action.playerId !== pending.attackerId) {
      return { state, events: [], error: "Bara angriparen kan svara på hjälparens krav" };
    }
    const helper = pending.helpSelectedHelperId
      ? next.players.find((p) => p.id === pending.helpSelectedHelperId)
      : null;
    const requested = pending.helpProposedContract;
    if (!helper || !requested) {
      return { state, events: [], error: "Ingen aktiv hjälpförfrågan att svara på" };
    }
    if (!action.accept) {
      log(next, `${next.players.find((p) => p.id === action.playerId)?.name ?? "Angriparen"} tackar nej till hjälpvillkoret (${requested}).`);
      pending.helpSelectedHelperId = undefined;
      pending.helpAccepted = false;
      pending.helpUsedPositiveItem = undefined;
      pending.helpContract = undefined;
      pending.helpProposedContract = undefined;
      pending.phase = "reactions";
      return { state: next, events: ["state"] };
    }
    if (!playerHasPlayablePositiveHelpItem(helper)) {
      return { state, events: [], error: "Hjälparen kan inte spela något positivt hjälpkort nu (t.ex. för lite pant)." };
    }
    pending.helpAccepted = true;
    pending.helpUsedPositiveItem = false;
    pending.helpContract = requested as CombatHelpContract;
    pending.helpProposedContract = undefined;
    pending.phase = "helpAwaitCard";
    log(
      next,
      `${next.players.find((p) => p.id === action.playerId)?.name ?? "Angriparen"} accepterar hjälpvillkoret (${requested}) från ${helper.name}.`,
    );
    return { state: next, events: ["state"] };
  }

  if (action.type === "useItem") {
    const user = next.players.find((p) => p.id === action.playerId);
    if (!user) return { state, events: [], error: "Spelaren hittades inte" };
    const inv = user.inventory ?? [];
    const idx = inv.findIndex((it) => it.instanceId === action.instanceId);
    if (idx < 0) return { state, events: [], error: "Föremålet hittades inte" };
    const inst = inv[idx]!;

    if (user.eliminated) {
      return { state, events: [], error: "Du är ute ur spelet" };
    }
    if (action.targetPlayerId) {
      const itemTarget = next.players.find((p) => p.id === action.targetPlayerId);
      const inactiveErr = errorIfInactiveOtherPlayerTarget(itemTarget, user.id);
      if (inactiveErr) return { state, events: [], error: inactiveErr };
    }
    if (next.pending?.type === "brewerDown" && HEALING_ANYTIME_ITEM_IDS.has(inst.itemId)) {
      return { state, events: [], error: "Vänta tills du valt efter stupad bryggare." };
    }

    // Allow item usage on your turn, during combat reactions, or as accepted helper.
    const combatPending = next.pending?.type === "combat" ? next.pending : null;
    const pvpPending = next.pending?.type === "pvp" ? next.pending : null;
    const inCombatReactions = combatPending?.phase === "reactions";
    const inCombatHelpAwaitCard = combatPending?.phase === "helpAwaitCard";
    const inCombatItemWindow = inCombatReactions || inCombatHelpAwaitCard;
    const shouldSendDirectTargetNotices = !inCombatItemWindow;
    const inCombatTableFan = inCombatItemWindow;
    const inPvpPreRoundItems =
      pvpPending?.phase === "preRoundItems" &&
      (action.playerId === pvpPending.attackerId || action.playerId === pvpPending.defenderId);
    const inPvpAwaitingRollsParticipant =
      pvpPending?.phase === "awaitingRolls" &&
      (action.playerId === pvpPending.attackerId || action.playerId === pvpPending.defenderId);
    if (inCombatReactions && !playerCanCombatIntervene(user)) {
      return { state, events: [], error: "Du kan inte ingripa när du är ute ur spelet" };
    }
    if (
      combatPending &&
      (combatPending.phase === "reactions" || combatPending.phase === "enemyIntro") &&
      attackerCannotSelfNegativeCombatItem(inst.itemId, combatPending.attackerId, user.id)
    ) {
      return { state, events: [], error: "Du kan inte sabotera din egen strid med det här föremålet." };
    }
    const skipHelpAwaitCardRules =
      HEALING_ANYTIME_ITEM_IDS.has(inst.itemId) &&
      inCombatHelpAwaitCard &&
      combatPending &&
      action.playerId !== combatPending.helpSelectedHelperId;
    if (inCombatHelpAwaitCard && !skipHelpAwaitCardRules) {
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
    const healingAnytimeOk = HEALING_ANYTIME_ITEM_IDS.has(inst.itemId);
    if (!isYourTurn && !inCombatItemWindow && !inPvpPreRoundItems && !inPvpAwaitingRollsParticipant && !healingAnytimeOk) {
      return { state, events: [], error: "Inte din tur" };
    }
    const healingPvpRollOk =
      inPvpAwaitingRollsParticipant && (inst.itemId === "healing_potion" || inst.itemId === "pretzel_snack");
    if (inPvpAwaitingRollsParticipant && !PVP_ROLL_PHASE_ITEM_IDS.has(inst.itemId) && !healingPvpRollOk) {
      return { state, events: [], error: "Det kortet kan inte spelas under BvB-slaget." };
    }
    const healingPvpPreRoundOk =
      inPvpPreRoundItems && (inst.itemId === "healing_potion" || inst.itemId === "pretzel_snack");
    if (inPvpPreRoundItems && !PVP_PRE_ROUND_ITEM_IDS.has(inst.itemId) && !healingPvpPreRoundOk) {
      return { state, events: [], error: "Det kortet kan inte spelas i BvB före rundan." };
    }
    const playCost = effectiveItemPlayGoldCost(user, inst.itemId);
    if (playCost > 0 && user.gold < playCost) {
      return {
        state,
        events: [],
        error: `Du behöver ${playCost} pant för att spela ${itemDisplayTitle(inst.itemId)}.`,
      };
    }

    if (inst.itemId === "healing_potion") {
      const target = action.targetPlayerId
        ? next.players.find((p) => p.id === action.targetPlayerId)
        : user;
      if (!target) return { state, events: [], error: "Mål krävs" };
      const healAmt = flatItemUseAmount("healing_potion", playerTotalItemCardBonus(user)) ?? 3;
      const before = target.hp;
      target.hp = Math.min(target.maxHp, target.hp + healAmt);
      const healed = target.hp - before;
      log(
        next,
        target.id === user.id
          ? `${user.name} använder en helande brygd (+${healed} HP).`
          : `${user.name} använder en helande brygd på ${target.name} (+${healed} HP).`,
      );
      inv.splice(idx, 1);
      user.inventory = inv;
      recordItemConsumed(next, user.id, inst.itemId);
      markCombatReactorUsedItemIfNeeded(next, user.id);
      notifyItemPlayForTableAfterUse(next, "healing_potion", user.id, target.id, inCombatTableFan);
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
      recordItemConsumed(next, user.id, inst.itemId);
      markCombatReactorUsedItemIfNeeded(next, user.id);
      notifyItemPlayForTableAfterUse(next, "sleep_potion", user.id, target.id, inCombatTableFan);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "sip_card") {
      const target = action.targetPlayerId ? next.players.find((p) => p.id === action.targetPlayerId) : null;
      if (!target) return { state, events: [], error: "Mål krävs" };
      if (target.id === user.id) return { state, events: [], error: "Du kan inte välja dig själv" };
      grantKlunkWithXp(next, target, flatItemUseAmount("sip_card", playerTotalItemCardBonus(user)) ?? 1, {
        penaltyStraff: true,
      });
      pushSipNotice(next, target.id, user.name);
      log(next, `${user.name} ger ${target.name} en straffklunk (+1 klunk).`, {
        key: LOG_MESSAGE_KEYS.itemGrantPenaltySip,
        params: { giver: user.name, target: target.name },
      });
      inv.splice(idx, 1);
      user.inventory = inv;
      recordItemConsumed(next, user.id, inst.itemId);
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
          return { state, events: [], error: "Ogiltigt BvB-mål" };
        }
        applyPlayableItemAttackMod(next, user, targetId, "weak_beer");
        pending.roundItemReady ??= {};
        pending.roundItemReady[user.id] = false;
        log(next, `${user.name} spelar Druckit för mycket: −2 attack i BvB-ronden.`);
      } else {
        const combatPending = pending as Extract<Pending, { type: "combat" }>;
        targetId = action.targetPlayerId ?? combatPending.attackerId;
        applyPlayableItemAttackMod(next, user, targetId, "weak_beer");
        log(next, `${user.name} spelar Druckit för mycket: −2 attack i striden.`);
        // Mark this reactor as having acted (so attacker can roll once everyone either acted or passed).
        combatPending.reacted ??= {};
        if (combatPending.reactors?.includes(user.id) && !combatPending.reacted[user.id]) {
          combatPending.reacted[user.id] = "intervened";
        }
      }
      inv.splice(idx, 1);
      user.inventory = inv;
      recordItemConsumed(next, user.id, inst.itemId);
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
          return { state, events: [], error: "Ogiltigt BvB-mål" };
        }
        applyPlayableItemAttackMod(next, user, targetId, "light_beer");
        pending.roundItemReady ??= {};
        pending.roundItemReady[user.id] = false;
        log(next, `${user.name} spelar Energidryck: +1 attack i BvB-ronden.`);
      } else {
        const combatPending = pending as Extract<Pending, { type: "combat" }>;
        targetId = isHelpCardPhase ? combatPending.attackerId : (action.targetPlayerId ?? combatPending.attackerId);
        applyPlayableItemAttackMod(next, user, targetId, "light_beer");
        log(next, `${user.name} spelar Energidryck: +1 attack i striden.`);
        combatPending.reacted ??= {};
        if (combatPending.reactors?.includes(user.id) && !combatPending.reacted[user.id]) {
          combatPending.reacted[user.id] = "intervened";
        }
      }
      inv.splice(idx, 1);
      user.inventory = inv;
      recordItemConsumed(next, user.id, inst.itemId);
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
          return { state, events: [], error: "Ogiltigt BvB-mål" };
        }
        applyPlayableItemAttackMod(next, user, targetId, "folk_beer");
        pending.roundItemReady ??= {};
        pending.roundItemReady[user.id] = false;
        log(next, `${user.name} spelar 8-bit beer: +2 attack i BvB-ronden.`);
      } else {
        const combatPending = pending as Extract<Pending, { type: "combat" }>;
        targetId = isHelpCardPhase ? combatPending.attackerId : (action.targetPlayerId ?? combatPending.attackerId);
        applyPlayableItemAttackMod(next, user, targetId, "folk_beer");
        log(next, `${user.name} spelar 8-bit beer: +2 attack i striden.`);
        combatPending.reacted ??= {};
        if (combatPending.reactors?.includes(user.id) && !combatPending.reacted[user.id]) {
          combatPending.reacted[user.id] = "intervened";
        }
      }
      inv.splice(idx, 1);
      user.inventory = inv;
      recordItemConsumed(next, user.id, inst.itemId);
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
          return { state, events: [], error: "Ogiltigt BvB-mål" };
        }
        applyPlayableItemAttackMod(next, user, targetId, "tripwire");
        pending.roundItemReady ??= {};
        pending.roundItemReady[user.id] = false;
        log(next, `${user.name} spelar Halt golv: −1 attack i BvB-ronden.`);
      } else {
        const combatPending = pending as Extract<Pending, { type: "combat" }>;
        targetId = action.targetPlayerId ?? combatPending.attackerId;
        applyPlayableItemAttackMod(next, user, targetId, "tripwire");
        log(next, `${user.name} spelar Halt golv: −1 attack i striden.`);
        combatPending.reacted ??= {};
        if (combatPending.reactors?.includes(user.id) && !combatPending.reacted[user.id]) {
          combatPending.reacted[user.id] = "intervened";
        }
      }
      inv.splice(idx, 1);
      user.inventory = inv;
      recordItemConsumed(next, user.id, inst.itemId);
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
          return { state, events: [], error: "Ogiltigt BvB-mål" };
        }
        applyPlayableItemAttackMod(next, user, targetId, "double_hops");
        pending.roundItemReady ??= {};
        pending.roundItemReady[user.id] = false;
        log(next, `${user.name} spelar En hjälpande hand: +2 attack i BvB-ronden.`);
      } else {
        const combatPending = pending as Extract<Pending, { type: "combat" }>;
        targetId = isHelpCardPhase ? combatPending.attackerId : (action.targetPlayerId ?? combatPending.attackerId);
        applyPlayableItemAttackMod(next, user, targetId, "double_hops");
        log(next, `${user.name} spelar En hjälpande hand: +2 attack i striden.`);
        combatPending.reacted ??= {};
        if (combatPending.reactors?.includes(user.id) && !combatPending.reacted[user.id]) {
          combatPending.reacted[user.id] = "intervened";
        }
      }
      inv.splice(idx, 1);
      user.inventory = inv;
      recordItemConsumed(next, user.id, inst.itemId);
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
          return { state, events: [], error: "Ogiltigt BvB-mål" };
        }
        applyPlayableItemAttackMod(next, user, targetId, "beer_bomb");
        pending.roundItemReady ??= {};
        pending.roundItemReady[user.id] = false;
        log(next, `${user.name} spelar Ölbomb: +3 attack i BvB-ronden.`);
      } else {
        const combatPending = pending as Extract<Pending, { type: "combat" }>;
        targetId = isHelpCardPhase ? combatPending.attackerId : (action.targetPlayerId ?? combatPending.attackerId);
        applyPlayableItemAttackMod(next, user, targetId, "beer_bomb");
        log(next, `${user.name} spelar Ölbomb: +3 attack i striden.`);
        combatPending.reacted ??= {};
        if (combatPending.reactors?.includes(user.id) && !combatPending.reacted[user.id]) {
          combatPending.reacted[user.id] = "intervened";
        }
      }
      inv.splice(idx, 1);
      user.inventory = inv;
      recordItemConsumed(next, user.id, inst.itemId);
      markCombatReactorUsedItemIfNeeded(next, user.id);
      if (!isPvpPreRound && isHelpCardPhase) {
        pending.helpUsedPositiveItem = true;
        pending.phase = "reactions";
      }
      notifyItemPlayForTableAfterUse(next, "beer_bomb", user.id, targetId, inCombatTableFan || isPvpPreRound);
      if (isPvpPreRound) maybePvpPreRoundAutoReadyAfterItemUse(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "manopositiv") {
      const pending = next.pending;
      const isHelpCardPhase = pending?.type === "combat" && pending.phase === "helpAwaitCard";
      const isPvpPreRound = pending?.type === "pvp" && pending.phase === "preRoundItems";
      if (
        !pending ||
        (!isPvpPreRound && (pending.type !== "combat" || (pending.phase !== "reactions" && !isHelpCardPhase)))
      ) {
        return { state, events: [], error: "Kan bara användas under stridsreaktioner" };
      }
      const playCost = effectiveItemPlayGoldCost(user, "manopositiv");
      if (user.gold < playCost) {
        return { state, events: [], error: `Du behöver ${playCost} pant för att spela Manopositiv` };
      }
      let targetId: string;
      if (isPvpPreRound && pending.type === "pvp") {
        targetId = action.targetPlayerId ?? user.id;
        if (targetId !== pending.attackerId && targetId !== pending.defenderId) {
          return { state, events: [], error: "Ogiltigt BvB-mål" };
        }
        const mod = applyPlayableItemAttackMod(next, user, targetId, "manopositiv");
        pending.roundItemReady ??= {};
        pending.roundItemReady[user.id] = false;
        log(next, `${user.name} spelar Manopositiv: +${mod} attack i BvB-ronden (−${playCost} pant).`);
      } else {
        const combatPending = pending as Extract<Pending, { type: "combat" }>;
        targetId = isHelpCardPhase ? combatPending.attackerId : (action.targetPlayerId ?? combatPending.attackerId);
        const mod = applyPlayableItemAttackMod(next, user, targetId, "manopositiv");
        log(next, `${user.name} spelar Manopositiv: +${mod} attack i striden (−${playCost} pant).`);
        combatPending.reacted ??= {};
        if (combatPending.reactors?.includes(user.id) && !combatPending.reacted[user.id]) {
          combatPending.reacted[user.id] = "intervened";
        }
      }
      user.gold -= playCost;
      recordPantSpent(next, user.id, playCost);
      inv.splice(idx, 1);
      user.inventory = inv;
      recordItemConsumed(next, user.id, inst.itemId);
      markCombatReactorUsedItemIfNeeded(next, user.id);
      if (!isPvpPreRound && isHelpCardPhase) {
        pending.helpUsedPositiveItem = true;
        pending.phase = "reactions";
      }
      notifyItemPlayForTableAfterUse(next, "manopositiv", user.id, targetId, inCombatTableFan || isPvpPreRound);
      if (isPvpPreRound) maybePvpPreRoundAutoReadyAfterItemUse(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "beard_back") {
      const playCost = effectiveItemPlayGoldCost(user, "beard_back");
      if (user.gold < playCost) {
        return { state, events: [], error: `Du behöver ${playCost} pant för att spela Skägget rakt bak` };
      }
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
      user.gold -= playCost;
      recordPantSpent(next, user.id, playCost);
      log(next, `${user.name} använder Skägget rakt bak: nästa stridsslag räknas dubbelt (−${playCost} pant).`);
      inv.splice(idx, 1);
      user.inventory = inv;
      recordItemConsumed(next, user.id, inst.itemId);
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
          return { state, events: [], error: "Ogiltigt BvB-mål" };
        }
        applyPlayableItemAttackMod(next, user, targetId, "hangover");
        pending.roundItemReady ??= {};
        pending.roundItemReady[user.id] = false;
        log(next, `${user.name} spelar Baksmälla: −3 attack i BvB-ronden.`);
      } else {
        const combatPending = pending as Extract<Pending, { type: "combat" }>;
        targetId = action.targetPlayerId ?? combatPending.attackerId;
        applyPlayableItemAttackMod(next, user, targetId, "hangover");
        log(next, `${user.name} spelar Baksmälla: −3 attack i striden.`);
        combatPending.reacted ??= {};
        if (combatPending.reactors?.includes(user.id) && !combatPending.reacted[user.id]) {
          combatPending.reacted[user.id] = "intervened";
        }
      }
      inv.splice(idx, 1);
      user.inventory = inv;
      recordItemConsumed(next, user.id, inst.itemId);
      markCombatReactorUsedItemIfNeeded(next, user.id);
      notifyItemPlayForTableAfterUse(next, "hangover", user.id, targetId, inCombatTableFan || isPvpPreRound);
      if (isPvpPreRound) maybePvpPreRoundAutoReadyAfterItemUse(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "paidassasin") {
      const pending = next.pending;
      const isPvpPreRound = pending?.type === "pvp" && pending.phase === "preRoundItems";
      if (!pending || (pending.type !== "combat" && !isPvpPreRound) || (pending.type === "combat" && pending.phase !== "reactions")) {
        return { state, events: [], error: "Kan bara användas under stridsreaktioner eller BvB-förberedelse." };
      }
      let targetId: string;
      if (isPvpPreRound && pending.type === "pvp") {
        targetId = action.targetPlayerId ?? (user.id === pending.attackerId ? pending.defenderId : pending.attackerId);
        if (targetId !== pending.attackerId && targetId !== pending.defenderId) {
          return { state, events: [], error: "Ogiltigt BvB-mål" };
        }
        applyPlayableItemAttackMod(next, user, targetId, "paidassasin");
        pending.roundItemReady ??= {};
        pending.roundItemReady[user.id] = false;
        log(next, `${user.name} spelar Hejduk på ${next.players.find((p) => p.id === targetId)?.name ?? "spelaren"}: −5 attack i BvB-ronden (−${playCost} pant).`);
      } else {
        const combatPending = pending as Extract<Pending, { type: "combat" }>;
        targetId = action.targetPlayerId ?? combatPending.attackerId;
        applyPlayableItemAttackMod(next, user, targetId, "paidassasin");
        log(next, `${user.name} spelar Hejduk på ${next.players.find((p) => p.id === targetId)?.name ?? "spelaren"}: −5 attack i striden (−${playCost} pant).`);
        combatPending.reacted ??= {};
        if (combatPending.reactors?.includes(user.id) && !combatPending.reacted[user.id]) {
          combatPending.reacted[user.id] = "intervened";
        }
      }
      user.gold -= playCost;
      recordPantSpent(next, user.id, playCost);
      inv.splice(idx, 1);
      user.inventory = inv;
      recordItemConsumed(next, user.id, inst.itemId);
      markCombatReactorUsedItemIfNeeded(next, user.id);
      notifyItemPlayForTableAfterUse(next, "paidassasin", user.id, targetId, inCombatTableFan || isPvpPreRound);
      if (isPvpPreRound) maybePvpPreRoundAutoReadyAfterItemUse(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "pretzel_snack") {
      const target = action.targetPlayerId
        ? next.players.find((p) => p.id === action.targetPlayerId)
        : user;
      if (!target) return { state, events: [], error: "Mål krävs" };
      const healAmt = flatItemUseAmount("pretzel_snack", playerTotalItemCardBonus(user)) ?? 2;
      const before = target.hp;
      target.hp = Math.min(target.maxHp, target.hp + healAmt);
      const healed = target.hp - before;
      log(
        next,
        target.id === user.id
          ? `${user.name} äter en pretzel (+${healed} HP).`
          : `${user.name} ger ${target.name} en pretzel (+${healed} HP).`,
      );
      inv.splice(idx, 1);
      user.inventory = inv;
      recordItemConsumed(next, user.id, inst.itemId);
      markCombatReactorUsedItemIfNeeded(next, user.id);
      notifyItemPlayForTableAfterUse(next, "pretzel_snack", user.id, target.id, inCombatTableFan);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "coin_purse") {
      const goldAmt = flatItemUseAmount("coin_purse", playerTotalItemCardBonus(user)) ?? 4;
      user.gold += goldAmt;
      log(next, `${user.name} använder en pantpåse (+${goldAmt} pant).`);
      inv.splice(idx, 1);
      user.inventory = inv;
      recordItemConsumed(next, user.id, inst.itemId);
      markCombatReactorUsedItemIfNeeded(next, user.id);
      notifyItemPlayForTableAfterUse(next, "coin_purse", user.id, undefined, inCombatTableFan);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "charity") {
      if (inCombatItemWindow || inPvpPreRoundItems || inPvpAwaitingRollsParticipant) {
        return { state, events: [], error: "Skänk till välgörenhet kan inte användas under strid eller BvB." };
      }
      const pe = next.pending;
      if (!pendingAllowsShortcutTaproom(pe, user.id)) {
        return {
          state,
          events: [],
          error: "Skänk kan inte användas nu — avsluta pågående val först.",
        };
      }
      const missingHp = Math.max(0, Math.floor(user.maxHp - user.hp));
      if (missingHp <= 0) {
        return {
          state,
          events: [],
          error: "Du har fullt liv — skänken fyller bara på saknad hälsa.",
        };
      }
      const donation = Math.min(missingHp, user.gold);
      if (donation <= 0) {
        return {
          state,
          events: [],
          error: "Du har ingen pant att skänka.",
        };
      }
      user.gold -= donation;
      recordPantSpent(next, user.id, donation);
      const beforeHp = user.hp;
      user.hp = Math.min(user.maxHp, user.hp + donation);
      const healed = user.hp - beforeHp;
      log(
        next,
        `${user.name} skänker ${donation} pant till välgörenhet och återfår ${healed} HP (${beforeHp} → ${user.hp}).`,
      );
      inv.splice(idx, 1);
      user.inventory = inv;
      recordItemConsumed(next, user.id, inst.itemId);
      notifyItemPlayForTableAfterUse(next, "charity", user.id, undefined, false);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "shortcut") {
      if (inCombatItemWindow || inPvpPreRoundItems) {
        return { state, events: [], error: "Genväg kan inte användas under strid eller BvB-förberedelse." };
      }
      if (!isYourTurn) {
        return { state, events: [], error: "Inte din tur" };
      }
      const pe = next.pending;
      if (!pendingAllowsShortcutTaproom(pe, user.id)) {
        return {
          state,
          events: [],
          error: "Genvägen kan inte användas nu — avsluta pågående val först.",
        };
      }
      if (!action.targetPlayerId || action.targetPlayerId === user.id) {
        return { state, events: [], error: "Välj en annan spelare att teleportera till." };
      }
      const teleportTarget = next.players.find((p) => p.id === action.targetPlayerId);
      const inactiveTeleportErr = errorIfInactiveOtherPlayerTarget(teleportTarget, user.id);
      if (inactiveTeleportErr) return { state, events: [], error: inactiveTeleportErr };
      if (!teleportTarget) return { state, events: [], error: "Okänd spelare" };

      const goldCost = SHORTCUT_TELEPORT_GOLD_COST;
      if (user.gold < goldCost) {
        return {
          state,
          events: [],
          error: `Du behöver ${goldCost} pant för att använda Genväg.`,
        };
      }

      const ascending = teleportTarget.levelIndex > user.levelIndex;
      if (ascending) {
        logMonsterScalePreviewForAscend(next, user, teleportTarget.levelIndex, "door");
      }

      user.gold -= goldCost;
      recordPantSpent(next, user.id, goldCost);
      user.levelIndex = teleportTarget.levelIndex;
      user.tileIndex = teleportTarget.tileIndex;
      clearPendingSupersededByFloorTravel(next, user.id);
      log(
        next,
        `${user.name} använder Genväg och betalar ${goldCost} pant för att teleportera till ${teleportTarget.name}.`,
        {
          key: LOG_MESSAGE_KEYS.itemShortcutTeleport,
          params: { user: user.name, target: teleportTarget.name, cost: goldCost },
        },
      );
      inv.splice(idx, 1);
      user.inventory = inv;
      recordItemConsumed(next, user.id, inst.itemId);
      if (ascending) {
        logMonsterScaleAfterAscend(next, user);
      }
      notifyItemPlayForTableAfterUse(next, "shortcut", user.id, teleportTarget.id, inCombatTableFan);
      resolveLanding(next, user, rng);
      if (!next.pending && next.phase === "playing") endTurnOrOfferLevelUp(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "taproom_key") {
      if (inCombatItemWindow || inPvpPreRoundItems) {
        return { state, events: [], error: "Taproom-nyckel kan inte användas under strid eller BvB-förberedelse." };
      }
      if (!isYourTurn) {
        return { state, events: [], error: "Inte din tur" };
      }
      const pe = next.pending;
      if (!pendingAllowsShortcutTaproom(pe, user.id)) {
        return {
          state,
          events: [],
          error: "Taproom-nyckel kan inte användas nu — avsluta pågående val först.",
        };
      }
      const targetLevelIndex = user.levelIndex + 1;
      if (targetLevelIndex >= next.levels.length) {
        const bossIdx = findBossTileIndexInLevel(next.levels[user.levelIndex]);
        if (bossIdx < 0) {
          return { state, events: [], error: "Ingen bossruta på sista våningen." };
        }
        if (!next.finalBossMonsterId || !MONSTERS.some((m) => m.id === next.finalBossMonsterId)) {
          return { state, events: [], error: "Slutbossen är inte konfigurerad." };
        }
        const taproomKeyCost = shortcutTaproomGoldCostForFloor(user.levelIndex, "taproom_key");
        if (user.gold < taproomKeyCost) {
          return {
            state,
            events: [],
            error: `Du behöver ${taproomKeyCost} pant för att använda Taproom-nyckel.`,
          };
        }
        user.gold -= taproomKeyCost;
        recordPantSpent(next, user.id, taproomKeyCost);
        const alreadyOnBossTap = user.tileIndex === bossIdx;
        if (!alreadyOnBossTap) {
          user.tileIndex = bossIdx;
        }
        clearPendingSupersededByFloorTravel(next, user.id);
        log(
          next,
          alreadyOnBossTap
            ? `${user.name} använder Taproom-nyckel och betalar ${taproomKeyCost} pant för att lösa slutbossrutan direkt.`
            : `${user.name} använder Taproom-nyckel och betalar ${taproomKeyCost} pant för att gå direkt till slutbossens ruta.`,
        );
        inv.splice(idx, 1);
        user.inventory = inv;
        recordItemConsumed(next, user.id, inst.itemId);
        notifyItemPlayForTableAfterUse(next, "taproom_key", user.id, undefined, false);
        if (!alreadyOnBossTap) {
          next.landingBypassEncounter = true;
        }
        resolveLanding(next, user, rng);
        return { state: next, events: ["state"] };
      }
      const shortcutCost = shortcutItemGoldCostForTargetLevel(targetLevelIndex);
      const taproomKeyCost = Math.max(0, shortcutCost - 10);
      if (user.gold < taproomKeyCost) {
        return {
          state,
          events: [],
          error: `Du behöver ${taproomKeyCost} pant för att använda Taproom-nyckel.`,
        };
      }
      logMonsterScalePreviewForAscend(next, user, targetLevelIndex, "door");
      user.gold -= taproomKeyCost;
      recordPantSpent(next, user.id, taproomKeyCost);
      user.levelIndex = targetLevelIndex;
      user.tileIndex = 0;
      clearPendingSupersededByFloorTravel(next, user.id);
      log(
        next,
        `${user.name} använder Taproom-nyckel och betalar ${taproomKeyCost} pant för att stiga till nivå ${user.levelIndex + 1}.`,
      );
      inv.splice(idx, 1);
      user.inventory = inv;
      recordItemConsumed(next, user.id, inst.itemId);
      logMonsterScaleAfterAscend(next, user);
      notifyItemPlayForTableAfterUse(next, "taproom_key", user.id, undefined, inCombatTableFan);
      endTurnOrOfferLevelUp(next, user.id);
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
          return { state, events: [], error: "Ogiltigt BvB-mål" };
        }
        applyPlayableItemAttackMod(next, user, targetId, "monster_hype");
        pending.roundItemReady ??= {};
        pending.roundItemReady[user.id] = false;
        log(next, `${user.name} spelar Okontrollerad jäsning: −2 attack i BvB-ronden.`);
      } else {
        const combatPending = pending as Extract<Pending, { type: "combat" }>;
        targetId = action.targetPlayerId ?? combatPending.attackerId;
        applyPlayableItemAttackMod(next, user, targetId, "monster_hype");
        log(next, `${user.name} spelar Okontrollerad jäsning: −2 attack i striden.`);
        combatPending.reacted ??= {};
        if (combatPending.reactors?.includes(user.id) && !combatPending.reacted[user.id]) {
          combatPending.reacted[user.id] = "intervened";
        }
      }
      inv.splice(idx, 1);
      user.inventory = inv;
      recordItemConsumed(next, user.id, inst.itemId);
      markCombatReactorUsedItemIfNeeded(next, user.id);
      notifyItemPlayForTableAfterUse(next, "monster_hype", user.id, targetId, inCombatTableFan || isPvpPreRound);
      if (isPvpPreRound) maybePvpPreRoundAutoReadyAfterItemUse(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "yeast_sabotage") {
      const pending = next.pending;
      const isPvpPreRound = pending?.type === "pvp" && pending.phase === "preRoundItems";
      if (!pending || (pending.type !== "combat" && !isPvpPreRound) || (pending.type === "combat" && pending.phase !== "reactions")) {
        return {
          state,
          events: [],
          error: "Kan bara användas under stridsreaktioner eller som BvB-föremål innan slaget",
        };
      }
      let targetId: string;
      if (isPvpPreRound && pending.type === "pvp") {
        targetId = action.targetPlayerId ?? (user.id === pending.attackerId ? pending.defenderId : pending.attackerId);
        if (targetId !== pending.attackerId && targetId !== pending.defenderId) {
          return { state, events: [], error: "Ogiltigt BvB-mål" };
        }
        pending.pvpYeastSabotageVictimId = targetId;
        applyPlayableItemAttackMod(next, user, targetId, "yeast_sabotage");
        pending.roundItemReady ??= {};
        pending.roundItemReady[user.id] = false;
        log(next, `${user.name} spelar Skakad öl: −1 attack i BvB-ronden.`);
      } else {
        const combatPending = pending as Extract<Pending, { type: "combat" }>;
        targetId = action.targetPlayerId ?? combatPending.attackerId;
        combatPending.yeastSabotageVictimId = targetId;
        applyPlayableItemAttackMod(next, user, targetId, "yeast_sabotage");
        log(next, `${user.name} spelar Skakad öl: −1 attack i striden.`);
        combatPending.reacted ??= {};
        if (combatPending.reactors?.includes(user.id) && !combatPending.reacted[user.id]) {
          combatPending.reacted[user.id] = "intervened";
        }
      }
      inv.splice(idx, 1);
      user.inventory = inv;
      recordItemConsumed(next, user.id, inst.itemId);
      markCombatReactorUsedItemIfNeeded(next, user.id);
      notifyItemPlayForTableAfterUse(next, "yeast_sabotage", user.id, targetId, inCombatTableFan || isPvpPreRound);
      if (isPvpPreRound) maybePvpPreRoundAutoReadyAfterItemUse(next, user.id);
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
      recordItemConsumed(next, user.id, inst.itemId);
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
      log(next, `${user.name} spelar Split the G och tar ${steal} pant från ${target.name}.`, {
        key: LOG_MESSAGE_KEYS.itemSplitTheG,
        params: { user: user.name, amount: steal, target: target.name },
      });
      if (shouldSendDirectTargetNotices) {
        pushPlayerNotice(
          next,
          target.id,
          user.name,
          "Split the G",
          `${user.name} tog ${steal} pant från dig med Split the G.`,
        );
      }
      inv.splice(idx, 1);
      user.inventory = inv;
      recordItemConsumed(next, user.id, inst.itemId);
      notifyItemPlayForTableAfterUse(next, "split_the_g", user.id, target.id, inCombatTableFan);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "shuffle") {
      const target = action.targetPlayerId ? next.players.find((x) => x.id === action.targetPlayerId) : null;
      if (!target) return { state, events: [], error: "Mål krävs" };
      if (target.id === user.id) return { state, events: [], error: "Du kan inte välja dig själv" };
      if (target.eliminated || target.leftVoluntarily) {
        return { state, events: [], error: "Målet är inte tillgängligt." };
      }
      if (target.equipment.accessory?.preventTheft) {
        return { state, events: [], error: `${target.name} kan inte bli bestulen.` };
      }
      const cost = effectiveItemPlayGoldCost(user, "shuffle");
      if (cost > 0 && user.gold < cost) {
        return { state, events: [], error: `Du behöver ${cost} pant för att spela Shuffle.` };
      }
      if (cost > 0) {
        user.gold -= cost;
        recordPantSpent(next, user.id, cost);
      }
      inv.splice(idx, 1);
      user.inventory = inv;
      const a = [...(user.inventory ?? [])];
      const b = [...(target.inventory ?? [])];
      user.inventory = b;
      target.inventory = a;
      log(next, `${user.name} spelar Shuffle och byter hela föremålsväskan med ${target.name} (${cost} pant).`);
      recordItemConsumed(next, user.id, inst.itemId);
      notifyItemPlayForTableAfterUse(next, "shuffle", user.id, target.id, inCombatTableFan);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "rigged_game") {
      const playCost = effectiveItemPlayGoldCost(user, "rigged_game");
      if (user.gold < playCost) {
        return { state, events: [], error: `Du behöver ${playCost} pant för att spela Riggat spel` };
      }
      const target = action.targetPlayerId ? next.players.find((p) => p.id === action.targetPlayerId) : null;
      if (!target) return { state, events: [], error: "Mål krävs" };
      if (target.id === user.id) return { state, events: [], error: "Du kan inte välja dig själv" };
      if (target.equipment.accessory?.preventTheft) {
        return { state, events: [], error: `${target.name} kan inte bli bestulen.` };
      }
      if (next.stolenEquipmentEscrow?.thiefId === user.id) {
        discardStolenEquipmentEscrow(next, user.name);
      }
      const slot = randomEquippedSlot(target, rng);
      if (!slot) return { state, events: [], error: "Målet har ingen utrustning att stjäla" };
      const piece = target.equipment[slot]!;
      const stealSide: TableItemPlaySidePayload = {
        sideEquipmentSlot: slot,
        sideEquipmentName: piece.name ?? String(slot),
      };
      target.equipment[slot] = undefined as any;
      if (slot === "armor" || slot === "helmet") {
        target.maxHp = maxHpFor(next, target);
        if (target.hp > target.maxHp) target.hp = target.maxHp;
      }
      onPlayerEquipmentSlotCleared(target, slot);
      const incomingClone = cloneEquipmentIncomingPiece(piece as Weapon | ArmorPiece | Helmet | Accessory);
      const thiefOccupied =
        (slot === "weapon" && !!user.equipment.weapon) ||
        (slot === "armor" && !!user.equipment.armor) ||
        (slot === "helmet" && !!user.equipment.helmet) ||
        (slot === "accessory" && !!user.equipment.accessory);
      if (thiefOccupied) {
        setStolenEquipmentEscrow(next, user.id, target.id, slot, incomingClone);
        next.pending = {
          type: "equipmentReplaceOffer",
          playerId: user.id,
          slot,
          newName: piece.name ?? String(slot),
          incomingPiece: incomingClone,
          returnVictimId: target.id,
        };
        log(
          next,
          `${user.name} spelar Riggat spel och rycker ${piece.name ?? slot} (${slot}) från ${target.name} — välj om du tar emot den (du har redan något där, −${playCost} pant).`,
          {
            key: LOG_MESSAGE_KEYS.itemRiggedGameStealReplace,
            params: {
              user: user.name,
              pieceName: piece.name ?? String(slot),
              slot,
              target: target.name,
              cost: playCost,
            },
          },
        );
        if (shouldSendDirectTargetNotices) {
          pushPlayerNotice(
            next,
            target.id,
            user.name,
            "Riggat spel",
            `${user.name} har tagit din ${piece.name ?? slot}.`,
          );
        }
      } else {
        assignEquipmentPieceFromLoot(next, user, slot, incomingClone);
        log(
          next,
          `${user.name} spelar Riggat spel och tar ${piece.name ?? slot} (${slot}) från ${target.name} (−${playCost} pant).`,
          {
            key: LOG_MESSAGE_KEYS.itemRiggedGameSteal,
            params: {
              user: user.name,
              pieceName: piece.name ?? String(slot),
              slot,
              target: target.name,
              cost: playCost,
            },
          },
        );
        if (shouldSendDirectTargetNotices) {
          pushPlayerNotice(
            next,
            target.id,
            user.name,
            "Riggat spel",
            `${user.name} tog ${piece.name ?? slot} från dig med Riggat spel.`,
          );
        }
      }
      user.gold -= playCost;
      recordPantSpent(next, user.id, playCost);
      inv.splice(idx, 1);
      user.inventory = inv;
      recordItemConsumed(next, user.id, inst.itemId);
      notifyItemPlayForTableAfterUse(next, "rigged_game", user.id, target.id, inCombatTableFan, stealSide);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "lengraddad") {
      if (inCombatReactions && lengraddadBlockedForCombatParticipant(user.id, combatPending)) {
        return { state, events: [], error: "Lengräddad kan inte spelas i strider du deltar i." };
      }
      const combatFallbackTargetId =
        next.pending?.type === "combat" && next.pending.phase === "reactions"
          ? next.pending.attackerId
          : undefined;
      const pvpFallbackTargetId =
        inPvpPreRoundItems && pvpPending?.type === "pvp"
          ? user.id === pvpPending.attackerId
            ? pvpPending.defenderId
            : pvpPending.attackerId
          : undefined;
      const targetId = action.targetPlayerId ?? combatFallbackTargetId ?? pvpFallbackTargetId;
      const target = targetId ? next.players.find((p) => p.id === targetId) : null;
      if (!target) return { state, events: [], error: "Mål krävs" };
      if (target.id === user.id) return { state, events: [], error: "Du kan inte välja dig själv" };

      if (inPvpPreRoundItems && pvpPending?.type === "pvp") {
        if (target.id !== pvpPending.attackerId && target.id !== pvpPending.defenderId) {
          return { state, events: [], error: "Lengräddad måste spelas på en duellant." };
        }
        pvpPending.pvpAttackMods ??= {};
        applyPlayableItemAttackMod(next, user, target.id, "lengraddad");
        pvpPending.roundItemReady ??= {};
        pvpPending.roundItemReady[user.id] = false;
        log(next, `${user.name} spelar Lengräddad på ${target.name}: −2 attack i BvB-ronden.`);
        inv.splice(idx, 1);
        user.inventory = inv;
        recordItemConsumed(next, user.id, inst.itemId);
        notifyItemPlayForTableAfterUse(next, "lengraddad", user.id, target.id, inCombatTableFan || inPvpPreRoundItems);
        maybePvpPreRoundAutoReadyAfterItemUse(next, user.id);
        return { state: next, events: ["state"] };
      }

      if (!inCombatReactions || combatPending?.phase !== "reactions") {
        return { state, events: [], error: "Kan bara användas under stridsreaktioner eller BvB-förberedelse." };
      }

      target.nextCombatModifier = (target.nextCombatModifier ?? 0) - 2;
      log(next, `${user.name} spelar Lengräddad på ${target.name}: nästa strid −2 i attack.`);
      inv.splice(idx, 1);
      user.inventory = inv;
      recordItemConsumed(next, user.id, inst.itemId);
      markCombatReactorUsedItemIfNeeded(next, user.id);
      notifyItemPlayForTableAfterUse(next, "lengraddad", user.id, target.id, inCombatTableFan);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "not_my_round") {
      const combatFallbackTargetId =
        next.pending?.type === "combat" && next.pending.phase === "reactions"
          ? next.pending.attackerId
          : undefined;
      const targetId = action.targetPlayerId ?? combatFallbackTargetId;
      const target = targetId ? next.players.find((p) => p.id === targetId) : null;
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
        if (shouldSendDirectTargetNotices) {
          pushPlayerNotice(
            next,
            target.id,
            user.name,
            "En enkel stöld",
            `${user.name} stal ${itemDisplayTitle(stolen.itemId)} från dig.`,
          );
        }
      } else {
        const slot = randomEquippedSlot(target, rng);
        if (!slot) return { state, events: [], error: "Målet har inget att stjäla" };
        const piece = target.equipment[slot]!;
        stealSide = { sideEquipmentSlot: slot, sideEquipmentName: piece.name ?? String(slot) };
        target.equipment[slot] = undefined as any;
        if (slot === "armor" || slot === "helmet") {
          target.maxHp = maxHpFor(next, target);
          if (target.hp > target.maxHp) target.hp = target.maxHp;
        }
        onPlayerEquipmentSlotCleared(target, slot);
        const incomingClone = cloneEquipmentIncomingPiece(piece as Weapon | ArmorPiece | Helmet | Accessory);
        const thiefOccupied =
          (slot === "weapon" && !!user.equipment.weapon) ||
          (slot === "armor" && !!user.equipment.armor) ||
          (slot === "helmet" && !!user.equipment.helmet) ||
          (slot === "accessory" && !!user.equipment.accessory);
        if (thiefOccupied) {
          if (next.pending?.type !== "combat") {
            return { state, events: [], error: "Ogiltigt spelläge för bytesmodal." };
          }
          setStolenEquipmentEscrow(next, user.id, target.id, slot, incomingClone);
          next.pending.postReactionEquipmentOffer = {
            playerId: user.id,
            slot,
            newName: piece.name ?? String(slot),
            incomingPiece: incomingClone,
            returnVictimId: target.id,
          };
          log(
            next,
            `${user.name} rycker ${piece.name ?? slot} (${slot}) från ${target.name} — välj om du tar emot den (du har redan något där).`,
          );
        } else {
          assignEquipmentPieceFromLoot(next, user, slot, incomingClone);
          log(next, `${user.name} stjäl ${piece.name ?? slot} (${slot}) från ${target.name}.`);
        }
        if (shouldSendDirectTargetNotices && !thiefOccupied) {
          pushPlayerNotice(
            next,
            target.id,
            user.name,
            "En enkel stöld",
            `${user.name} stal ${piece.name ?? slot} från dig.`,
          );
        } else if (shouldSendDirectTargetNotices && thiefOccupied) {
          pushPlayerNotice(
            next,
            target.id,
            user.name,
            "En enkel stöld",
            `${user.name} har tagit din ${piece.name ?? slot}.`,
          );
        }
      }
      inv.splice(idx, 1);
      user.inventory = inv;
      recordItemConsumed(next, user.id, inst.itemId);
      markCombatReactorUsedItemIfNeeded(next, user.id);
      notifyItemPlayForTableAfterUse(next, "not_my_round", user.id, target.id, inCombatTableFan, stealSide);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "spill_intentional") {
      const playCost = effectiveItemPlayGoldCost(user, "spill_intentional");
      if (user.gold < playCost) {
        return { state, events: [], error: `Du behöver ${playCost} pant för att spela Spilla med flit` };
      }
      const combatFallbackTargetId =
        next.pending?.type === "combat" && next.pending.phase === "reactions"
          ? next.pending.attackerId
          : undefined;
      const inPvpSpillEligible =
        pvpPending?.type === "pvp" &&
        (pvpPending.phase === "preRoundItems" || pvpPending.phase === "awaitingRolls") &&
        (user.id === pvpPending.attackerId || user.id === pvpPending.defenderId);
      const pvpFallbackTargetId =
        inPvpSpillEligible && pvpPending?.type === "pvp"
          ? user.id === pvpPending.attackerId
            ? pvpPending.defenderId
            : pvpPending.attackerId
          : undefined;
      const targetId = action.targetPlayerId ?? combatFallbackTargetId ?? pvpFallbackTargetId;
      const target = targetId ? next.players.find((p) => p.id === targetId) : null;
      if (!target) return { state, events: [], error: "Mål krävs" };
      if (target.id === user.id) return { state, events: [], error: "Du kan inte välja dig själv" };
      if (inPvpSpillEligible && pvpPending?.type === "pvp") {
        if (target.id !== pvpPending.attackerId && target.id !== pvpPending.defenderId) {
          return { state, events: [], error: "Ogiltigt BvB-mål" };
        }
      }
      let spillSide: TableItemPlaySidePayload | undefined;
      if ((target.inventory ?? []).length > 0) {
        const ti = Math.floor(rng() * target.inventory.length);
        const ruined = target.inventory.splice(ti, 1)[0]!;
        spillSide = { sideInventoryItemId: ruined.itemId };
        log(next, `${user.name} spiller med flit och förstör ${itemDisplayTitle(ruined.itemId)} hos ${target.name}.`);
        if (shouldSendDirectTargetNotices) {
          pushPlayerNotice(
            next,
            target.id,
            user.name,
            "Spilla med flit",
            `${user.name} förstörde ${itemDisplayTitle(ruined.itemId)} hos dig.`,
          );
        }
      } else {
        const slot = randomEquippedSlot(target, rng);
        if (!slot) return { state, events: [], error: "Målet har inget att förstöra" };
        const piece = target.equipment[slot]!;
        spillSide = { sideEquipmentSlot: slot, sideEquipmentName: piece.name ?? String(slot) };
        target.equipment[slot] = undefined as any;
        if (slot === "armor" || slot === "helmet") {
          target.maxHp = maxHpFor(next, target);
          if (target.hp > target.maxHp) target.hp = target.maxHp;
        }
        onPlayerEquipmentSlotCleared(target, slot);
        log(next, `${user.name} spiller med flit och förstör ${piece.name ?? slot} hos ${target.name}.`);
        if (shouldSendDirectTargetNotices) {
          pushPlayerNotice(
            next,
            target.id,
            user.name,
            "Spilla med flit",
            `${user.name} förstörde ${piece.name ?? slot} hos dig.`,
          );
        }
      }
      user.gold -= playCost;
      recordPantSpent(next, user.id, playCost);
      inv.splice(idx, 1);
      user.inventory = inv;
      recordItemConsumed(next, user.id, inst.itemId);
      markCombatReactorUsedItemIfNeeded(next, user.id);
      notifyItemPlayForTableAfterUse(
        next,
        "spill_intentional",
        user.id,
        target.id,
        inCombatTableFan || inPvpPreRoundItems || inPvpAwaitingRollsParticipant,
        spillSide,
      );
      if (inPvpPreRoundItems) maybePvpPreRoundAutoReadyAfterItemUse(next, user.id);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "early_night") {
      const pending = next.pending;
      if (!pending || pending.type !== "combat" || (pending.phase !== "enemyIntro" && pending.phase !== "reactions")) {
        return { state, events: [], error: "Kan bara användas under ett pågående batchmöte" };
      }
      if (pending.attackerId !== user.id) return { state, events: [], error: "Endast angriparen kan skippa mötet" };
      if (pending.postReactionEquipmentOffer) {
        return {
          state,
          events: [],
          error: "Välj hur du hanterar den stulna utrustningen först.",
        };
      }
      log(next, `${user.name} spelar Vaska och skippar den dåliga batchen.`, {
        key: LOG_MESSAGE_KEYS.itemVaskaSkip,
        params: { name: user.name },
      });
      inv.splice(idx, 1);
      user.inventory = inv;
      recordItemConsumed(next, user.id, inst.itemId);
      discardStolenEquipmentEscrow(next, user.name);
      next.pending = null;
      endTurnOrOfferLevelUp(next, user.id);
      appendTableItemPlayReveal(next, "early_night", user.id, undefined);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "bribes") {
      const pending = next.pending;
      if (!pending || pending.type !== "combat" || (pending.phase !== "enemyIntro" && pending.phase !== "reactions")) {
        return { state, events: [], error: "Kan bara användas under ett pågående batchmöte" };
      }
      if (pending.attackerId !== user.id) return { state, events: [], error: "Endast angriparen kan välja bort mötet" };
      if (pending.postReactionEquipmentOffer) {
        return {
          state,
          events: [],
          error: "Välj hur du hanterar den stulna utrustningen först.",
        };
      }
      user.gold -= playCost;
      recordPantSpent(next, user.id, playCost);
      log(next, `${user.name} mutar sig ur batchmötet (${pending.enemyName}) och betalar ${playCost} pant.`, {
        key: LOG_MESSAGE_KEYS.itemBribeSkip,
        params: { name: user.name, enemyName: pending.enemyName, cost: playCost },
      });
      inv.splice(idx, 1);
      user.inventory = inv;
      recordItemConsumed(next, user.id, inst.itemId);
      discardStolenEquipmentEscrow(next, user.name);
      next.pending = null;
      endTurnOrOfferLevelUp(next, user.id);
      appendTableItemPlayReveal(next, "bribes", user.id, undefined);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "get_lucky") {
      const playCost = effectiveItemPlayGoldCost(user, "get_lucky");
      if (user.gold < playCost) {
        return { state, events: [], error: `Du behöver ${playCost} pant för att spela Get Lucky` };
      }
      const pending = next.pending;
      const isHelpCardPhase = pending?.type === "combat" && pending.phase === "helpAwaitCard";
      if (!pending || pending.type !== "combat" || (pending.phase !== "reactions" && !isHelpCardPhase)) {
        return { state, events: [], error: "Kan bara användas under stridsreaktioner" };
      }
      const canUseAsHelper =
        isHelpCardPhase && pending.helpAccepted === true && pending.helpSelectedHelperId === user.id;
      if (isHelpCardPhase && !canUseAsHelper) {
        return { state, events: [], error: "Endast vald hjälpare kan spela kort nu" };
      }
      const fallbackTargetId =
        isHelpCardPhase || (user.id !== pending.attackerId && user.id !== pending.assistId)
          ? pending.attackerId
          : user.id;
      const targetId = action.targetPlayerId ?? fallbackTargetId;
      const validTargets = new Set([pending.attackerId, pending.assistId].filter((id): id is string => !!id));
      if (!validTargets.has(targetId)) {
        return { state, events: [], error: "Get Lucky måste spelas på den som slåss" };
      }
      const mod = applyPlayableItemAttackMod(next, user, targetId, "get_lucky");
      pending.getLuckyRiskPlayerIds = Array.from(new Set([...(pending.getLuckyRiskPlayerIds ?? []), targetId]));
      const target = next.players.find((p) => p.id === targetId);
      user.gold -= playCost;
      recordPantSpent(next, user.id, playCost);
      log(
        next,
        `${user.name} spelar Get Lucky på ${target?.name ?? "spelaren"}: +${mod} attack men dubbel HP-skada vid förlust (−${playCost} pant).`,
      );
      pending.reacted ??= {};
      if (pending.reactors?.includes(user.id) && !pending.reacted[user.id]) pending.reacted[user.id] = "intervened";
      inv.splice(idx, 1);
      user.inventory = inv;
      recordItemConsumed(next, user.id, inst.itemId);
      markCombatReactorUsedItemIfNeeded(next, user.id);
      if (isHelpCardPhase) {
        pending.helpUsedPositiveItem = true;
        pending.phase = "reactions";
      }
      notifyItemPlayForTableAfterUse(next, "get_lucky", user.id, targetId, inCombatTableFan);
      return { state: next, events: ["state"] };
    }

    if (inst.itemId === "six_sense") {
      const playCost = effectiveItemPlayGoldCost(user, "six_sense");
      if (user.gold < playCost) {
        return { state, events: [], error: `Du behöver ${playCost} pant för att spela Ett sjätte ölsinne` };
      }
      const face = action.chosenDieFace;
      if (typeof face !== "number" || face < 1 || face > 6 || face !== Math.floor(face)) {
        return { state, events: [], error: "Välj tärningsvärde 1–6." };
      }
      if (inCombatHelpAwaitCard) {
        return { state, events: [], error: "Föremålet kan inte användas nu." };
      }
      const fighterInCombatReactions =
        combatPending?.phase === "reactions" &&
        (combatPending.attackerId === user.id || combatPending.assistId === user.id);
      const inPvpPre =
        pvpPending?.phase === "preRoundItems" &&
        (pvpPending.attackerId === user.id || pvpPending.defenderId === user.id);
      const inPvpRoll =
        pvpPending?.phase === "awaitingRolls" &&
        (pvpPending.attackerId === user.id || pvpPending.defenderId === user.id);
      const onMapTurn =
        isYourTurn &&
        (combatPending == null || combatPending.phase !== "reactions" || fighterInCombatReactions);
      const allowed = onMapTurn || inPvpPre || inPvpRoll;
      if (!allowed) {
        return { state, events: [], error: "Föremålet kan inte användas nu." };
      }
      user.nextForcedDieFace = face as Player["nextForcedDieFace"];
      user.gold -= playCost;
      recordPantSpent(next, user.id, playCost);
      log(next, `${user.name} använder Ett sjätte ölsinne — nästa tärning visar ${face} (−${playCost} pant).`);
      inv.splice(idx, 1);
      user.inventory = inv;
      recordItemConsumed(next, user.id, inst.itemId);
      markCombatReactorUsedItemIfNeeded(next, user.id);
      if (fighterInCombatReactions) {
        notifyItemPlayForTableAfterUse(next, "six_sense", user.id, undefined, true);
      } else if (inPvpPre && pvpPending?.type === "pvp") {
        pvpPending.roundItemReady ??= {};
        pvpPending.roundItemReady[user.id] = false;
        appendTableItemPlayReveal(next, "six_sense", user.id, undefined);
        maybePvpPreRoundAutoReadyAfterItemUse(next, user.id);
      } else if (inPvpRoll) {
        appendTableItemPlayReveal(next, "six_sense", user.id, undefined);
      } else {
        notifyItemPlayForTableAfterUse(next, "six_sense", user.id, undefined, inCombatTableFan);
      }
      return { state: next, events: ["state"] };
    }

    return { state, events: [], error: "Okänt föremål" };
  }

  if (action.type === "combatChooseSipWeaponBonus" && next.pending?.type === "combat" && next.pending.phase === "reactions") {
    const pending = next.pending;
    if (pending.postReactionEquipmentOffer) {
      return { state, events: [], error: "Välj hur du hanterar den stulna utrustningen först." };
    }
    const assistId = pending.assistId;
    const canChoose =
      action.playerId === pending.attackerId || (!!assistId && action.playerId === assistId);
    if (!canChoose) return { state, events: [], error: "Du är inte med i den här striden" };
    if (action.playerId !== cp.id && !(assistId && action.playerId === assistId)) {
      return { state, events: [], error: "Inte din tur" };
    }
    const chooser = next.players.find((x) => x.id === action.playerId);
    if (!chooser) return { state, events: [], error: "Spelaren hittades inte" };
    const sipBonus = chooser.equipment.weapon?.sipAttackBonus ?? 0;
    if (sipBonus <= 0) return { state, events: [], error: "Inget vapen med sip-bonus" };
    const sipPay = sipWeaponExtraAttackCosts(chooser.equipment.weapon);
    if (action.useSipWeaponBonus && sipPay.gold > 0 && chooser.gold < sipPay.gold) {
      return {
        state,
        events: [],
        error: `Du behöver ${sipPay.gold} pant för att använda ${chooser.equipment.weapon?.name ?? "vapnet"}-bonusen.`,
      };
    }
    pending.sipWeaponBonusChoice ??= {};
    pending.sipWeaponBonusChoice[action.playerId] = action.useSipWeaponBonus;
    return { state: next, events: ["state"] };
  }

  if (action.type === "combatRoll" && next.pending?.type === "combat" && next.pending.phase === "reactions") {
    const pending = next.pending;
    if (pending.postReactionEquipmentOffer) {
      return { state, events: [], error: "Välj hur du hanterar den stulna utrustningen först." };
    }
    const assistId = pending.assistId;
    const needsAssistRoll = !!assistId;
    const canRollForTeam =
      action.playerId === pending.attackerId || (needsAssistRoll && action.playerId === assistId);
    if (!canRollForTeam) return { state, events: [], error: "Du är inte med i den här striden" };
    if (action.playerId !== cp.id && !(needsAssistRoll && action.playerId === assistId)) {
      return { state, events: [], error: "Inte din tur" };
    }
    autoPassReactorsWithoutPlayableItems(next, pending);
    // Slag får bara gå innan timeout om alla uttryckligen valt "gör inget".
    const reactors = pending.reactors ?? [];
    const reacted = pending.reacted ?? {};
    const allDone = combatReactionsAllAnswered(reactors, reacted);
    const reactionsTimedOut =
      (pending.reactionsDeadlineAt ?? 0) > 0 && Date.now() > (pending.reactionsDeadlineAt ?? 0);
    if (reactors.length > 0 && !allDone && !reactionsTimedOut) {
      return { state, events: [], error: "Väntar på att reaktionsfönstret stänger eller att alla gör inget." };
    }
    const tile = next.levels[pending.levelIndex]?.tiles?.[pending.tileIndex];
    if (!tile || (tile.type !== "combat" && tile.type !== "boss")) {
      next.pending = null;
      return { state: next, events: ["state"] };
    }

    const roller = next.players.find((x) => x.id === action.playerId);
    if (!roller) return { state, events: [], error: "Spelaren hittades inte" };
    const tempMod = roller.nextCombatModifier ?? 0;
    roller.nextCombatModifier = 0;
    const mod = (pending.attackMods?.[roller.id] ?? 0) + tempMod;
    const rawRoll = rollD6WithOptionalSixSense(roller, rng);
    const rawDie = rawRoll.die;
    const attackDoubled = roller.nextCombatAttackDiceDouble === true;
    if (attackDoubled) {
      roller.nextCombatAttackDiceDouble = false;
    }
    const dieContribution = attackDoubled ? rawDie * 2 : rawDie;
    let sipBoost = 0;
    const sipBonus = roller.equipment.weapon?.sipAttackBonus ?? 0;
    let useSipWeaponBonusResolved: boolean | undefined = pending.sipWeaponBonusChoice?.[roller.id];
    if (useSipWeaponBonusResolved === undefined && typeof action.useSipWeaponBonus === "boolean") {
      useSipWeaponBonusResolved = action.useSipWeaponBonus;
    }
    if (sipBonus > 0) {
      if (useSipWeaponBonusResolved === undefined) {
        return {
          state,
          events: [],
          error: "Välj om du vill använda vapnets extraattack innan du slår.",
        };
      }
      if (useSipWeaponBonusResolved) {
        const sipPay = sipWeaponExtraAttackCosts(roller.equipment.weapon);
        if (sipPay.klunks > 0) {
          grantKlunkWithXp(next, roller, sipPay.klunks, { penaltyStraff: false });
          pending.weaponSipDeferredPenalties = mergePenaltySipQueue(pending.weaponSipDeferredPenalties, [
            {
              recipientId: roller.id,
              klunkCount: sipPay.klunks,
              fromPlayerName: pending.enemyName ?? "Striden",
              noticeBody: weaponBoostPenaltySipNoticeBody(
                roller.equipment.weapon?.name,
                sipPay.klunks,
                pending.enemyName ?? "",
              ),
              noticeEquipmentName: roller.equipment.weapon?.name,
            },
          ]);
          sipBoost = sipBonus;
          log(
            next,
            `${roller.name} dricker ${sipPay.klunks} klunk med ${roller.equipment.weapon?.name ?? "vapnet"}: +${sipBonus} attack.`,
          );
        } else if (sipPay.gold > 0) {
          if (roller.gold < sipPay.gold) {
            return {
              state,
              events: [],
              error: `Du behöver ${sipPay.gold} pant för att använda ${roller.equipment.weapon?.name ?? "vapnet"}-bonusen.`,
            };
          }
          roller.gold -= sipPay.gold;
          recordPantSpent(next, roller.id, sipPay.gold);
          sipBoost = sipBonus;
          log(
            next,
            `${roller.name} betalar ${sipPay.gold} pant med ${roller.equipment.weapon?.name ?? "vapnet"}: +${sipBonus} attack.`,
          );
        } else {
          sipBoost = sipBonus;
        }
      }
    }
    const total = dieContribution + weaponPower(roller) + mod + sipBoost;

    pending.teamRolls ??= {};
    if (pending.teamRolls[action.playerId]) return { state, events: [], error: "Du har redan slagit" };
    pending.teamRolls[action.playerId] = {
      die: rawDie,
      total,
      attackDiceDoubled: attackDoubled || undefined,
      sipBoost: sipBoost > 0 ? sipBoost : undefined,
    };
    if (rawRoll.forced) {
      log(next, `${roller.name}s stridstärning: ${rawDie} (fast siffra).`);
    }

    if (needsAssistRoll) {
      const aRoll = pending.teamRolls[pending.attackerId];
      const bRoll = assistId ? pending.teamRolls[assistId] : undefined;
      if (!aRoll || !bRoll) {
        return { state: next, events: ["state"] };
      }
    }

    const attackerRoll = pending.teamRolls[pending.attackerId]!;
    const assistRollObj = assistId ? pending.teamRolls[assistId] : undefined;
    /* Lagstrid: preview-fälten måste täcka BÅDA slagen, inte bara den som slog sist. */
    const teamSipBoostTotal = (attackerRoll.sipBoost ?? 0) + (assistRollObj?.sipBoost ?? 0);
    const prBase = attackerRoll.total;
    const assistRoll = assistRollObj?.total ?? null;
    const previewBroDie = assistRollObj?.die ?? null;
    const pr = prBase + (assistRoll ?? 0);
    const need = pending.need + (pending.needMod ?? 0);
    const attackerPl = next.players.find((x) => x.id === pending.attackerId);
    const assistPl = assistId != null ? next.players.find((x) => x.id === assistId) : undefined;
    const attackerIgnoresCritFailOnOne =
      attackerPl?.equipment.accessory?.ignoreCombatCritFailOnOne === true;
    const broIgnoresCritFailOnOne = assistPl?.equipment.accessory?.ignoreCombatCritFailOnOne === true;
    const critFailOnOne = combatCritFailFromDice(
      assistId,
      attackerRoll.die,
      previewBroDie,
      attackerIgnoresCritFailOnOne,
      broIgnoresCritFailOnOne,
    );

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
      rewardXp: pending.rewardXp,
      assistId: pending.assistId,
      helpCandidateIds: pending.helpCandidateIds,
      helpSelectedHelperId: pending.helpSelectedHelperId,
      helpContract: pending.helpContract,
      helpProposedContract: pending.helpProposedContract,
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
      previewCritFailOnOne: critFailOnOne || undefined,
      previewUsedSipWeaponBonus: teamSipBoostTotal > 0,
      previewSipWeaponBonusValue: teamSipBoostTotal > 0 ? teamSipBoostTotal : undefined,
      previewDeferredSipWeaponPenalties: pending.weaponSipDeferredPenalties
        ? [...pending.weaponSipDeferredPenalties]
        : undefined,
      getLuckyRiskPlayerIds: pending.getLuckyRiskPlayerIds,
      postReactionEquipmentOffer: pending.postReactionEquipmentOffer,
    };

    return { state: next, events: ["state"] };
  }

  if (action.type === "combatRollAck" && next.pending?.type === "combat" && next.pending.phase === "rollPreview") {
    const pending = next.pending;
    if (action.playerId !== pending.attackerId) return { state, events: [], error: "Endast angriparen kan fortsätta" };
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
    if (action.playerId !== pending.attackerId) return { state, events: [], error: "Endast angriparen kan välja" };
    if (action.playerId !== cp.id) return { state, events: [], error: "Inte din tur" };
    if (action.choice !== "sip" && action.choice !== "no_sip") return { state, events: [], error: "Ogiltigt val" };
    const p = next.players.find((x) => x.id === pending.attackerId);
    const tile = next.levels[pending.levelIndex]?.tiles?.[pending.tileIndex];
    if (!p || !tile || (tile.type !== "combat" && tile.type !== "boss")) {
      next.pending = null;
      return { state: next, events: ["state"] };
    }
    const monsterId = pending.monsterId as MonsterId;
    const chooseMitigation = action.choice === "sip";
    if (monsterId === "kapten_interrobang" && chooseMitigation) {
      if (p.gold < 5) return { state, events: [], error: "Du behöver 5 pant för att mildra Kapten Interrobangs träff." };
      p.gold -= 5;
      recordPantSpent(next, p.id, 5);
    }
    if (monsterId === "transporter" && chooseMitigation) {
      if (p.gold < 10) return { state, events: [], error: "Du behöver 10 pant för att undvika skadan från Transporter." };
      p.gold -= 10;
      recordPantSpent(next, p.id, 10);
    }
    log(
      next,
      chooseMitigation
        ? monsterId === "kapten_interrobang"
          ? `${p.name} betalar 5 pant för att mildra träffen från ${pending.enemyName}.`
          : monsterId === "transporter"
            ? `${p.name} betalar 10 pant och undviker skadan från ${pending.enemyName}.`
            : `${p.name} dricker en klunk för att mildra träffen från ${pending.enemyName}.`
        : monsterId === "kapten_interrobang" || monsterId === "transporter"
          ? `${p.name} tar hela skadan från ${pending.enemyName} (ingen betalning).`
          : `${p.name} tar hela skadan från ${pending.enemyName} (ingen klunk).`,
    );
    next.pending = null;
    const helpMateIdMitigation =
      !(pending.teamBattleRequired ?? false) &&
      pending.helpAccepted === true &&
      pending.helpSelectedHelperId
        ? pending.helpSelectedHelperId
        : undefined;
    const attackerIgnoresCritFailOnOneMit = p.equipment.accessory?.ignoreCombatCritFailOnOne === true;
    const broIgnoresCritFailOnOneMit =
      pending.assistId != null
        ? (next.players.find((x) => x.id === pending.assistId)?.equipment.accessory?.ignoreCombatCritFailOnOne ??
          false)
        : false;
    const critFailOnOneMit = combatCritFailFromDice(
      pending.assistId,
      pending.previewDie ?? 1,
      pending.previewBroDie,
      attackerIgnoresCritFailOnOneMit,
      broIgnoresCritFailOnOneMit,
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
        helpMateId: helpMateIdMitigation,
        teamBattleRequired: pending.teamBattleRequired,
        enemyName: pending.enemyName,
        sipMitigation: chooseMitigation,
        critFailOnOne: critFailOnOneMit,
        weaponSipBeforeRoll: pending.previewUsedSipWeaponBonus === true,
        weaponSipKlunkCost: (pending.previewDeferredSipWeaponPenalties ?? [])
          .filter((e) => e.recipientId === p.id)
          .reduce((s, e) => s + Math.max(1, Math.floor(e.klunkCount)), 0),
        queuedPenaltySipNotices: pending.previewDeferredSipWeaponPenalties,
        getLuckyRiskPlayerIds: pending.getLuckyRiskPlayerIds,
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
    if (!p) return { state, events: [], error: "Spelaren hittades inte" };

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
    if (pending.cardId === "boss_final_win" && !next.bossFinaleExitStartedAt) {
      next.bossFinaleExitStartedAt = Date.now();
      return { state: next, events: ["state"] };
    }
    flushPenaltySipQueue(next, pending.queuedPenaltySipNotices);
    const winnerId = pending.playerId;
    const replaceOffer = pending.equipmentReplaceOffer;
    const handled = handleCardConfirm({ state: next, pending, rng, log });
    if (handled.handled) {
      if (handled.startCombat) clearTableItemPlay(next);
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
        if (!next.pending) endTurnOrOfferLevelUp(next, winnerId);
      }
      return { state: next, events: ["state"] };
    }
    next.pending = null;
    if (replaceOffer && next.phase === "playing") {
      next.pending = {
        type: "equipmentReplaceOffer",
        playerId: winnerId,
        slot: replaceOffer.slot,
        catalogId: replaceOffer.catalogId,
        newName: replaceOffer.newName,
      };
      return { state: next, events: ["state"] };
    }
    drainNextCombatEquipReplace(next);
    if (next.phase === "playing") {
      queueFirstBrewerDownIfNeeded(next);
      const combatLootOffTurn =
        next.offTurnPersonalPending?.type === "equipmentReplaceOffer" &&
        next.offTurnPersonalPending.fromCombatLoot === true;
      if (combatLootOffTurn || !next.pending) {
        endTurnOrOfferLevelUp(next, winnerId);
      }
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
    if (!p) return { state, events: [], error: "Spelaren hittades inte" };
    const optRes = handleCardOption({ state: next, player: p, pending, choiceId: action.choiceId, rng, log });
    if (optRes.handled) {
      if (optRes.error) return { state, events: [], error: optRes.error };
      if (optRes.startCombat) {
        clearTableItemPlay(next);
        next.pending = optRes.startCombat;
        return { state: next, events: ["state"] };
      }
      if (optRes.completeCard) {
        flushPenaltySipQueue(next, pending.queuedPenaltySipNotices);
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

    const klunkFallback = effectOutFallback.klunkar ?? 0;
    const sipAddsFallback =
      klunkFallback > 0
        ? [{ recipientId: p.id, klunkCount: klunkFallback, fromPlayerName: pending.title }]
        : [];

    // Uppdatera korttexten med resultat, och vänta på bekräftelse.
    next.pending = {
      ...pending,
      choices: undefined,
      artKey: artKeyForGrantedItem(effectOutFallback, pending.artKey) ?? pending.artKey,
      grantedItemId: effectOutFallback.grantedItemId ?? pending.grantedItemId,
      equipmentReplaceOffer: effectOutFallback.equipmentReplaceOffer ?? pending.equipmentReplaceOffer,
      queuedPenaltySipNotices: mergePenaltySipQueue(pending.queuedPenaltySipNotices, sipAddsFallback),
      text:
        `${def.text}\nVal: ${choice.label}` +
        appendTextForGrantedItem(effectOutFallback) +
        formatSelfStatDeltas(beforeGold, p.gold, beforeHp, p.hp, beforeKlunk, p.klunkar),
    };
    return { state: next, events: ["state"] };
  }

  if (action.type === "equipmentReplaceDecision") {
    const combatP = next.pending?.type === "combat" ? next.pending : null;
    const postOffer = combatP?.postReactionEquipmentOffer;
    if (postOffer && combatP) {
      if (action.playerId !== postOffer.playerId) {
        return { state, events: [], error: "Inte ditt val" };
      }
      const thief = next.players.find((x) => x.id === action.playerId);
      if (!thief) return { state, events: [], error: "Spelaren hittades inte" };
      finishStealEquipmentReplaceDecision(next, action.playerId, action.accept, postOffer);
      combatP.postReactionEquipmentOffer = undefined;
      next.pending = combatP;
      return { state: next, events: ["state"] };
    }

    const erFromOffTurn =
      next.offTurnPersonalPending?.type === "equipmentReplaceOffer"
        ? next.offTurnPersonalPending
        : null;
    const erPending =
      next.pending?.type === "equipmentReplaceOffer" ? next.pending : erFromOffTurn;
    if (!erPending) {
      return { state, events: [], error: "Inget aktivt bytesval" };
    }
    if (action.playerId !== erPending.playerId) {
      return { state, events: [], error: "Inte ditt val" };
    }
    const lootOffer = !!(erPending.incomingPiece && erPending.returnVictimId);
    if (!lootOffer && !erPending.fromCombatLoot && action.playerId !== cp.id) {
      return { state, events: [], error: "Inte din tur" };
    }
    const p = next.players.find((x) => x.id === action.playerId);
    if (!p) return { state, events: [], error: "Spelaren hittades inte" };
    const turnPid = erPending.playerId;
    if (action.accept) {
      if (erPending.fromPlastbackTake) {
        if (!takePlastbackPackBottle(p)) {
          return { state, events: [], error: "Inga flaskor kvar i Plastback." };
        }
        equipTomFlaskaFromPlastback(p);
        log(next, `${p.name} byter ut vapen mot Tom flaska från Plastback.`, {
          key: LOG_MESSAGE_KEYS.playerSwapWeaponTomFlaskaFromPlastback,
          params: { name: p.name },
        });
      } else if (erPending.catalogId) {
        const eq = EQUIPMENT_CATALOG.find((e) => e.id === erPending.catalogId);
        if (!eq || eq.slot !== erPending.slot) {
          return { state, events: [], error: "Ogiltig utrustning" };
        }
        const item = catalogEquipmentToMerchantShopItem(eq, eq.id);
        equipShopLikeItemToPlayer(p, item, next.config.maxHp);
        log(next, `${p.name} byter ut ${erPending.slot} mot ${erPending.newName}.`);
      } else if (erPending.incomingPiece || next.stolenEquipmentEscrow) {
        finishStealEquipmentReplaceDecision(next, action.playerId, true, erPending);
      } else {
        return { state, events: [], error: "Ogiltigt bytesval" };
      }
    } else if (lootOffer || next.stolenEquipmentEscrow) {
      finishStealEquipmentReplaceDecision(next, action.playerId, false, erPending);
    } else if (erPending.fromPlastbackTake) {
      log(next, `${p.name} behåller sitt vapen.`);
    } else {
      log(next, `${p.name} behåller sin nuvarande utrustning och lämnar ${erPending.newName}.`);
    }
    if (erFromOffTurn) {
      next.offTurnPersonalPending = null;
    } else {
      next.pending = null;
    }
    drainNextCombatEquipReplace(next);
    surfaceActivePlayerCombatLoot(next);
    if (next.phase === "playing") {
      queueFirstBrewerDownIfNeeded(next);
      const riggedTheftReplace =
        lootOffer && !erPending.fromPvpLoot && !erPending.fromCombatLoot;
      if (!next.pending && !riggedTheftReplace) {
        if (erPending.fromCombatLoot) {
          offerPostTurnPrompts(next, turnPid);
        } else if (!erPending.fromPlastbackTake) {
          endTurnOrOfferLevelUp(next, turnPid);
        }
      }
    }
    return { state: next, events: ["state"] };
  }

  if (action.type === "chooseEncounter" && next.pending?.type === "encounterChoice") {
    const pending = next.pending;
    if (pending.phase !== "choosePvpOrTile") {
      return { state, events: [], error: "Ogiltigt mötesläge" };
    }
    if (action.playerId !== pending.moverId) {
      return { state, events: [], error: "Endast den aktiva spelaren kan välja" };
    }
    const mover = next.players.find((p) => p.id === pending.moverId);
    if (!mover) return { state, events: [], error: "Spelaren hittades inte" };

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
      return { state, events: [], error: "Endast den aktiva spelaren kan välja" };
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
    } else if (lead === "nextRound") {
      const prevRound = pvpRoundWithDefaults(pending);
      const nr = savedNextRound ?? prevRound + 1;
      pending.phase = "preRoundItems";
      pending.roundNumber = nr;
      pending.pvpRound = nr;
      pending.rolls = {};
      pending.roundItemReady = {};
      pending.pvpAttackMods = {};
      /** Likaresultat + ny förberedelse i samma rond: behåll Skakad öl-offer tills ronden avgörs. */
      if (nr !== prevRound) pending.pvpYeastSabotageVictimId = undefined;
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
    if (!p) return { state, events: [], error: "Spelaren hittades inte" };
    const rawRoll = rollD6WithOptionalSixSense(p, rng);
    const rawDie = rawRoll.die;
    const attackDoubled = p.nextCombatAttackDiceDouble === true;
    if (attackDoubled) {
      p.nextCombatAttackDiceDouble = false;
    }
    const dieContribution = attackDoubled ? rawDie * 2 : rawDie;
    const pvpMod = pending.pvpAttackMods?.[action.playerId] ?? 0;
    const total = dieContribution + pvpEquipmentDieBonusTotal(p) + pvpMod;
    pending.rolls[action.playerId] = { die: rawDie, total };
    log(
      next,
      `${p.name} rolls for PvP: ${rawDie}${rawRoll.forced ? " (fast siffra)" : ""}${attackDoubled ? ` (dubblat till ${dieContribution} i total)` : ""}${pvpMod !== 0 ? ` (PvP-mod ${pvpMod > 0 ? `+${pvpMod}` : pvpMod})` : ""} (total ${total}).`,
    );
    recordPvpDiceRoll(next, action.playerId, rawDie, total);

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
        pending.phase = "roundReveal";
        pending.roundRevealLead = "nextRound";
        /** Omslag i samma rondnummer efter att båda bekräftat lika-resultatet. */
        pending.nextRoundNumber = currentRound;
        pending.roundRevealAcked = {};
        pending.winnerId = undefined;
        pending.loserId = undefined;
        pending.resolvedTotals = { attackerTotal: ar, defenderTotal: dr };
        log(
          next,
          `PvP: Lika (${ar})! Bekräfta resultatet på mobilen innan omslag i rond ${currentRound}.`,
        );
        return { state: next, events: ["state"] };
      }
      const attacker = next.players.find((x) => x.id === pending.attackerId)!;
      const defender = next.players.find((x) => x.id === pending.defenderId)!;
      const attackerWins = ar >= dr;
      const winner = attackerWins ? attacker : defender;
      const loser = attackerWins ? defender : attacker;
      const yeastVictim = pending.pvpYeastSabotageVictimId;
      if (yeastVictim != null && yeastVictim === loser.id) {
        applyYeastSabotageAfterMonsterLoss(next, loser.id, winner.name);
      }
      pending.pvpYeastSabotageVictimId = undefined;
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
          {
            key: LOG_MESSAGE_KEYS.playerWeaponWinGold,
            params: {
              name: winner.name,
              amount: pvpWeaponBonusGold,
              weaponName: winner.equipment.weapon?.name ?? "vapnet",
            },
          },
        );
      }
      if (pvpWeaponRandomDamage) {
        log(
          next,
          `${winner.name}s ${winner.equipment.weapon?.name ?? "vapen"} träffar slumpmässigt: ${pvpWeaponRandomDamage.targetName} tar ${pvpWeaponRandomDamage.damage} skada.`,
        );
      }
      const brokenWeaponName = breakWeaponAfterWin(winner);
      if (brokenWeaponName) {
        log(next, `${winner.name}s ${brokenWeaponName} går sönder efter vinsten.`);
      }
    }

    return { state: next, events: ["state"] };
  }

  if (action.type === "sellAccessory") {
    if (next.phase !== "playing") return { state, events: [], error: "Spelet är slut" };
    const cp = currentPlayer(next);
    if (!cp || cp.id !== action.playerId) {
      return { state, events: [], error: "Inte din tur" };
    }
    if (cp.equipment.accessory?.name !== PLASTBACK_ACCESSORY_NAME) {
      return { state, events: [], error: "Du har ingen Plastback att sälja." };
    }
    const pant = plastbackPackRemainingCount(cp);
    cp.gold += pant;
    cp.equipment.accessory = undefined;
    syncPlastbackEmptyBottleSynergy(cp);
    log(
      next,
      pant > 0 ? `${cp.name} säljer Plastback och får ${pant} pant.` : `${cp.name} säljer Plastback.`,
    );
    return { state: next, events: ["state"] };
  }

  if (action.type === "takePlastbackBottle") {
    if (next.phase !== "playing") return { state, events: [], error: "Spelet är slut" };
    const cp = currentPlayer(next);
    if (!cp || cp.id !== action.playerId) {
      return { state, events: [], error: "Inte din tur" };
    }
    if (cp.equipment.accessory?.name !== PLASTBACK_ACCESSORY_NAME) {
      return { state, events: [], error: "Du har ingen Plastback." };
    }
    if (plastbackPackRemainingCount(cp) <= 0) {
      return { state, events: [], error: "Inga flaskor kvar i Plastback." };
    }
    const w = cp.equipment.weapon;
    if (!w || w.name === TOM_FLASKA_WEAPON_NAME) {
      if (!takePlastbackPackBottle(cp)) {
        return { state, events: [], error: "Inga flaskor kvar i Plastback." };
      }
      equipTomFlaskaFromPlastback(cp);
      log(next, `${cp.name} tar en flaska ur Plastback.`, {
        key: LOG_MESSAGE_KEYS.playerTakePlastbackBottle,
        params: { name: cp.name },
      });
      return { state: next, events: ["state"] };
    }
    next.pending = {
      type: "equipmentReplaceOffer",
      playerId: cp.id,
      slot: "weapon",
      catalogId: TOM_FLASKA_CATALOG_ID,
      newName: TOM_FLASKA_WEAPON_NAME,
      fromPlastbackTake: true,
    };
    return { state: next, events: ["state"] };
  }

  if (action.type === "merchantReroll" && next.pending?.type === "merchant") {
    if (action.playerId !== next.pending.playerId) {
      return { state, events: [], error: "Inte du som är vid Panta burkar" };
    }
    const p = next.players.find((x) => x.id === action.playerId);
    if (!p) return { state, events: [], error: "Spelaren hittades inte" };
    if (p.gold < MERCHANT_REROLL_GOLD_COST) {
      return { state, events: [], error: "För lite pant" };
    }
    p.gold -= MERCHANT_REROLL_GOLD_COST;
    recordPantSpent(next, p.id, MERCHANT_REROLL_GOLD_COST);
    next.pending.items = rollMerchantItems(
      rng,
      new Set(next.config.disabledCardIds ?? []),
      p.levelIndex,
      next.levels.length,
    );
    log(
      next,
      `${p.name} slumpar om sortimentet i Panta burkar (−${MERCHANT_REROLL_GOLD_COST} pant).`,
    );
    return { state: next, events: ["state"] };
  }

  if (action.type === "merchantBuy" && next.pending?.type === "merchant") {
    if (action.playerId !== next.pending.playerId) {
      return { state, events: [], error: "Inte du som är vid Panta burkar" };
    }
    const p = next.players.find((x) => x.id === action.playerId);
    if (!p) return { state, events: [], error: "Spelaren hittades inte" };
    if (action.itemId === null) {
      log(next, `${p.name} lämnar Panta burkar.`);
      next.pending = null;
      endTurnOrOfferLevelUp(next, p.id);
      return { state: next, events: ["state"] };
    }
    const itemIdx = next.pending.items.findIndex((i) => i.id === action.itemId);
    if (itemIdx < 0) return { state, events: [], error: "Ogiltigt föremål" };
    const item = next.pending.items[itemIdx]!;
    const pay = effectiveMerchantBuyPrice(p, item.price);
    if (p.gold < pay) return { state, events: [], error: "För lite pant" };
    p.gold -= pay;
    recordPantSpent(next, p.id, pay);
    if (item.slot === "weapon" || item.slot === "armor" || item.slot === "helmet" || item.slot === "accessory") {
      equipShopLikeItemToPlayer(p, item, next.config.maxHp);
    } else if (item.slot === "heal") {
      p.inventory ??= [];
      p.inventory.push(createItemInstance("healing_potion", newItemInstanceId(rng)));
    } else if (item.slot === "inventory" && item.inventoryItemId) {
      p.inventory ??= [];
      p.inventory.push(createItemInstance(item.inventoryItemId, newItemInstanceId(rng)));
    } else if (item.slot === "gold") {
      p.gold += item.goldAmount ?? 0;
    }
    log(next, `${p.name} buys ${item.name} (${pay}g).`);
    // One purchase per shelf row during the current merchant visit.
    next.pending.items = next.pending.items.filter((_, idx) => idx !== itemIdx);
    const existingIds = new Set(next.pending.items.map((row) => row.id));
    const restock = rollSingleMerchantShelfItem(
      rng,
      new Set(next.config.disabledCardIds ?? []),
      p.levelIndex,
      existingIds,
      next.levels.length,
    );
    if (restock) next.pending.items.push(restock);
    // Keep merchant open so player can buy multiple things before leaving explicitly.
    return { state: next, events: ["state"] };
  }

  if (action.type === "useDoor" && next.pending?.type === "door") {
    return { state, events: [], error: "Nivå-rutor är avstängda. Nivå upp sker via särskilda kort/händelser." };
  }

  if (action.type === "levelUpDecision") {
    const pending =
      next.pending?.type === "levelUpOffer"
        ? next.pending
        : next.offTurnPersonalPending?.type === "levelUpOffer"
          ? next.offTurnPersonalPending
          : null;
    if (!pending) {
      return { state, events: [], error: "Ogiltig handling" };
    }
    if (action.playerId !== pending.playerId) {
      return { state, events: [], error: "Inte du som väljer nivåuppstigning" };
    }
    const p = next.players.find((x) => x.id === action.playerId);
    if (!p) return { state, events: [], error: "Spelaren hittades inte" };
    if (action.choice === "stay") {
      log(next, `${p.name} stannar kvar på sin nuvarande våning.`);
      if (next.pending?.type === "levelUpOffer" && next.pending.playerId === p.id) {
        next.pending = null;
      }
      if (next.offTurnPersonalPending?.type === "levelUpOffer" && next.offTurnPersonalPending.playerId === p.id) {
        next.offTurnPersonalPending = null;
      }
      if (next.deferredPending?.type === "levelUpOffer" && next.deferredPending.playerId === p.id) {
        next.deferredPending = null;
      }
      dismissInvalidLevelUpOffersForPlayer(next, p.id);
      return { state: next, events: ["state"] };
    }
    p.levelIndex = pending.targetLevelIndex;
    p.tileIndex = 0;
    log(
      next,
      `${p.name} stiger till nivå ${p.levelIndex + 1}.`,
    );
    logMonsterScaleAfterAscend(next, p);
    if (next.pending?.type === "levelUpOffer" && next.pending.playerId === p.id) {
      next.pending = null;
    }
    if (next.offTurnPersonalPending?.type === "levelUpOffer" && next.offTurnPersonalPending.playerId === p.id) {
      next.offTurnPersonalPending = null;
    }
    if (next.deferredPending?.type === "levelUpOffer" && next.deferredPending.playerId === p.id) {
      next.deferredPending = null;
    }
    dismissInvalidLevelUpOffersForPlayer(next, p.id);
    return { state: next, events: ["state"] };
  }

  if (action.type === "brewerPerkDecision") {
    const pCheck = next.players.find((x) => x.id === action.playerId);
    if (pCheck && (pCheck.pendingBrewerPerkLevels ?? 0) > 0) {
      tryOpenBrewerPerkChoice(next, action.playerId, log);
    }
    const pending =
      next.pending?.type === "brewerPerkChoice"
        ? next.pending
        : next.offTurnPersonalPending?.type === "brewerPerkChoice"
          ? next.offTurnPersonalPending
          : null;
    if (!pending) {
      return { state, events: [], error: "Ogiltig handling" };
    }
    if (action.playerId !== pending.playerId) {
      return { state, events: [], error: "Inte du som väljer bryggbonus" };
    }
    const p = next.players.find((x) => x.id === action.playerId);
    if (!p) return { state, events: [], error: "Spelaren hittades inte" };
    if (!isBrewerPerkChoiceAvailable(p, action.choice)) {
      return { state, events: [], error: "Den kategorin är redan maxad (3/3)" };
    }
    if (!applyBrewerPerkChoice(p, action.choice, next.config.maxHp)) {
      return { state, events: [], error: "Den kategorin är redan maxad (3/3)" };
    }
    syncDynamicMaxHp(next);
    const label =
      action.choice === "attack"
        ? "+1 styrka"
        : action.choice === "shield"
          ? "+1 sköld"
          : action.choice === "pvp"
            ? "+1 BvB"
            : action.choice === "items"
              ? "+1 föremålskort"
              : "+2 HP";
    log(next, `${p.name} väljer ${label} (bryggnivå).`);
    consumeExhaustedBrewerPerkLevels(p, (msg) => log(next, msg));
    const remaining = p.pendingBrewerPerkLevels ?? 0;
    const nextPrompt = { type: "brewerPerkChoice" as const, playerId: p.id, levelsRemaining: remaining };
    const inOffTurnSlot =
      next.offTurnPersonalPending?.type === "brewerPerkChoice" &&
      next.offTurnPersonalPending.playerId === p.id;
    const onOwnTurn = next.turnOrder[next.currentTurnIndex] === p.id;
    if (remaining > 0 && availableBrewerPerkChoices(p).length > 0) {
      if (onOwnTurn) {
        next.pending = nextPrompt;
        if (inOffTurnSlot) next.offTurnPersonalPending = null;
      } else if (inOffTurnSlot) {
        next.offTurnPersonalPending = nextPrompt;
      } else {
        next.pending = nextPrompt;
      }
      return { state: next, events: ["state"] };
    }
    const restoredDeferred = finishBrewerPerkChoicePrompt(next, p.id);
    dismissInvalidLevelUpOffersForPlayer(next, p.id);
    if (!restoredDeferred) {
      offerPostTurnPrompts(next, p.id);
    }
    dismissInvalidLevelUpOffersForPlayer(next, p.id);
    return { state: next, events: ["state"] };
  }

  if (action.type === "pvpLootChoice" && next.pending?.type === "pvp" && next.pending.phase === "chooseLoot") {
    const pending = next.pending;
    if (action.playerId !== pending.winnerId) {
      return { state, events: [], error: "Endast vinnaren kan välja byte" };
    }
    const winner = next.players.find((x) => x.id === pending.winnerId);
    const loser = next.players.find((x) => x.id === pending.loserId);
    if (!winner || !loser) return { state, events: [], error: "Spelaren hittades inte" };
    recordPvpMatchOutcome(next, winner.id, loser.id);
    const theftBlocked = loser.equipment.accessory?.preventTheft === true;
    let deferredEquipReplace: Extract<Pending, { type: "equipmentReplaceOffer" }> | null = null;
    if (action.choice === "gold") {
      const steal = pvpLootPantStealAmount(loser.gold);
      loser.gold -= steal;
      winner.gold += steal;
      log(next, `${winner.name} tar ${steal} pant från ${loser.name}.`, {
        key: LOG_MESSAGE_KEYS.pvpLootGold,
        params: { winner: winner.name, amount: steal, loser: loser.name },
      });
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
      grantKlunkWithXp(next, loser, gain, { penaltyStraff: true });
      pushSipNotice(next, loser.id, winner.name, gain);
      log(next, `${winner.name} ger ${loser.name} en straffklunk (+1 klunk).`, {
        key: LOG_MESSAGE_KEYS.pvpLootSip,
        params: { winner: winner.name, loser: loser.name },
      });
    } else if (action.choice === "damage") {
      const beforeHp = loser.hp;
      applyDamage({ state: next, player: loser, amount: 2, source: "pvp", bypassShield: true, log });
      log(next, `${winner.name} ger ${loser.name} 2 skada i PvP (HP ${beforeHp} → ${loser.hp}).`, {
        key: LOG_MESSAGE_KEYS.pvpLootDamage,
        params: {
          winner: winner.name,
          loser: loser.name,
          beforeHp,
          afterHp: loser.hp,
        },
      });
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
          loser.maxHp = maxHpFor(next, loser);
          if (loser.hp > loser.maxHp) loser.hp = loser.maxHp;
        }
        onPlayerEquipmentSlotCleared(loser, slot);
        const incomingClone = cloneEquipmentIncomingPiece(piece as Weapon | ArmorPiece | Helmet | Accessory);
        const winnerOccupied =
          (slot === "weapon" && !!winner.equipment.weapon) ||
          (slot === "armor" && !!winner.equipment.armor) ||
          (slot === "helmet" && !!winner.equipment.helmet) ||
          (slot === "accessory" && !!winner.equipment.accessory);
        if (winnerOccupied) {
          setStolenEquipmentEscrow(next, winner.id, loser.id, slot, incomingClone);
          deferredEquipReplace = {
            type: "equipmentReplaceOffer",
            playerId: winner.id,
            slot,
            newName: piece.name ?? String(slot),
            incomingPiece: incomingClone,
            returnVictimId: loser.id,
            fromPvpLoot: true,
          };
          log(
            next,
            `${winner.name} rycker ${piece.name ?? slot} från ${loser.name} — välj om du tar emot den (du har redan något i ${slot}).`,
          );
          pushPlayerNotice(
            next,
            loser.id,
            winner.name,
            "Du förlorade duellen",
            `${winner.name} tog din ${piece.name ?? slot}.`,
            "duel_loss",
          );
        } else {
          assignEquipmentPieceFromLoot(next, winner, slot, incomingClone);
          log(next, `${winner.name} tar ${piece.name ?? slot} från ${loser.name}.`);
          pushPlayerNotice(
            next,
            loser.id,
            winner.name,
            "Du förlorade duellen",
            `${winner.name} tog din ${piece.name ?? slot} efter duellen.`,
            "duel_loss",
          );
        }
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
    if (deferredEquipReplace) {
      next.pending = deferredEquipReplace;
    } else {
      next.pending = null;
      if (next.phase === "playing") {
        queueFirstBrewerDownIfNeeded(next);
        if (!next.pending) endTurnOrOfferLevelUp(next, winner.id);
      }
    }
    return { state: next, events: ["state"] };
  }

  if (action.type === "chooseMerchant") {
    if (action.playerId === cp.id) {
      clearTurnStartPromptsBeforeRoll(next, cp.id);
    }
    if (pendingBlocksPlayer(next, cp.id)) {
      return { state: next, events: ["state"], error: "Avsluta nuvarande val först" };
    }
    if (action.playerId !== cp.id) {
      return { state, events: [], error: "Inte din tur" };
    }
    if (cp.eliminated || cp.hp <= 0) {
      return { state, events: [], error: "Ingen HP kvar — välj på stupad bryggare-kortet först" };
    }
    if (cp.gold < 5) {
      return { state, events: [], error: "Du behöver minst 5 pant för att panta burkar" };
    }
    clearTableItemPlay(next);
    log(next, `${cp.name} väljer att panta burkar i stället för att slå rörelsetärningen.`);
    const disabledCardIds = new Set(next.config.disabledCardIds ?? []);
    next.pending = {
      type: "merchant",
      items: rollMerchantItems(rng, disabledCardIds, cp.levelIndex, next.levels.length),
      playerId: cp.id,
    };
    return { state: next, events: ["state"] };
  }

  dismissInvalidLevelUpOffersForPlayer(next, cp.id);
  if (action.playerId === cp.id) {
    clearTurnStartPromptsBeforeRoll(next, cp.id);
  }
  if (pendingBlocksPlayer(next, cp.id)) {
    return { state: next, events: ["state"], error: "Avsluta nuvarande val först" };
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

  const diceRoll = rollD6WithOptionalSixSense(cp, rng);
  const dice = diceRoll.die;
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
  log(
    next,
    `${cp.name} slår ${dice}${diceRoll.forced ? " (fast siffra)" : ""}${bonus ? ` (+${bonus})` : ""}. Välj en riktning.`,
  );
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
  if (state.pending) return;
  const victim = state.players.find((pl) => pl.hp <= 0 && !pl.eliminated && !pl.leftVoluntarily);
  if (!victim) return;
  if (endGameIfSingleBrewerAlive(state)) return;

  dismissInvalidLevelUpOffersForPlayer(state, victim.id);
  if (state.offTurnPersonalPending?.playerId === victim.id) {
    state.offTurnPersonalPending = null;
  }

  bumpKnockdown(state, victim.id);
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
  const awaitingBrewerDown = state.players.some(
    (p) => !p.eliminated && !p.leftVoluntarily && p.hp <= 0,
  );
  if (awaitingBrewerDown) return false;
  /** Matchen avgörs av aktiva spelare (HP > 0, inte eliminerad). 0 HP väntar stupad-bryggare. */
  const active = state.players.filter((p) => isPlayerActiveInMatch(p));
  if (active.length === 1) {
    const winner = active[0]!;
    state.phase = "ended";
    discardStolenEquipmentEscrow(state);
    state.pending = null;
    state.winnerId = winner.id;
    state.winnerName = winner.name;
    log(state, `🏆 ${winner.name} är sista bryggaren kvar i spelet och vinner!`);
    return true;
  }
  if (active.length === 0) {
    const awaitingBrewerDown = state.players.some(
      (p) => !p.eliminated && !p.leftVoluntarily && p.hp <= 0,
    );
    if (awaitingBrewerDown) return false;
    state.phase = "ended";
    discardStolenEquipmentEscrow(state);
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
  const orderLen = state.turnOrder.length;
  if (orderLen === 0) return;
  const anyAlive = state.turnOrder.some((id) => {
    const pl = state.players.find((p) => p.id === id);
    return pl && !pl.eliminated && !pl.leftVoluntarily;
  });
  if (!anyAlive) return;
  const maxSkipQueued = state.players.reduce((m, p) => Math.max(m, p.skippedTurns ?? 0), 0);
  const maxAttempts = orderLen * Math.max(1, maxSkipQueued + 1);
  for (let i = 0; i < maxAttempts; i++) {
    state.currentTurnIndex = (state.currentTurnIndex + 1) % orderLen;
    const n = currentPlayer(state);
    if (!n) continue;
    if (n.eliminated || n.leftVoluntarily) {
      continue;
    }
    if ((n.skippedTurns ?? 0) > 0) {
      n.skippedTurns -= 1;
      if (n.skipTurnReasons && n.skipTurnReasons.length > 0) n.skipTurnReasons.shift();
      log(state, `— ${n.name} står över sin tur —`);
      continue;
    }
    log(state, `— ${n.name}s tur —`);
    applyArmorHealHpPerTurnAtTurnStart(state, n);
    surfaceActivePlayerCombatLoot(state);
    return;
  }
}
