import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EQUIPMENT_CATALOG } from "@bv/game-core";
import {
  formatLocalizedShopItemEffectSummary,
  shopItemMechanicalEffectParts,
} from "../src/lib/equipmentEffectSummary.ts";
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

describe("shopItemMechanicalEffectParts", () => {
  it("joins Burksvärd pant tiers onto one line", () => {
    const sword = EQUIPMENT_CATALOG.find((e) => e.id === "ew_can_sword");
    assert.ok(sword);
    const parts = shopItemMechanicalEffectParts(sword, "sv", sv);
    assert.equal(parts[0], "Kraft +1");
    assert.equal(
      parts[1],
      "Vid 10+ pant: Kraft +2, Vid 20+ pant: Kraft +3, Vid 30+ pant: Kraft +4",
    );
    assert.equal(parts.length, 2);
  });

  it("joins Ölfylld rymdhjälm klunk tiers onto one line", () => {
    const helm = EQUIPMENT_CATALOG.find((e) => e.id === "eh_beer_filled_helmet");
    assert.ok(helm);
    const parts = shopItemMechanicalEffectParts(helm, "sv", sv);
    assert.ok(parts.some((p) => p === "Attack +1"));
    assert.ok(
      parts.some(
        (p) => p === "Vid 10+ klunkar: +1 attack, Vid 20+ klunkar: +2 attack",
      ),
    );
  });
});
