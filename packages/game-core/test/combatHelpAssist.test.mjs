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

function soloCombatReactionsClosed(players) {
  return {
    phase: "playing",
    seed: 42,
    config: gameConfig(),
    roomCode: "H",
    players,
    turnOrder: players.map((p) => p.id),
    currentTurnIndex: 0,
    levels: [{ tiles: [{ id: "t0", type: "combat", combatValue: skumBanan.strength }] }],
    pending: {
      type: "combat",
      phase: "reactions",
      attackerId: "p1",
      levelIndex: 0,
      tileIndex: 0,
      monsterId: skumBanan.id,
      enemyName: skumBanan.name,
      need: skumBanan.strength,
      needMod: 0,
      baseDamage: skumBanan.baseDamage,
      lossSipsOnLose: skumBanan.lossSipsOnLose ?? 0,
      attackMods: {},
      reactors: [],
      reacted: {},
      rewardGold: skumBanan.rewardGold ?? 4,
      rewardItems: skumBanan.rewardItems ?? 1,
      rewardXp: skumBanan.rewardXp ?? 1,
      reactionsDeadlineAt: Date.now() - 1000,
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

describe("combat help as dual-roll assist", () => {
  it("allows help request without positive help items", () => {
    const state = soloCombatReactionsClosed([
      mkPlayer({ id: "p1", name: "A", isHost: true, inventory: [] }),
      mkPlayer({ id: "p2", name: "B", inventory: [] }),
    ]);
    const r = applyAction(state, { type: "combatRequestHelp", playerId: "p1" });
    assert.equal(r.error, undefined);
    assert.equal(r.state.pending?.phase, "helpChooseHelper");
    assert.deepEqual(r.state.pending?.helpCandidateIds, ["p2"]);
  });

  it("free help sets assistId and returns to reactions for dual roll", () => {
    let state = soloCombatReactionsClosed([
      mkPlayer({ id: "p1", name: "A", isHost: true }),
      mkPlayer({ id: "p2", name: "B" }),
    ]);
    state = applyAction(state, { type: "combatRequestHelp", playerId: "p1" }).state;
    state = applyAction(state, { type: "combatChooseHelper", playerId: "p1", helperId: "p2" }).state;
    const r = applyAction(state, { type: "combatHelperDecision", playerId: "p2", decision: "free" });
    assert.equal(r.error, undefined);
    assert.equal(r.state.pending?.phase, "reactions");
    assert.equal(r.state.pending?.assistId, "p2");
    assert.equal(r.state.pending?.helpAccepted, true);
    assert.equal(r.state.pending?.helpContract, "free");
    assert.equal(r.state.pending?.helpUsedPositiveItem, true);
  });

  it("both fighters can roll after free help", () => {
    let state = soloCombatReactionsClosed([
      mkPlayer({ id: "p1", name: "A", isHost: true, nextForcedDieFace: 4 }),
      mkPlayer({ id: "p2", name: "B", nextForcedDieFace: 5 }),
    ]);
    state = applyAction(state, { type: "combatRequestHelp", playerId: "p1" }).state;
    state = applyAction(state, { type: "combatChooseHelper", playerId: "p1", helperId: "p2" }).state;
    state = applyAction(state, { type: "combatHelperDecision", playerId: "p2", decision: "free" }).state;

    const a = applyAction(state, { type: "combatRoll", playerId: "p1" });
    assert.equal(a.error, undefined);
    assert.equal(a.state.pending?.phase, "reactions");
    assert.ok(a.state.pending?.teamRolls?.p1);

    const b = applyAction(a.state, { type: "combatRoll", playerId: "p2" });
    assert.equal(b.error, undefined);
    assert.equal(b.state.pending?.phase, "rollPreview");
    assert.equal(typeof b.state.pending?.previewTotal, "number");
    assert.ok(b.state.pending?.previewTotal >= 4 + 5);
  });

  it("legacy helpAwaitCard promotes before combatRoll", () => {
    const state = soloCombatReactionsClosed([
      mkPlayer({ id: "p1", name: "A", isHost: true, nextForcedDieFace: 3 }),
      mkPlayer({ id: "p2", name: "B", nextForcedDieFace: 3 }),
    ]);
    state.pending = {
      ...state.pending,
      phase: "helpAwaitCard",
      helpSelectedHelperId: "p2",
      helpAccepted: true,
      helpContract: "pant",
      helpUsedPositiveItem: false,
    };
    const r = applyAction(state, { type: "combatRoll", playerId: "p1" });
    assert.equal(r.error, undefined);
    assert.equal(r.state.pending?.assistId, "p2");
    assert.equal(r.state.pending?.helpContract, "pant");
    assert.ok(r.state.pending?.teamRolls?.p1 || r.state.pending?.phase === "reactions" || r.state.pending?.phase === "rollPreview");
  });
});
