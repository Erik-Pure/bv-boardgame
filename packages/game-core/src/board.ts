import { createRng, rollDie } from "./rng.js";
import type { LevelBoard, Tile, TileType } from "./types.js";

/** Yttre kant på “hålet” i mitten: 5×5 → 4·5−4 = 16 rutor per våning. */
export const BOARD_RING_GRID_SIZE = 5;

export function ringTileCount(gridSize: number): number {
  return 4 * gridSize - 4;
}

/**
 * Invers till {@link ringTileCount}: antal rutor på ringen → grid-storlek (hål i mitten).
 * Ogiltigt värde → {@link BOARD_RING_GRID_SIZE} (fallback vid korrupt eller okänt state).
 */
export function ringGridSizeFromTileCount(tileCount: number): number {
  if (!Number.isFinite(tileCount) || tileCount < 4) {
    return BOARD_RING_GRID_SIZE;
  }
  const s = (tileCount + 4) / 4;
  if (!Number.isInteger(s) || s < 2) {
    return BOARD_RING_GRID_SIZE;
  }
  if (ringTileCount(s) !== tileCount) {
    return BOARD_RING_GRID_SIZE;
  }
  return s;
}

function makeTile(
  id: string,
  type: TileType,
  extra: Partial<Tile> = {},
): Tile {
  return { id, type, ...extra };
}

/** Typfördelning per våning; summan ska bli `ringTileCount(BOARD_RING_GRID_SIZE)` (16). */
function tileCountsForLevel(li: number): Record<TileType, number> {
  if (li === 0) {
    return {
      empty: 0,
      event: 6,
      combat: 5,
      merchant: 1,
      door: 1,
      rest: 1,
      treasure: 2,
      boss: 0,
    };
  }
  if (li === 1) {
    return {
      empty: 0,
      event: 4,
      combat: 7,
      merchant: 1,
      door: 1,
      rest: 1,
      treasure: 2,
      boss: 0,
    };
  }
  if (li === 2) {
    return {
      empty: 0,
      event: 4,
      combat: 8,
      merchant: 1,
      door: 0,
      rest: 0,
      treasure: 2,
      boss: 1,
    };
  }
  return {
    empty: 0,
    event: 4,
    combat: 8,
    merchant: 1,
    door: 0,
    rest: 0,
    treasure: 2,
    boss: 1,
  };
}

export function generateLevels(seed: number): LevelBoard[] {
  const rng = createRng(seed);
  const levels: LevelBoard[] = [];
  const n = ringTileCount(BOARD_RING_GRID_SIZE);

  /** Nivå 0 = källare; 1–2 övriga våningar (totalt 3 nivåer). */
  const NUM_LEVELS = 3;

  for (let li = 0; li < NUM_LEVELS; li++) {
    const tiles: Tile[] = [];
    const types: TileType[] = [];

    const counts = tileCountsForLevel(li);

    for (const [t, c] of Object.entries(counts) as [TileType, number][]) {
      for (let i = 0; i < c; i++) types.push(t);
    }
    while (types.length < n) types.push(rng() < 0.6 ? "event" : "combat");
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [types[i], types[j]] = [types[j]!, types[i]!];
    }

    for (let i = 0; i < n; i++) {
      const ty = types[i]!;
      const id = `L${li}-T${i}`;
      if (ty === "combat" || ty === "boss") {
        const base = li * 2 + 3;
        const combatValue =
          ty === "boss"
            ? base + 6 + rollDie(rng, 3)
            : base + rollDie(rng, 4);
        /** Namn/styrka skrivs över i `startGame` utifrån vald slutboss. */
        const bossName = ty === "boss" ? "Slutboss" : undefined;
        tiles.push(
          makeTile(id, ty, {
            combatValue,
            bossName,
          }),
        );
      } else if (ty === "door") {
        tiles.push(
          makeTile(id, "door", {
            doorTargetLevelIndex: li + 1,
          }),
        );
      } else {
        tiles.push(makeTile(id, ty));
      }
    }
    levels.push({ tiles });
  }

  return levels;
}
