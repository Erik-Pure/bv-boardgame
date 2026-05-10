import { clockwiseTileIndex, counterClockwiseTileIndex, ringGridSizeFromTileCount } from "@bv/game-core";
import { ringPosRect, ringRectDimsFromGridSize } from "./tableBoard";

export type MoveChoiceCardinalArrow = "up" | "down" | "left" | "right";

export type MoveChoiceDirectionHints = {
  cw: { besideDice: MoveChoiceCardinalArrow };
  ccw: { besideDice: MoveChoiceCardinalArrow };
};

function tileCenterColsRows(col: number, row: number): { x: number; y: number } {
  return { x: col + 0.5, y: row + 0.5 };
}

function displacementToward(
  fromTileIndex: number,
  toTileIndex: number,
  cols: number,
  rows: number,
): { dx: number; dy: number } {
  const pf = ringPosRect(cols, rows, fromTileIndex);
  const pt = ringPosRect(cols, rows, toTileIndex);
  const a = tileCenterColsRows(pf.col, pf.row);
  const b = tileCenterColsRows(pt.col, pt.row);
  return { dx: b.x - a.x, dy: b.y - a.y };
}

/** Ett steg längs rektangelringen är kardinalt; atan2 ger stabilt väderstreck. */
function cardinalFromRingStep(dx: number, dy: number): MoveChoiceCardinalArrow {
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return "right";
  const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const a = ((deg % 360) + 360) % 360;
  if (a >= 315 || a < 45) return "right";
  if (a < 135) return "down";
  if (a < 225) return "left";
  return "up";
}

function firstStepHint(
  from: number,
  dir: "cw" | "ccw",
  n: number,
  cols: number,
  rows: number,
): MoveChoiceCardinalArrow {
  const next =
    dir === "cw" ? clockwiseTileIndex(from, 1, n) : counterClockwiseTileIndex(from, 1, n);
  const { dx, dy } = displacementToward(from, next, cols, rows);
  return cardinalFromRingStep(dx, dy);
}

/**
 * Pilhintar: enbart **första steget** medurs resp. moturs längs ringen (samma indexering som spelet).
 */
export function moveChoiceDirectionHints(params: {
  fromTileIndex: number;
  cwLandingTileIndex: number;
  ccwLandingTileIndex: number;
  ringTileCount: number;
}): MoveChoiceDirectionHints | null {
  const { fromTileIndex, ringTileCount } = params;
  const n = Math.max(0, Math.floor(ringTileCount));
  if (n <= 1) return null;

  const gridSize = ringGridSizeFromTileCount(n);
  const { cols, rows } = ringRectDimsFromGridSize(gridSize);
  const from = ((fromTileIndex % n) + n) % n;

  return {
    cw: { besideDice: firstStepHint(from, "cw", n, cols, rows) },
    ccw: { besideDice: firstStepHint(from, "ccw", n, cols, rows) },
  };
}

/** Sant på tiles längs ringens överkant (`ringPosRect` row === 0). Där är första cw-steget åt höger och ccw åt vänster — UI-kolumner speglas då så vänster knapp = visuellt vänster. */
export function isRingTopEdgeTile(fromTileIndex: number, ringTileCount: number): boolean {
  const n = Math.max(0, Math.floor(ringTileCount));
  if (n <= 1) return false;
  const gridSize = ringGridSizeFromTileCount(n);
  const { cols, rows } = ringRectDimsFromGridSize(gridSize);
  const from = ((fromTileIndex % n) + n) % n;
  return ringPosRect(cols, rows, from).row === 0;
}
