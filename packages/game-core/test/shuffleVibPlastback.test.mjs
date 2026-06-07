import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAction,
  CONFIG_NUMERIC,
  DEFAULT_PLAYER_SESSION_STATS,
  createItemInstance,
} from "../dist/index.js";
import { effectiveMerchantBuyPrice } from "../dist/merchantBuyPrice.js";
import { syncPlastbackEmptyBottleSynergy, TOM_FLASKA_WEAPON_NAME, plastbackPackRemainingCount } from "../dist/plastbackSynergy.js";

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
    stats: p.stats ?? { ...DEFAULT_PLAYER_SESSION_STATS },
  };
}

function playingState(players, extra = {}) {
  return {
    phase: "playing",
    seed: 1,
    config: gameConfig(),
    roomCode: "T",
    players,
    turnOrder: players.map((p) => p.id),
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
    ...extra,
  };
}

describe("VIB / Plastback / Shuffle", () => {
  it("effectiveMerchantBuyPrice ger golv 1 och VIB −2", () => {
    const p = mkPlayer({
      id: "p1",
      name: "A",
      isHost: true,
      equipment: { accessory: { name: "VIB Member", merchantDiscountGold: 2 } },
    });
    assert.equal(effectiveMerchantBuyPrice(p, 8), 6);
    assert.equal(effectiveMerchantBuyPrice(p, 2), 1);
    const noVib = mkPlayer({ id: "x", name: "X", isHost: true });
    assert.equal(effectiveMerchantBuyPrice(noVib, 8), 8);
  });

  it("syncPlastbackEmptyBottleSynergy sätter breakWinsRemaining till 6", () => {
    const p = mkPlayer({
      id: "p1",
      name: "A",
      isHost: true,
      equipment: {
        weapon: { name: TOM_FLASKA_WEAPON_NAME, power: 5, breakOnWin: true },
        accessory: { name: "Plastback" },
      },
    });
    syncPlastbackEmptyBottleSynergy(p);
    assert.equal(p.equipment.weapon?.breakWinsRemaining, 6);
    p.equipment.accessory = undefined;
    syncPlastbackEmptyBottleSynergy(p);
    assert.equal(p.equipment.weapon?.breakWinsRemaining, undefined);
  });

  it("useItem shuffle byter inventory och tar 10 pant", () => {
    const sh = createItemInstance("shuffle", "inst_shuffle");
    const hp = createItemInstance("healing_potion", "inst_hp");
    const p1 = mkPlayer({
      id: "p1",
      name: "A",
      isHost: true,
      gold: 25,
      inventory: [sh],
    });
    const p2 = mkPlayer({ id: "p2", name: "B", isHost: false, tileIndex: 1, inventory: [hp] });
    const state = {
      phase: "playing",
      seed: 1,
      config: gameConfig(),
      roomCode: "T",
      players: [p1, p2],
      turnOrder: ["p1", "p2"],
      currentTurnIndex: 0,
      levels: [{ tiles: [{ id: "e0", type: "empty" }, { id: "e1", type: "empty" }] }],
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
      type: "useItem",
      playerId: "p1",
      instanceId: "inst_shuffle",
      targetPlayerId: "p2",
    });
    assert.equal(r.error, undefined);
    const u = r.state.players.find((x) => x.id === "p1");
    const t = r.state.players.find((x) => x.id === "p2");
    assert.ok(u && t);
    assert.equal(u.gold, 15);
    assert.equal((u.inventory ?? []).length, 1);
    assert.equal((u.inventory ?? [])[0]?.itemId, "healing_potion");
    assert.equal((t.inventory ?? []).length, 0);
  });

  it("useItem shuffle blockeras mot Solbrillor (preventTheft)", () => {
    const sh = createItemInstance("shuffle", "inst_shuffle");
    const p1 = mkPlayer({
      id: "p1",
      name: "A",
      isHost: true,
      gold: 25,
      inventory: [sh],
    });
    const p2 = mkPlayer({
      id: "p2",
      name: "B",
      isHost: false,
      tileIndex: 1,
      equipment: { accessory: { name: "Solbrillor", preventTheft: true } },
    });
    const state = {
      phase: "playing",
      seed: 1,
      config: gameConfig(),
      roomCode: "T",
      players: [p1, p2],
      turnOrder: ["p1", "p2"],
      currentTurnIndex: 0,
      levels: [{ tiles: [{ id: "e0", type: "empty" }, { id: "e1", type: "empty" }] }],
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
      type: "useItem",
      playerId: "p1",
      instanceId: "inst_shuffle",
      targetPlayerId: "p2",
    });
    assert.ok(r.error);
    assert.match(r.error, /bestulen/i);
  });

  it("sellAccessory ger pant från pack i hållaren (inte vapnets vinster)", () => {
    const p1 = mkPlayer({
      id: "p1",
      name: "A",
      isHost: true,
      gold: 1,
      equipment: {
        weapon: { name: TOM_FLASKA_WEAPON_NAME, power: 5, breakOnWin: true, breakWinsRemaining: 3 },
        accessory: { name: "Plastback", plastbackPackRemaining: 3 },
      },
    });
    const p2 = mkPlayer({ id: "p2", name: "B", isHost: false, tileIndex: 1 });
    const state = playingState([p1, p2]);
    const r = applyAction(state, { type: "sellAccessory", playerId: "p1" });
    assert.equal(r.error, undefined);
    const u = r.state.players.find((x) => x.id === "p1");
    assert.ok(u);
    assert.equal(u.gold, 4);
    assert.equal(u.equipment.accessory, undefined);
    assert.equal(u.equipment.weapon?.breakWinsRemaining, undefined);
  });

  it("sellAccessory ger 6 pant när pack saknas (migration default)", () => {
    const p1 = mkPlayer({
      id: "p1",
      name: "A",
      isHost: true,
      gold: 6,
      equipment: {
        weapon: { name: TOM_FLASKA_WEAPON_NAME, power: 5, breakOnWin: true },
        accessory: { name: "Plastback" },
      },
    });
    const p2 = mkPlayer({ id: "p2", name: "B", isHost: false, tileIndex: 1 });
    const state = playingState([p1, p2]);
    const r = applyAction(state, { type: "sellAccessory", playerId: "p1" });
    assert.equal(r.error, undefined);
    const u = r.state.players.find((x) => x.id === "p1");
    assert.ok(u);
    assert.equal(u.gold, 12);
    assert.equal(u.equipment.accessory, undefined);
  });

  it("takePlastbackBottle: tom vapenplats ger Tom flaska och minskar pack", () => {
    const p1 = mkPlayer({
      id: "p1",
      name: "A",
      isHost: true,
      equipment: { accessory: { name: "Plastback", plastbackPackRemaining: 6 } },
    });
    const p2 = mkPlayer({ id: "p2", name: "B", isHost: false, tileIndex: 1 });
    const r = applyAction(playingState([p1, p2]), { type: "takePlastbackBottle", playerId: "p1" });
    assert.equal(r.error, undefined);
    const u = r.state.players.find((x) => x.id === "p1");
    assert.ok(u);
    assert.equal(plastbackPackRemainingCount(u), 5);
    assert.equal(u.equipment.weapon?.name, TOM_FLASKA_WEAPON_NAME);
    assert.equal(u.equipment.weapon?.breakWinsRemaining, 6);
  });

  it("takePlastbackBottle: Tom flaska redan utrustad refreshar vinster och minskar pack", () => {
    const p1 = mkPlayer({
      id: "p1",
      name: "A",
      isHost: true,
      equipment: {
        weapon: { name: TOM_FLASKA_WEAPON_NAME, power: 5, breakOnWin: true, breakWinsRemaining: 2 },
        accessory: { name: "Plastback", plastbackPackRemaining: 4 },
      },
    });
    const p2 = mkPlayer({ id: "p2", name: "B", isHost: false, tileIndex: 1 });
    const r = applyAction(playingState([p1, p2]), { type: "takePlastbackBottle", playerId: "p1" });
    assert.equal(r.error, undefined);
    const u = r.state.players.find((x) => x.id === "p1");
    assert.ok(u);
    assert.equal(plastbackPackRemainingCount(u), 3);
    assert.equal(u.equipment.weapon?.breakWinsRemaining, 6);
  });

  it("takePlastbackBottle: annat vapen ger bytesval; accept minskar pack", () => {
    const p1 = mkPlayer({
      id: "p1",
      name: "A",
      isHost: true,
      equipment: {
        weapon: { name: "Folköl", power: 2 },
        accessory: { name: "Plastback", plastbackPackRemaining: 6 },
      },
    });
    const p2 = mkPlayer({ id: "p2", name: "B", isHost: false, tileIndex: 1 });
    const offer = applyAction(playingState([p1, p2]), { type: "takePlastbackBottle", playerId: "p1" });
    assert.equal(offer.error, undefined);
    assert.equal(offer.state.pending?.type, "equipmentReplaceOffer");
    assert.equal(offer.state.pending?.fromPlastbackTake, true);
    const uOffer = offer.state.players.find((x) => x.id === "p1");
    assert.equal(plastbackPackRemainingCount(uOffer), 6);
    const accept = applyAction(offer.state, {
      type: "equipmentReplaceDecision",
      playerId: "p1",
      accept: true,
    });
    assert.equal(accept.error, undefined);
    const u = accept.state.players.find((x) => x.id === "p1");
    assert.ok(u);
    assert.equal(plastbackPackRemainingCount(u), 5);
    assert.equal(u.equipment.weapon?.name, TOM_FLASKA_WEAPON_NAME);
    assert.equal(u.equipment.weapon?.breakWinsRemaining, 6);
  });

  it("takePlastbackBottle: bytesval avböjt lämnar pack oförändrat", () => {
    const p1 = mkPlayer({
      id: "p1",
      name: "A",
      isHost: true,
      equipment: {
        weapon: { name: "Folköl", power: 2 },
        accessory: { name: "Plastback", plastbackPackRemaining: 6 },
      },
    });
    const p2 = mkPlayer({ id: "p2", name: "B", isHost: false, tileIndex: 1 });
    const offer = applyAction(playingState([p1, p2]), { type: "takePlastbackBottle", playerId: "p1" });
    const decline = applyAction(offer.state, {
      type: "equipmentReplaceDecision",
      playerId: "p1",
      accept: false,
    });
    assert.equal(decline.error, undefined);
    const u = decline.state.players.find((x) => x.id === "p1");
    assert.ok(u);
    assert.equal(plastbackPackRemainingCount(u), 6);
    assert.equal(u.equipment.weapon?.name, "Folköl");
  });

  it("takePlastbackBottle: pack 0 ger fel", () => {
    const p1 = mkPlayer({
      id: "p1",
      name: "A",
      isHost: true,
      equipment: { accessory: { name: "Plastback", plastbackPackRemaining: 0 } },
    });
    const p2 = mkPlayer({ id: "p2", name: "B", isHost: false, tileIndex: 1 });
    const r = applyAction(playingState([p1, p2]), { type: "takePlastbackBottle", playerId: "p1" });
    assert.ok(r.error);
    assert.match(r.error, /flaskor kvar/i);
  });

  it("merchantBuy med VIB drar rabatterat pris", () => {
    const p1 = mkPlayer({
      id: "p1",
      name: "A",
      isHost: true,
      gold: 20,
      equipment: { accessory: { name: "VIB Member", merchantDiscountGold: 2 } },
    });
    const p2 = mkPlayer({ id: "p2", name: "B", isHost: false, tileIndex: 1 });
    const healPrice = 5;
    const state = {
      phase: "playing",
      seed: 1,
      config: gameConfig(),
      roomCode: "T",
      players: [p1, p2],
      turnOrder: ["p1", "p2"],
      currentTurnIndex: 0,
      levels: [{ tiles: [{ id: "e0", type: "empty" }] }],
      pending: {
        type: "merchant",
        playerId: "p1",
        items: [{ id: "h", slot: "heal", name: "Helande brygd", price: healPrice, healAmount: 3 }],
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
    const pay = effectiveMerchantBuyPrice(p1, healPrice);
    assert.equal(pay, 3);
    const r = applyAction(state, { type: "merchantBuy", playerId: "p1", itemId: "h" });
    assert.equal(r.error, undefined);
    const u = r.state.players.find((x) => x.id === "p1");
    assert.ok(u);
    assert.equal(u.gold, 17);
    assert.equal((u.inventory ?? []).some((x) => x.itemId === "healing_potion"), true);
  });
});
