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
    xp: 120,
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

function baseState(overrides = {}) {
  return {
    phase: "playing",
    seed: 1,
    config: gameConfig(),
    roomCode: "T",
    players: [mkPlayer()],
    turnOrder: ["p1"],
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

describe("levelUpOffer after sip notice", () => {
  it("offers level-up only after straffklunk modal is acknowledged", () => {
    const withSip = baseState({
      sipNotices: [{ recipientId: "p1", fromPlayerName: "Batch", klunkCount: 1 }],
    });
    const ack = applyAction(withSip, { type: "sipNoticeAck", playerId: "p1" });
    assert.equal(ack.error, undefined);
    assert.equal(ack.state.sipNotices?.length ?? 0, 0);
    assert.equal(ack.state.pending?.type, "levelUpOffer");
    assert.equal(ack.state.pending?.playerId, "p1");
    assert.equal(ack.state.pending?.targetLevelIndex, 1);
  });

  it("does not advance turn while sip notice blocks level-up offer", () => {
    const withSip = baseState({
      sipNotices: [{ recipientId: "p1", fromPlayerName: "Batch", klunkCount: 1 }],
      pending: {
        type: "card",
        playerId: "p1",
        cardId: "event_klunk",
        kind: "event",
        title: "Klunk",
        text: "Test",
        artKey: "event/klunk",
      },
    });
    const confirmed = applyAction(withSip, { type: "confirmCard", playerId: "p1" });
    assert.equal(confirmed.error, undefined);
    assert.equal(confirmed.state.currentTurnIndex, 0);
    assert.equal(confirmed.state.pending?.type !== "levelUpOffer", true);
    assert.ok((confirmed.state.sipNotices?.length ?? 0) >= 1);
  });
});
