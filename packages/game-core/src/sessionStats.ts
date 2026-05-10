import type { GameState, ItemId, Player, PlayerSessionStats } from "./types.js";

/** Standard värden när ett parti startar eller spelare skapas. */
export const DEFAULT_PLAYER_SESSION_STATS: PlayerSessionStats = {
  knockdownCount: 0,
  monsterCombatWins: 0,
  monsterCombatLosses: 0,
  pvpMatchWins: 0,
  pvpMatchLosses: 0,
  itemsPlayed: 0,
  combatOnesRolled: 0,
  pvpOnesRolled: 0,
  sabotageItemsPlayed: 0,
  helpedCombatWins: 0,
  maxDiceRollTotal: 0,
  goldSpent: 0,
};

/** Negativa/sochande föremål som räknas till «sabotage»-badge. */
const SABOTAGE_ITEM_IDS = new Set<ItemId>([
  "weak_beer",
  "tripwire",
  "hangover",
  "monster_hype",
  "lengraddad",
  "not_my_round",
  "spill_intentional",
  "rigged_game",
  "sleep_potion",
  "sip_card",
  "yeast_sabotage",
  "paidassasin",
]);

export function isSabotageItemId(itemId: ItemId): boolean {
  return SABOTAGE_ITEM_IDS.has(itemId);
}

/** Normaliserad avläsning (gamla saves saknar nya fält). */
function sessionStatsRead(p: Player): PlayerSessionStats {
  return { ...DEFAULT_PLAYER_SESSION_STATS, ...(p.stats ?? {}) };
}

export function ensurePlayerStats(p: Player): PlayerSessionStats {
  p.stats = { ...DEFAULT_PLAYER_SESSION_STATS, ...(p.stats ?? {}) };
  return p.stats;
}

export function bumpKnockdown(state: GameState, playerId: string): void {
  const pl = state.players.find((x) => x.id === playerId);
  if (!pl) return;
  ensurePlayerStats(pl).knockdownCount += 1;
}

export function recordMonsterCombatDiceRoll(
  state: GameState,
  attackerId: string,
  assistId: string | undefined,
  attackerDie: number,
  previewBroDie: number | null | undefined,
  /** Angriparens egen attacktotal (tärning + vapen + mods), inte lagets summerade slag. */
  attackerRollTotal: number,
  /** Medkompisens egen attacktotal i team battle; saknas vid solo. */
  assistRollTotal?: number,
): void {
  const bumpMax = (pid: string, rollTotal: number) => {
    const pl = state.players.find((x) => x.id === pid);
    if (!pl) return;
    const s = ensurePlayerStats(pl);
    s.maxDiceRollTotal = Math.max(s.maxDiceRollTotal, rollTotal);
  };
  bumpMax(attackerId, attackerRollTotal);
  if (assistId != null && typeof assistRollTotal === "number") bumpMax(assistId, assistRollTotal);

  const atk = state.players.find((x) => x.id === attackerId);
  if (atk && attackerDie === 1) ensurePlayerStats(atk).combatOnesRolled += 1;
  if (assistId && previewBroDie === 1) {
    const bro = state.players.find((x) => x.id === assistId);
    if (bro) ensurePlayerStats(bro).combatOnesRolled += 1;
  }
}

export function recordMonsterCombatWin(
  state: GameState,
  attackerId: string,
  assistMateId: string | undefined,
): void {
  const atk = state.players.find((x) => x.id === attackerId);
  if (atk) ensurePlayerStats(atk).monsterCombatWins += 1;
  if (assistMateId) {
    const bro = state.players.find((x) => x.id === assistMateId);
    if (bro) ensurePlayerStats(bro).monsterCombatWins += 1;
  }
}

export function recordMonsterCombatLoss(
  state: GameState,
  attackerId: string,
  assistMateId: string | undefined,
): void {
  const atk = state.players.find((x) => x.id === attackerId);
  if (atk) ensurePlayerStats(atk).monsterCombatLosses += 1;
  if (assistMateId) {
    const bro = state.players.find((x) => x.id === assistMateId);
    if (bro) ensurePlayerStats(bro).monsterCombatLosses += 1;
  }
}

export function recordHelpedCombatWin(state: GameState, helperId: string): void {
  const h = state.players.find((x) => x.id === helperId);
  if (h) ensurePlayerStats(h).helpedCombatWins += 1;
}

export function recordPvpMatchOutcome(state: GameState, winnerId: string, loserId: string): void {
  const w = state.players.find((x) => x.id === winnerId);
  const l = state.players.find((x) => x.id === loserId);
  if (w) ensurePlayerStats(w).pvpMatchWins += 1;
  if (l) ensurePlayerStats(l).pvpMatchLosses += 1;
}

export function recordPvpDiceRoll(state: GameState, playerId: string, rawDie: number, rollTotal: number): void {
  const pl = state.players.find((x) => x.id === playerId);
  if (!pl) return;
  const s = ensurePlayerStats(pl);
  if (rawDie === 1) s.pvpOnesRolled += 1;
  s.maxDiceRollTotal = Math.max(s.maxDiceRollTotal, rollTotal);
}

