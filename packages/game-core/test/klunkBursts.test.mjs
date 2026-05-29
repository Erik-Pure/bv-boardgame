import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyAction, CONFIG_NUMERIC, DEFAULT_PLAYER_SESSION_STATS } from "../dist/index.js";
import { grantKlunkWithXp } from "../dist/klunkGrant.js";
import { latestKlunkBurstForPlayer } from "../dist/klunkBursts.js";
import {
  klunkBurstCountForSipNotice,
  pushSipNotice,
  recordKlunkBurstForSipNoticeAck,
} from "../dist/sipNotice.js";

function mkPlayer(id) {
  return {
    id,
    name: "Test",
    color: "#111",
    isHost: true,
    ready: true,
    xp: 0,
    gold: 0,
    hp: 10,
    maxHp: 10,
    klunkar: 0,
    levelIndex: 0,
    tileIndex: 0,
    equipment: {},
    inventory: [],
    nextMoveBonus: 0,
    nextCombatModifier: 0,
    skippedTurns: 0,
    eliminated: false,
    stats: { ...DEFAULT_PLAYER_SESSION_STATS },
  };
}

function baseState(overrides = {}) {
  return {
    phase: "playing",
    seed: 1,
    config: {
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
    },
    roomCode: "T",
    players: [mkPlayer("p1")],
    turnOrder: ["p1"],
    currentTurnIndex: 0,
    levels: [{ tiles: [{ id: "e0", type: "empty" }, { id: "e1", type: "empty" }] }],
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
    playerKlunkBursts: [],
    ...overrides,
  };
}

describe("playerKlunkBursts", () => {
  it("straffklunk via grantKlunkWithXp skapar ingen burst förrän sipNoticeAck", () => {
    const state = {
      players: [mkPlayer("p1")],
      playerKlunkBursts: [],
      sipNotices: [],
    };
    const p = state.players[0];
    grantKlunkWithXp(state, p, 2, { penaltyStraff: true });
    pushSipNotice(state, p.id, "Batch", 2);
    assert.equal(state.playerKlunkBursts?.length ?? 0, 0);
    recordKlunkBurstForSipNoticeAck(state, state.sipNotices[0]);
    assert.equal(state.playerKlunkBursts?.length, 1);
    assert.equal(state.playerKlunkBursts[0].playerId, "p1");
    assert.equal(state.playerKlunkBursts[0].klunkCount, 2);
    const latest = latestKlunkBurstForPlayer(state.playerKlunkBursts, "p1", Date.now());
    assert.ok(latest);
    assert.equal(latest.klunkCount, 2);
  });

  it("sipNoticeAck i motorn registrerar burst för standard straffklunk", () => {
    const out = applyAction(
      baseState({
        sipNotices: [{ recipientId: "p1", fromPlayerName: "Batch", klunkCount: 1 }],
      }),
      { type: "sipNoticeAck", playerId: "p1" },
    );
    assert.equal(out.error, undefined);
    assert.equal(out.state.sipNotices.length, 0);
    assert.equal(out.state.playerKlunkBursts?.length, 1);
    assert.equal(out.state.playerKlunkBursts[0].klunkCount, 1);
  });

  it("toast och duell-förlust ger ingen burst vid ack", () => {
    assert.equal(
      klunkBurstCountForSipNotice({
        recipientId: "p1",
        fromPlayerName: "X",
        noticeKind: "toast",
        title: "Hej",
        body: "Hej",
      }),
      null,
    );
    assert.equal(
      klunkBurstCountForSipNotice({
        recipientId: "p1",
        fromPlayerName: "X",
        noticeKind: "duel_loss",
        title: "Du förlorade",
        body: "Pant borta",
      }),
      null,
    );
  });

  it("vanlig klunk utan penaltyStraff skapar ingen burst", () => {
    const state = {
      players: [mkPlayer("p1")],
      playerKlunkBursts: [],
    };
    grantKlunkWithXp(state, state.players[0], 1);
    assert.equal(state.playerKlunkBursts?.length ?? 0, 0);
  });
});
