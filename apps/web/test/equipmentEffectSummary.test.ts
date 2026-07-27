import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EQUIPMENT_CATALOG } from "@bv/game-core";
import { formatLocalizedShopItemEffectSummary } from "../src/lib/equipmentEffectSummary.ts";
import { en } from "../src/lib/uiStringsEn.ts";
import { sv } from "../src/lib/uiStrings.ts";

describe("formatLocalizedShopItemEffectSummary", () => {
  it("uses English rules text for Plastic Cup in merchant detail", () => {
    const plasticCup = EQUIPMENT_CATALOG.find((e) => e.id === "ew_plastic_cup");
    assert.ok(plasticCup);
    const summary = formatLocalizedShopItemEffectSummary(plasticCup, "en", en);
    assert.match(summary, /−1 attack in monster fights/i);
    assert.match(summary, /−2 max HP/i);
    assert.match(summary, /free to play|0 cans/i);
    assert.doesNotMatch(summary, /Kraft|Föremål/i);
  });

  it("keeps Swedish mechanical summary for Plastic Cup", () => {
    const plasticCup = EQUIPMENT_CATALOG.find((e) => e.id === "ew_plastic_cup");
    assert.ok(plasticCup);
    const summary = formatLocalizedShopItemEffectSummary(plasticCup, "sv", sv);
    assert.match(summary, /Kraft -1/);
    assert.match(summary, /-2 max HP/);
    assert.match(summary, /gratis att spela/i);
  });
});
