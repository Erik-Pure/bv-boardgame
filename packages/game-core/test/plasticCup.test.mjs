import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAction,
  CONFIG_NUMERIC,
  createItemInstance,
  DEFAULT_PLAYER_SESSION_STATS,
  effectiveItemPlayGoldCost,
  itemPlayGoldCost,
  monsterCombatEquipmentAttackBonus,
  playerHasCombatReactionPlayableItem,
  playerHasFreeInventoryItemPlay,
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
    xp: 0,
    equipment: p.equipment ?? {},
    inventory: p.inventory ?? [],
    nextMoveBonus: 0,
    nextCombatModifier: 0,
    skippedTurns: 0,
    stats: { ...DEFAULT_PLAYER_SESSION_STATS },
    ...p,
  };
}

function combatReactionsState(attacker, extra = {}) {
  return {
    phase: "playing",
    seed: 7,
    config: gameConfig(),
    roomCode: "T",
    players: [attacker],
    turnOrder: [attacker.id],
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

describe("Plastmugg", () => {
  it("monsterCombatEquipmentAttackBonus ger −3 attack", () => {
    const p = mkPlayer({
      id: "p1",
      name: "A",
      equipment: { weapon: { name: "Plastmugg", power: -3, freeInventoryItemPlay: true } },
    });
    assert.equal(monsterCombatEquipmentAttackBonus(p), -3);
  });

  it("effectiveItemPlayGoldCost nollställer pantkostnad med Plastmugg", () => {
    const bare = mkPlayer({ id: "p1", name: "A" });
    const cup = mkPlayer({
      id: "p1",
      name: "A",
      equipment: { weapon: { name: "Plastmugg", power: -3, freeInventoryItemPlay: true } },
    });
    assert.equal(itemPlayGoldCost("manopositiv"), 10);
    assert.equal(effectiveItemPlayGoldCost(bare, "manopositiv"), 10);
    assert.equal(effectiveItemPlayGoldCost(cup, "manopositiv"), 0);
    assert.equal(effectiveItemPlayGoldCost(cup, "shuffle"), 0);
    assert.equal(playerHasFreeInventoryItemPlay(cup), true);
  });

  it("manopositiv i strid kostar inget pant med Plastmugg utrustad", () => {
    const item = createItemInstance("manopositiv", "inst_mp");
    const attacker = mkPlayer({
      id: "p1",
      name: "A",
      isHost: true,
      gold: 0,
      inventory: [item],
      equipment: { weapon: { name: "Plastmugg", power: -3, freeInventoryItemPlay: true } },
    });
    const state = combatReactionsState(attacker);
    const r = applyAction(state, {
      type: "useItem",
      playerId: "p1",
      instanceId: "inst_mp",
    });
    assert.equal(r.error, undefined);
    assert.equal(r.state.players[0].gold, 0);
    assert.equal(r.state.pending?.attackMods?.[attacker.id], 4);
  });

  it("playerHasCombatReactionPlayableItem: 0 pant + Plastmugg + Manopositiv", () => {
    const item = createItemInstance("manopositiv", "inst_mp");
    const attacker = mkPlayer({
      id: "p1",
      name: "A",
      gold: 0,
      inventory: [item],
      equipment: { weapon: { name: "Plastmugg", power: -3, freeInventoryItemPlay: true } },
    });
    const pending = combatReactionsState(attacker).pending;
    assert.equal(playerHasCombatReactionPlayableItem(attacker, pending), true);
  });
});
