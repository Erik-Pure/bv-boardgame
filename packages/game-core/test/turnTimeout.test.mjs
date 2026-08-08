import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAction,
  applyTurnTimeoutIfDue,
  CONFIG_NUMERIC,
  createEmptyLobby,
  DEFAULT_PLAYER_SESSION_STATS,
  isTurnTimeoutActionablePending,
  lobbyAddPlayer,
  PVP_BEST_OF,
} from "../dist/index.js";

function gameConfig(overrides = {}) {
  return {
    turnSeconds: CONFIG_NUMERIC.turnSeconds.default,
    turnTimeoutEnabled: false,
    missedTurnsKickAfter: CONFIG_NUMERIC.missedTurnsKickAfter.default,
    reactionSeconds: CONFIG_NUMERIC.reactionSeconds.default,
    gameMode: "bossKill",
    difficulty: "folkol",
    hardcore: false,
    allowLateJoin: false,
    clearPlayersOnRematch: false,
    boardSize: "default",
    levelCount: 3,
    maxHp: CONFIG_NUMERIC.maxHp.default,
    startPant: CONFIG_NUMERIC.startPant.default,
    pvpBestOf: CONFIG_NUMERIC.pvpBestOf.default,
    maxPlayers: CONFIG_NUMERIC.maxPlayers.default,
    wakeLockBeforeStart: false,
    disabledCardIds: [],
    cardCover: "card1",
    ...overrides,
  };
}

function mkPlayer(p) {
  return {
    id: p.id,
    name: p.name,
    color: p.color ?? "#111",
    isHost: p.isHost ?? false,
    ready: p.ready ?? true,
    levelIndex: p.levelIndex ?? 0,
    tileIndex: p.tileIndex ?? 0,
    gold: p.gold ?? 20,
    klunkar: p.klunkar ?? 0,
    hp: p.hp ?? 10,
    maxHp: p.maxHp ?? 10,
    xp: p.xp ?? 0,
    equipment: p.equipment ?? {},
    inventory: p.inventory ?? [],
    nextMoveBonus: p.nextMoveBonus ?? 0,
    nextCombatModifier: p.nextCombatModifier ?? 0,
    skippedTurns: p.skippedTurns ?? 0,
    eliminated: p.eliminated ?? false,
    leftVoluntarily: p.leftVoluntarily ?? false,
    stats: p.stats ?? { ...DEFAULT_PLAYER_SESSION_STATS },
    ...p,
  };
}

function playingState(players, pending = null, extra = {}) {
  return {
    phase: "playing",
    seed: 99,
    config: gameConfig(extra.config),
    roomCode: "TO01",
    players,
    turnOrder: players.map((pl) => pl.id),
    currentTurnIndex: extra.currentTurnIndex ?? 0,
    levels: [{ tiles: [{ id: "t0", type: "empty" }, { id: "t1", type: "empty" }] }],
    pending,
    log: [],
    logSeq: 0,
    winnerId: null,
    winnerName: null,
    gameStartedAt: Date.now(),
    turnDeadlineAt: extra.turnDeadlineAt ?? null,
    goldenBeerCarrierId: null,
    finalBossMonsterId: "store_narcissius",
    finalBossLivesRemaining: 3,
    bossFinaleExitStartedAt: null,
    treasureTaken: {},
    lastDiceRoll: null,
    lastDiceRollerId: null,
    sipNotices: [],
  };
}

