import type { GameState, Player } from "@bv/game-core";

export function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

/** Rektangulär ringposition i clockwise-ordning: topp -> höger -> botten -> vänster. */
export function ringPosRect(cols: number, rows: number, idx: number): { col: number; row: number } {
  const c = Math.max(2, Math.floor(cols));
  const r = Math.max(2, Math.floor(rows));
  const n = 2 * c + 2 * r - 4;
  const i = ((idx % n) + n) % n;
  const topLen = c;
  const rightLen = r - 1;
  const bottomLen = c - 1;

  if (i < topLen) return { col: i, row: 0 };
  if (i < topLen + rightLen) return { col: c - 1, row: i - topLen + 1 };
  if (i < topLen + rightLen + bottomLen) {
    return { col: c - 2 - (i - (topLen + rightLen)), row: r - 1 };
  }
  return { col: 0, row: r - 2 - (i - (topLen + rightLen + bottomLen)) };
}

/**
 * Returnerar en bredare rektangel som behåller samma perimeter som kvadratisk ring.
 * Exempel: 5 -> 6x4, 6 -> 8x4, 7 -> 9x5.
 */
export function ringRectDimsFromGridSize(size: number): { cols: number; rows: number } {
  const s = Math.max(2, Math.floor(size));
  // Bas-widescreen för små/medelstora bräden.
  let cols = s + 1;
  let rows = s - 1;
  // Större bräden får lite extra bredd så de inte blir "nästan kvadratiska".
  if (s >= 6) {
    cols += 1;
    rows -= 1;
  }
  rows = Math.max(2, rows);
  return { cols, rows };
}

/** Måste följa samma perimeterordning som `clockwiseTileIndex` i @bv/game-core (rörelse längs ringen). */
export function ringPos(size: number, idx: number): { col: number; row: number } {
  return ringPosRect(size, size, idx);
}

export function activePlayer(state: GameState | null): Player | null {
  if (!state) return null;
  const id = state.turnOrder[state.currentTurnIndex];
  return state.players.find((p) => p.id === id) ?? null;
}

