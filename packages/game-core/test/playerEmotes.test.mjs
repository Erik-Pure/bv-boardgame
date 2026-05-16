import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAction,
  CONFIG_NUMERIC,
  DEFAULT_PLAYER_SESSION_STATS,
  EMOTE_COOLDOWN_MS,
  EMOTE_DISPLAY_MS,
  prunePlayerEmoteBursts,
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
  };
}

function playingState(players, extra = {}) {
  return {
    phase: "playing",
    seed: 1,
    config: gameConfig(),
    roomCode: "T",
    players,
    turnOrder: players.map((x) => x.id),
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
    playerEmoteBursts: [],
    ...extra,
  };
}

describe("player emotes", () => {
  it("prunePlayerEmoteBursts tar bort gamla poster", () => {
    const now = 10_000;
    const bursts = [
      { playerId: "a", emoteId: "happy", at: now - EMOTE_DISPLAY_MS - 1 },
      { playerId: "b", emoteId: "sad", at: now - 100 },
    ];
    const pruned = prunePlayerEmoteBursts(bursts, now);
    assert.equal(pruned.length, 1);
    assert.equal(pruned[0]?.playerId, "b");
  });

  it("sendEmote lägger till burst", () => {
    const p1 = mkPlayer({ id: "p1", name: "A", isHost: true });
    const p2 = mkPlayer({ id: "p2", name: "B", isHost: false, tileIndex: 1 });
    const state = playingState([p1, p2]);
    const r = applyAction(state, { type: "sendEmote", playerId: "p2", emoteId: "angry" });
    assert.equal(r.error, undefined);
    assert.equal(r.state.playerEmoteBursts?.length, 1);
    assert.equal(r.state.playerEmoteBursts?.[0]?.emoteId, "angry");
    assert.equal(r.state.playerEmoteBursts?.[0]?.playerId, "p2");
  });

  it("sendEmote inom cooldown avvisas", () => {
    const p1 = mkPlayer({ id: "p1", name: "A", isHost: true });
    const p2 = mkPlayer({ id: "p2", name: "B", isHost: false, tileIndex: 1 });
    const now = Date.now();
    const state = playingState([p1, p2], {
      playerEmoteBursts: [{ playerId: "p2", emoteId: "happy", at: now - 1000 }],
    });
    const r = applyAction(state, { type: "sendEmote", playerId: "p2", emoteId: "sad" });
    assert.match(String(r.error ?? ""), /Vänta lite/);
    assert.equal(r.state.playerEmoteBursts?.length, 1);
    assert.equal(r.state.playerEmoteBursts?.[0]?.emoteId, "happy");
  });

  it("sendEmote tillåts efter cooldown", () => {
    const p1 = mkPlayer({ id: "p1", name: "A", isHost: true });
    const p2 = mkPlayer({ id: "p2", name: "B", isHost: false, tileIndex: 1 });
    const now = Date.now();
    const state = playingState([p1, p2], {
      playerEmoteBursts: [{ playerId: "p2", emoteId: "happy", at: now - EMOTE_COOLDOWN_MS - 50 }],
    });
    const r = applyAction(state, { type: "sendEmote", playerId: "p2", emoteId: "sad" });
    assert.equal(r.error, undefined);
    assert.ok((r.state.playerEmoteBursts ?? []).some((b) => b.emoteId === "sad"));
  });
});
