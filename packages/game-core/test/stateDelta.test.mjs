import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeGameStateDelta } from "../dist/stateDelta.js";

function baseState() {
  return {
    phase: "playing",
    config: {},
    players: [
      { id: "a", name: "A", gold: 5, hp: 10, maxHp: 10, klunkar: 0 },
      { id: "b", name: "B", gold: 3, hp: 8, maxHp: 10, klunkar: 1 },
    ],
    turnOrder: ["a", "b"],
    currentTurnIndex: 0,
    levels: [{ tiles: [{ type: "start" }] }],
    log: [],
    logSeq: 0,
  };
}

describe("mergeGameStateDelta", () => {
  it("merges partial player patch by id", () => {
    const prev = baseState();
    const next = mergeGameStateDelta(prev, {
      playersPartial: true,
      players: [{ id: "a", name: "A", gold: 9, hp: 10, maxHp: 10, klunkar: 0 }],
    });
    assert.equal(next.players[0].gold, 9);
    assert.equal(next.players[1].gold, 3);
  });

  it("replaces full players array when playersPartial is absent", () => {
    const prev = baseState();
    const next = mergeGameStateDelta(prev, {
      players: [{ id: "a", name: "A", gold: 1, hp: 10, maxHp: 10, klunkar: 0 }],
    });
    assert.equal(next.players.length, 1);
  });

  it("keeps levels when patch omits them", () => {
    const prev = baseState();
    const next = mergeGameStateDelta(prev, { pending: null });
    assert.equal(next.levels.length, 1);
  });
});
