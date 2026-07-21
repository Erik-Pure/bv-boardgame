import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEmptyLobby, returnToLobby } from "../dist/index.js";

function endedWithPlayers(clearPlayersOnRematch) {
  const state = createEmptyLobby("TEST01");
  state.phase = "ended";
  state.config.clearPlayersOnRematch = clearPlayersOnRematch;
  state.winnerId = "p1";
  state.winnerName = "Ada";
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
      gold: 3,
      klunkar: 1,
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
      gold: 1,
      klunkar: 0,
      hp: 8,
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
  return state;
}

describe("returnToLobby", () => {
  it("keeps players when clearPlayersOnRematch is false", () => {
    const res = returnToLobby(endedWithPlayers(false));
    assert.equal(res.error, undefined);
    assert.equal(res.state.phase, "lobby");
    assert.equal(res.state.players.length, 2);
    assert.equal(res.state.config.clearPlayersOnRematch, false);
    assert.equal(res.state.players.every((p) => p.ready === false), true);
  });

  it("clears players when clearPlayersOnRematch is true", () => {
    const res = returnToLobby(endedWithPlayers(true));
    assert.equal(res.error, undefined);
    assert.equal(res.state.phase, "lobby");
    assert.equal(res.state.players.length, 0);
    assert.equal(res.state.config.clearPlayersOnRematch, true);
  });
});
