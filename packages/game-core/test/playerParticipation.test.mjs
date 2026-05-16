import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAction,
  CONFIG_NUMERIC,
  createItemInstance,
  DEFAULT_PLAYER_SESSION_STATS,
  isPlayerActiveInMatch,
  isPlayerOnBoard,
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
  };
}

describe("playerParticipation helpers", () => {
  it("isPlayerActiveInMatch kräver aktiv deltagare", () => {
    const active = mkPlayer({ id: "a", name: "A", isHost: true });
    assert.equal(isPlayerActiveInMatch(active), true);
    assert.equal(isPlayerOnBoard(active), true);
    const elim = mkPlayer({ id: "e", name: "E", isHost: false, eliminated: true });
    assert.equal(isPlayerActiveInMatch(elim), false);
    assert.equal(isPlayerOnBoard(elim), false);
    const left = mkPlayer({ id: "l", name: "L", isHost: false, leftVoluntarily: true });
    assert.equal(isPlayerActiveInMatch(left), false);
    assert.equal(isPlayerOnBoard(left), false);
    const down = mkPlayer({ id: "d", name: "D", isHost: false, hp: 0 });
    assert.equal(isPlayerActiveInMatch(down), false);
    assert.equal(isPlayerOnBoard(down), true);
  });
});

describe("eliminated players cannot be targeted", () => {
  it("chooseCombatTeammate avvisar eliminerad medkämpe", () => {
    const p1 = mkPlayer({ id: "p1", name: "A", isHost: true });
    const p2 = mkPlayer({ id: "p2", name: "B", isHost: false, tileIndex: 1, eliminated: true });
    const p3 = mkPlayer({ id: "p3", name: "C", isHost: false, tileIndex: 2 });
    const state = {
      phase: "playing",
      seed: 1,
      config: gameConfig(),
      roomCode: "T",
      players: [p1, p2, p3],
      turnOrder: ["p1", "p2", "p3"],
      currentTurnIndex: 0,
      levels: [{ tiles: [{ id: "e0", type: "empty" }, { id: "e1", type: "empty" }, { id: "e2", type: "empty" }] }],
      pending: {
        type: "combat",
        phase: "chooseTeammate",
        attackerId: "p1",
        levelIndex: 0,
        tileIndex: 0,
        monsterId: "pimp",
        enemyName: "Pimp",
        need: 8,
        needMod: 0,
        baseDamage: 3,
        lossSipsOnLose: 1,
        teamBattleRequired: true,
        teamBattleBonusGold: 2,
        attackMods: {},
        reactors: [],
        reacted: {},
        rewardGold: 8,
        rewardItems: 3,
        rewardXp: 80,
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
      type: "chooseCombatTeammate",
      playerId: "p1",
      teammateId: "p2",
    });
    assert.match(String(r.error ?? ""), /ute ur spelet/);
    assert.equal(r.state.pending?.assistId, undefined);
  });

  it("useItem shuffle mot eliminerad spelare ger fel", () => {
    const sh = createItemInstance("shuffle", "inst_shuffle");
    const p1 = mkPlayer({
      id: "p1",
      name: "A",
      isHost: true,
      gold: 25,
      inventory: [sh],
    });
    const p2 = mkPlayer({
      id: "p2",
      name: "B",
      isHost: false,
      tileIndex: 1,
      eliminated: true,
    });
    const state = {
      phase: "playing",
      seed: 1,
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
    const r = applyAction(state, {
      type: "useItem",
      playerId: "p1",
      instanceId: "inst_shuffle",
      targetPlayerId: "p2",
    });
    assert.match(String(r.error ?? ""), /inte tillgängligt/);
    assert.equal((p1.inventory ?? []).length, 1);
  });
});
