import { prunePlayerEmoteBursts } from "./emotes.js";
import { prunePlayerKlunkBursts } from "./klunkBursts.js";
import type { GameState, Player, PlayerEmoteBurst, PlayerKlunkBurst } from "./types.js";

export function isGameState(x: unknown): x is GameState {
  return typeof x === "object" && x !== null && "phase" in x && "players" in x;
}

export type GameStateDeltaPatch = Partial<GameState> & {
  /** När satt: `players` innehåller endast ändrade spelare (merge per id). */
  playersPartial?: boolean;
  /** När satt: `log` innehåller nya rader att lägga till (inte ersätta). */
  logPartial?: boolean;
  /** När satt tillsammans med logPartial: loggen roterade vid 200-raders tak. */
  logTruncated?: boolean;
  /** När satt: `playerEmoteBursts` innehåller nya poster att lägga till. */
  emoteBurstsPartial?: boolean;
  /** När satt: `playerKlunkBursts` innehåller nya poster att lägga till. */
  klunkBurstsPartial?: boolean;
};

function patchHasLevels(patch: GameStateDeltaPatch): patch is GameStateDeltaPatch & { levels: GameState["levels"] } {
  return Array.isArray(patch.levels) && patch.levels.length > 0;
}

function mergeBurstArray<T>(
  prev: readonly T[] | undefined,
  incoming: T[],
  partial: boolean,
  prune: (bursts: T[]) => T[],
): T[] {
  const base = partial ? [...(prev ?? []), ...incoming] : incoming;
  return prune(base);
}

function mergePlayers(prev: Player[], incoming: Player[], partial: boolean): Player[] {
  if (!partial) return incoming;
  const byId = new Map(incoming.map((p) => [p.id, p]));
  const merged = prev.map((p) => byId.get(p.id) ?? p);
  for (const p of incoming) {
    if (!prev.some((x) => x.id === p.id)) merged.push(p);
  }
  return merged;
}

/** Slå ihop stateDelta med befintlig state; acceptera patch som bootstrap om snapshot inte hunnit fram. */
export function mergeGameStateDelta(prev: GameState | null, patch: unknown): GameState | null {
  if (typeof patch !== "object" || patch == null) return prev;
  const p = patch as GameStateDeltaPatch;
  if (!prev) {
    if (p.phase === "playing" && !patchHasLevels(p)) return null;
    return isGameState(patch) ? (patch as GameState) : null;
  }
  const {
    playersPartial,
    players,
    logPartial,
    logTruncated,
    log,
    emoteBurstsPartial,
    klunkBurstsPartial,
    playerEmoteBursts,
    playerKlunkBursts,
    ...rest
  } = p;
  const merged: GameState = { ...prev, ...rest };
  if (players) {
    merged.players = mergePlayers(prev.players, players, playersPartial === true);
  }
  if (log) {
    if (logPartial === true) {
      const appended = [...prev.log, ...log];
      if (logTruncated === true && appended.length > 200) {
        merged.log = appended.slice(-200);
      } else {
        merged.log = appended;
      }
    } else {
      merged.log = log;
    }
  }
  const now = Date.now();
  if (playerEmoteBursts) {
    merged.playerEmoteBursts = mergeBurstArray<PlayerEmoteBurst>(
      prev.playerEmoteBursts,
      playerEmoteBursts,
      emoteBurstsPartial === true,
      (bursts) => prunePlayerEmoteBursts(bursts, now),
    );
  }
  if (playerKlunkBursts) {
    merged.playerKlunkBursts = mergeBurstArray<PlayerKlunkBurst>(
      prev.playerKlunkBursts,
      playerKlunkBursts,
      klunkBurstsPartial === true,
      (bursts) => prunePlayerKlunkBursts(bursts, now),
    );
  }
  if (prev.levels?.length && !patchHasLevels(p)) {
    merged.levels = prev.levels;
  }
  return isGameState(merged) ? merged : prev;
}
