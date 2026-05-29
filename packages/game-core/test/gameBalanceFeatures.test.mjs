import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAction,
  CONFIG_NUMERIC,
  DEFAULT_PLAYER_SESSION_STATS,
  equipmentDamageNegate,
  generateLevels,
  monsterCombatEquipmentAttackBonus,
  MONSTERS,
  PVP_BEST_OF,
  PVP_LOOT_MAX_PANT,
  pvpLootPantStealAmount,
} from "../dist/index.js";
import { tryOpenBrewerPerkChoice } from "../dist/brewerPerk.js";

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
    ...p,
  };
}

describe("game balance features", () => {
  it("PVP_BEST_OF defaults to 1", () => {
    assert.equal(PVP_BEST_OF, 1);
  });

  it("BvB pant-byte capped at PVP_LOOT_MAX_PANT", () => {
    assert.equal(PVP_LOOT_MAX_PANT, 10);
    assert.equal(pvpLootPantStealAmount(3), 3);
    assert.equal(pvpLootPantStealAmount(10), 10);
    assert.equal(pvpLootPantStealAmount(25), 10);
  });

  it("folke_bengtsson has higher rewardGold and at least one reward item", () => {
    const m = MONSTERS.find((x) => x.id === "folke_bengtsson");
    assert.ok(m);
    assert.equal(m.rewardGold, 5);
    assert.ok(m.rewardItems >= 1);
  });

  it("generated boards have no merchant tiles on level 0", () => {
    const levels = generateLevels(42, 2, { levelCount: 3, boardSize: "default" });
    for (const level of levels) {
      const merchants = level.tiles.filter((t) => t.type === "merchant");
      assert.equal(merchants.length, 0, "merchant tile should not appear on new boards");
    }
  });

  it("chooseMerchant opens shop without rolling when player has 5+ pant", () => {
    const p1 = mkPlayer({ id: "p1", name: "A", tileIndex: 2, gold: 5 });
    const state = {
      phase: "playing",
      seed: 1,
      config: gameConfig(),
      roomCode: "GB",
      players: [p1],
      turnOrder: ["p1"],
      currentTurnIndex: 0,
      levels: [{ tiles: [{ id: "a", type: "empty" }, { id: "b", type: "empty" }, { id: "c", type: "empty" }] }],
      pending: null,
      log: [],
      winnerId: null,
      winnerName: null,
      goldenBeerCarrierId: null,
      finalBossMonsterId: null,
      finalBossLivesRemaining: null,
      bossFinaleExitStartedAt: null,
      treasureTaken: {},
    };
    const res = applyAction(state, { type: "chooseMerchant", playerId: "p1" });
    assert.ok(!res.error, res.error);
    assert.equal(res.state.players[0].tileIndex, 2);
    assert.equal(res.state.pending?.type, "merchant");
    assert.equal(res.state.pending?.playerId, "p1");
    assert.ok((res.state.pending?.items?.length ?? 0) > 0);
  });

  it("chooseMerchant rejected below 5 pant", () => {
    const p1 = mkPlayer({ id: "p1", name: "A", gold: 4 });
    const state = {
      phase: "playing",
      seed: 1,
      config: gameConfig(),
      roomCode: "GB",
      players: [p1],
      turnOrder: ["p1"],
      currentTurnIndex: 0,
      levels: [{ tiles: [{ id: "a", type: "empty" }] }],
      pending: null,
      log: [],
      winnerId: null,
      winnerName: null,
      goldenBeerCarrierId: null,
      finalBossMonsterId: null,
      finalBossLivesRemaining: null,
      bossFinaleExitStartedAt: null,
      treasureTaken: {},
    };
    const res = applyAction(state, { type: "chooseMerchant", playerId: "p1" });
    assert.ok(res.error);
    assert.equal(res.state.pending, null);
  });

  it("tryOpenBrewerPerkChoice preempts own card pending until perk is chosen", () => {
    const p1 = mkPlayer({
      id: "p1",
      name: "A",
      xp: 120,
      brewerPerkLevelsClaimed: 0,
      pendingBrewerPerkLevels: 1,
    });
    const cardPending = {
      type: "card",
      playerId: "p1",
      cardId: "combat_lose",
      kind: "combat",
      title: "Förlust",
      text: "",
      artKey: "combat/lose",
    };
    const state = {
      phase: "playing",
      seed: 2,
      config: gameConfig(),
      roomCode: "GB",
      players: [p1],
      turnOrder: ["p1"],
      currentTurnIndex: 0,
      levels: [{ tiles: [{ id: "a", type: "empty" }] }],
      pending: cardPending,
      log: [],
      winnerId: null,
      winnerName: null,
      goldenBeerCarrierId: null,
      finalBossMonsterId: null,
      finalBossLivesRemaining: null,
      bossFinaleExitStartedAt: null,
      treasureTaken: {},
    };
    const opened = tryOpenBrewerPerkChoice(state, "p1");
    assert.equal(opened, true);
    assert.equal(state.pending?.type, "brewerPerkChoice");
    assert.equal(state.deferredPending?.type, "card");
    const res = applyAction(state, { type: "brewerPerkDecision", playerId: "p1", choice: "attack" });
    assert.ok(!res.error, res.error);
    assert.equal(res.state.pending?.type, "card");
    assert.equal(res.state.deferredPending ?? null, null);
    assert.equal(res.state.players[0].brewerAttackBonus, 1);
  });

  it("brewerPerkDecision applies attack bonus and clears pending", () => {
    const p1 = mkPlayer({
      id: "p1",
      name: "A",
      xp: 120,
      brewerPerkLevelsClaimed: 0,
      pendingBrewerPerkLevels: 1,
    });
    const state = {
      phase: "playing",
      seed: 2,
      config: gameConfig(),
      roomCode: "GB",
      players: [p1],
      turnOrder: ["p1"],
      currentTurnIndex: 0,
      levels: [{ tiles: [{ id: "a", type: "empty" }] }],
      pending: { type: "brewerPerkChoice", playerId: "p1", levelsRemaining: 1 },
      log: [],
      winnerId: null,
      winnerName: null,
      goldenBeerCarrierId: null,
      finalBossMonsterId: null,
      finalBossLivesRemaining: null,
      bossFinaleExitStartedAt: null,
      treasureTaken: {},
    };
    const res = applyAction(state, { type: "brewerPerkDecision", playerId: "p1", choice: "attack" });
    assert.ok(!res.error, res.error);
    assert.equal(res.state.pending, null);
    const pl = res.state.players[0];
    assert.equal(pl.brewerAttackBonus, 1);
    assert.equal(pl.brewerPerkLevelsClaimed, 1);
    assert.equal(monsterCombatEquipmentAttackBonus(pl), 1);
  });

  it("brewerPerkDecision shield increases damage negate", () => {
    const p1 = mkPlayer({ id: "p1", name: "A", brewerPerkLevelsClaimed: 0, pendingBrewerPerkLevels: 1 });
    const state = {
      phase: "playing",
      seed: 3,
      config: gameConfig(),
      roomCode: "GB",
      players: [p1],
      turnOrder: ["p1"],
      currentTurnIndex: 0,
      levels: [{ tiles: [{ id: "a", type: "empty" }] }],
      pending: { type: "brewerPerkChoice", playerId: "p1", levelsRemaining: 1 },
      log: [],
      winnerId: null,
      winnerName: null,
      goldenBeerCarrierId: null,
      finalBossMonsterId: null,
      finalBossLivesRemaining: null,
      bossFinaleExitStartedAt: null,
      treasureTaken: {},
    };
    const res = applyAction(state, { type: "brewerPerkDecision", playerId: "p1", choice: "shield" });
    assert.ok(!res.error, res.error);
    assert.equal(res.state.players[0].brewerShieldBonus, 1);
    assert.equal(equipmentDamageNegate(res.state.players[0]), 1);
  });
});
