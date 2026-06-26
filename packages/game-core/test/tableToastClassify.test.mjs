import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyTableToastMessage } from "../dist/tableToastClassify.js";

describe("classifyTableToastMessage", () => {
  it("classifies Swedish sip toast", () => {
    assert.equal(
      classifyTableToastMessage("Anna ger Bob en straffklunk (+1 klunk)."),
      "sip",
    );
  });

  it("classifies English sip toast", () => {
    assert.equal(
      classifyTableToastMessage("Anna gives Bob a penalty sip (+1 sip)."),
      "sip",
    );
  });

  it("classifies English combat skip as vaska", () => {
    assert.equal(
      classifyTableToastMessage(
        "Anna avoids the batch encounter (Skum banan) — no XP, no loot (−2 cans).",
      ),
      "vaska",
    );
  });

  it("classifies Sink It skip as vaska", () => {
    assert.equal(
      classifyTableToastMessage("Anna plays Sink It and skips the bad batch."),
      "vaska",
    );
  });

  it("classifies Swedish bribe skip as vaska", () => {
    assert.equal(
      classifyTableToastMessage(
        "Anna mutar sig ur batchmötet (Kapten Interrobang) och betalar 10 pant.",
      ),
      "vaska",
    );
  });

  it("classifies English PvP gold loot", () => {
    assert.equal(
      classifyTableToastMessage("Anna takes 3 cans from Bob."),
      "pvp",
    );
  });

  it("does not classify combat damage as pvp toast", () => {
    assert.equal(
      classifyTableToastMessage("Anna tar skada (HP 5 → 3)."),
      null,
    );
    assert.equal(
      classifyTableToastMessage("Anna takes damage (HP 5 → 3)."),
      null,
    );
  });
});
