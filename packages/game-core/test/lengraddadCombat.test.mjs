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
    ...p,
  };
}

function combatReactionsState(attacker, reactor, extra = {}) {
  return {
    phase: "playing",
    seed: 7,
    config: gameConfig(),
    roomCode: "T",
    players: [attacker, reactor],
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
      ...extra,
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

describe("lengraddad combat restrictions", () => {
  it("attacker cannot play lengraddad in own PvE fight", () => {
    const item = createItemInstance("lengraddad", "inst_len");
    const attacker = mkPlayer({ id: "p1", name: "A", isHost: true, inventory: [item] });
    const reactor = mkPlayer({ id: "p2", name: "B", inventory: [] });
    const state = combatReactionsState(attacker, reactor);

    const r = applyAction(state, {
      type: "useItem",
      playerId: "p1",
      instanceId: "inst_len",
    });
    assert.match(String(r.error), /sabotera din egen strid|Lengräddad kan inte spelas/i);
  });

  it("assist partner cannot play lengraddad in team fight", () => {
    const item = createItemInstance("lengraddad", "inst_len");
    const attacker = mkPlayer({ id: "p1", name: "A", isHost: true, inventory: [] });
    const assist = mkPlayer({ id: "p2", name: "B", inventory: [item] });
    const reactor = mkPlayer({ id: "p3", name: "C", inventory: [] });
    const state = {
      ...combatReactionsState(attacker, reactor, { assistId: "p2", reactors: ["p3"] }),
      players: [attacker, assist, reactor],
    };

    const r = applyAction(state, {
      type: "useItem",
      playerId: "p2",
      instanceId: "inst_len",
    });
    assert.equal(r.error, "Lengräddad kan inte spelas i strider du deltar i.");
  });

  it("third party can debuff attacker during reactions", () => {
    const item = createItemInstance("lengraddad", "inst_len");
    const attacker = mkPlayer({ id: "p1", name: "A", isHost: true, inventory: [] });
    const reactor = mkPlayer({ id: "p2", name: "B", inventory: [item] });
    const state = combatReactionsState(attacker, reactor);

    const r = applyAction(state, {
      type: "useItem",
      playerId: "p2",
      instanceId: "inst_len",
    });
    assert.equal(r.error, undefined);
    assert.equal(r.state.players[0].nextCombatModifier, -2);
  });

  it("cannot target self in BvB pre-round", () => {
    const item = createItemInstance("lengraddad", "inst_len");
    const attacker = mkPlayer({ id: "p1", name: "A", isHost: true, inventory: [item] });
    const defender = mkPlayer({ id: "p2", name: "B", inventory: [] });
    const state = {
      phase: "playing",
      seed: 1,
      config: gameConfig(),
      roomCode: "T",
      players: [attacker, defender],
      turnOrder: ["p1", "p2"],
      currentTurnIndex: 0,
      levels: [{ tiles: [{ id: "e0", type: "empty" }] }],
      pending: {
        type: "pvp",
        phase: "preRoundItems",
        attackerId: "p1",
        defenderId: "p2",
        roundItemReady: {},
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

    const r = applyAction(state, {
      type: "useItem",
      playerId: "p1",
      instanceId: "inst_len",
      targetPlayerId: "p1",
    });
    assert.equal(r.error, "Du kan inte välja dig själv");
  });
});
