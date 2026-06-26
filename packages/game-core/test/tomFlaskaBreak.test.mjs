import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAction,
  CONFIG_NUMERIC,
  DEFAULT_PLAYER_SESSION_STATS,
  MONSTERS,
  syncPlastbackEmptyBottleSynergy,
  TOM_FLASKA_WEAPON_NAME,
} from "../dist/index.js";

const skumBanan = MONSTERS.find((x) => x.id === "skum_banan");

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
    stats: p.stats ?? { ...DEFAULT_PLAYER_SESSION_STATS },
    ...p,
  };
}

function combatWinPreview(attacker, assistId) {
  const p1 = mkPlayer({ id: "p1", name: "A", isHost: true, ...attacker });
  const players = [p1];
  if (assistId) {
    players.push(mkPlayer({ id: "p2", name: "B", isHost: false, equipment: assistId.equipment ?? {} }));
  }
  return {
    phase: "playing",
    seed: 9,
    config: gameConfig(),
    roomCode: "TF",
    players,
    turnOrder: players.map((pl) => pl.id),
    currentTurnIndex: 0,
    levels: [{ tiles: [{ id: "t0", type: "combat", combatValue: 3 }] }],
    pending: {
      type: "combat",
      phase: "rollPreview",
      attackerId: "p1",
      assistId: assistId ? "p2" : undefined,
      levelIndex: 0,
      tileIndex: 0,
      monsterId: skumBanan.id,
      enemyName: skumBanan.name,
      need: skumBanan.strength,
      needMod: 0,
      baseDamage: skumBanan.baseDamage,
      lossSipsOnLose: skumBanan.lossSipsOnLose,
      previewDie: 6,
      previewTotal: 11,
      previewNeed: skumBanan.strength,
      previewWon: true,
      attackMods: {},
      reactors: [],
      rewardGold: skumBanan.rewardGold,
      rewardItems: 0,
      rewardXp: skumBanan.rewardXp,
    },
    log: [],
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

describe("Tom flaska break on win", () => {
  it("breaks after win even when breakOnWin flag was missing on saved weapon", () => {
    const state = combatWinPreview({
      equipment: { weapon: { name: TOM_FLASKA_WEAPON_NAME, power: 5 } },
    });
    const r = applyAction(state, { type: "combatRollAck", playerId: "p1" });
    assert.equal(r.error, undefined);
    assert.equal(r.state.players[0].equipment.weapon, undefined);
    assert.match(r.state.log.map((l) => l.message).join("\n"), /Tom flaska går sönder/);
  });

  it("breaks on next win after Plastback is removed and synergy resyncs", () => {
    const p = mkPlayer({
      id: "p1",
      name: "A",
      isHost: true,
      equipment: {
        weapon: { name: TOM_FLASKA_WEAPON_NAME, power: 5, breakOnWin: true, breakWinsRemaining: 4 },
        accessory: { name: "Plastback", plastbackPackRemaining: 4 },
      },
    });
    p.equipment.accessory = undefined;
    syncPlastbackEmptyBottleSynergy(p);
    assert.equal(p.equipment.weapon?.breakWinsRemaining, undefined);

    const state = combatWinPreview({ equipment: p.equipment });
    const r = applyAction(state, { type: "combatRollAck", playerId: "p1" });
    assert.equal(r.state.players[0].equipment.weapon, undefined);
  });

  it("breaks beer bro assist weapon after shared win", () => {
    const state = combatWinPreview(
      { equipment: { weapon: { name: "Folköl", power: 1 } } },
      { equipment: { weapon: { name: TOM_FLASKA_WEAPON_NAME, power: 5, breakOnWin: true } } },
    );
    const r = applyAction(state, { type: "combatRollAck", playerId: "p1" });
    assert.equal(r.error, undefined);
    assert.equal(r.state.players.find((x) => x.id === "p2")?.equipment.weapon, undefined);
  });
});
