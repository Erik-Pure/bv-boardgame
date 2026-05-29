import type { GameState, Pending, Player, ShopItem } from "@bv/game-core";

export function isGameState(x: unknown): x is GameState {
  return typeof x === "object" && x !== null && "phase" in x && "players" in x;
}

/** Slå ihop stateDelta med befintlig state; acceptera patch som bootstrap om snapshot inte hunnit fram. */
export function mergeGameStateDelta(prev: GameState | null, patch: unknown): GameState | null {
  if (typeof patch !== "object" || patch == null) return prev;
  if (!prev) {
    return isGameState(patch) ? patch : null;
  }
  const merged = { ...prev, ...(patch as Partial<GameState>) };
  return isGameState(merged) ? merged : prev;
}

export type { GameState, Pending, Player, ShopItem };

