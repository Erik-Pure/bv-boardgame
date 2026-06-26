import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAction,
  CONFIG_NUMERIC,
  createItemInstance,
  DEFAULT_PLAYER_SESSION_STATS,
  formatLogEntry,
  LOG_MESSAGE_KEYS,
  SHORTCUT_TELEPORT_GOLD_COST,
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
    levels: [
      { tiles: [{ id: "e0", type: "empty" }, { id: "e1", type: "empty" }] },
      { tiles: [{ id: "l1e0", type: "empty" }, { id: "l1e1", type: "empty" }] },
    ],
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

describe("shortcut teleport to player", () => {
  it("teleports to target position and costs 10 pant", () => {
    const shortcut = createItemInstance("shortcut", "sc1");
    const p1 = mkPlayer({
      id: "p1",
      name: "Alice",
      gold: 25,
      levelIndex: 0,
      tileIndex: 0,
      inventory: [shortcut],
    });
    const p2 = mkPlayer({
      id: "p2",
      name: "Bob",
      isHost: false,
      levelIndex: 1,
      tileIndex: 1,
    });
    const state = playingState([p1, p2]);

    const r = applyAction(state, {
      type: "useItem",
      playerId: "p1",
      instanceId: "sc1",
      targetPlayerId: "p2",
    });
    assert.equal(r.error, undefined);
    const alice = r.state.players.find((p) => p.id === "p1");
    assert.equal(alice.levelIndex, 1);
    assert.equal(alice.tileIndex, 1);
    assert.equal(alice.gold, 25 - SHORTCUT_TELEPORT_GOLD_COST);
    assert.equal((alice.inventory ?? []).length, 0);
  });

  it("creates encounterChoice when landing on target tile", () => {
    const shortcut = createItemInstance("shortcut", "sc2");
    const p1 = mkPlayer({
      id: "p1",
      name: "Alice",
      gold: 20,
      inventory: [shortcut],
    });
    const p2 = mkPlayer({ id: "p2", name: "Bob", isHost: false, tileIndex: 2 });
    const state = playingState(
      [
        p1,
        p2,
        mkPlayer({ id: "p3", name: "Cara", isHost: false, tileIndex: 0 }),
      ],
      {
        levels: [{ tiles: [{ id: "e0", type: "empty" }, { id: "e1", type: "empty" }, { id: "e2", type: "empty" }] }],
      },
    );

    const r = applyAction(state, {
      type: "useItem",
      playerId: "p1",
      instanceId: "sc2",
      targetPlayerId: "p2",
    });
    assert.equal(r.error, undefined);
    assert.equal(r.state.pending?.type, "encounterChoice");
    assert.equal(r.state.pending?.moverId, "p1");
    assert.deepEqual(r.state.pending?.opponentIds, ["p2"]);
  });

  it("rejects missing or inactive target", () => {
    const shortcut = createItemInstance("shortcut", "sc3");
    const p1 = mkPlayer({ id: "p1", name: "Alice", gold: 20, inventory: [shortcut] });
    const p2 = mkPlayer({ id: "p2", name: "Bob", isHost: false, eliminated: true });
    const state = playingState([p1, p2]);

    const noTarget = applyAction(state, {
      type: "useItem",
      playerId: "p1",
      instanceId: "sc3",
    });
    assert.match(noTarget.error ?? "", /annan spelare/i);

    const inactive = applyAction(state, {
      type: "useItem",
      playerId: "p1",
      instanceId: "sc3",
      targetPlayerId: "p2",
    });
    assert.match(inactive.error ?? "", /inte tillgängligt/i);
  });

  it("formatLogEntry localizes shortcut teleport log", () => {
    const entry = {
      message: "Alice använder Genväg och betalar 10 pant för att teleportera till Bob.",
      key: LOG_MESSAGE_KEYS.itemShortcutTeleport,
      params: { user: "Alice", target: "Bob", cost: 10 },
    };
    assert.equal(
      formatLogEntry(entry, "en"),
      "Alice uses Shortcut and pays 10 cans to teleport to Bob.",
    );
  });
});
