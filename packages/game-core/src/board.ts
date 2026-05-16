import { createRng, rollDie } from "./rng.js";
import { DEV_QUICK_BOSS_TEST } from "./devBossTest.js";
import type { LevelBoard, Tile, TileType } from "./types.js";

/** Yttre kant på “hålet” i mitten: 5×5 → 4·5−4 = 16 rutor per våning. */
export const BOARD_RING_GRID_SIZE = 5;
const LARGE_LOBBY_RING_GRID_SIZE = 6;
const LARGE_LOBBY_MIN_PLAYERS = 4;
const XL_LOBBY_RING_GRID_SIZE = 7;

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

/** Index för slutboss-rutan; `bossName`-fallback om `type` saknas i äldre/serialiserad state. */
export function findBossTileIndexInLevel(level: LevelBoard | undefined): number {
  if (!level?.tiles?.length) return -1;
  const byType = level.tiles.findIndex((t) => t.type === "boss");
  if (byType >= 0) return byType;
  return level.tiles.findIndex((t) => Boolean(t.bossName?.trim()));
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
    if (DEV_QUICK_BOSS_TEST.enabled) {
      return {
        empty: 0,
        event: 4,
        combat: 3,
        merchant: 1,
        door: 0,
        rest: 1,
        treasure: 2,
        boss: DEV_QUICK_BOSS_TEST.bossTilesOnLevel0,
      };
    }
    return {
      empty: 0,
      event: 6,
      combat: 5,
      merchant: 1,
      door: 0,
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
      door: 0,
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

export function generateLevels(
  seed: number,
  playerCount = 2,
  opts?: { levelCount?: number; boardSize?: "default" | "large" | "xlarge" },
): LevelBoard[] {
  const rng = createRng(seed);
  const levels: LevelBoard[] = [];
  const defaultGridSize = playerCount >= LARGE_LOBBY_MIN_PLAYERS ? LARGE_LOBBY_RING_GRID_SIZE : BOARD_RING_GRID_SIZE;
  const gridSize =
    opts?.boardSize === "xlarge"
      ? Math.max(defaultGridSize, XL_LOBBY_RING_GRID_SIZE)
      : opts?.boardSize === "large"
        ? Math.max(defaultGridSize, LARGE_LOBBY_RING_GRID_SIZE + 1)
        : defaultGridSize;
  const n = ringTileCount(gridSize);

  /** Nivå 0 = källare; 1–2 övriga våningar (totalt 3 nivåer som default). */
  const NUM_LEVELS = Math.max(1, Math.floor(opts?.levelCount ?? 3));

  for (let li = 0; li < NUM_LEVELS; li++) {
    const tiles: Tile[] = [];
    const types: TileType[] = [];

    const counts = tileCountsForLevel(li);

    for (const [t, c] of Object.entries(counts) as [TileType, number][]) {
      for (let i = 0; i < c; i++) types.push(t);
    }
    while (types.length < n) types.push(rng() < 0.6 ? "event" : "combat");
    const isFinalLevel = li === NUM_LEVELS - 1;
    if (!isFinalLevel) {
      const keepBossOnThisLevel = DEV_QUICK_BOSS_TEST.enabled && li === 0;
      if (!keepBossOnThisLevel) {
        for (let i = 0; i < types.length; i++) {
          if (types[i] === "boss") {
            types[i] = "combat";
          }
        }
      }
    } else if (!types.includes("boss")) {
      // Guarantee exactly one boss tile on the final level.
      const replaceIdx = Math.floor(rng() * types.length);
      types[replaceIdx] = "boss";
    }
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
      } else {
        tiles.push(makeTile(id, ty));
      }
    }
    levels.push({ tiles });
  }

  return levels;
}
