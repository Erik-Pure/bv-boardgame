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

/** Kortaste avståndet längs en ring med `n` tiles (CW eller CCW). */
export function ringDistance(a: number, b: number, n: number): number {
  if (n <= 0) return 0;
  const ai = ((a % n) + n) % n;
  const bi = ((b % n) + n) % n;
  const d = Math.abs(ai - bi);
  return Math.min(d, n - d);
}

/** Tile-index längs ringen från `from` till `to` (inklusive båda), i given riktning. */
export function ringPathIndices(
  fromTileIndex: number,
  toTileIndex: number,
  ringTileCount: number,
  dir?: "cw" | "ccw",
): number[] {
  const n = Math.max(1, ringTileCount);
  const from = ((fromTileIndex % n) + n) % n;
  const to = ((toTileIndex % n) + n) % n;
  if (from === to) return [from];
  const cwSteps = (to - from + n) % n;
  const ccwSteps = (from - to + n) % n;
  const useCw = dir ? dir === "cw" : cwSteps <= ccwSteps;
  const steps = useCw ? cwSteps : ccwSteps;
  const delta = useCw ? 1 : -1;
  const out: number[] = [from];
  for (let i = 1; i <= steps; i++) out.push((((from + i * delta) % n) + n) % n);
  return out;
}

/**
 * Sekventiell bob-ordning utåt från spelaren (samma steg i CW och CCW samtidigt).
 * Spelarens tile returnerar null. Räckvidd begränsas av `radius` (och ringens halva).
 * Returvärdet är 0-baserat steg: delay = steg * bobStep.
 */
export const TILE_BOB_RADIUS = 5;

/** Full half-ring reach (varvet, exkl. spelarruta / motsatta ytterkanten med amp 0). */
export function tileBobFullRingRadius(n: number): number {
  if (n <= 0) return 0;
  return Math.max(0, Math.floor(n / 2) - 1);
}

export function tileBobReach(n: number, radius: number = TILE_BOB_RADIUS): number {
  if (n <= 0) return 0;
  const maxDist = Math.floor(n / 2);
  return Math.min(radius, Math.max(0, maxDist - 1));
}

export function tileBobSequenceIndex(
  tileIndex: number,
  playerTileIndex: number,
  n: number,
  radius: number = TILE_BOB_RADIUS,
): number | null {
  if (n <= 0) return null;
  const dist = ringDistance(tileIndex, playerTileIndex, n);
  const reach = tileBobReach(n, radius);
  if (dist <= 0 || dist > reach) return null;
  return dist - 1;
}

/** Antal sekventiella steg i en våg (ett steg = båda riktningarna på samma avstånd). */
export function tileBobSequenceLength(n: number, radius: number = TILE_BOB_RADIUS): number {
  return tileBobReach(n, radius);
}

/**
 * Pre-roll: en CW-våg runt hela ringen (inte ut åt båda hållen).
 * Spelarens tile står stilla; övriga får steg 0..n-2 längs CW från spelaren.
 */
export function tileBobCircuitSequenceIndex(
  tileIndex: number,
  playerTileIndex: number,
  n: number,
): number | null {
  if (n <= 1) return null;
  const t = ((tileIndex % n) + n) % n;
  const p = ((playerTileIndex % n) + n) % n;
  if (t === p) return null;
  return ((t - p + n) % n) - 1;
}

export function tileBobCircuitSequenceLength(n: number): number {
  return n > 1 ? n - 1 : 0;
}

export type TileBobMoveChoiceStep = { step: number; pathLen: number };

/**
 * Bob-meta längs moveChoice-vägar: tiles mellan from och target (exklusive båda).
 * `step` är 1..pathLen; samma step används samtidigt i CW och CCW.
 */
export function tileBobMoveChoiceMeta(
  fromTileIndex: number,
  options: Array<{ dir: "cw" | "ccw"; targetTileIndex: number }>,
  n: number,
): Map<number, TileBobMoveChoiceStep> {
  const out = new Map<number, TileBobMoveChoiceStep>();
  if (n <= 0) return out;

  for (const opt of options) {
    const path = ringPathIndices(fromTileIndex, opt.targetTileIndex, n, opt.dir);
    // path[0] = from, path[last] = target — guppa bara mellanliggande
    if (path.length < 3) continue;
    const mid = path.slice(1, -1);
    const pathLen = mid.length;
    for (let i = 0; i < mid.length; i++) {
      const tile = mid[i]!;
      const step = i + 1;
      const prev = out.get(tile);
      if (!prev || step < prev.step) {
        out.set(tile, { step, pathLen: prev ? Math.max(prev.pathLen, pathLen) : pathLen });
      } else if (step === prev.step) {
        out.set(tile, { step, pathLen: Math.max(prev.pathLen, pathLen) });
      }
    }
  }
  return out;
}

/** Längsta pathLen bland moveChoice-bob-steg (för wave-cykel). */
export function tileBobMoveChoiceSequenceLength(meta: Map<number, TileBobMoveChoiceStep>): number {
  let max = 0;
  for (const { pathLen } of meta.values()) {
    if (pathLen > max) max = pathLen;
  }
  return max;
}

export function activePlayer(state: GameState | null): Player | null {
  if (!state) return null;
  const id = state.turnOrder[state.currentTurnIndex];
  return state.players.find((p) => p.id === id) ?? null;
}
