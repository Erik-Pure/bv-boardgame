import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAction,
  CONFIG_NUMERIC,
  DEFAULT_PLAYER_SESSION_STATS,
  EQUIPMENT_CATALOG,
} from "../dist/index.js";
import { tryGrantRandomEquipmentOrOffer } from "../dist/cards/effects.js";

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
    color: p.color ?? "#111111",
    isHost: p.isHost ?? true,
    ready: true,
    levelIndex: 0,
    tileIndex: 0,
    gold: p.gold ?? 10,
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
  };
}

function combatWinState(queue) {
  const p1 = mkPlayer({
    id: "p1",
    name: "A",
    equipment: { weapon: { name: "Gammalt vapen", power: 1 } },
    inventory: [],
  });
  const newWeapon = EQUIPMENT_CATALOG.find((e) => e.slot === "weapon" && e.name !== "Gammalt vapen");
  assert.ok(newWeapon, "expected catalog weapon for replace test");
  return {
    state: {
      phase: "playing",
      seed: 99,
      config: gameConfig(),
      roomCode: "T",
      players: [p1],
      turnOrder: ["p1"],
      currentTurnIndex: 0,
      levels: [{ tiles: [{ id: "c0", type: "combat", combatValue: 1 }] }],
      pending: {
        type: "card",
        playerId: "p1",
        cardId: "combat_win",
        kind: "combat",
        title: "Dålig batch",
        text: "",
        combatWin: {
          winnerName: "A",
          enemyName: "Testbatch",
          rollTotal: 6,
          need: 3,
          rewardGold: 2,
          rewardItems: 1,
          rewardXp: 10,
          grantedRewardTitles: [newWeapon.name],
        },
      },
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
      combatEquipReplaceQueue: queue ?? [
        {
          playerId: "p1",
          slot: "weapon",
          catalogId: newWeapon.id,
          newName: newWeapon.name,
        },
      ],
    },
    newWeapon,
  };
}

describe("tryGrantRandomEquipmentOrOffer", () => {
  it("occupied slot returns offer without equipping", () => {
    const player = mkPlayer({
      id: "p1",
      equipment: { weapon: { name: "Gammalt vapen", power: 1 } },
    });
    let n = 0;
    const rng = () => {
      n += 1;
      return 0;
    };
    const roll = tryGrantRandomEquipmentOrOffer(player, rng, 10);
    assert.equal(roll?.kind, "offer");
    assert.equal(player.equipment.weapon?.name, "Gammalt vapen");
    assert.equal(player.inventory.length, 0);
  });
});

describe("combat loot equipment replace queue", () => {
  it("confirmCard on combat_win drains queue to equipmentReplaceOffer", () => {
    const { state } = combatWinState();
    const r = applyAction(state, { type: "confirmCard", playerId: "p1" });
    assert.equal(r.error, undefined);
    assert.equal(r.state.pending?.type, "equipmentReplaceOffer");
    assert.equal(r.state.pending.playerId, "p1");
    assert.equal(r.state.pending.fromCombatLoot, true);
    assert.equal(r.state.combatEquipReplaceQueue, undefined);
  });

  it("accept replaces weapon; decline keeps old weapon", () => {
    const { state, newWeapon } = combatWinState();
    let r = applyAction(state, { type: "confirmCard", playerId: "p1" });
    assert.equal(r.error, undefined);

    r = applyAction(r.state, { type: "equipmentReplaceDecision", playerId: "p1", accept: true });
    assert.equal(r.error, undefined);
    assert.equal(r.state.players[0].equipment.weapon?.name, newWeapon.name);
    assert.equal(r.state.pending, null);

    const { state: state2 } = combatWinState();
    r = applyAction(state2, { type: "confirmCard", playerId: "p1" });
    r = applyAction(r.state, { type: "equipmentReplaceDecision", playerId: "p1", accept: false });
    assert.equal(r.error, undefined);
    assert.equal(r.state.players[0].equipment.weapon?.name, "Gammalt vapen");
    assert.equal(r.state.pending, null);
  });

  it("processes queue for two players in order", () => {
    const weaponA = EQUIPMENT_CATALOG.find((e) => e.slot === "weapon");
    const weaponB = EQUIPMENT_CATALOG.find((e) => e.slot === "helmet");
    assert.ok(weaponA && weaponB);

    const p1 = mkPlayer({
      id: "p1",
      name: "A",
      equipment: { weapon: { name: "Gammalt vapen", power: 1 } },
    });
    const p2 = mkPlayer({
      id: "p2",
      name: "B",
      isHost: false,
      equipment: { helmet: { name: "Gammal hjälm", damageNegate: 0, combatBonus: 0 } },
    });

    let s = {
      phase: "playing",
      seed: 99,
      config: gameConfig(),
      roomCode: "T",
      players: [p1, p2],
      turnOrder: ["p1", "p2"],
      currentTurnIndex: 0,
      levels: [{ tiles: [{ id: "c0", type: "combat", combatValue: 1 }] }],
      pending: {
        type: "card",
        playerId: "p1",
        cardId: "combat_win",
        kind: "combat",
        title: "Dålig batch",
        text: "",
        combatWin: {
          winnerName: "A",
          enemyName: "Testbatch",
          rollTotal: 6,
          need: 3,
          rewardGold: 2,
          rewardItems: 2,
          rewardXp: 10,
        },
      },
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
      combatEquipReplaceQueue: [
        { playerId: "p1", slot: "weapon", catalogId: weaponA.id, newName: weaponA.name },
        { playerId: "p2", slot: "helmet", catalogId: weaponB.id, newName: weaponB.name },
      ],
    };

    let r = applyAction(s, { type: "confirmCard", playerId: "p1" });
    assert.equal(r.state.pending?.type, "equipmentReplaceOffer");
    assert.equal(r.state.pending?.playerId, "p1");

    r = applyAction(r.state, { type: "equipmentReplaceDecision", playerId: "p1", accept: true });
    assert.equal(r.state.pending?.type, "equipmentReplaceOffer");
    assert.equal(r.state.pending?.playerId, "p2");
    assert.equal(r.state.pending?.fromCombatLoot, true);

    r = applyAction(r.state, { type: "equipmentReplaceDecision", playerId: "p2", accept: true });
    assert.equal(r.state.pending, null);
    assert.equal(r.state.players[0].equipment.weapon?.name, weaponA.name);
    assert.equal(r.state.players[1].equipment.helmet?.name, weaponB.name);
  });
});
