import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canAffordPant, playerPant } from "../dist/playerPant.js";

describe("playerPant", () => {
  it("reads gold as non-negative pant", () => {
    assert.equal(playerPant({ gold: 7 }), 7);
    assert.equal(playerPant({ gold: -3 }), 0);
    assert.equal(playerPant(null), 0);
  });

  it("canAffordPant compares floored cost", () => {
    assert.equal(canAffordPant({ gold: 5 }, 5), true);
    assert.equal(canAffordPant({ gold: 4 }, 5), false);
    assert.equal(canAffordPant({ gold: 4 }, 4.9), true);
  });
});
