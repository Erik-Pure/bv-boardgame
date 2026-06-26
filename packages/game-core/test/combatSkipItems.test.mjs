import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAction,
  classifyTableToastMessage,
  createItemInstance,
  formatLogEntry,
  LOG_MESSAGE_KEYS,
  localizeTableToastLog,
} from "../dist/index.js";

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
    stats: p.stats ?? {
      knockdownCount: 0,
      monsterCombatWins: 0,
      monsterCombatLosses: 0,
      pvpMatchWins: 0,
      pvpMatchLosses: 0,
      itemsPlayed: 0,
      combatOnesRolled: 0,
      pvpOnesRolled: 0,
      sabotageItemsPlayed: 0,
      helpedCombatWins: 0,
      highestCombatRollTotal: 0,
      highestPvpRollTotal: 0,
      pantSpent: 0,
      pantReceived: 0,
      klunkarGained: 0,
      klunkarGiven: 0,
    },
    ...p,
  };
}

function combatIntroState(itemId, instanceId) {
  const attacker = mkPlayer({
    id: "p1",
    name: "Vera",
    isHost: true,
    inventory: [createItemInstance(itemId, instanceId)],
    gold: 20,
  });
  return {
    phase: "playing",
    seed: 42,
    config: {
      turnSeconds: 60,
      reactionSeconds: 30,
      gameMode: "bossKill",
      difficulty: "folkol",
      hardcore: false,
      boardSize: "default",
      levelCount: 3,
      maxHp: 10,
      startPant: 10,
      wakeLockBeforeStart: false,
      disabledCardIds: [],
      cardCover: "card1",
    },
    roomCode: "SKIP",
    players: [attacker],
    turnOrder: ["p1"],
    currentTurnIndex: 0,
    levels: [{ tiles: [{ id: "t0", type: "start" }, { id: "t1", type: "combat", combatValue: 3 }] }],
    pending: {
      type: "combat",
      phase: "enemyIntro",
      attackerId: "p1",
      levelIndex: 0,
      tileIndex: 1,
      monsterId: "skum_banan",
      enemyName: "Kapten Interrobang",
      reactors: [],
    },
    log: [],
    logSeq: 0,
    winnerId: null,
    winnerName: null,
    goldenBeerCarrierId: null,
    finalBossMonsterId: null,
    finalBossLivesRemaining: null,
    treasureTaken: {},
    lastDiceRoll: null,
    lastDiceRollerId: null,
    sipNotices: [],
  };
}

function assertSkipToast(entry, locale) {
  const message = localizeTableToastLog(formatLogEntry(entry, locale), locale);
  assert.equal(classifyTableToastMessage(message), "vaska", message);
}

function lastLogByKey(state, key) {
  return [...(state.log ?? [])].reverse().find((e) => e.key === key);
}

describe("combat skip items", () => {
  it("early_night logs, classifies as toast, and keeps table reveal after turn ends", () => {
    const state = combatIntroState("early_night", "en1");
    const r = applyAction(state, { type: "useItem", playerId: "p1", instanceId: "en1" });
    assert.equal(r.error, undefined);
    assert.equal(r.state.pending, null);
    const entry = lastLogByKey(r.state, LOG_MESSAGE_KEYS.itemVaskaSkip);
    assert.ok(entry);
    assertSkipToast(entry, "sv");
    assertSkipToast(entry, "en");
    assert.deepEqual(r.state.tableItemPlayReveals, [
      { seq: 1, itemId: "early_night", actorId: "p1", targetPlayerId: undefined },
    ]);
  });

  it("bribes logs, classifies as toast, and keeps table reveal after turn ends", () => {
    const state = combatIntroState("bribes", "br1");
    const r = applyAction(state, { type: "useItem", playerId: "p1", instanceId: "br1" });
    assert.equal(r.error, undefined);
    assert.equal(r.state.pending, null);
    const entry = lastLogByKey(r.state, LOG_MESSAGE_KEYS.itemBribeSkip);
    assert.ok(entry);
    assertSkipToast(entry, "sv");
    assertSkipToast(entry, "en");
    assert.deepEqual(r.state.tableItemPlayReveals, [
      { seq: 1, itemId: "bribes", actorId: "p1", targetPlayerId: undefined },
    ]);
    assert.equal(r.state.players[0].gold, 10);
  });
});
