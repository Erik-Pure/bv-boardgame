import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getCard, getCardDefById } from "../dist/cards/db.js";
import { getMonsterDisplay, getFinalBossTagline, localizeFinalBossDisplayName, localizeFinalBossRoundLabel } from "../dist/monsterLocale.js";
import { getEquipmentDisplay, getEquipmentDisplayByEquippedName } from "../dist/equipmentLocale.js";
import { formatCanAmount } from "../dist/canFormat.js";
import { formatSelfStatDeltas } from "../dist/statDeltaText.js";
import { formatLogEntry, LOG_MESSAGE_KEYS } from "../dist/logMessages.js";

describe("locale", () => {
  it("getCard returns English overlay when locale is en", () => {
    const sv = getCard("event_gold", "sv");
    const en = getCard("event_gold", "en");
    assert.equal(sv.title, "Tomburkar!");
    assert.equal(en.title, "Empty Cans!");
    assert.notEqual(en.text, sv.text);
  });

  it("getCardDefById respects locale", () => {
    const def = getCardDefById("event_spill", "en");
    assert.ok(def);
    assert.equal(def.title, "Spill!");
    assert.match(def.text, /damage/i);
  });

  it("getMonsterDisplay localizes name and rules", () => {
    const sv = getMonsterDisplay("skum_banan", "sv");
    const en = getMonsterDisplay("skum_banan", "en");
    assert.equal(sv.name, "Skum banan");
    assert.notEqual(en.name, sv.name);
    assert.ok(en.rulesText.length > 0);
  });

  it("getFinalBossTagline returns localized string", () => {
    const en = getFinalBossTagline("store_narcissius", "en");
    assert.ok(en);
    assert.match(en, /final boss/i);
  });

  it("localizeFinalBossDisplayName maps Swedish boss name to English", () => {
    assert.equal(localizeFinalBossDisplayName("Den store narcissus", "en"), "The Great Narcissus");
    assert.equal(localizeFinalBossDisplayName("Den store narcissus", "sv"), "Den store narcissus");
  });

  it("localizeFinalBossRoundLabel maps RUNDA X AV Y to ROUND X OF Y", () => {
    assert.equal(localizeFinalBossRoundLabel("RUNDA 3 AV 3", "en"), "ROUND 3 OF 3");
    assert.equal(localizeFinalBossRoundLabel("RUNDA 3 AV 3", "sv"), "RUNDA 3 AV 3");
  });

  it("getEquipmentDisplay localizes equipment copy", () => {
    const en = getEquipmentDisplay("ew_beer_chucks", "en");
    assert.match(en.name, /nunchuck/i);
    assert.ok(en.rulesText.length > 0);
  });

  it("getEquipmentDisplayByEquippedName resolves Swedish equipped name", () => {
    const en = getEquipmentDisplayByEquippedName("Öl-nunchucks", "en");
    assert.match(en?.name ?? "", /nunchuck/i);
  });

  it("getEquipmentDisplayByEquippedName localizes Rhubarb loot", () => {
    const sword = getEquipmentDisplayByEquippedName("Rabarbersvärd", "en");
    const helmet = getEquipmentDisplayByEquippedName("Körsbärshjälm", "en");
    assert.equal(sword?.name, "Rhubarb sword");
    assert.equal(helmet?.name, "Cherry helmet");
  });

  it("getEquipmentDisplayByEquippedName localizes Rally Robot loot", () => {
    const arm = getEquipmentDisplayByEquippedName("Robotarm", "en");
    const helm = getEquipmentDisplayByEquippedName("Robothjälm", "en");
    assert.equal(arm?.name, "Robot Arm");
    assert.equal(helm?.name, "Robot Helmet");
  });

  it("formatCanAmount uses singular can and plural cans", () => {
    assert.equal(formatCanAmount(1), "1 can");
    assert.equal(formatCanAmount(5), "5 cans");
  });

  it("formatSelfStatDeltas uses English labels", () => {
    const text = formatSelfStatDeltas(2, 7, 10, 8, 1, 2, "en");
    assert.match(text, /Cans: 2 → 7/);
    assert.match(text, /HP: 10 → 8/);
    assert.match(text, /Sips: 1 → 2/);
  });

  it("formatLogEntry translates structured log keys", () => {
    const entry = {
      at: Date.now(),
      message: "— Bryggmästarnas Mästare börjar! (seed abc) —",
      key: "game.started",
      params: { seed: "abc" },
    };
    const en = formatLogEntry(entry, "en");
    assert.match(en, /Brewmasters' Master begins/i);
  });

  it("formatLogEntry translates Plastback bottle toast", () => {
    const entry = {
      at: Date.now(),
      message: "Erik tar en flaska ur Plastback.",
      key: "player.takePlastbackBottle",
      params: { name: "Erik" },
    };
    assert.equal(formatLogEntry(entry, "en"), "Erik takes a bottle from the Crate.");
  });

  it("formatLogEntry translates PvP loot keys", () => {
    const gold = {
      at: Date.now(),
      message: "Anna tar 4 pant från Bob.",
      key: LOG_MESSAGE_KEYS.pvpLootGold,
      params: { winner: "Anna", amount: 4, loser: "Bob" },
    };
    assert.equal(formatLogEntry(gold, "en"), "Anna takes 4 cans from Bob.");

    const splitG = {
      at: Date.now(),
      message: "Vera spelar Split the G och tar 1 pant från Erik.",
      key: LOG_MESSAGE_KEYS.itemSplitTheG,
      params: { user: "Vera", amount: 1, target: "Erik" },
    };
    assert.equal(
      formatLogEntry(splitG, "en"),
      "Vera plays Split the G and takes 1 can from Erik.",
    );

    const sip = {
      at: Date.now(),
      message: "Anna ger Bob en straffklunk (+1 klunk).",
      key: LOG_MESSAGE_KEYS.pvpLootSip,
      params: { winner: "Anna", loser: "Bob" },
    };
    assert.equal(formatLogEntry(sip, "en"), "Anna gives Bob a penalty sip (+1 sip).");
  });

  it("formatLogEntry translates weapon win gold with fallback weapon name", () => {
    const entry = {
      at: Date.now(),
      message: "Anna får +2 pant från vapnet efter vinsten.",
      key: LOG_MESSAGE_KEYS.playerWeaponWinGold,
      params: { name: "Anna", amount: 2, weaponName: "vapnet" },
    };
    assert.equal(formatLogEntry(entry, "en"), "Anna gains +2 cans from the weapon after the win.");
  });
});