describe("turn timeout + pvpBestOf config", () => {
  it("createEmptyLobby defaults: timeout off, pvpBestOf 1", () => {
    const state = createEmptyLobby("LOBBY");
    assert.equal(state.config.turnTimeoutEnabled, false);
    assert.equal(state.config.missedTurnsKickAfter, 0);
    assert.equal(state.config.pvpBestOf, PVP_BEST_OF);
    assert.equal(state.config.maxPlayers, 8);
    assert.equal(state.config.turnSeconds, 60);
    assert.equal(state.turnDeadlineAt, null);
  });

  it("isTurnTimeoutActionablePending for free turn states", () => {
    assert.equal(isTurnTimeoutActionablePending(null), true);
    assert.equal(isTurnTimeoutActionablePending({ type: "moveChoice", playerId: "p1", die: 3, baseDie: 3, from: { levelIndex: 0, tileIndex: 0 }, options: [] }), true);
    assert.equal(
      isTurnTimeoutActionablePending({
        type: "merchant",
        playerId: "p1",
        items: [],
      }),
      false,
    );
    assert.equal(
      isTurnTimeoutActionablePending({
        type: "encounterChoice",
        moverId: "p1",
        opponentIds: ["p2"],
        phase: "choosePvpOrTile",
      }),
      true,
    );
    assert.equal(
      isTurnTimeoutActionablePending({
        type: "combat",
        phase: "reactions",
        attackerId: "p1",
        monsterId: "goblin",
      }),
      false,
    );
  });

  it("applyTurnTimeoutIfDue skips while merchant pending", () => {
    const p1 = mkPlayer({ id: "p1", name: "A", isHost: true });
    const p2 = mkPlayer({ id: "p2", name: "B" });
    const state = playingState(
      [p1, p2],
      { type: "merchant", playerId: "p1", items: [] },
      {
        config: { turnTimeoutEnabled: true },
        turnDeadlineAt: Date.now() - 1000,
      },
    );
    const res = applyTurnTimeoutIfDue(state, Date.now());
    assert.equal(res, null);
    assert.equal(state.currentTurnIndex, 0);
  });

  it("applyTurnTimeoutIfDue ends idle turn and advances", () => {
    const p1 = mkPlayer({ id: "p1", name: "A", isHost: true });
    const p2 = mkPlayer({ id: "p2", name: "B" });
    const state = playingState([p1, p2], null, {
      config: { turnTimeoutEnabled: true, turnSeconds: 60 },
      turnDeadlineAt: Date.now() - 1000,
    });
    const res = applyTurnTimeoutIfDue(state, Date.now());
    assert.ok(res);
    assert.equal(res.state.currentTurnIndex, 1);
    assert.ok(res.state.turnDeadlineAt == null || res.state.turnDeadlineAt > Date.now() - 100);
    assert.ok(res.events.includes("turnTimeout"));
  });

  it("applyTurnTimeoutIfDue skips while combat pending", () => {
    const p1 = mkPlayer({ id: "p1", name: "A", isHost: true });
    const p2 = mkPlayer({ id: "p2", name: "B" });
    const state = playingState(
      [p1, p2],
      {
        type: "combat",
        phase: "reactions",
        attackerId: "p1",
        monsterId: "goblin",
        need: 5,
      },
      {
        config: { turnTimeoutEnabled: true },
        turnDeadlineAt: Date.now() - 1000,
      },
    );
    const res = applyTurnTimeoutIfDue(state, Date.now());
    assert.equal(res, null);
    assert.equal(state.currentTurnIndex, 0);
  });

  it("applyTurnTimeoutIfDue clears moveChoice and ends turn", () => {
    const p1 = mkPlayer({ id: "p1", name: "A", isHost: true });
    const p2 = mkPlayer({ id: "p2", name: "B" });
    const state = playingState(
      [p1, p2],
      {
        type: "moveChoice",
        playerId: "p1",
        die: 4,
        baseDie: 4,
        from: { levelIndex: 0, tileIndex: 0 },
        options: [
          {
            dir: "cw",
            target: { levelIndex: 0, tileIndex: 1 },
            tileType: "empty",
            label: "cw",
          },
          {
            dir: "ccw",
            target: { levelIndex: 0, tileIndex: 1 },
            tileType: "empty",
            label: "ccw",
          },
        ],
      },
      {
        config: { turnTimeoutEnabled: true },
        turnDeadlineAt: Date.now() - 1,
      },
    );
    const res = applyTurnTimeoutIfDue(state, Date.now());
    assert.ok(res);
    assert.equal(res.state.pending, null);
    assert.equal(res.state.currentTurnIndex, 1);
  });

  it("setConfig accepts pvpBestOf and turnTimeoutEnabled", () => {
    const state = createEmptyLobby("CFG01");
    state.players = [
      mkPlayer({ id: "host", name: "Host", isHost: true }),
      mkPlayer({ id: "p2", name: "B" }),
    ];
    const res = applyAction(state, {
      type: "setConfig",
      playerId: "host",
      pvpBestOf: 5,
      turnTimeoutEnabled: true,
      turnSeconds: 90,
      missedTurnsKickAfter: 3,
      maxPlayers: 4,
    });
    assert.equal(res.error, undefined);
    assert.equal(res.state.config.pvpBestOf, 5);
    assert.equal(res.state.config.turnTimeoutEnabled, true);
    assert.equal(res.state.config.turnSeconds, 90);
    assert.equal(res.state.config.missedTurnsKickAfter, 3);
    assert.equal(res.state.config.maxPlayers, 4);
  });

  it("lobbyAddPlayer rejects when at config.maxPlayers", () => {
    let state = createEmptyLobby("FULL4");
    state.config.maxPlayers = 4;
    for (let i = 0; i < 4; i++) {
      const res = lobbyAddPlayer(state, {
        id: `p${i}`,
        name: `P${i}`,
        isHost: i === 0,
      });
      assert.equal(res.error, undefined);
      state = res.state;
    }
    assert.equal(state.players.length, 4);
    const blocked = lobbyAddPlayer(state, { id: "p4", name: "P4", isHost: false });
    assert.equal(blocked.error, "Lobbyn är full");
    assert.equal(blocked.state.players.length, 4);
  });

  it("two consecutive timeouts with missedTurnsKickAfter 2 emit afkKick", () => {
    const p1 = mkPlayer({ id: "p1", name: "A", isHost: true });
    const p2 = mkPlayer({ id: "p2", name: "B" });
    let state = playingState([p1, p2], null, {
      config: { turnTimeoutEnabled: true, turnSeconds: 60, missedTurnsKickAfter: 2 },
      turnDeadlineAt: Date.now() - 1000,
    });
    const first = applyTurnTimeoutIfDue(state, Date.now());
    assert.ok(first);
    assert.equal(first.events.some((e) => e.startsWith("afkKick:")), false);
    assert.equal(first.state.players.find((p) => p.id === "p1")?.consecutiveMissedTurnTimeouts, 1);
    assert.equal(first.state.currentTurnIndex, 1);

    state = {
      ...first.state,
      currentTurnIndex: 0,
      turnDeadlineAt: Date.now() - 1000,
      pending: null,
    };
    const second = applyTurnTimeoutIfDue(state, Date.now());
    assert.ok(second);
    assert.ok(second.events.includes("afkKick:p1"));
    assert.equal(second.state.players.find((p) => p.id === "p1")?.consecutiveMissedTurnTimeouts, 2);
    assert.equal(second.state.currentTurnIndex, 0);
    assert.equal(second.state.turnDeadlineAt, null);
  });

  it("acting on a turn resets consecutive missed timeouts", () => {
    const p1 = mkPlayer({ id: "p1", name: "A", isHost: true, consecutiveMissedTurnTimeouts: 1 });
    const p2 = mkPlayer({ id: "p2", name: "B" });
    const afterAct = applyAction(
      playingState([p1, p2], null, {
        config: { turnTimeoutEnabled: true, missedTurnsKickAfter: 2 },
      }),
      { type: "sendEmote", playerId: "p1", emoteId: "happy" },
    );
    assert.equal(afterAct.error, undefined);
    assert.equal(afterAct.state.players.find((p) => p.id === "p1")?.consecutiveMissedTurnTimeouts, 0);

    const timed = applyTurnTimeoutIfDue(
      {
        ...afterAct.state,
        turnDeadlineAt: Date.now() - 1000,
        pending: null,
      },
      Date.now(),
    );
    assert.ok(timed);
    assert.equal(timed.events.some((e) => e.startsWith("afkKick:")), false);
    assert.equal(timed.state.players.find((p) => p.id === "p1")?.consecutiveMissedTurnTimeouts, 1);
  });

  it("missedTurnsKickAfter 0 never emits afkKick", () => {
    const p1 = mkPlayer({ id: "p1", name: "A", isHost: true, consecutiveMissedTurnTimeouts: 99 });
    const p2 = mkPlayer({ id: "p2", name: "B" });
    const state = playingState([p1, p2], null, {
      config: { turnTimeoutEnabled: true, missedTurnsKickAfter: 0 },
      turnDeadlineAt: Date.now() - 1000,
    });
    const res = applyTurnTimeoutIfDue(state, Date.now());
    assert.ok(res);
    assert.equal(res.events.some((e) => e.startsWith("afkKick:")), false);
    assert.equal(res.state.currentTurnIndex, 1);
    assert.equal(res.state.players.find((p) => p.id === "p1")?.consecutiveMissedTurnTimeouts, 100);
  });

  it("BvB pending uses config.pvpBestOf", () => {
    const attacker = mkPlayer({ id: "p1", name: "A", isHost: true, tileIndex: 1 });
    const defender = mkPlayer({ id: "p2", name: "B", tileIndex: 1 });
    const state = playingState(
      [attacker, defender],
      {
        type: "encounterChoice",
        moverId: "p1",
        opponentIds: ["p2"],
        phase: "choosePvpOrTile",
        tileType: "empty",
      },
      { config: { pvpBestOf: 3 } },
    );
    const res = applyAction(state, { type: "chooseEncounter", playerId: "p1", choice: "pvp" });
    assert.equal(res.error, undefined);
    assert.equal(res.state.pending?.type, "pvp");
    assert.equal(res.state.pending?.bestOf, 3);
  });
});
