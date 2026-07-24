import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAction,
  CONFIG_NUMERIC,
  DEFAULT_PLAYER_SESSION_STATS,
  monsterCombatEquipmentAttackBonus,
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
    maxHp: 10,
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
    color: "#111",
    isHost: p.isHost ?? false,
    ready: true,
    levelIndex: 0,
    tileIndex: 0,
    gold: 20,
    klunkar: 0,
    hp: p.hp ?? 10,
    maxHp: p.maxHp ?? 10,
    xp: 0,
    equipment: p.equipment ?? {},
    inventory: [],
    nextMoveBonus: 0,
    nextCombatModifier: 0,
    skippedTurns: 0,
    stats: { ...DEFAULT_PLAYER_SESSION_STATS },
    ...p,
  };
}

function playingState(players, pending = null) {
  return {
    phase: "playing",
    seed: 1,
    config: gameConfig(),
    roomCode: "U",
    players,
    turnOrder: players.map((x) => x.id),
    currentTurnIndex: 0,
    levels: [{ tiles: [{ id: "t0", type: "empty" }] }],
    pending,
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

describe("unequipEquipment", () => {
  it("removes weapon on own turn", () => {
    const p1 = mkPlayer({
      id: "p1",
      name: "A",
      isHost: true,
      equipment: { weapon: { name: "Plastmugg", power: -2, freeInventoryItemPlay: true } },
    });
    const state = playingState([p1, mkPlayer({ id: "p2", name: "B" })]);
    assert.equal(monsterCombatEquipmentAttackBonus(p1), -2);
    const r = applyAction(state, { type: "unequipEquipment", playerId: "p1", slot: "weapon" });
    assert.equal(r.error, undefined);
    assert.equal(r.state.players[0].equipment.weapon, undefined);
    assert.equal(monsterCombatEquipmentAttackBonus(r.state.players[0]), 0);
  });

  it("recalculates maxHp when unequipping armor with bonusHp", () => {
    const p1 = mkPlayer({
      id: "p1",
      name: "A",
      isHost: true,
      maxHp: 15,
      hp: 15,
      equipment: { armor: { name: "Dunjacka", bonusHp: 5, combatBonus: -1 } },
    });
    const r = applyAction(playingState([p1]), {
      type: "unequipEquipment",
      playerId: "p1",
      slot: "armor",
    });
    assert.equal(r.error, undefined);
    assert.equal(r.state.players[0].equipment.armor, undefined);
    assert.equal(r.state.players[0].maxHp, 10);
    assert.equal(r.state.players[0].hp, 10);
  });

  it("rejects unequip when not your turn", () => {
    const p1 = mkPlayer({
      id: "p1",
      name: "A",
      isHost: true,
      equipment: { weapon: { name: "Enkelpipa", power: 1 } },
    });
    const p2 = mkPlayer({
      id: "p2",
      name: "B",
      equipment: { weapon: { name: "Plastmugg", power: -2 } },
    });
    const state = playingState([p1, p2]);
    const r = applyAction(state, { type: "unequipEquipment", playerId: "p2", slot: "weapon" });
    assert.ok(r.error);
    assert.equal(r.state.players[1].equipment.weapon?.name, "Plastmugg");
  });
});
