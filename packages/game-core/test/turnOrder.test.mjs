import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAction,
  CONFIG_NUMERIC,
  DEFAULT_PLAYER_SESSION_STATS,
} from "../dist/index.js";
import { grantKlunkWithXp } from "../dist/klunkGrant.js";

function gameConfig() {
  return {
    turnSeconds: CONFIG_NUMERIC.turnSeconds.default,
    reactionSeconds: CONFIG_NUMERIC.reactionSeconds.default,
    gameMode: "bossKill",
    difficulty: "folkol",
    hardcore: false,
    boardSize: "default",
    levelCount: 3,
    maxHp: CONFIG_NUMERIC.maxHp.default,
    startPant: CONFIG_NUMERIC.startPant.default,
    wakeLockBeforeStart: false,
    disabledCardIds: [],
    cardCover: "card1",
  };
}

function mkPlayer(overrides) {
  return {
    id: "p1",
    name: "Test",
    color: "#111",
    isHost: true,
    ready: true,
    levelIndex: 0,
    tileIndex: 0,
    gold: 50,
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
    stats: { ...DEFAULT_PLAYER_SESSION_STATS },
    ...overrides,
  };
}

function twoPlayerState(overrides = {}) {
  return {
    phase: "playing",
    seed: 1,
    config: gameConfig(),
    roomCode: "T",
    players: [
      mkPlayer({ id: "p1", xp: 0 }),
      mkPlayer({ id: "p2", name: "B", color: "#222", isHost: false, xp: 0 }),
    ],
    turnOrder: ["p1", "p2"],
    currentTurnIndex: 0,
    levels: [
      { tiles: [{ id: "e0", type: "empty" }, { id: "e1", type: "empty" }] },
      { tiles: [{ id: "e1-0", type: "empty" }, { id: "e1-1", type: "empty" }] },
    ],
    pending: null,
    log: [],
    winnerId: null,
    winnerName: null,
    goldenBeerCarrierId: null,
    finalBossMonsterId: "store_narcissius",
    finalBossLivesRemaining: 3,
    treasureTaken: {},
    lastDiceRoll: null,
    lastDiceRollerId: null,
    sipNotices: [],
    ...overrides,
  };
}

