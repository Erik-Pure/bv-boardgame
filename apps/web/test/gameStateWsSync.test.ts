import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyFullGameState,
  applyGameStateDelta,
  createStateSeqTracker,
} from "../src/lib/gameStateWsSync.ts";

function baseState() {
  return {
    phase: "playing" as const,
    config: {},
    players: [{ id: "a", name: "A", gold: 5, hp: 10, maxHp: 10, klunkar: 0 }],
    turnOrder: ["a"],
    currentTurnIndex: 0,
    levels: [{ tiles: [{ type: "start" as const }] }],
    log: [],
    logSeq: 0,
  };
}

describe("gameStateWsSync", () => {
  it("tracks seq across snapshot and deltas", () => {
    const tracker = createStateSeqTracker();
    const full = applyFullGameState(tracker, baseState(), 3);
    assert.ok(full);
    const next = applyGameStateDelta(tracker, full, 4, { currentTurnIndex: 1 }, () => {
      assert.fail("should not resync");
    });
    assert.equal(next?.currentTurnIndex, 1);
  });

  it("requests resync on seq gap without applying patch", () => {
    const tracker = createStateSeqTracker();
    const full = applyFullGameState(tracker, baseState(), 2);
    let resync = 0;
    const next = applyGameStateDelta(tracker, full, 5, { currentTurnIndex: 9 }, () => {
      resync += 1;
    });
    assert.equal(resync, 1);
    assert.equal(next?.currentTurnIndex, 0);
  });
});
