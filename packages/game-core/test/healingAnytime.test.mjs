import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAction,
  CONFIG_NUMERIC,
  DEFAULT_PLAYER_SESSION_STATS,
  createItemInstance,
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

function baseState(players, currentTurnIndex, pending) {
  return {
    phase: "playing",
    seed: 1,
    config: gameConfig(),
    roomCode: "T",
    players,
    turnOrder: players.map((p) => p.id),
    currentTurnIndex,
    levels: [{ tiles: [{ id: "e0", type: "empty" }, { id: "e1", type: "empty" }] }],
    pending: pending ?? null,
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

describe("healing anytime (off-turn + brewerDown)", () => {
  it("healing_potion går att använda när det inte är spelarens tur", () => {
    const hp = createItemInstance("healing_potion", "inst_hp");
    const p1 = mkPlayer({
      id: "p1",
      name: "A",
      isHost: true,
      hp: 3,
      inventory: [hp],
    });
    const p2 = mkPlayer({ id: "p2", name: "B", isHost: false, tileIndex: 1 });
    const state = baseState([p1, p2], 1, null);
    const r = applyAction(state, {
      type: "useItem",
      playerId: "p1",
      instanceId: "inst_hp",
      targetPlayerId: "p1",
    });
    assert.equal(r.error, undefined);
    const u = r.state.players.find((x) => x.id === "p1");
    assert.ok(u);
    assert.equal(u.hp, 6);
    assert.equal((u.inventory ?? []).length, 0);
  });

  it("healing_potion nekas under stupad bryggare", () => {
    const hp = createItemInstance("healing_potion", "inst_hp");
    const p1 = mkPlayer({
      id: "p1",
      name: "A",
      isHost: true,
      hp: 0,
      inventory: [hp],
    });
    const p2 = mkPlayer({ id: "p2", name: "B", isHost: false, tileIndex: 1 });
    const state = baseState([p1, p2], 0, { type: "brewerDown", playerId: "p1" });
    const r = applyAction(state, {
      type: "useItem",
      playerId: "p1",
      instanceId: "inst_hp",
      targetPlayerId: "p1",
    });
    assert.ok(r.error);
    const u = r.state.players.find((x) => x.id === "p1");
    assert.ok(u);
    assert.equal(u.hp, 0);
    assert.equal((u.inventory ?? []).length, 1);
  });
});
