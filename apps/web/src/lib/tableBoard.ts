import type { GameState, Player } from "@bv/game-core";

export function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

/** Måste följa samma perimeterordning som `clockwiseTileIndex` i @bv/game-core (rörelse längs ringen). */
export function ringPos(size: number, idx: number): { col: number; row: number } {
  const n = 4 * size - 4;
  const i = ((idx % n) + n) % n;
  const topLen = size;
  const rightLen = size - 1;
  const bottomLen = size - 1;

  if (i < topLen) return { col: i, row: 0 };
  if (i < topLen + rightLen) return { col: size - 1, row: i - topLen + 1 };
  if (i < topLen + rightLen + bottomLen) {
    return { col: size - 2 - (i - (topLen + rightLen)), row: size - 1 };
  }
  return { col: 0, row: size - 2 - (i - (topLen + rightLen + bottomLen)) };
}

export function activePlayer(state: GameState | null): Player | null {
  if (!state) return null;
  const id = state.turnOrder[state.currentTurnIndex];
  return state.players.find((p) => p.id === id) ?? null;
}

