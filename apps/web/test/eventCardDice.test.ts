import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { eventCardDiceSfxKey, parseRolledDieFromCardText } from "../src/lib/eventCardDice.ts";

describe("parseRolledDieFromCardText", () => {
  it("parses Tärning: N from card body", () => {
    assert.equal(parseRolledDieFromCardText("Du slog.\nTärning: 4\nPant: 2 → 7."), 4);
  });

  it("returns null when die line is missing", () => {
    assert.equal(parseRolledDieFromCardText("Ingen tärning här."), null);
  });

  it("clamps die to 1–6", () => {
    assert.equal(parseRolledDieFromCardText("Tärning: 9"), 6);
    assert.equal(parseRolledDieFromCardText("Tärning: 0"), 1);
  });
});

describe("eventCardDiceSfxKey", () => {
  it("builds stable key for rolled event cards", () => {
    const key = eventCardDiceSfxKey({
      type: "card",
      kind: "event",
      playerId: "p1",
      cardId: "event_rotasoptunna",
      title: "Rotasoptunna",
      text: "Tärning: 3",
    });
    assert.equal(key, "event_rotasoptunna:p1:3");
  });

  it("returns null before roll result exists", () => {
    assert.equal(
      eventCardDiceSfxKey({
        type: "card",
        kind: "event",
        playerId: "p1",
        cardId: "event_rotasoptunna",
        title: "Rotasoptunna",
        text: "Välj ett alternativ.",
      }),
      null,
    );
  });
});
