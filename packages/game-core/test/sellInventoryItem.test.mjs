import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAction,
  CONFIG_NUMERIC,
  createItemInstance,
  inventoryItemSellPrice,
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
    isHost: p.isHost ?? true,
    ready: true,
    levelIndex: 0,
    tileIndex: 0,
    gold: p.gold ?? 20,
    klunkar: 0,
    hp: 10,
    maxHp: 10,
    xp: 0,
    equipment: {},
    inventory: p.inventory ?? [],
    nextMoveBonus: 0,
    nextCombatModifier: 0,
    skippedTurns: 0,
    eliminated: false,
    stats: {},
  };
}

describe("sellInventoryItem", () => {
  it("inventoryItemSellPrice är halva spelkostnaden", () => {
    assert.equal(inventoryItemSellPrice("shuffle"), 5);
    assert.equal(inventoryItemSellPrice("six_sense"), 2);
  });

  it("sellInventoryItem ger pant och tar bort föremål", () => {
    const inst = createItemInstance("shuffle", "inst_sell");
    const p1 = mkPlayer({ id: "p1", name: "A", gold: 4, inventory: [inst] });
    const state = {
      phase: "playing",
      seed: 1,
      config: gameConfig(),
      roomCode: "T",
      players: [p1, mkPlayer({ id: "p2", name: "B", isHost: false, tileIndex: 1 })],
      turnOrder: ["p1", "p2"],
      currentTurnIndex: 0,
      levels: [{ tiles: [{ id: "e0", type: "empty" }] }],
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
      type: "sellInventoryItem",
      playerId: "p1",
      instanceId: "inst_sell",
    });
    assert.equal(r.error, undefined);
    const u = r.state.players.find((x) => x.id === "p1");
    assert.ok(u);
    assert.equal(u.gold, 9);
    assert.equal((u.inventory ?? []).length, 0);
  });
});
