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

  it("clears all players when patch has empty players array", () => {
    const prev = baseState();
    const next = mergeGameStateDelta(prev, {
      phase: "lobby",
      players: [],
    });
    assert.equal(next.players.length, 0);
    assert.equal(next.phase, "lobby");
  });

  it("keeps levels when patch omits them", () => {
    const prev = baseState();
    const next = mergeGameStateDelta(prev, { pending: null });
    assert.equal(next.levels.length, 1);
  });

  it("appends partial log entries", () => {
    const prev = { ...baseState(), log: [{ at: 1, message: "start" }], logSeq: 1 };
    const next = mergeGameStateDelta(prev, {
      logPartial: true,
      log: [{ at: 2, message: "move" }],
      logSeq: 2,
    });
    assert.equal(next.log.length, 2);
    assert.equal(next.log[1].message, "move");
  });

  it("rotates log when partial append hits 200-row cap", () => {
    const prev = {
      ...baseState(),
      log: Array.from({ length: 200 }, (_, i) => ({ at: i, message: `line-${i}` })),
      logSeq: 200,
    };
    const next = mergeGameStateDelta(prev, {
      logPartial: true,
      logTruncated: true,
      log: [{ at: 999, message: "newest" }],
      logSeq: 201,
    });
    assert.equal(next.log.length, 200);
    assert.equal(next.log[0].message, "line-1");
    assert.equal(next.log[199].message, "newest");
  });

  it("replaces full log when partial flag is absent", () => {
    const prev = { ...baseState(), log: [{ at: 1, message: "old" }] };
    const next = mergeGameStateDelta(prev, {
      log: [{ at: 2, message: "fresh" }],
    });
    assert.equal(next.log.length, 1);
    assert.equal(next.log[0].message, "fresh");
  });

  it("appends partial emote bursts and prunes expired", () => {
    const now = Date.now();
    const prev = {
      ...baseState(),
      playerEmoteBursts: [{ playerId: "a", emoteId: "happy", at: now - 1000 }],
    };
    const next = mergeGameStateDelta(prev, {
      emoteBurstsPartial: true,
      playerEmoteBursts: [{ playerId: "b", emoteId: "sad", at: now }],
    });
    assert.equal(next.playerEmoteBursts?.length, 2);
    assert.equal(next.playerEmoteBursts?.[1]?.playerId, "b");
  });

  it("appends partial klunk bursts", () => {
    const now = Date.now();
    const prev = { ...baseState(), playerKlunkBursts: [] };
    const next = mergeGameStateDelta(prev, {
      klunkBurstsPartial: true,
      playerKlunkBursts: [{ playerId: "a", at: now, klunkCount: 2 }],
    });
    assert.equal(next.playerKlunkBursts?.length, 1);
    assert.equal(next.playerKlunkBursts?.[0]?.klunkCount, 2);
  });
});