describe("turn order", () => {
  it("sipNoticeAck does not advance turn when only clearing a notice", () => {
    const withSip = twoPlayerState({
      currentTurnIndex: 1,
      sipNotices: [{ recipientId: "p1", fromPlayerName: "Batch", klunkCount: 1 }],
    });
    const ack = applyAction(withSip, { type: "sipNoticeAck", playerId: "p1" });
    assert.equal(ack.error, undefined);
    assert.equal(ack.state.sipNotices?.length ?? 0, 0);
    assert.equal(ack.state.pending?.type, undefined);
    assert.equal(ack.state.currentTurnIndex, 1);
    assert.equal(ack.state.turnOrder[ack.state.currentTurnIndex], "p2");
  });

  it("sipNoticeAck shows level-up without stealing turn from next player", () => {
    const withSip = twoPlayerState({
      currentTurnIndex: 1,
      players: [
        mkPlayer({ id: "p1", xp: 120 }),
        mkPlayer({ id: "p2", name: "B", color: "#222", isHost: false, xp: 0 }),
      ],
      sipNotices: [{ recipientId: "p1", fromPlayerName: "Batch", klunkCount: 1 }],
    });
    const ack = applyAction(withSip, { type: "sipNoticeAck", playerId: "p1" });
    assert.equal(ack.error, undefined);
    assert.equal(ack.state.currentTurnIndex, 1);
    assert.equal(ack.state.turnOrder[ack.state.currentTurnIndex], "p2");
    assert.equal(ack.state.offTurnPersonalPending?.type, "levelUpOffer");
    assert.equal(ack.state.offTurnPersonalPending?.playerId, "p1");
  });

  it("grantKlunkWithXp opens brewer perk off-turn when XP crosses bryggnivå", () => {
    const state = twoPlayerState({
      currentTurnIndex: 1,
      players: [
        mkPlayer({ id: "p1", xp: 115, brewerPerkLevelsClaimed: 0 }),
        mkPlayer({ id: "p2", name: "B", color: "#222", isHost: false, xp: 0 }),
      ],
    });
    const p1 = state.players[0];
    grantKlunkWithXp(state, p1, 1, { penaltyStraff: true });
    assert.equal(p1.xp, 120);
    assert.equal(state.offTurnPersonalPending?.type, "brewerPerkChoice");
    assert.equal(state.offTurnPersonalPending?.playerId, "p1");
  });

  it("next player can rollMove while opponent has off-turn levelUpOffer", () => {
    const state = twoPlayerState({
      currentTurnIndex: 1,
      players: [
        mkPlayer({ id: "p1", xp: 120 }),
        mkPlayer({ id: "p2", name: "B", color: "#222", isHost: false, xp: 0 }),
      ],
      offTurnPersonalPending: {
        type: "levelUpOffer",
        playerId: "p1",
        targetLevelIndex: 1,
        costs: { gold: 0, sips: 0 },
      },
    });
    const roll = applyAction(state, { type: "rollMove", playerId: "p2" });
    assert.equal(roll.error, undefined);
    assert.equal(roll.state.pending?.type, "moveChoice");
    assert.equal(roll.state.offTurnPersonalPending?.type, "levelUpOffer");
    assert.equal(roll.state.offTurnPersonalPending?.playerId, "p1");
  });

  it("player with own levelUpOffer cannot rollMove until decided", () => {
    const state = twoPlayerState({
      currentTurnIndex: 0,
      players: [mkPlayer({ id: "p1", xp: 120 }), mkPlayer({ id: "p2", name: "B", color: "#222", isHost: false })],
      pending: {
        type: "levelUpOffer",
        playerId: "p1",
        targetLevelIndex: 1,
        costs: { gold: 0, sips: 0 },
      },
    });
    const roll = applyAction(state, { type: "rollMove", playerId: "p1" });
    assert.ok(roll.error);
  });

  it("current player can rollMove while opponent has off-turn brewerPerkChoice", () => {
    const state = twoPlayerState({
      currentTurnIndex: 0,
      players: [
        mkPlayer({ id: "p1", xp: 0 }),
        mkPlayer({
          id: "p2",
          name: "B",
          color: "#222",
          isHost: false,
          xp: 0,
          pendingBrewerPerkLevels: 1,
        }),
      ],
      offTurnPersonalPending: { type: "brewerPerkChoice", playerId: "p2", levelsRemaining: 1 },
    });
    const roll = applyAction(state, { type: "rollMove", playerId: "p1" });
    assert.equal(roll.error, undefined);
    assert.equal(roll.state.pending?.type, "moveChoice");
    assert.equal(roll.state.offTurnPersonalPending?.type, "brewerPerkChoice");
  });

  it("advanceTurn passes to opponent when both players have a queued skip", () => {
    const state = twoPlayerState({
      players: [
        mkPlayer({ id: "p1", xp: 0, skippedTurns: 1 }),
        mkPlayer({ id: "p2", name: "B", color: "#222", isHost: false, xp: 0, skippedTurns: 1 }),
      ],
      pending: { type: "merchant", items: [], playerId: "p1" },
    });
    const left = applyAction(state, { type: "merchantBuy", playerId: "p1", itemId: null });
    assert.equal(left.error, undefined);
    assert.equal(left.state.currentTurnIndex, 1);
    assert.equal(left.state.turnOrder[left.state.currentTurnIndex], "p2");
    assert.equal(left.state.players.find((p) => p.id === "p1")?.skippedTurns, 0);
    assert.equal(left.state.players.find((p) => p.id === "p2")?.skippedTurns, 0);
  });
});
