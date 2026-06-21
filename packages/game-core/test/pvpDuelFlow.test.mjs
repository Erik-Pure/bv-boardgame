import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAction,
  CONFIG_NUMERIC,
  createItemInstance,
  DEFAULT_PLAYER_SESSION_STATS,
  PVP_LOOT_MAX_PANT,
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
    ...(p.nextForcedDieFace != null ? { nextForcedDieFace: p.nextForcedDieFace } : {}),
    ...p,
  };
}

function playingState(players, pending, extra = {}) {
  return {
    phase: "playing",
    seed: 4242,
    config: gameConfig(),
    roomCode: "PVP",
    players,
    turnOrder: players.map((pl) => pl.id),
    currentTurnIndex: extra.currentTurnIndex ?? 0,
    levels: extra.levels ?? [
      {
        tiles: [
          { id: "t0", type: "empty" },
          { id: "t1", type: "empty" },
          { id: "t2", type: "combat", combatValue: 3 },
        ],
      },
    ],
    pending,
    log: [],
    logSeq: 0,
    winnerId: null,
    winnerName: null,
    goldenBeerCarrierId: null,
    finalBossMonsterId: "store_narcissius",
    finalBossLivesRemaining: 3,
    treasureTaken: {},
    lastDiceRoll: null,
    lastDiceRollerId: null,
    sipNotices: [],
    ...extra,
  };
}

function encounterState({ moverId = "p1", opponentIds = ["p2"], phase = "choosePvpOrTile", tileType = "empty" } = {}) {
  return playingState(
    [
      mkPlayer({ id: "p1", name: "A", isHost: true, tileIndex: 0 }),
      mkPlayer({ id: "p2", name: "B", isHost: false, tileIndex: 0 }),
    ],
    {
      type: "encounterChoice",
      moverId,
      opponentIds,
      phase,
      tileType,
    },
  );
}

function initPvpPending(phase = "preRoundItems", extra = {}) {
  return {
    type: "pvp",
    attackerId: "p1",
    defenderId: "p2",
    bestOf: 1,
    wins: { attacker: 0, defender: 0 },
    roundNumber: 1,
    pvpRound: 1,
    phase,
    roundItemReady: {},
    pvpAttackMods: {},
    rolls: {},
    roundResults: [],
    ...extra,
  };
}

function pvpDuelState({ pending, players, ...extra } = {}) {
  const attacker = mkPlayer({ id: "p1", name: "A", isHost: true, tileIndex: 0, ...(players?.attacker ?? {}) });
  const defender = mkPlayer({ id: "p2", name: "B", isHost: false, tileIndex: 0, ...(players?.defender ?? {}) });
  return playingState([attacker, defender], pending ?? initPvpPending(), extra);
}

function withForcedDice(state, facesByPlayerId) {
  return {
    ...state,
    players: state.players.map((pl) =>
      facesByPlayerId[pl.id] != null ? { ...pl, nextForcedDieFace: facesByPlayerId[pl.id] } : pl,
    ),
  };
}

function rollBothPvp(state, attackerFace, defenderFace) {
  let r = applyAction(withForcedDice(state, { p1: attackerFace }), {
    type: "pvpRoll",
    playerId: "p1",
  });
  assert.equal(r.error, undefined, r.error);
  r = applyAction(withForcedDice(r.state, { p2: defenderFace }), {
    type: "pvpRoll",
    playerId: "p2",
  });
  assert.equal(r.error, undefined, r.error);
  return r;
}

function ackBothRoundReveal(state) {
  let r = applyAction(state, { type: "pvpRoundRevealAck", playerId: "p1" });
  assert.equal(r.error, undefined, r.error);
  if (r.state.pending?.phase === "chooseLoot") return r;
  r = applyAction(r.state, { type: "pvpRoundRevealAck", playerId: "p2" });
  assert.equal(r.error, undefined, r.error);
  return r;
}

