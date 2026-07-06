import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAction,
  CONFIG_NUMERIC,
  DEFAULT_PLAYER_SESSION_STATS,
  MONSTERS,
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
    ready: true,
    levelIndex: 0,
    tileIndex: 0,
    gold: p.gold ?? 20,
    klunkar: p.klunkar ?? 0,
    hp: 10,
    maxHp: 10,
    xp: 0,
    equipment: p.equipment ?? {},
    inventory: [],
    nextMoveBonus: 0,
    nextCombatModifier: p.nextCombatModifier ?? 0,
    skippedTurns: 0,
    stats: { ...DEFAULT_PLAYER_SESSION_STATS },
    ...(p.brewerAttackBonus != null ? { brewerAttackBonus: p.brewerAttackBonus } : {}),
    ...(p.nextForcedDieFace != null ? { nextForcedDieFace: p.nextForcedDieFace } : {}),
  };
}

/** Lagstrid i reactions-fasen: p1 angriper, p2 assisterar. */
function teamCombatReactionsState(opts) {
  return {
    phase: "playing",
    seed: 7,
    config: gameConfig(),
    roomCode: "TEAM",
    players: [
      mkPlayer({ id: "p1", name: "A", isHost: true, ...opts.p1 }),
      mkPlayer({ id: "p2", name: "B", ...opts.p2 }),
    ],
    turnOrder: ["p1", "p2"],
    currentTurnIndex: 0,
    levels: [{ tiles: [{ id: "t0", type: "combat", combatValue: skumBanan.strength }] }],
    pending: {
      type: "combat",
      phase: "reactions",
      attackerId: "p1",
      assistId: "p2",
      teamBattleRequired: true,
      levelIndex: 0,
      tileIndex: 0,
      monsterId: skumBanan.id,
      enemyName: skumBanan.name,
      need: skumBanan.strength,
      needMod: 0,
      baseDamage: skumBanan.baseDamage,
      lossSipsOnLose: skumBanan.lossSipsOnLose,
      attackMods: opts.attackMods ?? {},
      reactors: [],
      reacted: {},
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

function rollBoth(state, rollActions) {
  let s = state;
  for (const a of rollActions) {
    const r = applyAction(s, a);
    assert.equal(r.error, undefined, `combatRoll ${a.playerId}: ${r.error ?? ""}`);
    s = r.state;
  }
  assert.equal(s.pending?.type, "combat");
  assert.equal(s.pending?.phase, "rollPreview");
  return s;
}

describe("lagstrid: tärningstotaler och preview-fält", () => {
  it("previewTotal = båda tärningarna + utrustning + föremålsmods + nextCombatModifier", () => {
    const state = teamCombatReactionsState({
      p1: {
        equipment: { weapon: { name: "Svärd", power: 1 }, armor: { name: "Rock", combatBonus: 1 } },
        brewerAttackBonus: 1,
        nextCombatModifier: -2,
        nextForcedDieFace: 4,
      },
      p2: {
        equipment: { weapon: { name: "Klubba", power: 2 } },
        nextForcedDieFace: 5,
      },
      attackMods: { p1: 2, p2: 1 },
    });
    const s = rollBoth(state, [
      { type: "combatRoll", playerId: "p1" },
      { type: "combatRoll", playerId: "p2" },
    ]);
    const pend = s.pending;
    // p1: 4 (tärning) + 1 (vapen) + 1 (rustning) + 1 (bryggnivå) + 2 (föremål) − 2 (Lengräddad-typ) = 7
    assert.equal(pend.previewPrBase, 7);
    // p2: 5 (tärning) + 2 (vapen) + 1 (föremål) = 8
    assert.equal(pend.previewAssistRoll, 8);
    assert.equal(pend.previewTotal, 15);
    assert.equal(pend.previewDie, 4);
    assert.equal(pend.previewBroDie, 5);
    // Temp-modifieraren är förbrukad.
    assert.equal(s.players.find((p) => p.id === "p1").nextCombatModifier, 0);
  });

  it("angriparens vapen-sipbonus syns i preview även när assisten slår sist", () => {
    const state = teamCombatReactionsState({
      p1: {
        equipment: {
          weapon: { name: "Ölsejdel", power: 1, sipAttackBonus: 2, sipWeaponBonusKlunks: 1 },
        },
        nextForcedDieFace: 6,
      },
      p2: { nextForcedDieFace: 3 },
    });
    const s = rollBoth(state, [
      { type: "combatRoll", playerId: "p1", useSipWeaponBonus: true },
      { type: "combatRoll", playerId: "p2" },
    ]);
    const pend = s.pending;
    assert.equal(pend.previewUsedSipWeaponBonus, true);
    assert.equal(pend.previewSipWeaponBonusValue, 2);
    // p1: 6 + 1 + 2 = 9, p2: 3 → 12
    assert.equal(pend.previewTotal, 12);
  });

  it("båda med vapen-sipbonus: preview-värdet är summan", () => {
    const state = teamCombatReactionsState({
      p1: {
        equipment: {
          weapon: { name: "Ölsejdel", power: 1, sipAttackBonus: 2, sipWeaponBonusKlunks: 1 },
        },
        nextForcedDieFace: 2,
      },
      p2: {
        equipment: {
          weapon: { name: "Ölsejdel", power: 1, sipAttackBonus: 2, sipWeaponBonusKlunks: 1 },
        },
        nextForcedDieFace: 3,
      },
    });
    const s = rollBoth(state, [
      { type: "combatRoll", playerId: "p1", useSipWeaponBonus: true },
      { type: "combatRoll", playerId: "p2", useSipWeaponBonus: true },
    ]);
    const pend = s.pending;
    assert.equal(pend.previewUsedSipWeaponBonus, true);
    assert.equal(pend.previewSipWeaponBonusValue, 4);
    // p1: 2 + 1 + 2 = 5, p2: 3 + 1 + 2 = 6 → 11
    assert.equal(pend.previewTotal, 11);
  });

  it("etta blir bara auto-förlust när båda tärningarna visar 1", () => {
    const state = teamCombatReactionsState({
      p1: { nextForcedDieFace: 1 },
      p2: { equipment: { weapon: { name: "Klubba", power: 2 } }, nextForcedDieFace: 5 },
    });
    const s = rollBoth(state, [
      { type: "combatRoll", playerId: "p1" },
      { type: "combatRoll", playerId: "p2" },
    ]);
    assert.notEqual(s.pending.previewCritFailOnOne, true);
    assert.equal(s.pending.previewTotal, 8);
  });
});
