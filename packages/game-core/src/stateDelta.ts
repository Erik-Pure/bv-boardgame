import type { GameState, Player } from "./types.js";

export function isGameState(x: unknown): x is GameState {
  return typeof x === "object" && x !== null && "phase" in x && "players" in x;
}

export type GameStateDeltaPatch = Partial<GameState> & {
  /** När satt: `players` innehåller endast ändrade spelare (merge per id). */
  playersPartial?: boolean;
};

function patchHasLevels(patch: GameStateDeltaPatch): patch is GameStateDeltaPatch & { levels: GameState["levels"] } {
  return Array.isArray(patch.levels) && patch.levels.length > 0;
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
  const { playersPartial, players, ...rest } = p;
  const merged: GameState = { ...prev, ...rest };
  if (players) {
    merged.players = mergePlayers(prev.players, players, playersPartial === true);
  }
  if (prev.levels?.length && !patchHasLevels(p)) {
    merged.levels = prev.levels;
  }
  return isGameState(merged) ? merged : prev;
}
