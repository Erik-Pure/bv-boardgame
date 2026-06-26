import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAction,
  CONFIG_NUMERIC,
  MERCHANT_SELLABLE_COMBAT_ITEM_IDS,
  MERCHANT_TAPROOM_KEY_PRICE,
  rollMerchantItems,
} from "../dist/index.js";

const EQUIP_SLOTS = new Set(["weapon", "armor", "helmet", "accessory"]);

function gameConfig(overrides = {}) {
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
    ...overrides,
  };
}

function mkPlayer(p) {
  return {
    id: p.id,
    name: p.name,
    isHost: p.isHost ?? false,
    tileIndex: p.tileIndex ?? 0,
    levelIndex: p.levelIndex ?? 0,
    hp: p.hp ?? 10,
    gold: p.gold ?? 20,
    xp: p.xp ?? 0,
    klunk: p.klunk ?? 0,
    eliminated: false,
    equipment: p.equipment ?? {},
    inventory: p.inventory ?? [],
    brewerPerkLevelsClaimed: p.brewerPerkLevelsClaimed ?? 0,
    pendingBrewerPerkLevels: p.pendingBrewerPerkLevels ?? 0,
    sessionStats: p.sessionStats,
  };
}

describe("merchant shelf", () => {
  it("rollMerchantItems has heal, two equipment, one combat inventory item", () => {
    for (let seed = 0; seed < 40; seed += 1) {
      let t = seed * 0.137;
      const rng = () => {
        t = (t * 9301 + 49297) % 233280;
        return t / 233280;
      };
      const items = rollMerchantItems(rng);
      assert.equal(items.length, 4, `seed ${seed}`);
      assert.equal(items.filter((i) => i.slot === "heal").length, 1);
      assert.equal(items.filter((i) => EQUIP_SLOTS.has(i.slot)).length, 2);
      const inv = items.filter((i) => i.slot === "inventory");
      assert.equal(inv.length, 1);
      assert.ok(
        MERCHANT_SELLABLE_COMBAT_ITEM_IDS.includes(inv[0].inventoryItemId),
        `unexpected item ${inv[0].inventoryItemId}`,
      );
      assert.equal(inv[0].price, 5);
    }
  });

  it("rollMerchantItems omits disabled combat items", () => {
    const disabled = new Set(["item_light_beer"]);
    const items = rollMerchantItems(() => 0.42, disabled);
    const inv = items.find((i) => i.slot === "inventory");
    assert.ok(inv);
    assert.notEqual(inv.inventoryItemId, "light_beer");
  });

  it("rollMerchantItems adds taproom_key on last board level", () => {
    const levelCount = 3;
    const lastIdx = levelCount - 1;
    const items = rollMerchantItems(() => 0.42, undefined, lastIdx, levelCount);
    assert.equal(items.length, 5);
    const taproom = items.find((i) => i.inventoryItemId === "taproom_key");
    assert.ok(taproom);
    assert.equal(taproom.price, MERCHANT_TAPROOM_KEY_PRICE);
    assert.equal(taproom.id, "inv_taproom_key");
  });

  it("rollMerchantItems has no taproom_key before last board level", () => {
    const levelCount = 3;
    const items = rollMerchantItems(() => 0.42, undefined, 0, levelCount);
    assert.equal(items.length, 4);
    assert.equal(items.some((i) => i.inventoryItemId === "taproom_key"), false);
  });

  it("rollMerchantItems omits taproom_key when card disabled", () => {
    const disabled = new Set(["item_taproom_key"]);
    const items = rollMerchantItems(() => 0.42, disabled, 2, 3);
    assert.equal(items.length, 4);
    assert.equal(items.some((i) => i.inventoryItemId === "taproom_key"), false);
  });

  it("merchantBuy adds taproom_key from shelf", () => {
    const p1 = mkPlayer({ id: "p1", name: "A", isHost: true, gold: 25 });
    const state = {
      phase: "playing",
      seed: 1,
      config: gameConfig(),
      roomCode: "TK",
      players: [p1],
      turnOrder: ["p1"],
      currentTurnIndex: 0,
      levels: [{ tiles: [] }, { tiles: [] }, { tiles: [] }],
      pending: {
        type: "merchant",
        playerId: "p1",
        items: [
          {
            id: "inv_taproom_key",
            slot: "inventory",
            inventoryItemId: "taproom_key",
            name: "Taproom-nyckel",
            price: MERCHANT_TAPROOM_KEY_PRICE,
          },
        ],
      },
      log: [],
      winnerId: null,
      winnerName: null,
      goldenBeerCarrierId: null,
      finalBossMonsterId: null,
      finalBossLivesRemaining: null,
      bossFinaleExitStartedAt: null,
      treasureTaken: {},
    };
    const r = applyAction(state, { type: "merchantBuy", playerId: "p1", itemId: "inv_taproom_key" });
    assert.equal(r.error, undefined);
    const u = r.state.players.find((x) => x.id === "p1");
    assert.ok(u);
    assert.equal(u.gold, 5);
    assert.equal((u.inventory ?? []).some((x) => x.itemId === "taproom_key"), true);
  });

  it("merchantBuy adds inventory combat item to player", () => {
    const p1 = mkPlayer({ id: "p1", name: "A", isHost: true, gold: 20 });
    const state = {
      phase: "playing",
      seed: 1,
      config: gameConfig(),
      roomCode: "MS",
      players: [p1],
      turnOrder: ["p1"],
      currentTurnIndex: 0,
      levels: [{ tiles: [{ id: "e0", type: "empty" }] }],
      pending: {
        type: "merchant",
        playerId: "p1",
        items: [
          {
            id: "inv_folk_beer",
            slot: "inventory",
            inventoryItemId: "folk_beer",
            name: "Folköl",
            price: 5,
          },
        ],
      },
      log: [],
      winnerId: null,
      winnerName: null,
      goldenBeerCarrierId: null,
      finalBossMonsterId: null,
      finalBossLivesRemaining: null,
      bossFinaleExitStartedAt: null,
      treasureTaken: {},
    };
    const r = applyAction(state, { type: "merchantBuy", playerId: "p1", itemId: "inv_folk_beer" });
    assert.equal(r.error, undefined);
    const u = r.state.players.find((x) => x.id === "p1");
    assert.ok(u);
    assert.equal(u.gold, 15);
    assert.equal((u.inventory ?? []).some((x) => x.itemId === "folk_beer"), true);
  });

  it("merchantReroll costs 5 pant and replaces all shelf items", () => {
    const p1 = mkPlayer({ id: "p1", name: "A", isHost: true, gold: 20 });
    const beforeItems = [
      { id: "a", slot: "heal", name: "Helande brygd", price: 5, healAmount: 3 },
      { id: "b", slot: "weapon", name: "Testvapen", price: 8, power: 1 },
    ];
    const state = {
      phase: "playing",
      seed: 99,
      config: gameConfig(),
      roomCode: "MR",
      players: [p1],
      turnOrder: ["p1"],
      currentTurnIndex: 0,
      levels: [
        { tiles: [{ id: "e0", type: "empty" }] },
        { tiles: [{ id: "e1", type: "empty" }] },
        { tiles: [{ id: "e2", type: "empty" }] },
      ],
      pending: { type: "merchant", playerId: "p1", items: beforeItems },
      log: [],
      winnerId: null,
      winnerName: null,
      goldenBeerCarrierId: null,
      finalBossMonsterId: null,
      finalBossLivesRemaining: null,
      bossFinaleExitStartedAt: null,
      treasureTaken: {},
    };
    const r = applyAction(state, { type: "merchantReroll", playerId: "p1" });
    assert.equal(r.error, undefined);
    assert.equal(r.state.players[0].gold, 15);
    assert.equal(r.state.pending?.type, "merchant");
    assert.equal(r.state.pending.items.length, 4);
    assert.notDeepEqual(r.state.pending.items.map((i) => i.id), beforeItems.map((i) => i.id));
  });

  it("merchantReroll rejects when player cannot afford reroll", () => {
    const p1 = mkPlayer({ id: "p1", name: "A", isHost: true, gold: 4 });
    const state = {
      phase: "playing",
      seed: 1,
      config: gameConfig(),
      roomCode: "MR2",
      players: [p1],
      turnOrder: ["p1"],
      currentTurnIndex: 0,
      levels: [{ tiles: [{ id: "e0", type: "empty" }] }],
      pending: {
        type: "merchant",
        playerId: "p1",
        items: [{ id: "a", slot: "heal", name: "Helande brygd", price: 5, healAmount: 3 }],
      },
      log: [],
      winnerId: null,
      winnerName: null,
      goldenBeerCarrierId: null,
      finalBossMonsterId: null,
      finalBossLivesRemaining: null,
      bossFinaleExitStartedAt: null,
      treasureTaken: {},
    };
    const r = applyAction(state, { type: "merchantReroll", playerId: "p1" });
    assert.equal(r.error, "För lite pant");
    assert.equal(r.state.players[0].gold, 4);
  });
});
