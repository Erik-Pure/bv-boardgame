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

  it("does not offer level-up until sip notice is acknowledged", () => {
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
    assert.equal(confirmed.state.pending?.type !== "levelUpOffer", true);
    assert.ok((confirmed.state.sipNotices?.length ?? 0) >= 1);
  });

  it("advances turn before sip notice after combat loss card (2 players)", () => {
    const state = {
      ...baseState(),
      players: [
        mkPlayer({ id: "p1", xp: 120 }),
        mkPlayer({ id: "p2", name: "B", color: "#222", isHost: false, ready: true, xp: 0 }),
      ],
      turnOrder: ["p1", "p2"],
      currentTurnIndex: 0,
      pending: {
        type: "card",
        playerId: "p1",
        cardId: "combat_lose",
        kind: "combat",
        title: "Förlust",
        text: "",
        artKey: "combat/lose",
        queuedPenaltySipNotices: [{ recipientId: "p1", fromPlayerName: "Batch", klunkCount: 1 }],
      },
    };
    const confirmed = applyAction(state, { type: "confirmCard", playerId: "p1" });
    assert.equal(confirmed.error, undefined);
    assert.equal(confirmed.state.currentTurnIndex, 1);
    assert.equal(confirmed.state.turnOrder[confirmed.state.currentTurnIndex], "p2");
    assert.ok((confirmed.state.sipNotices?.length ?? 0) >= 1);
    assert.equal(confirmed.state.pending?.type, undefined);
  });

  it("offers brewer perk off-turn right after combat loss even when straffklunk is queued", () => {
    const state = {
      ...baseState(),
      players: [
        mkPlayer({
          id: "p1",
          xp: 120,
          brewerPerkLevelsClaimed: 0,
          pendingBrewerPerkLevels: 1,
        }),
        mkPlayer({ id: "p2", name: "B", color: "#222", isHost: false, ready: true, xp: 0 }),
      ],
      turnOrder: ["p1", "p2"],
      currentTurnIndex: 0,
      pending: {
        type: "card",
        playerId: "p1",
        cardId: "combat_lose",
        kind: "combat",
        title: "Förlust",
        text: "",
        artKey: "combat/lose",
        queuedPenaltySipNotices: [{ recipientId: "p1", fromPlayerName: "Batch", klunkCount: 1 }],
      },
    };
    const confirmed = applyAction(state, { type: "confirmCard", playerId: "p1" });
    assert.equal(confirmed.error, undefined);
    assert.equal(confirmed.state.currentTurnIndex, 1);
    assert.ok((confirmed.state.sipNotices?.length ?? 0) >= 1);
    assert.equal(confirmed.state.offTurnPersonalPending?.type, "brewerPerkChoice");
    assert.equal(confirmed.state.offTurnPersonalPending?.playerId, "p1");
  });

  it("after last brewerPerkDecision offers level-up without blocking next player turn", () => {
    const state = {
      ...baseState(),
      players: [
        mkPlayer({ id: "p1", xp: 120, pendingBrewerPerkLevels: 1, brewerPerkLevelsClaimed: 0 }),
        mkPlayer({ id: "p2", name: "B", color: "#222", isHost: false, ready: true, xp: 0 }),
      ],
      turnOrder: ["p1", "p2"],
      currentTurnIndex: 1,
      offTurnPersonalPending: { type: "brewerPerkChoice", playerId: "p1", levelsRemaining: 1 },
    };
    const picked = applyAction(state, { type: "brewerPerkDecision", playerId: "p1", choice: "attack" });
    assert.equal(picked.error, undefined);
    assert.equal(picked.state.currentTurnIndex, 1);
    assert.equal(picked.state.offTurnPersonalPending?.type, "levelUpOffer");
    assert.equal(picked.state.offTurnPersonalPending?.playerId, "p1");
    const roll = applyAction(picked.state, { type: "rollMove", playerId: "p2" });
    assert.equal(roll.error, undefined);
  });
});
