import type { GameState, Pending, Player, ShopItem } from "@bv/game-core";

export function isGameState(x: unknown): x is GameState {
  return typeof x === "object" && x !== null && "phase" in x && "players" in x;
}

function patchHasLevels(patch: Partial<GameState>): patch is Partial<GameState> & { levels: GameState["levels"] } {
  return Array.isArray(patch.levels) && patch.levels.length > 0;
}

/** Slå ihop stateDelta med befintlig state; acceptera patch som bootstrap om snapshot inte hunnit fram. */
export function mergeGameStateDelta(prev: GameState | null, patch: unknown): GameState | null {
  if (typeof patch !== "object" || patch == null) return prev;
  const p = patch as Partial<GameState>;
  if (!prev) {
    // Vänta på full snapshot — partial delta utan våningar ger tomt/svart bräde.
    if (p.phase === "playing" && !patchHasLevels(p)) return null;
    return isGameState(patch) ? (patch as GameState) : null;
  }
  const merged = { ...prev, ...p };
  if (prev.levels?.length && !patchHasLevels(p)) {
    merged.levels = prev.levels;
  }
  return isGameState(merged) ? merged : prev;
}

export type { GameState, Pending, Player, ShopItem };

