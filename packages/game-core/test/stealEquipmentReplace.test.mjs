import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAction,
  CONFIG_NUMERIC,
  DEFAULT_PLAYER_SESSION_STATS,
  createItemInstance,
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
    ready: true,
    levelIndex: 0,
    tileIndex: 0,
    gold: p.gold ?? 20,
    klunkar: 0,
    hp: 10,
    maxHp: 10,
    xp: p.xp ?? 0,
    equipment: p.equipment ?? {},
    inventory: p.inventory ?? [],
    nextMoveBonus: 0,
    nextCombatModifier: 0,
    skippedTurns: 0,
    stats: { ...DEFAULT_PLAYER_SESSION_STATS },
  };
}

function twoPlayerTurnState(p1, p2) {
  return {
    phase: "playing",
    seed: 42,
    config: gameConfig(),
    roomCode: "T",
    players: [p1, p2],
    turnOrder: ["p1", "p2"],
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
  };
}

function combatReactionsState(reactor, attacker, extraPlayers = []) {
  return {
    phase: "playing",
    seed: 7,
    config: gameConfig(),
    roomCode: "T",
    players: [attacker, reactor, ...extraPlayers],
    turnOrder: [attacker.id, reactor.id],
    currentTurnIndex: 0,
    levels: [{ tiles: [{ id: "c0", type: "combat", combatValue: 1 }] }],
    pending: {
      type: "combat",
      phase: "reactions",
      attackerId: attacker.id,
      levelIndex: 0,
      tileIndex: 0,
      monsterId: "skum_banan",
      enemyName: "Test",
      need: 4,
      needMod: 0,
      baseDamage: 1,
      lossSipsOnLose: 1,
      attackMods: {},
      reactors: [reactor.id],
      reacted: {},
      rewardGold: 1,
      rewardItems: 0,
      rewardXp: 1,
    },
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
  };
}