describe("BvB duel flow", () => {
  it("chooseEncounter pvp starts duel and auto-advances when no PvB items", () => {
    const r = applyAction(encounterState(), {
      type: "chooseEncounter",
      playerId: "p1",
      choice: "pvp",
    });
    assert.equal(r.error, undefined);
    assert.equal(r.state.pending?.type, "pvp");
    assert.equal(r.state.pending?.phase, "awaitingRolls");
    assert.equal(r.state.pending?.attackerId, "p1");
    assert.equal(r.state.pending?.defenderId, "p2");
  });

  it("chooseEncounter pvp with multiple opponents enters choosePvpOpponent", () => {
    const state = playingState(
      [
        mkPlayer({ id: "p1", name: "A", isHost: true, tileIndex: 0 }),
        mkPlayer({ id: "p2", name: "B", isHost: false, tileIndex: 1 }),
        mkPlayer({ id: "p3", name: "C", isHost: false, tileIndex: 1 }),
      ],
      {
        type: "encounterChoice",
        moverId: "p1",
        opponentIds: ["p2", "p3"],
        phase: "choosePvpOrTile",
        tileType: "empty",
      },
    );
    const pick = applyAction(state, { type: "chooseEncounter", playerId: "p1", choice: "pvp" });
    assert.equal(pick.error, undefined);
    assert.equal(pick.state.pending?.type, "encounterChoice");
    assert.equal(pick.state.pending?.phase, "choosePvpOpponent");

    const start = applyAction(pick.state, {
      type: "choosePvpOpponent",
      playerId: "p1",
      opponentId: "p3",
    });
    assert.equal(start.error, undefined);
    assert.equal(start.state.pending?.type, "pvp");
    assert.equal(start.state.pending?.defenderId, "p3");
    assert.equal(start.state.pending?.phase, "awaitingRolls");
  });

  it("chooseEncounter tile resolves landing without BvB", () => {
    const r = applyAction(encounterState({ tileType: "combat" }), {
      type: "chooseEncounter",
      playerId: "p1",
      choice: "tile",
    });
    assert.equal(r.error, undefined);
    assert.notEqual(r.state.pending?.type, "encounterChoice");
    assert.notEqual(r.state.pending?.type, "pvp");
  });

  it("pvpRoundReady advances to awaitingRolls when both have PvB items", () => {
    const lightBeer = createItemInstance("light_beer", "lb1");
    const folkBeer = createItemInstance("folk_beer", "fb1");
    const state = pvpDuelState({
      players: {
        attacker: { inventory: [lightBeer] },
        defender: { inventory: [folkBeer] },
      },
    });
    assert.equal(state.pending?.phase, "preRoundItems");

    let r = applyAction(state, { type: "pvpRoundReady", playerId: "p1", ready: true });
    assert.equal(r.error, undefined);
    assert.equal(r.state.pending?.phase, "preRoundItems");

    r = applyAction(r.state, { type: "pvpRoundReady", playerId: "p2", ready: true });
    assert.equal(r.error, undefined);
    assert.equal(r.state.pending?.phase, "awaitingRolls");
  });

  it("pvpRoll: higher total wins and enters roundReveal before loot", () => {
    const state = pvpDuelState({ pending: initPvpPending("awaitingRolls") });
    const r = rollBothPvp(state, 6, 2);
    assert.equal(r.state.pending?.type, "pvp");
    assert.equal(r.state.pending?.phase, "roundReveal");
    assert.equal(r.state.pending?.roundRevealLead, "chooseLoot");
    assert.equal(r.state.pending?.winnerId, "p1");
    assert.equal(r.state.pending?.loserId, "p2");
    assert.equal(r.state.pending?.wins?.attacker, 1);
    assert.deepEqual(r.state.pending?.resolvedTotals, { attackerTotal: 6, defenderTotal: 2 });
  });

  it("pvpRoll tie keeps same round number after both reveal acks", () => {
    const state = pvpDuelState({ pending: initPvpPending("awaitingRolls") });
    let r = rollBothPvp(state, 4, 4);
    assert.equal(r.state.pending?.phase, "roundReveal");
    assert.equal(r.state.pending?.roundRevealLead, "nextRound");
    assert.equal(r.state.pending?.nextRoundNumber, 1);
    assert.equal(r.state.pending?.roundResults?.at(-1)?.tie, true);

    r = ackBothRoundReveal(r.state);
    assert.equal(r.state.pending?.roundNumber, 1);
    assert.equal(r.state.pending?.pvpRound, 1);
    // Tomma förråd → auto-klar i förberedelse → direkt till awaitingRolls igen.
    assert.equal(r.state.pending?.phase, "awaitingRolls");
    assert.deepEqual(r.state.pending?.rolls, {});
  });

  it("pvpRoundRevealAck both required before chooseLoot", () => {
    const state = pvpDuelState({ pending: initPvpPending("awaitingRolls") });
    const rolled = rollBothPvp(state, 5, 1);
    const oneAck = applyAction(rolled.state, { type: "pvpRoundRevealAck", playerId: "p1" });
    assert.equal(oneAck.error, undefined);
    assert.equal(oneAck.state.pending?.phase, "roundReveal");

    const bothAck = applyAction(oneAck.state, { type: "pvpRoundRevealAck", playerId: "p2" });
    assert.equal(bothAck.error, undefined);
    assert.equal(bothAck.state.pending?.phase, "chooseLoot");
    assert.equal(bothAck.state.pending?.winnerId, "p1");
  });

  it("pvpLootChoice gold transfers pant capped at PVP_LOOT_MAX_PANT", () => {
    const state = pvpDuelState({
      players: {
        attacker: { gold: 5 },
        defender: { gold: 25 },
      },
      pending: initPvpPending("chooseLoot", {
        winnerId: "p1",
        loserId: "p2",
        wins: { attacker: 1, defender: 0 },
        resolvedTotals: { attackerTotal: 6, defenderTotal: 2 },
      }),
    });
    const r = applyAction(state, { type: "pvpLootChoice", playerId: "p1", choice: "gold" });
    assert.equal(r.error, undefined);
    assert.equal(r.state.pending, null);
    const winner = r.state.players.find((p) => p.id === "p1");
    const loser = r.state.players.find((p) => p.id === "p2");
    assert.equal(winner.gold, 5 + PVP_LOOT_MAX_PANT);
    assert.equal(loser.gold, 25 - PVP_LOOT_MAX_PANT);
    assert.equal(winner.stats.pvpMatchWins, 1);
    assert.equal(loser.stats.pvpMatchLosses, 1);
    const notice = r.state.sipNotices?.find((n) => n.recipientId === "p2");
    assert.ok(notice);
    assert.equal(notice.noticeKind, "duel_loss");
  });

  it("pvpLootChoice sip grants klunk to loser", () => {
    const state = pvpDuelState({
      pending: initPvpPending("chooseLoot", {
        winnerId: "p1",
        loserId: "p2",
        wins: { attacker: 1, defender: 0 },
      }),
    });
    const r = applyAction(state, { type: "pvpLootChoice", playerId: "p1", choice: "sip" });
    assert.equal(r.error, undefined);
    const loser = r.state.players.find((p) => p.id === "p2");
    assert.equal(loser.klunkar, 1);
    assert.ok((r.state.sipNotices ?? []).some((n) => n.recipientId === "p2"));
  });

  it("only winner may choose loot", () => {
    const state = pvpDuelState({
      pending: initPvpPending("chooseLoot", {
        winnerId: "p1",
        loserId: "p2",
      }),
    });
    const r = applyAction(state, { type: "pvpLootChoice", playerId: "p2", choice: "gold" });
    assert.equal(r.error, "Endast vinnaren kan välja byte");
  });

  it("pvpRoll rejects duplicate roll from same player", () => {
    const state = pvpDuelState({ pending: initPvpPending("awaitingRolls") });
    const first = applyAction(withForcedDice(state, { p1: 3 }), {
      type: "pvpRoll",
      playerId: "p1",
    });
    assert.equal(first.error, undefined);
    const again = applyAction(first.state, { type: "pvpRoll", playerId: "p1" });
    assert.equal(again.error, "You already rolled");
  });

  it("full duel from rolls through loot ends pending and advances turn", () => {
    const state = pvpDuelState({
      pending: initPvpPending("awaitingRolls"),
      currentTurnIndex: 0,
    });
    let r = rollBothPvp(state, 6, 1);
    r = ackBothRoundReveal(r.state);
    assert.equal(r.state.pending?.phase, "chooseLoot");
    r = applyAction(r.state, { type: "pvpLootChoice", playerId: "p1", choice: "damage" });
    assert.equal(r.error, undefined);
    assert.equal(r.state.pending, null);
    assert.equal(r.state.currentTurnIndex, 1);
    const loser = r.state.players.find((p) => p.id === "p2");
    assert.equal(loser.hp, 8);
  });
});
