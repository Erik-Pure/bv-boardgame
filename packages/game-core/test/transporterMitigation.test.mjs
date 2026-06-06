import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAction,
  computeMonsterDamage,
  CONFIG_NUMERIC,
  DEFAULT_PLAYER_SESSION_STATS,
  MONSTERS,
} from "../dist/index.js";

const transporter = MONSTERS.find((x) => x.id === "transporter");

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

function basePlaying(players, pending) {
  return {
    phase: "playing",
    seed: 77,
    config: gameConfig(),
    roomCode: "TR",
    players,
    turnOrder: players.map((p) => p.id),
    currentTurnIndex: 0,
    levels: [
      {
        tiles: [
          { id: "a", type: "empty" },
          { id: "b", type: "empty" },
          { id: "c", type: "combat", combatValue: 3 },
        ],
      },
      {
        tiles: [{ id: "d", type: "combat", combatValue: 4 }],
      },
    ],
    pending,
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
  };
}

describe("Transporter pant mitigation", () => {
  it("computeMonsterDamage returns 0 HP when mitigation is paid (ignores board level bonus)", () => {
    const p = mkPlayer({ id: "p1", name: "A", levelIndex: 2, hp: 10 });
    const full = computeMonsterDamage("transporter", p, 4, false);
    const mitigated = computeMonsterDamage("transporter", p, 4, true);
    assert.ok(full.damage > 0, "full loss should deal HP damage");
    assert.equal(mitigated.damage, 0);
  });

  it("chooseCombatHitMitigation with pant avoids HP damage on higher board level", () => {
    const p1 = mkPlayer({ id: "p1", name: "A", isHost: true, levelIndex: 1, tileIndex: 2, gold: 15, hp: 10 });
    const p2 = mkPlayer({ id: "p2", name: "B", isHost: false, levelIndex: 0, tileIndex: 0 });
    const state = basePlaying([p1, p2], {
      type: "combat",
      phase: "chooseHitMitigation",
      attackerId: "p1",
      levelIndex: 1,
      tileIndex: 0,
      monsterId: transporter.id,
      enemyName: transporter.name,
      need: transporter.strength + 1,
      needMod: 0,
      baseDamage: transporter.baseDamage,
      lossSipsOnLose: transporter.lossSipsOnLose,
      previewDie: 2,
      previewTotal: 2,
      previewNeed: transporter.strength + 1,
      previewWon: false,
      attackMods: {},
      reactors: [],
      rewardGold: transporter.rewardGold,
      rewardItems: transporter.rewardItems,
      rewardXp: transporter.rewardXp,
    });

    const r = applyAction(state, {
      type: "chooseCombatHitMitigation",
      playerId: "p1",
      choice: "sip",
    });
    assert.equal(r.error, undefined);
    const me = r.state.players.find((x) => x.id === "p1");
    assert.equal(me.gold, 5);
    assert.equal(me.hp, 10, "10 pant ska ge 0 HP-skada även på våning 2");
    assert.equal(r.state.pending?.type, "card");
    assert.equal(r.state.pending?.cardId, "combat_lose");
  });
});
