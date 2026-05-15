import test from "node:test";
import assert from "node:assert/strict";
import { findBossTileIndexInLevel } from "../dist/board.js";

test("findBossTileIndexInLevel hittar type boss", () => {
  const idx = findBossTileIndexInLevel({
    tiles: [
      { id: "a", type: "event" },
      { id: "b", type: "boss", bossName: "X" },
    ],
  });
  assert.equal(idx, 1);
});

test("findBossTileIndexInLevel fallback på bossName om type saknas", () => {
  const idx = findBossTileIndexInLevel({
    tiles: [
      { id: "a", type: "combat" },
      { id: "b", type: "combat", bossName: "Slutboss" },
    ],
  });
  assert.equal(idx, 1);
});