export function recordItemConsumed(state: GameState, playerId: string, itemId: ItemId): void {
  const pl = state.players.find((x) => x.id === playerId);
  if (!pl) return;
  const s = ensurePlayerStats(pl);
  s.itemsPlayed += 1;
  if (isSabotageItemId(itemId)) s.sabotageItemsPlayed += 1;
}

/** Pant betald till sinkholes (ej spelaröverföring). */
export function recordPantSpent(state: GameState, playerId: string, amount: number): void {
  const n = Math.max(0, Math.floor(amount));
  if (n <= 0) return;
  const pl = state.players.find((x) => x.id === playerId);
  if (!pl) return;
  ensurePlayerStats(pl).goldSpent += n;
}

export type StatBadgeKind =
  | "mostKnockdowns"
  | "mostMonsterWins"
  | "mostMonsterLosses"
  | "mostPvpWins"
  | "mostPvpLosses"
  | "mostItemsPlayed"
  | "mostCombatOnes"
  | "mostPvpOnes"
  | "mostSabotage"
  | "mostHelpedWins"
  | "maxDiceRoll";

export interface StatBadge {
  kind: StatBadgeKind;
  playerIds: string[];
  value: number;
}

function playersAtMax(
  players: Player[],
  getVal: (s: PlayerSessionStats) => number,
): { ids: string[]; max: number } {
  if (players.length === 0) return { ids: [], max: 0 };
  const vals = players.map((p) => ({
    id: p.id,
    v: getVal(sessionStatsRead(p)),
  }));
  const max = Math.max(...vals.map((x) => x.v));
  if (max <= 0) return { ids: [], max: 0 };
  return { ids: vals.filter((x) => x.v === max).map((x) => x.id), max };
}

export type EndedSpotlightKind =
  | "mostOnesCombined"
  | "mostPantSpent"
  | "mostPvpWins"
  | "mostPvpMatches"
  | "mostCombinedLosses"
  | "mostSabotageItems"
  | "mostHelpedWins"
  /** Extra höjdpunkter för fylligare karusell */
  | "maxDiceRollTotal"
  | "mostKnockdowns"
  | "mostMonsterWins";

export interface EndedSpotlight {
  kind: EndedSpotlightKind;
  playerIds: string[];
  value: number;
}

/**
 * Höjdpunkter för slutskärm (karusell). Samma tie-logik som badges: alla på maxvärde, värdet > 0.
 */
export function computeEndedSpotlights(players: Player[]): EndedSpotlight[] {
  const out: EndedSpotlight[] = [];

  const push = (
    kind: EndedSpotlightKind,
    sel: (s: PlayerSessionStats) => number,
    /** Minsta maxvärde för att visa kortet (t.ex. stup bara om någon stupat ≥ 2). */
    minMax = 1,
  ) => {
    const { ids, max } = playersAtMax(players, sel);
    if (ids.length && max >= minMax) out.push({ kind, playerIds: ids, value: max });
  };

  push("mostOnesCombined", (s) => s.combatOnesRolled + s.pvpOnesRolled);
  push("mostPantSpent", (s) => s.goldSpent);
  push("mostPvpWins", (s) => s.pvpMatchWins);
  push("mostPvpMatches", (s) => s.pvpMatchWins + s.pvpMatchLosses);
  push("mostCombinedLosses", (s) => s.monsterCombatLosses + s.pvpMatchLosses);
  push("mostSabotageItems", (s) => s.sabotageItemsPlayed);
  push("mostHelpedWins", (s) => s.helpedCombatWins);
  push("maxDiceRollTotal", (s) => s.maxDiceRollTotal);
  push("mostKnockdowns", (s) => s.knockdownCount, 2);
  push("mostMonsterWins", (s) => s.monsterCombatWins);

  return out;
}

/** Badges för spelare som delar förstaplats i varje kategori (max > 0). */
export function computeStatBadges(players: Player[]): StatBadge[] {
  const out: StatBadge[] = [];

  const push =
    (kind: StatBadgeKind, sel: (s: PlayerSessionStats) => number) => {
      const { ids, max } = playersAtMax(players, sel);
      if (ids.length && max > 0) out.push({ kind, playerIds: ids, value: max });
    };

  push("mostKnockdowns", (s) => s.knockdownCount);
  push("mostMonsterWins", (s) => s.monsterCombatWins);
  push("mostMonsterLosses", (s) => s.monsterCombatLosses);
  push("mostPvpWins", (s) => s.pvpMatchWins);
  push("mostPvpLosses", (s) => s.pvpMatchLosses);
  push("mostItemsPlayed", (s) => s.itemsPlayed);
  push("mostCombatOnes", (s) => s.combatOnesRolled);
  push("mostPvpOnes", (s) => s.pvpOnesRolled);
  push("mostSabotage", (s) => s.sabotageItemsPlayed);
  push("mostHelpedWins", (s) => s.helpedCombatWins);
  push("maxDiceRoll", (s) => s.maxDiceRollTotal);

  return out;
}
