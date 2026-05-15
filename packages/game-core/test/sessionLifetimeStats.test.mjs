import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAction,
  computeEndedSpotlights,
  CONFIG_NUMERIC,
  DEFAULT_PLAYER_SESSION_STATS,
  recordPantSpent,
} from "../dist/index.js";
import { applyDamage } from "../dist/damage.js";
import { grantKlunkWithXp } from "../dist/klunkGrant.js";

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

describe("session stats över liv (omstart + klunk total)", () => {
  it("grantKlunkWithXp ökar totalKlunksGained kumulativt", () => {
    const p = mkPlayer({ id: "p1", name: "A", isHost: true });
    const state = { players: [p] };
    grantKlunkWithXp(state, p, 2);
    assert.equal(p.klunkar, 2);
    assert.equal(p.stats.totalKlunksGained, 2);
    grantKlunkWithXp(state, p, 1);
    assert.equal(p.stats.totalKlunksGained, 3);
  });

  it("brewerDownChoice retry nollställer inte knockdownCount, totalKlunksGained eller goldSpent", () => {
    const startPant = gameConfig().startPant;
    const p1 = mkPlayer({
      id: "p1",
      name: "A",
      isHost: true,
      hp: 0,
      klunkar: 40,
      gold: 500,
      xp: 100,
      stats: {
        ...DEFAULT_PLAYER_SESSION_STATS,
        knockdownCount: 3,
        totalKlunksGained: 20,
        goldSpent: 15,
        totalHpLost: 33,
      },
    });
    const p2 = mkPlayer({ id: "p2", name: "B", isHost: false, tileIndex: 1 });
    const state = {
      phase: "playing",
      seed: 1,
      config: gameConfig(),
      roomCode: "T",
      players: [p1, p2],
      turnOrder: ["p1", "p2"],
      currentTurnIndex: 0,
      levels: [
        {
          tiles: [
            { id: "e0", type: "empty" },
            { id: "e1", type: "empty" },
          ],
        },
      ],
      pending: { type: "brewerDown", playerId: "p1" },
      log: [],
      winnerId: null,
      winnerName: null,
      goldenBeerCarrierId: null,
      finalBossMonsterId: "store_narcissius",
      finalBossLivesRemaining: 3,
      treasureTaken: {},
      lastDiceRoll: null,
      lastDiceRollerId: null,
      sipNotices: [
        { recipientId: "p1", fromPlayerName: "Dålig batch", klunkCount: 2 },
        { recipientId: "p2", fromPlayerName: "A", klunkCount: 1 },
      ],
    };

    recordPantSpent(state, "p1", 5);
    assert.equal(p1.stats.goldSpent, 20);

    const r = applyAction(state, { type: "brewerDownChoice", playerId: "p1", choice: "retry" });
    assert.equal(r.error, undefined);
    const v = r.state.players.find((x) => x.id === "p1");
    assert.ok(v);
    assert.equal(v.klunkar, 0);
    assert.equal(v.gold, startPant);
    assert.equal(v.xp, 0);
    assert.equal(v.hp, v.maxHp);
    assert.equal(v.stats.knockdownCount, 3);
    assert.equal(v.stats.totalKlunksGained, 20);
    assert.equal(v.stats.goldSpent, 20);
    assert.equal(v.stats.totalHpLost, 33);
    assert.equal(r.state.sipNotices?.length, 1);
    assert.equal(r.state.sipNotices?.[0]?.recipientId, "p2");
    assert.equal(v.inventory.length, 2);
    const buffIds = new Set([
      "light_beer",
      "folk_beer",
      "double_hops",
      "beer_bomb",
      "beard_back",
    ]);
    const debuffIds = new Set([
      "weak_beer",
      "tripwire",
      "hangover",
      "monster_hype",
      "yeast_sabotage",
      "lengraddad",
    ]);
    const ids = v.inventory.map((it) => it.itemId);
    assert.equal(ids.filter((id) => buffIds.has(id)).length, 1);
    assert.equal(ids.filter((id) => debuffIds.has(id)).length, 1);
  });
});

describe("totalHpLost (skada + slutspotlight)", () => {
  it("applyDamage ökar totalHpLost med faktiskt avdragen HP", () => {
    const cfg = gameConfig();
    const p = mkPlayer({ id: "p1", name: "A", isHost: true, hp: 10, maxHp: 10 });
    const state = { players: [p], config: cfg };
    applyDamage({ state, player: p, amount: 4 });
    assert.equal(p.hp, 6);
    assert.equal(p.stats.totalHpLost, 4);
    applyDamage({ state, player: p, amount: 10 });
    assert.equal(p.hp, 0);
    assert.equal(p.stats.totalHpLost, 10);
  });

  it("computeEndedSpotlights lyfter mestHpLost", () => {
    const a = mkPlayer({
      id: "a",
      name: "A",
      stats: { ...DEFAULT_PLAYER_SESSION_STATS, totalHpLost: 5 },
    });
    const b = mkPlayer({
      id: "b",
      name: "B",
      stats: { ...DEFAULT_PLAYER_SESSION_STATS, totalHpLost: 22 },
    });
    const spots = computeEndedSpotlights([a, b]);
    const hpSpot = spots.find((s) => s.kind === "mostHpLost");
    assert.ok(hpSpot);
    assert.deepEqual(hpSpot.playerIds, ["b"]);
    assert.equal(hpSpot.value, 22);
  });
});
