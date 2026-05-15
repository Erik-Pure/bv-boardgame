import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LATE_RANDOM_MONSTER_IDS,
  monsterAvailableAtBoardLevel,
  monstersEligibleForRandomEncounter,
  MONSTERS,
} from "../dist/index.js";
import { createRng } from "../dist/rng.js";

function pickMonsterForLevel(rng, levelIndex) {
  const { team, normal } = monstersEligibleForRandomEncounter(levelIndex);
  const teamChance = levelIndex <= 0 ? 0.04 : levelIndex === 1 ? 0.09 : 0.14;
  if (team.length > 0 && rng() < teamChance) {
    return team[Math.floor(rng() * team.length)];
  }
  return normal[Math.floor(rng() * normal.length)];
}

describe("monster board level gate", () => {
  it("Stoorn, Enhörningsryttare och Demonkrigare har minBoardLevelIndex 1", () => {
    for (const id of LATE_RANDOM_MONSTER_IDS) {
      const m = MONSTERS.find((x) => x.id === id);
      assert.ok(m, id);
      assert.equal(m.minBoardLevelIndex, 1);
    }
  });

  it("våning 1 (levelIndex 0) utesluter sena monster ur slump-poolen", () => {
    const { normal } = monstersEligibleForRandomEncounter(0);
    assert.ok(normal.length > 0);
    for (const id of LATE_RANDOM_MONSTER_IDS) {
      assert.equal(
        normal.some((m) => m.id === id),
        false,
        `expected ${id} absent at levelIndex 0`,
      );
    }
  });

  it("våning 2+ (levelIndex 1) inkluderar sena monster", () => {
    const { normal } = monstersEligibleForRandomEncounter(1);
    for (const id of LATE_RANDOM_MONSTER_IDS) {
      assert.equal(
        normal.some((m) => m.id === id),
        true,
        `expected ${id} present at levelIndex 1`,
      );
    }
  });

  it("1000 slump på våning 1 träffar aldrig sena monster", () => {
    const rng = createRng(0xdeadbeef);
    for (let i = 0; i < 1000; i++) {
      const m = pickMonsterForLevel(rng, 0);
      assert.ok(monsterAvailableAtBoardLevel(m, 0));
      assert.equal(LATE_RANDOM_MONSTER_IDS.includes(m.id), false);
    }
  });
});
