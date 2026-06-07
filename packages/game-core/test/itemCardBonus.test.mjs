import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adjustFlatItemValue,
  applyAction,
  combatItemAttackModForPlayer,
  CONFIG_NUMERIC,
  createItemInstance,
  DEFAULT_PLAYER_SESSION_STATS,
  equipmentItemCardBonus,
  flatItemUseAmount,
  playerTotalItemCardBonus,
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
    hp: p.hp ?? 5,
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

describe("itemCardBonus", () => {
  it("adjustFlatItemValue preserves sign direction", () => {
    assert.equal(adjustFlatItemValue(3, 1), 4);
    assert.equal(adjustFlatItemValue(-2, 1), -3);
    assert.equal(adjustFlatItemValue(0, 2), 0);
    assert.equal(adjustFlatItemValue(2, 0), 2);
  });

  it("combatItemAttackModForPlayer applies bonus before board scaling", () => {
    assert.equal(combatItemAttackModForPlayer("weak_beer", 0, 1), -3);
    assert.equal(combatItemAttackModForPlayer("light_beer", 0, 1), 2);
    assert.equal(combatItemAttackModForPlayer("folk_beer", 0, 1), 3);
    assert.equal(combatItemAttackModForPlayer("manopositiv", 0, 1), 5);
    assert.equal(combatItemAttackModForPlayer("get_lucky", 0, 2), 6);
    assert.equal(combatItemAttackModForPlayer("weak_beer", 0, 0), -2);
  });

  it("flatItemUseAmount boosts heal and pant items", () => {
    assert.equal(flatItemUseAmount("healing_potion", 0), 3);
    assert.equal(flatItemUseAmount("healing_potion", 2), 5);
    assert.equal(flatItemUseAmount("coin_purse", 1), 5);
  });

  it("equipmentItemCardBonus stacks armor, helmet and accessory", () => {
    const p = mkPlayer({
      id: "p1",
      name: "A",
      equipment: {
        armor: { name: "Hawaiiskojorta", bonusHp: 0, itemCardBonus: 2 },
        helmet: { name: "Pannband", itemCardBonus: 1 },
        accessory: { name: "Anteckningsblock", itemCardBonus: 1 },
      },
    });
    assert.equal(equipmentItemCardBonus(p), 4);
    assert.equal(playerTotalItemCardBonus({ ...p, brewerItemCardBonus: 1 }), 5);
    assert.equal(flatItemUseAmount("healing_potion", playerTotalItemCardBonus(p)), 7);
  });

  it("brewerPerkDecision items increases bonus and healing potion heal", () => {
    const hp = createItemInstance("healing_potion", "inst_hp");
    let state = {
      phase: "playing",
      roomCode: "T",
      config: gameConfig(),
      players: [
        mkPlayer({
          id: "p1",
          name: "A",
          isHost: true,
          hp: 5,
          inventory: [hp],
          pendingBrewerPerkLevels: 1,
          brewerPerkLevelsClaimed: 0,
        }),
      ],
      turnOrder: ["p1"],
      currentTurnIndex: 0,
      pending: { type: "brewerPerkChoice", playerId: "p1", levelsRemaining: 1 },
      levels: [{ tiles: [{ id: "t0", type: "empty" }] }],
      log: [],
      logSeq: 0,
    };

    const picked = applyAction(state, { type: "brewerPerkDecision", playerId: "p1", choice: "items" });
    assert.equal(picked.error, undefined);
    assert.equal(picked.state.players[0].brewerItemCardBonus, 1);

    state = {
      ...picked.state,
      pending: null,
      inventory: [hp],
    };
    state.players[0].inventory = [hp];

    const used = applyAction(state, {
      type: "useItem",
      playerId: "p1",
      instanceId: "inst_hp",
    });
    assert.equal(used.error, undefined);
    assert.equal(used.state.players[0].hp, 9);
  });

  it("light_beer i strid får itemCardBonus på positiv attackmod", () => {
    const item = createItemInstance("light_beer", "inst_lb");
    const attacker = mkPlayer({
      id: "p1",
      name: "A",
      isHost: true,
      inventory: [item],
      brewerItemCardBonus: 1,
    });
    const reactor = mkPlayer({ id: "p2", name: "B", inventory: [] });
    const state = {
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
        reactors: [attacker.id],
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
    const r = applyAction(state, {
      type: "useItem",
      playerId: "p1",
      instanceId: "inst_lb",
    });
    assert.equal(r.error, undefined);
    assert.equal(r.state.pending?.attackMods?.[attacker.id], 2);
  });

  it("manopositiv i strid får itemCardBonus på positiv attackmod", () => {
    const item = createItemInstance("manopositiv", "inst_mp");
    const attacker = mkPlayer({
      id: "p1",
      name: "A",
      isHost: true,
      gold: 20,
      inventory: [item],
      brewerItemCardBonus: 1,
    });
    const reactor = mkPlayer({ id: "p2", name: "B", inventory: [] });
    const state = {
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
        reactors: [attacker.id],
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
    const r = applyAction(state, {
      type: "useItem",
      playerId: "p1",
      instanceId: "inst_mp",
    });
    assert.equal(r.error, undefined);
    assert.equal(r.state.pending?.attackMods?.[attacker.id], 5);
  });
});
