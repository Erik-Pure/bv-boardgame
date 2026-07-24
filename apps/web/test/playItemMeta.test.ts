import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Player } from "@bv/game-core";
import {
  applyItemCardBonusToItemText,
  itemMeta,
  itemMetaForView,
  replaceItemEffectAmountInText,
} from "../src/components/play/playItemMeta.ts";
import { shopItemEffectBadges } from "../src/lib/inventoryEffectBadges.ts";

function stubPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: "p1",
    name: "A",
    isHost: true,
    connected: true,
    levelIndex: 0,
    tileIndex: 0,
    hp: 10,
    maxHp: 10,
    gold: 0,
    xp: 0,
    klunk: 0,
    inventory: [],
    equipment: {},
    ...overrides,
  } as Player;
}

describe("replaceItemEffectAmountInText", () => {
  it("rewrites signed combat amounts with unicode minus", () => {
    assert.equal(
      replaceItemEffectAmountInText("Stridsreaktion: −2 attack", -2, -3),
      "Stridsreaktion: −3 attack",
    );
  });

  it("rewrites +attack without touching cost numbers", () => {
    assert.equal(
      replaceItemEffectAmountInText("Betala 5 pant: +4 attack. Vid förlust tar du dubbel skada.", 4, 5),
      "Betala 5 pant: +5 attack. Vid förlust tar du dubbel skada.",
    );
    assert.equal(
      replaceItemEffectAmountInText("Stridsreaktion: betala 10 pant för +4 attack.", 4, 6),
      "Stridsreaktion: betala 10 pant för +6 attack.",
    );
  });

  it("rewrites bare heal amounts", () => {
    assert.equal(
      replaceItemEffectAmountInText("Använd: återställ 3 HP.", 3, 4),
      "Använd: återställ 4 HP.",
    );
  });
});

describe("itemMetaForView itemCardBonus text", () => {
  it("leaves catalog text unchanged without bonus on floor 1", () => {
    const me = stubPlayer();
    const meta = itemMetaForView("healing_potion", me, null, "sv");
    assert.equal(meta.text, itemMeta("healing_potion", "sv").text);
  });

  it("buffs healing_potion HP amount from equipment itemCardBonus", () => {
    const me = stubPlayer({
      equipment: { helmet: { name: "Pannband", itemCardBonus: 1 } },
    });
    const meta = itemMetaForView("healing_potion", me, null, "sv");
    assert.match(meta.text, /4 HP/);
    assert.doesNotMatch(meta.text, /3 HP/);
  });

  it("buffs weak_beer attack to match badge math", () => {
    const me = stubPlayer({
      levelIndex: 0,
      equipment: { helmet: { name: "Pannband", itemCardBonus: 1 } },
    });
    const meta = itemMetaForView("weak_beer", me, { levels: [{ tiles: [] }] } as never, "sv");
    assert.match(meta.text, /−3 attack/);
  });

  it("buffs get_lucky attack but keeps pant cost", () => {
    const me = stubPlayer({
      brewerItemCardBonus: 1,
    });
    const meta = itemMetaForView("get_lucky", me, null, "sv");
    assert.match(meta.text, /Betala 5 pant/);
    assert.match(meta.text, /\+5 attack/);
  });

  it("applyItemCardBonusToItemText is a no-op for non-flat items", () => {
    const me = stubPlayer({ brewerItemCardBonus: 2 });
    const text = "Använd: skippa den dåliga batchen.";
    assert.equal(applyItemCardBonusToItemText("early_night", text, me, null), text);
  });
});

describe("kapsylbikini shop badge", () => {
  it("labels pvpCannotBeChallenged as BvB", () => {
    const badges = shopItemEffectBadges({
      id: "ea_cap_bikini",
      name: "Kapsylbikini",
      slot: "armor",
      price: 10,
      pvpCannotBeChallenged: true,
    } as never);
    const bvb = badges.find((b) => b.icon === "bvb");
    assert.equal(bvb?.label, "BvB");
  });
});
