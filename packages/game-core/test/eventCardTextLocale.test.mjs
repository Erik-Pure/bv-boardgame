import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  localizeEventCardPendingText,
  parseRolledDieFromCardText,
} from "../dist/localizeEventCardText.js";

describe("localizeEventCardText", () => {
  it("parses rolled die from Swedish and English prefixes", () => {
    assert.equal(parseRolledDieFromCardText("Roll the die.\nTärning: 2."), 2);
    assert.equal(parseRolledDieFromCardText("Roll the die.\nDie: 4."), 4);
    assert.equal(parseRolledDieFromCardText("Roll the die."), null);
  });

  it("localizes Butterfingers post-roll text", () => {
    const sv =
      "Slå tärningen.\nTärning: 2.\nInget tappades.";
    const en = localizeEventCardPendingText(sv, "event_fummel", "en");
    assert.match(en, /Roll the die/);
    assert.match(en, /Die: 2\./);
    assert.doesNotMatch(en, /Tärning/);
    assert.doesNotMatch(en, /Inget tappades/);
    assert.match(en, /You fumble but keep your gear/);
  });

  it("localizes Butterfingers equipment drop with Swedish equipped name", () => {
    const sv =
      "Slå tärningen.\nTärning: 6.\nDu tappade Öl-nunchucks (weapon).";
    const en = localizeEventCardPendingText(sv, "event_fummel", "en");
    assert.match(en, /You dropped Beer Nunchucks \(weapon\)\./);
    assert.doesNotMatch(en, /Öl-nunchucks/);
  });

  it("localizes rotasoptunna pant gain line", () => {
    const sv = "Slå tärning.\nTärning: 3 → +6 pant.\nPant: 5 → 11.";
    const en = localizeEventCardPendingText(sv, "event_rotasoptunna", "en");
    assert.match(en, /Die: 3 → \+6 cans\./);
    assert.match(en, /Cans: 5 → 11\./);
    assert.doesNotMatch(en, /pant/i);
  });

  it("localizes pantad poorest-player and no-transfer lines", () => {
    const transfer =
      "Slå tärning.\nTärning: 6.\nBertil var fattigast och fick 4 pant.\nPant: 8 → 4.";
    const enTransfer = localizeEventCardPendingText(transfer, "event_pantad", "en");
    assert.match(enTransfer, /Bertil was poorest and received 4 cans\./);
    assert.match(enTransfer, /Cans: 8 → 4\./);

    const none = "Slå tärning.\nTärning: 2.\nIngen pant överfördes.";
    const enNone = localizeEventCardPendingText(none, "event_pantad", "en");
    assert.match(enNone, /No cans were transferred\./);
  });

  it("localizes stat delta and syndabock target lines", () => {
    const sv =
      "Välj spelare.\nValt: Bertil\nBertil klunkar: 0 → 1.\nDina klunkar: 2 → 3.\nKlunkar: 2 → 3.";
    const en = localizeEventCardPendingText(sv, "event_syndabock", "en");
    assert.match(en, /Chosen: Bertil/);
    assert.match(en, /Bertil sips: 0 → 1\./);
    assert.match(en, /Your sips: 2 → 3\./);
    assert.match(en, /Sips: 2 → 3\./);
    assert.doesNotMatch(en, /klunkar/i);
  });

  it("localizes treasure_item_random body when only granted item text is shown", () => {
    const sv = "Helande brygd\nAnvänd: återställ 3 HP.";
    const en = localizeEventCardPendingText(sv, "treasure_item_random", "en", {
      grantedItemId: "healing_potion",
    });
    assert.equal(en, "Healing Brew\nUse: restore 3 HP.");
  });

  it("localizes granted item block when grantedItemId is provided", () => {
    const sv =
      "Slå tärningen.\nTärning: 6.\n\nSplit the G\nAnvänd på en annan spelare: ta hälften av spelarens pant (avrundat nedåt).";
    const en = localizeEventCardPendingText(sv, "event_snurraflaskan", "en", {
      grantedItemId: "split_the_g",
    });
    assert.match(en, /Split the G/);
    assert.match(en, /Use on another player/i);
    assert.doesNotMatch(en, /Använd på en annan spelare/);
  });

  it("returns Swedish text unchanged for sv locale", () => {
    const sv = "Slå tärningen.\nTärning: 2.\nInget tappades.";
    assert.equal(localizeEventCardPendingText(sv, "event_fummel", "sv"), sv);
  });

  it("localizes treasure_cache with substituted gold amount", () => {
    const sv = "Du hittar en gömma. +5 pant.";
    const en = localizeEventCardPendingText(sv, "treasure_cache", "en");
    assert.equal(en, "You find a stash. +5 cans.");
  });

  it("localizes treasure_empty hardcoded card", () => {
    const sv = "Någon hann före. Det finns inget kvar.";
    const en = localizeEventCardPendingText(sv, "treasure_empty", "en");
    assert.match(en, /Someone got there first/);
  });

  it("localizes boss_round_win with remaining lives", () => {
    const sv1 = "Slutbossen har 1 liv kvar. Bekräfta för att gå vidare till nästa runda.";
    const en1 = localizeEventCardPendingText(sv1, "boss_round_win", "en");
    assert.equal(
      en1,
      "The final boss has 1 life left. Confirm to continue to the next round.",
    );
    const sv2 = "Slutbossen har 2 liv kvar. Bekräfta för att gå vidare till nästa runda.";
    const en2 = localizeEventCardPendingText(sv2, "boss_round_win", "en");
    assert.equal(
      en2,
      "The final boss has 2 lives left. Confirm to continue to the next round.",
    );
  });
});
