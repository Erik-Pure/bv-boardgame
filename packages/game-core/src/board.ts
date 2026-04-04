import { createRng, pick, rollDie } from "./rng.js";
import type { LevelBoard, Tile, TileType } from "./types.js";

const BOSS_NAMES = [
  "Sour Yeast",
  "Spill from Hell",
  "Empty Tank",
  "Golden Cap",
] as const;

function makeTile(
  id: string,
  type: TileType,
  extra: Partial<Tile> = {},
): Tile {
  return { id, type, ...extra };
}

export function generateLevels(seed: number): LevelBoard[] {
  const rng = createRng(seed);
  const levels: LevelBoard[] = [];

  for (let li = 0; li < 3; li++) {
    // Square ring board: perimeter of a 7x7 grid (hole in the middle) => 24 tiles.
    const n = 24;
    const tiles: Tile[] = [];
    const types: TileType[] = [];

    const counts: Record<TileType, number> = {
      empty: 0,
      event: 6,
      combat: li === 0 ? 6 : li === 1 ? 7 : 6,
      merchant: 3,
      door: li < 2 ? 1 : 0,
      rest: 2,
      treasure: 3,
      boss: li === 2 ? 1 : 0,
    };

    for (const [t, c] of Object.entries(counts) as [TileType, number][]) {
      for (let i = 0; i < c; i++) types.push(t);
    }
    // No empty tiles in this variant: top up with events/combat (biased to events).
    while (types.length < n) types.push(rng() < 0.6 ? "event" : "combat");
    // shuffle
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
        const bossName =
          ty === "boss" ? pick(rng, [...BOSS_NAMES]) : undefined;
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
