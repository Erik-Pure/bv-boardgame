import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAction,
  canUseItem,
  CONFIG_NUMERIC,
  createItemInstance,
  DEFAULT_PLAYER_SESSION_STATS,
  pendingAllowsShortcutTaproom,
  playerHasPlayablePositiveHelpItem,
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
    leftVoluntarily: p.leftVoluntarily ?? false,
    stats: p.stats ?? { ...DEFAULT_PLAYER_SESSION_STATS },
    ...p,
  };
}

function playingState(players, pending, extra = {}) {
  return {
    phase: "playing",
    seed: 77,
    config: gameConfig(),
    roomCode: "CUI",
    players,
    turnOrder: players.map((pl) => pl.id),
    currentTurnIndex: extra.currentTurnIndex ?? 0,
    levels: extra.levels ?? [
      {
        tiles: [
          { id: "t0", type: "empty" },
          { id: "t1", type: "empty" },
          { id: "t2", type: "combat", combatValue: 3 },
        ],
      },
      {
        tiles: [
          { id: "l1t0", type: "empty" },
          { id: "l1t1", type: "empty" },
        ],
      },
    ],
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
    ...extra,
  };
}

describe("canUseItem", () => {
  it("pendingAllowsShortcutTaproom allows moveChoice, merchant, encounterChoice", () => {
    assert.equal(pendingAllowsShortcutTaproom(null, "p1"), true);
    assert.equal(
      pendingAllowsShortcutTaproom({ type: "moveChoice", playerId: "p1", die: 3, baseDie: 3, from: { levelIndex: 0, tileIndex: 0 }, options: [] }, "p1"),
      true,
    );
    assert.equal(
      pendingAllowsShortcutTaproom({ type: "merchant", playerId: "p1", items: [] }, "p1"),
      true,
    );
    assert.equal(
      pendingAllowsShortcutTaproom({ type: "encounterChoice", moverId: "p1", opponentIds: ["p2"], phase: "choosePvpOrTile", tileType: "empty" }, "p1"),
      true,
    );
    assert.equal(
      pendingAllowsShortcutTaproom({ type: "combat", phase: "reactions", attackerId: "p1", levelIndex: 0, tileIndex: 0, monsterId: "skum_banan", enemyName: "X", reactors: [] }, "p1"),
      false,
    );
  });

  it("healing_potion playable off-turn; blocked for helper in helpAwaitCard", () => {
    const p1 = mkPlayer({ id: "p1", name: "A", isHost: true });
    const p2 = mkPlayer({ id: "p2", name: "B", isHost: false });
    const offTurn = playingState([p1, p2], null, { currentTurnIndex: 1 });
    assert.equal(canUseItem(offTurn, "p1", "healing_potion", "self_or_other"), true);

    const helpAwait = playingState([p1, p2], {
      type: "combat",
      phase: "helpAwaitCard",
      attackerId: "p1",
      helpSelectedHelperId: "p2",
      helpAccepted: true,
      levelIndex: 0,
      tileIndex: 0,
      monsterId: "skum_banan",
      enemyName: "Batch",
      reactors: [],
    });
    assert.equal(canUseItem(helpAwait, "p2", "healing_potion", "self_or_other"), false);
  });

  it("shortcut playable during encounterChoice on own turn with enough pant", () => {
    const p1 = mkPlayer({ id: "p1", name: "A", isHost: true, gold: 30 });
    const p2 = mkPlayer({ id: "p2", name: "B", isHost: false, tileIndex: 1 });
    const state = playingState([p1, p2], {
      type: "encounterChoice",
      moverId: "p1",
      opponentIds: ["p2"],
      phase: "choosePvpOrTile",
      tileType: "empty",
    });
    assert.equal(canUseItem(state, "p1", "shortcut", "self"), true);
    assert.equal(canUseItem(state, "p2", "shortcut", "self"), false);
  });

  it("lengraddad blocked for combat participant; allowed for third-party reactor", () => {
    const attacker = mkPlayer({ id: "p1", name: "A", isHost: true, inventory: [createItemInstance("lengraddad", "lr1")] });
    const reactor = mkPlayer({ id: "p2", name: "B", isHost: false, inventory: [createItemInstance("lengraddad", "lr2")] });
    const state = playingState([attacker, reactor], {
      type: "combat",
      phase: "reactions",
      attackerId: "p1",
      levelIndex: 0,
      tileIndex: 0,
      monsterId: "skum_banan",
      enemyName: "Batch",
      reactors: ["p2"],
      reacted: {},
    });
    assert.equal(canUseItem(state, "p1", "lengraddad", "combat"), false);
    assert.equal(canUseItem(state, "p2", "lengraddad", "combat"), true);
  });

  it("lengraddad playable in BvB preRoundItems", () => {
    const state = playingState(
      [mkPlayer({ id: "p1", name: "A", isHost: true }), mkPlayer({ id: "p2", name: "B", isHost: false })],
      {
        type: "pvp",
        phase: "preRoundItems",
        attackerId: "p1",
        defenderId: "p2",
        roundItemReady: {},
      },
    );
    assert.equal(canUseItem(state, "p1", "lengraddad", "combat"), true);
  });

  it("attacker cannot self-negative weak_beer during enemyIntro", () => {
    const p1 = mkPlayer({ id: "p1", name: "A", isHost: true, inventory: [createItemInstance("weak_beer", "wb")] });
    const state = playingState([p1, mkPlayer({ id: "p2", name: "B", isHost: false })], {
      type: "combat",
      phase: "enemyIntro",
      attackerId: "p1",
      levelIndex: 0,
      tileIndex: 0,
      monsterId: "skum_banan",
      enemyName: "Batch",
      reactors: [],
    });
    assert.equal(canUseItem(state, "p1", "weak_beer", "combat"), false);
  });

  it("playerHasPlayablePositiveHelpItem respects pant cost", () => {
    const broke = mkPlayer({ id: "p2", name: "B", gold: 0, inventory: [createItemInstance("manopositiv", "mp")] });
    const rich = mkPlayer({ id: "p3", name: "C", gold: 20, inventory: [createItemInstance("manopositiv", "mp2")] });
    const state = playingState([mkPlayer({ id: "p1", name: "A", isHost: true }), broke, rich], null);
    assert.equal(playerHasPlayablePositiveHelpItem(state, broke), false);
    assert.equal(playerHasPlayablePositiveHelpItem(state, rich), true);
  });

  it("canUseItem matches applyAction for lengraddad self-target in BvB", () => {
    const item = createItemInstance("lengraddad", "inst_len");
    const attacker = mkPlayer({ id: "p1", name: "A", isHost: true, inventory: [item] });
    const defender = mkPlayer({ id: "p2", name: "B", isHost: false, inventory: [] });
    const state = playingState([attacker, defender], {
      type: "pvp",
      phase: "preRoundItems",
      attackerId: "p1",
      defenderId: "p2",
      roundItemReady: {},
    });
    assert.equal(canUseItem(state, "p1", "lengraddad", "combat"), true);
    const r = applyAction(state, {
      type: "useItem",
      playerId: "p1",
      instanceId: "inst_len",
      targetPlayerId: "p1",
    });
    assert.equal(r.error, "Du kan inte välja dig själv");
  });
});