describe("steal equipment replace when thief slot occupied", () => {
  it("rigged_game offers replace when thief already has gear in that slot", () => {
    const rigged = createItemInstance("rigged_game", "inst_rigged");
    const thief = mkPlayer({
      id: "p1",
      name: "T",
      isHost: true,
      gold: 10,
      inventory: [rigged],
      equipment: { weapon: { name: "Mitt vapen", power: 1 } },
    });
    const victim = mkPlayer({
      id: "p2",
      name: "V",
      equipment: { weapon: { name: "Stulet vapen", power: 3 } },
    });
    const state = twoPlayerTurnState(thief, victim);

    const r = applyAction(state, {
      type: "useItem",
      playerId: "p1",
      instanceId: "inst_rigged",
      targetPlayerId: "p2",
    });
    assert.equal(r.error, undefined);
    assert.equal(r.state.pending?.type, "equipmentReplaceOffer");
    assert.equal(r.state.pending.playerId, "p1");
    assert.equal(r.state.pending.slot, "weapon");
    assert.equal(r.state.pending.returnVictimId, "p2");
    assert.equal(r.state.pending.newName, "Stulet vapen");

    const t = r.state.players.find((x) => x.id === "p1");
    const v = r.state.players.find((x) => x.id === "p2");
    assert.equal(t?.equipment.weapon?.name, "Mitt vapen");
    assert.equal(v?.equipment.weapon, undefined);

    const decline = applyAction(r.state, {
      type: "equipmentReplaceDecision",
      playerId: "p1",
      accept: false,
    });
    assert.equal(decline.error, undefined);
    assert.equal(decline.state.pending, null);
    const t2 = decline.state.players.find((x) => x.id === "p1");
    const v2 = decline.state.players.find((x) => x.id === "p2");
    assert.equal(t2?.equipment.weapon?.name, "Mitt vapen");
    assert.equal(v2?.equipment.weapon, undefined);
  });

  it("rigged_game accept steal does not end thief turn or grant XP", () => {
    const rigged = createItemInstance("rigged_game", "inst_accept");
    const thief = mkPlayer({
      id: "p1",
      name: "T",
      isHost: true,
      gold: 10,
      xp: 50,
      inventory: [rigged],
      equipment: { weapon: { name: "Mitt vapen", power: 1 } },
    });
    const victim = mkPlayer({
      id: "p2",
      name: "V",
      equipment: { weapon: { name: "Stulet vapen", power: 3 } },
    });
    const state = twoPlayerTurnState(thief, victim);

    const r = applyAction(state, {
      type: "useItem",
      playerId: "p1",
      instanceId: "inst_accept",
      targetPlayerId: "p2",
    });
    assert.equal(r.error, undefined);
    const accept = applyAction(r.state, {
      type: "equipmentReplaceDecision",
      playerId: "p1",
      accept: true,
    });
    assert.equal(accept.error, undefined);
    const t = accept.state.players.find((x) => x.id === "p1");
    assert.ok(t);
    assert.equal(t.xp, 50);
    assert.equal(accept.state.currentTurnIndex, 0);
    assert.equal(accept.state.offTurnPersonalPending, undefined);
    assert.equal(t.equipment.weapon?.name, "Stulet vapen");
  });

  it("decline destroys stolen gear via escrow when pending loses incomingPiece", () => {
    const rigged = createItemInstance("rigged_game", "inst_rigged2");
    const thief = mkPlayer({
      id: "p1",
      name: "T",
      isHost: true,
      gold: 10,
      inventory: [rigged],
      equipment: { weapon: { name: "Mitt vapen", power: 1 } },
    });
    const victim = mkPlayer({
      id: "p2",
      name: "V",
      equipment: { weapon: { name: "Stulet vapen", power: 3 } },
    });
    const state = twoPlayerTurnState(thief, victim);
    const r = applyAction(state, {
      type: "useItem",
      playerId: "p1",
      instanceId: "inst_rigged2",
      targetPlayerId: "p2",
    });
    assert.equal(r.error, undefined);
    assert.ok(r.state.stolenEquipmentEscrow);
    const pending = { ...r.state.pending };
    delete pending.incomingPiece;
    const broken = { ...r.state, pending };
    const decline = applyAction(broken, {
      type: "equipmentReplaceDecision",
      playerId: "p1",
      accept: false,
    });
    assert.equal(decline.error, undefined);
    const v2 = decline.state.players.find((x) => x.id === "p2");
    assert.equal(v2?.equipment.weapon, undefined);
    assert.equal(decline.state.stolenEquipmentEscrow, undefined);
  });

  it("not_my_round in combat reactions offers replace when slot occupied", () => {
    const steal = createItemInstance("not_my_round", "inst_steal");
    const attacker = mkPlayer({
      id: "p1",
      name: "A",
      isHost: true,
      equipment: { weapon: { name: "Batchvapen", power: 2 } },
    });
    const reactor = mkPlayer({
      id: "p2",
      name: "R",
      inventory: [steal],
      equipment: { weapon: { name: "Reaktorvapen", power: 1 } },
    });
    const state = combatReactionsState(reactor, attacker);

    const r = applyAction(state, {
      type: "useItem",
      playerId: "p2",
      instanceId: "inst_steal",
      targetPlayerId: "p1",
    });
    assert.equal(r.error, undefined);
    assert.equal(r.state.pending?.type, "combat");
    assert.equal(r.state.pending.postReactionEquipmentOffer?.playerId, "p2");
    assert.equal(r.state.pending.postReactionEquipmentOffer?.slot, "weapon");
    assert.equal(r.state.pending.postReactionEquipmentOffer?.returnVictimId, "p1");

    const accept = applyAction(r.state, {
      type: "equipmentReplaceDecision",
      playerId: "p2",
      accept: true,
    });
    assert.equal(accept.error, undefined);
    const reactorAfter = accept.state.players.find((x) => x.id === "p2");
    const attackerAfter = accept.state.players.find((x) => x.id === "p1");
    assert.equal(reactorAfter?.equipment.weapon?.name, "Batchvapen");
    assert.equal(attackerAfter?.equipment.weapon, undefined);
    assert.equal(accept.state.pending.postReactionEquipmentOffer, undefined);
  });

  it("not_my_round decline destroys stolen gear (victim keeps empty slot)", () => {
    const steal = createItemInstance("not_my_round", "inst_steal2");
    const attacker = mkPlayer({
      id: "p1",
      name: "A",
      isHost: true,
      equipment: { weapon: { name: "Batchvapen", power: 2 } },
    });
    const reactor = mkPlayer({
      id: "p2",
      name: "R",
      inventory: [steal],
      equipment: { weapon: { name: "Reaktorvapen", power: 1 } },
    });
    const state = combatReactionsState(reactor, attacker);
    const r = applyAction(state, {
      type: "useItem",
      playerId: "p2",
      instanceId: "inst_steal2",
      targetPlayerId: "p1",
    });
    assert.equal(r.error, undefined);
    const decline = applyAction(r.state, {
      type: "equipmentReplaceDecision",
      playerId: "p2",
      accept: false,
    });
    assert.equal(decline.error, undefined);
    const attackerAfter = decline.state.players.find((x) => x.id === "p1");
    const reactorAfter = decline.state.players.find((x) => x.id === "p2");
    assert.equal(attackerAfter?.equipment.weapon, undefined);
    assert.equal(reactorAfter?.equipment.weapon?.name, "Reaktorvapen");
  });
});
