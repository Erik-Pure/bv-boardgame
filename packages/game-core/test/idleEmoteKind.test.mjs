import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONFIG_NUMERIC, DEFAULT_PLAYER_SESSION_STATS, resolveIdleEmoteKind } from "../dist/index.js";

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
  };
}

function playingState(players, extra = {}) {
  return {
    phase: "playing",
    seed: 1,
    config: gameConfig(),
    roomCode: "T",
    players,
    turnOrder: players.map((x) => x.id),
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
    playerEmoteBursts: [],
    ...extra,
  };
}

describe("resolveIdleEmoteKind", () => {
  it("BvB-åskådare", () => {
    const a = mkPlayer({ id: "a", name: "Anna", isHost: true });
    const b = mkPlayer({ id: "b", name: "Bertil", tileIndex: 1 });
    const c = mkPlayer({ id: "c", name: "Cecilia", tileIndex: 2 });
    const pending = {
      type: "pvp",
      attackerId: "a",
      defenderId: "b",
      phase: "awaitingRolls",
      rolls: {},
    };
    const state = playingState([a, b, c], { pending });
    const kind = resolveIdleEmoteKind(state, c, pending, false);
    assert.equal(kind?.type, "spectatingPvp");
    assert.equal(kind.attackerName, "Anna");
    assert.equal(kind.defenderName, "Bertil");
  });

  it("reaktion pass även vid isMyTurn", () => {
    const a = mkPlayer({ id: "a", name: "Anna", isHost: true });
    const b = mkPlayer({ id: "b", name: "Bertil", tileIndex: 1 });
    const pending = {
      type: "combat",
      phase: "reactions",
      attackerId: "a",
      enemyName: "Monster",
      need: 5,
      reactors: ["b"],
      reacted: { b: "pass" },
    };
    const state = playingState([a, b], { pending });
    const kind = resolveIdleEmoteKind(state, b, pending, true);
    assert.equal(kind?.type, "waitingCombatContinue");
  });

  it("aktiv stridsslagare utan pass", () => {
    const a = mkPlayer({ id: "a", name: "Anna", isHost: true });
    const pending = {
      type: "combat",
      phase: "reactions",
      attackerId: "a",
      enemyName: "Monster",
      need: 5,
      reactors: [],
    };
    const state = playingState([a], { pending });
    const kind = resolveIdleEmoteKind(state, a, pending, true);
    assert.equal(kind, null);
  });

  it("eliminerad spelare", () => {
    const a = mkPlayer({ id: "a", name: "Anna", isHost: true });
    const out = mkPlayer({ id: "b", name: "Bertil", eliminated: true, hp: 0, tileIndex: 1 });
    const state = playingState([a, out]);
    const kind = resolveIdleEmoteKind(state, out, null, false);
    assert.equal(kind, null);
  });
});
