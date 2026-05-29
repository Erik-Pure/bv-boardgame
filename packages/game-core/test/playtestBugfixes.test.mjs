import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAction,
  CONFIG_NUMERIC,
  DEFAULT_PLAYER_SESSION_STATS,
  EQUIPMENT_CATALOG,
  getCard,
  MONSTERS,
} from "../dist/index.js";
import { resolveEventCardOnLand } from "../dist/cards/runtime.js";
import { createRng } from "../dist/rng.js";

const rabarbapappa = MONSTERS.find((x) => x.id === "rabarbapappa");
const skumBanan = MONSTERS.find((x) => x.id === "skum_banan");
const fourClover = EQUIPMENT_CATALOG.find((x) => x.id === "ex_four_clover");

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
    ...(p.nextForcedDieFace != null ? { nextForcedDieFace: p.nextForcedDieFace } : {}),
  };
}

function basePlaying(players, pending) {
  return {
    phase: "playing",
    seed: 99,
    config: gameConfig(),
    roomCode: "PT",
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
    ],
    pending,
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

function withForcedDie(state, playerId, face) {
  return {
    ...state,
    players: state.players.map((pl) =>
      pl.id === playerId ? { ...pl, nextForcedDieFace: face } : pl,
    ),
  };
}

describe("playtest bugfixes — active player targeting", () => {
  it("landing on tile with 0 HP opponent does not offer BvB", () => {
    const p1 = mkPlayer({ id: "p1", name: "A", isHost: true, tileIndex: 0 });
    const p2 = mkPlayer({ id: "p2", name: "B", isHost: false, tileIndex: 1, hp: 0 });
    let s = basePlaying([p1, p2], {
      type: "moveChoice",
      playerId: "p1",
      die: 2,
      baseDie: 2,
      from: { levelIndex: 0, tileIndex: 0 },
      options: [
        {
          dir: "cw",
          target: { levelIndex: 0, tileIndex: 1 },
          tileType: "empty",
          label: "Tile 2 (empty)",
        },
        {
          dir: "ccw",
          target: { levelIndex: 0, tileIndex: 2 },
          tileType: "combat",
          label: "Tile 3 (combat)",
        },
      ],
    });
    const r = applyAction(s, { type: "chooseMove", playerId: "p1", dir: "cw" });
    assert.equal(r.error, undefined);
    assert.notEqual(r.state.pending?.type, "encounterChoice");
  });

  it("rabarbapappa redirect only hits active players", () => {
    const p1 = mkPlayer({
      id: "p1",
      name: "A",
      isHost: true,
      equipment: {},
    });
    const p2 = mkPlayer({ id: "p2", name: "B", isHost: false, tileIndex: 1, hp: 0 });
    const p3 = mkPlayer({ id: "p3", name: "C", isHost: false, tileIndex: 1, hp: 8 });
    let s = basePlaying([p1, p2, p3], {
      type: "combat",
      phase: "rollPreview",
      attackerId: "p1",
      levelIndex: 0,
      tileIndex: 2,
      monsterId: rabarbapappa.id,
      enemyName: rabarbapappa.name,
      need: rabarbapappa.strength,
      needMod: 0,
      baseDamage: rabarbapappa.baseDamage,
      lossSipsOnLose: rabarbapappa.lossSipsOnLose,
      previewDie: 1,
      previewTotal: 1,
      previewNeed: rabarbapappa.strength,
      previewWon: false,
      previewCritFailOnOne: true,
      attackMods: {},
      reactors: [],
      rewardGold: 0,
      rewardItems: 0,
      rewardXp: 0,
    });
    const rng = createRng(12345);
    const r = applyAction(s, { type: "combatRollAck", playerId: "p1" });
    assert.equal(r.error, undefined);
    const c3 = r.state.players.find((x) => x.id === "p3");
    const c2 = r.state.players.find((x) => x.id === "p2");
    assert.ok(c3.hp < 8, "active player should take redirect damage");
    assert.equal(c2.hp, 0, "0 HP inactive player should not be redirect target");
  });

  it("event_loser_wins heals lowest among active players only", () => {
    const p1 = mkPlayer({ id: "p1", name: "A", isHost: true, hp: 10 });
    const p2 = mkPlayer({ id: "p2", name: "B", isHost: false, hp: 0, eliminated: false });
    const p3 = mkPlayer({ id: "p3", name: "C", isHost: false, hp: 3 });
    const state = basePlaying([p1, p2, p3], null);
    const card = getCard("event_loser_wins");
    const logLines = [];
    const log = (st, msg) => {
      st.log.push({ at: Date.now(), message: msg });
      logLines.push(msg);
    };
    resolveEventCardOnLand({
      state,
      player: p1,
      card,
      rng: () => 0.5,
      log,
      showCard: () => {},
    });
    assert.equal(p2.hp, 0, "eliminated/down player should not be healed");
    assert.equal(p3.hp, 5, "lowest active player gets +2 HP");
  });

  it("endGame does not crown 0 HP teammate when first gives up after team loss", () => {
    const p1 = mkPlayer({ id: "p1", name: "A", isHost: true, hp: 0 });
    const p2 = mkPlayer({ id: "p2", name: "B", isHost: false, hp: 0 });
    let s = basePlaying([p1, p2], { type: "brewerDown", playerId: "p1" });
    const r = applyAction(s, { type: "brewerDownChoice", playerId: "p1", choice: "giveUp" });
    assert.equal(r.error, undefined);
    assert.equal(r.state.phase, "playing");
    assert.equal(r.state.winnerId, null);
    assert.equal(r.state.pending?.type, "brewerDown");
    assert.equal(r.state.pending?.playerId, "p2");
    assert.equal(r.state.players.find((x) => x.id === "p2")?.hp, 0);
  });
});

describe("playtest bugfixes — Fyrklöver preview", () => {
  it("attacker Fyrklöver applies when assist rolls last (preview not crit fail on single 1)", () => {
    const cloverAccessory = {
      name: fourClover.name,
      ignoreCombatCritFailOnOne: true,
    };
    const p1 = mkPlayer({
      id: "p1",
      name: "A",
      isHost: true,
      equipment: { accessory: cloverAccessory },
    });
    const p2 = mkPlayer({
      id: "p2",
      name: "B",
      isHost: false,
      tileIndex: 0,
      equipment: {},
    });
    let s = basePlaying([p1, p2], {
      type: "combat",
      phase: "reactions",
      attackerId: "p1",
      assistId: "p2",
      levelIndex: 0,
      tileIndex: 2,
      monsterId: skumBanan.id,
      enemyName: skumBanan.name,
      need: skumBanan.strength,
      needMod: 0,
      baseDamage: skumBanan.baseDamage,
      lossSipsOnLose: skumBanan.lossSipsOnLose,
      attackMods: {},
      reactors: [],
      reacted: {},
      rewardGold: skumBanan.rewardGold,
      rewardItems: skumBanan.rewardItems,
      rewardXp: skumBanan.rewardXp,
    });
    s = withForcedDie(s, "p1", 1);
    s = withForcedDie(s, "p2", 6);
    let r = applyAction(s, { type: "combatRoll", playerId: "p1" });
    assert.equal(r.error, undefined);
    assert.equal(r.state.pending?.phase, "reactions");
    r = applyAction(r.state, { type: "combatRoll", playerId: "p2" });
    assert.equal(r.error, undefined);
    assert.equal(r.state.pending?.phase, "rollPreview");
    assert.notEqual(r.state.pending?.previewCritFailOnOne, true);
  });
});
