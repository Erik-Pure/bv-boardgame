import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyAction, CONFIG_NUMERIC } from "../dist/index.js";
import {
  applyBrewerPerkChoice,
  availableBrewerPerkChoices,
  brewerPerkPickCount,
  consumeExhaustedBrewerPerkLevels,
  tryOpenBrewerPerkChoice,
} from "../dist/brewerPerk.js";

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
    stats: p.stats,
    brewerAttackBonus: p.brewerAttackBonus,
    brewerShieldBonus: p.brewerShieldBonus,
    brewerPvpBonus: p.brewerPvpBonus,
    brewerHpBonus: p.brewerHpBonus,
    brewerItemCardBonus: p.brewerItemCardBonus,
    brewerPerkLevelsClaimed: p.brewerPerkLevelsClaimed,
    pendingBrewerPerkLevels: p.pendingBrewerPerkLevels,
  };
}

function perkChoiceState(p1, extra = {}) {
  return {
    phase: "playing",
    seed: 2,
    config: gameConfig(),
    roomCode: "CAP",
    players: [p1],
    turnOrder: ["p1"],
    currentTurnIndex: 0,
    levels: [{ tiles: [{ id: "a", type: "empty" }] }],
    pending: { type: "brewerPerkChoice", playerId: "p1", levelsRemaining: p1.pendingBrewerPerkLevels ?? 1 },
    log: [],
    winnerId: null,
    winnerName: null,
    goldenBeerCarrierId: null,
    finalBossMonsterId: null,
    finalBossLivesRemaining: null,
    bossFinaleExitStartedAt: null,
    treasureTaken: {},
    ...extra,
  };
}

describe("brewerPerkCap", () => {
  it("brewerPerkPickCount räknar HP-val som brewerHpBonus / 2", () => {
    const p = mkPlayer({ id: "p1", name: "A", brewerHpBonus: 4 });
    assert.equal(brewerPerkPickCount(p, "hp"), 2);
  });

  it("fyra attack-val: tre lyckas, fjärde avvisas", () => {
    const p1 = mkPlayer({
      id: "p1",
      name: "A",
      xp: 1380,
      brewerPerkLevelsClaimed: 0,
      pendingBrewerPerkLevels: 5,
    });
    let state = perkChoiceState(p1);

    for (let i = 0; i < 3; i++) {
      const res = applyAction(state, { type: "brewerPerkDecision", playerId: "p1", choice: "attack" });
      assert.ok(!res.error, res.error);
      state = res.state;
      assert.equal(state.players[0].brewerAttackBonus, i + 1);
    }
    assert.equal(availableBrewerPerkChoices(state.players[0]).includes("attack"), false);

    const blocked = applyAction(state, { type: "brewerPerkDecision", playerId: "p1", choice: "attack" });
    assert.ok(blocked.error);
    assert.match(blocked.error, /maxad \(3\/3\)/);
    assert.equal(blocked.state.players[0].brewerAttackBonus, 3);
  });

  it("availableBrewerPerkChoices utesluter kategori vid 3 val", () => {
    const p = mkPlayer({
      id: "p1",
      name: "A",
      brewerAttackBonus: 3,
      brewerShieldBonus: 1,
    });
    const choices = availableBrewerPerkChoices(p);
    assert.equal(choices.includes("attack"), false);
    assert.equal(choices.includes("shield"), true);
    assert.equal(choices.length, 4);
  });

  it("consumeExhaustedBrewerPerkLevels nollställer pending utan bonus när alla kategorier är maxade", () => {
    const p = mkPlayer({
      id: "p1",
      name: "A",
      xp: 2180,
      brewerPerkLevelsClaimed: 5,
      pendingBrewerPerkLevels: 2,
      brewerAttackBonus: 3,
      brewerShieldBonus: 3,
      brewerPvpBonus: 3,
      brewerItemCardBonus: 3,
      brewerHpBonus: 6,
    });
    const consumed = consumeExhaustedBrewerPerkLevels(p);
    assert.equal(consumed, 2);
    assert.equal(p.pendingBrewerPerkLevels, 0);
    assert.equal(p.brewerPerkLevelsClaimed, 7);
    assert.equal(p.brewerAttackBonus, 3);
  });

  it("tryOpenBrewerPerkChoice auto-konsumerar utan modal när alla kategorier är maxade", () => {
    const p1 = mkPlayer({
      id: "p1",
      name: "A",
      xp: 2180,
      brewerPerkLevelsClaimed: 5,
      pendingBrewerPerkLevels: 2,
      brewerAttackBonus: 3,
      brewerShieldBonus: 3,
      brewerPvpBonus: 3,
      brewerItemCardBonus: 3,
      brewerHpBonus: 6,
    });
    const state = {
      phase: "playing",
      seed: 2,
      config: gameConfig(),
      roomCode: "CAP",
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
    const opened = tryOpenBrewerPerkChoice(state, "p1");
    assert.equal(opened, false);
    assert.equal(state.pending, null);
    assert.equal(state.players[0].pendingBrewerPerkLevels, 0);
  });

  it("applyBrewerPerkChoice returnerar false vid maxad kategori", () => {
    const p = mkPlayer({ id: "p1", name: "A", brewerAttackBonus: 3 });
    assert.equal(applyBrewerPerkChoice(p, "attack", 10), false);
    assert.equal(p.brewerAttackBonus, 3);
  });
});
