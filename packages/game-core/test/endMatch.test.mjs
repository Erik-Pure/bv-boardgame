import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEmptyLobby, endMatch, startGame } from "../dist/index.js";

describe("endMatch", () => {
  it("ends a playing match without a winner", () => {
    let state = createEmptyLobby("END01");
    state.players = [
      {
        id: "p1",
        name: "Ada",
        color: "#fff",
        avatar: { face: 0, hair: 0, eyes: 0, mouth: 0, accessory: 0 },
        isHost: true,
        ready: true,
        levelIndex: 0,
        tileIndex: 0,
        gold: 5,
        klunkar: 0,
        hp: 10,
        maxHp: 10,
        xp: 0,
        equipment: {},
        inventory: [],
        nextMoveBonus: 0,
        nextCombatModifier: 0,
        skippedTurns: 0,
        eliminated: false,
      },
      {
        id: "p2",
        name: "Bo",
        color: "#eee",
        avatar: { face: 0, hair: 0, eyes: 0, mouth: 0, accessory: 0 },
        isHost: false,
        ready: true,
        levelIndex: 0,
        tileIndex: 0,
        gold: 5,
        klunkar: 0,
        hp: 10,
        maxHp: 10,
        xp: 0,
        equipment: {},
        inventory: [],
        nextMoveBonus: 0,
        nextCombatModifier: 0,
        skippedTurns: 0,
        eliminated: false,
      },
    ];
    const started = startGame(state, "p1", 42);
    assert.equal(started.error, undefined);
    state = started.state;
    assert.equal(state.phase, "playing");

    const ended = endMatch(state);
    assert.equal(ended.error, undefined);
    assert.equal(ended.state.phase, "ended");
    assert.equal(ended.state.winnerId, null);
    assert.equal(ended.state.pending, null);
  });

  it("rejects when not playing", () => {
    const state = createEmptyLobby("END02");
    const r = endMatch(state);
    assert.ok(r.error);
    assert.equal(r.state.phase, "lobby");
  });
});
