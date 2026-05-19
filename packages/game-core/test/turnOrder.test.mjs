import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAction,
  CONFIG_NUMERIC,
  DEFAULT_PLAYER_SESSION_STATS,
} from "../dist/index.js";

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
  it("advances turn after sipNoticeAck when no level-up offer", () => {
    const withSip = twoPlayerState({
      sipNotices: [{ recipientId: "p1", fromPlayerName: "Batch", klunkCount: 1 }],
    });
    const ack = applyAction(withSip, { type: "sipNoticeAck", playerId: "p1" });
    assert.equal(ack.error, undefined);
    assert.equal(ack.state.sipNotices?.length ?? 0, 0);
    assert.equal(ack.state.pending?.type, undefined);
    assert.equal(ack.state.currentTurnIndex, 1);
    assert.equal(ack.state.turnOrder[ack.state.currentTurnIndex], "p2");
  });

  it("does not advance turn on sipNoticeAck when level-up offer is shown", () => {
    const withSip = twoPlayerState({
      players: [
        mkPlayer({ id: "p1", xp: 120 }),
        mkPlayer({ id: "p2", name: "B", color: "#222", isHost: false, xp: 0 }),
      ],
      sipNotices: [{ recipientId: "p1", fromPlayerName: "Batch", klunkCount: 1 }],
    });
    const ack = applyAction(withSip, { type: "sipNoticeAck", playerId: "p1" });
    assert.equal(ack.error, undefined);
    assert.equal(ack.state.currentTurnIndex, 0);
    assert.equal(ack.state.pending?.type, "levelUpOffer");
    assert.equal(ack.state.pending?.playerId, "p1");
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
