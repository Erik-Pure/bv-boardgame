import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAction,
  CONFIG_NUMERIC,
  DEFAULT_PLAYER_SESSION_STATS,
  normalizeLoadedGameState,
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

function playingState(players, extra = {}) {
  return {
    phase: "playing",
    seed: 42,
    config: gameConfig(),
    roomCode: "BD",
    players,
    turnOrder: players.map((p) => p.id),
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
    lastDiceRoll: null,
    lastDiceRollerId: null,
    sipNotices: [],
    playerEmoteBursts: [],
    playerKlunkBursts: [],
    ...extra,
  };
}

describe("brewerDown queue", () => {
  it("normalizeLoadedGameState surfaces brewerDown for 0 HP player (2-player)", () => {
    const state = playingState([
      mkPlayer({ id: "p1", name: "A", hp: 0 }),
      mkPlayer({ id: "p2", name: "B", color: "#222", isHost: false }),
    ]);
    normalizeLoadedGameState(state);
    assert.equal(state.phase, "playing");
    assert.equal(state.pending?.type, "brewerDown");
    assert.equal(state.pending.playerId, "p1");
  });

  it("brewerDown queues even when another player has offTurn levelUpOffer", () => {
    const state = playingState(
      [
        mkPlayer({ id: "p1", name: "A", hp: 0 }),
        mkPlayer({ id: "p2", name: "B", color: "#222", isHost: false, xp: 120 }),
      ],
      {
        offTurnPersonalPending: {
          type: "levelUpOffer",
          playerId: "p2",
          targetLevelIndex: 1,
          costs: { gold: 0, sips: 0 },
        },
      },
    );
    normalizeLoadedGameState(state);
    assert.equal(state.pending?.type, "brewerDown");
    assert.equal(state.pending.playerId, "p1");
  });

  it("retry (starta om) nollställer alla permanenta bryggnivå-buffar", () => {
    const state = playingState(
      [
        mkPlayer({
          id: "p1",
          name: "A",
          hp: 0,
          xp: 250,
          brewerAttackBonus: 2,
          brewerShieldBonus: 1,
          brewerPvpBonus: 1,
          brewerHpBonus: 4,
          brewerItemCardBonus: 2,
          brewerPerkLevelsClaimed: 6,
          pendingBrewerPerkLevels: 1,
          maxHp: 14,
        }),
        mkPlayer({ id: "p2", name: "B", color: "#222", isHost: false }),
      ],
      { pending: { type: "brewerDown", playerId: "p1" } },
    );
    const r = applyAction(state, { type: "brewerDownChoice", playerId: "p1", choice: "retry" });
    assert.equal(r.error, undefined);
    const p1 = r.state.players.find((p) => p.id === "p1");
    assert.equal(p1.brewerAttackBonus, 0);
    assert.equal(p1.brewerShieldBonus, 0);
    assert.equal(p1.brewerPvpBonus, 0);
    assert.equal(p1.brewerHpBonus, 0);
    assert.equal(p1.brewerItemCardBonus, 0);
    assert.equal(p1.brewerPerkLevelsClaimed, 0);
    assert.equal(p1.pendingBrewerPerkLevels, 0);
    assert.equal(p1.xp, 0);
    assert.equal(p1.maxHp, state.config.maxHp);
    assert.equal(p1.hp, p1.maxHp);
  });

  it("clears victim offTurn perk prompt before brewerDown", () => {
    const state = playingState(
      [
        mkPlayer({ id: "p1", name: "A", hp: 0, pendingBrewerPerkLevels: 1 }),
        mkPlayer({ id: "p2", name: "B", color: "#222", isHost: false }),
      ],
      {
        offTurnPersonalPending: {
          type: "brewerPerkChoice",
          playerId: "p1",
          levelsRemaining: 1,
        },
      },
    );
    normalizeLoadedGameState(state);
    assert.equal(state.pending?.type, "brewerDown");
    assert.equal(state.pending.playerId, "p1");
    assert.equal(state.offTurnPersonalPending, null);
  });
});
