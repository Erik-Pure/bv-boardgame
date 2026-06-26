import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { localizeTableToastLog } from "../dist/localizeTableToastLog.js";

describe("localizeTableToastLog", () => {
  it("leaves Swedish unchanged", () => {
    const sv = "Anna ger Bob en straffklunk (+1 klunk).";
    assert.equal(localizeTableToastLog(sv, "sv"), sv);
  });

  it("translates penalty sip grant", () => {
    const en = localizeTableToastLog("Anna ger Bob en straffklunk (+1 klunk).", "en");
    assert.equal(en, "Anna gives Bob a penalty sip (+1 sip).");
  });

  it("translates PvP gold loot", () => {
    const en = localizeTableToastLog("Anna tar 3 pant från Bob.", "en");
    assert.equal(en, "Anna takes 3 cans from Bob.");
  });

  it("translates Split the G without hybrid Swedish", () => {
    const en = localizeTableToastLog("Vera spelar Split the G och tar 1 pant från Erik.", "en");
    assert.equal(en, "Vera plays Split the G and takes 1 can from Erik.");
  });

  it("translates Rigged game steal", () => {
    const en = localizeTableToastLog(
      "Anna spelar Riggat spel och tar Öl-nunchucks (weapon) från Bob (−5 pant).",
      "en",
    );
    assert.match(en, /plays Rigged game and takes/i);
    assert.match(en, /from Bob/);
    assert.match(en, /−5 cans\)/);
    assert.doesNotMatch(en, /spelar/);
  });

  it("translates Vaska skip", () => {
    const en = localizeTableToastLog("Anna spelar Vaska och skippar den dåliga batchen.", "en");
    assert.equal(en, "Anna plays Sink It and skips the bad batch.");
  });

  it("translates bribe skip", () => {
    const en = localizeTableToastLog("Anna mutar sig ur batchmötet (Skum banan) och betalar 5 pant.", "en");
    assert.match(en, /bribed out of the batch encounter/i);
    assert.match(en, /paid 5 cans/i);
  });

  it("translates combat win random sip", () => {
    const en = localizeTableToastLog("Bob får straffklunk (Anna vann mot Enhörningsryttare).", "en");
    assert.match(en, /gets a penalty sip/i);
    assert.match(en, /Anna won against/i);
  });
});
