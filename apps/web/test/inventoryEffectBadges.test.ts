import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { itemInventoryEffectBadge } from "../src/lib/inventoryEffectBadges.ts";

describe("itemInventoryEffectBadge combat attack scaling", () => {
  it("paidassasin shows base −5 on floor 1 without player opts", () => {
    const badge = itemInventoryEffectBadge("paidassasin");
    assert.equal(badge?.label, "-5");
  });

  it("paidassasin shows scaled −6 on floor 2 (levelIndex 1)", () => {
    const badge = itemInventoryEffectBadge("paidassasin", null, {
      playerLevelIndex: 1,
      levelCount: 3,
    });
    assert.equal(badge?.label, "-6");
    assert.equal(badge?.labelTone, "danger");
  });

  it("weak_beer applies itemCardBonus before board scaling", () => {
    const badge = itemInventoryEffectBadge("weak_beer", null, {
      playerLevelIndex: 0,
      levelCount: 3,
      itemCardBonus: 1,
    });
    assert.equal(badge?.label, "-3");
  });
});
