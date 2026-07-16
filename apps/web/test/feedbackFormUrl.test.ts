import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GameState } from "@bv/game-core";
import { buildFeedbackFormUrl, gameDurationMinutes } from "../src/lib/feedbackFormUrl.js";

const STARTED_AT = 1_700_000_000_000;

function endedState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: "ended",
    seed: 424242,
    config: {
      gameMode: "bossKill",
      turnSeconds: 60,
      reactionSeconds: 15,
      difficulty: "folkol",
      hardcore: false,
      allowLateJoin: false,
      boardSize: "default",
      levelCount: 3,
      maxHp: 10,
      startPant: 5,
      wakeLockBeforeStart: false,
      disabledCardIds: [],
      cardCover: "card1",
    },
    roomCode: "ABC123",
    players: [{ id: "a", name: "A" } as GameState["players"][number]],
    turnOrder: ["a"],
    currentTurnIndex: 0,
    levels: [],
    pending: null,
    log: [
      { at: STARTED_AT, message: "— Bryggmästarnas Mästare börjar! (seed 424242) —" },
      { at: STARTED_AT + 45 * 60_000, message: "Slut." },
    ],
    winnerId: "a",
    winnerName: "A",
    gameStartedAt: STARTED_AT,
    goldenBeerCarrierId: null,
    finalBossMonsterId: null,
    finalBossLivesRemaining: null,
    bossFinaleExitStartedAt: null,
    treasureTaken: {},
    lastDiceRoll: null,
    lastDiceRollerId: null,
    sipNotices: [],
    playerEmoteBursts: [],
    playerKlunkBursts: [],
    ...overrides,
  };
}

describe("feedbackFormUrl", () => {
  it("returns null when form base URL is unset", () => {
    assert.equal(buildFeedbackFormUrl(endedState(), Date.now(), undefined), null);
  });

  it("builds pre-filled query from entry ids", () => {
    const url = buildFeedbackFormUrl(
      endedState(),
      STARTED_AT + 45 * 60_000,
      "https://docs.google.com/forms/d/e/TEST/viewform",
      {
        players: "111",
        minutes: "222",
        levels: "666",
        difficulty: "777",
      },
    );
    assert.ok(url);
    const parsed = new URL(url!);
    assert.equal(parsed.searchParams.get("entry.111"), "1");
    assert.equal(parsed.searchParams.get("entry.222"), "45");
    assert.equal(parsed.searchParams.get("entry.666"), "3");
    assert.equal(parsed.searchParams.get("entry.777"), "Folköl");
  });

  it("computes duration from log when gameStartedAt is missing", () => {
    const endAt = STARTED_AT + 30 * 60_000;
    const state = endedState({
      gameStartedAt: null,
      log: [
        { at: STARTED_AT, message: "— Bryggmästarnas Mästare börjar! (seed 424242) —" },
        { at: endAt, message: "Slut." },
      ],
    });
    assert.equal(gameDurationMinutes(state, endAt), 30);
  });
});
