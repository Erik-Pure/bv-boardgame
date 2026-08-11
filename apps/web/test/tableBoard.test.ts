import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ringDistance,
  ringPathIndices,
  tileBobCircuitSequenceIndex,
  tileBobCircuitSequenceLength,
  tileBobFullRingRadius,
  tileBobMoveChoiceMeta,
  tileBobMoveChoiceSequenceLength,
  tileBobSequenceIndex,
  tileBobSequenceLength,
} from "../src/lib/tableBoard.ts";

describe("ringDistance", () => {
  it("returns 0 for the same tile", () => {
    assert.equal(ringDistance(3, 3, 16), 0);
  });

  it("takes the shorter arc around the ring", () => {
    assert.equal(ringDistance(0, 1, 16), 1);
    assert.equal(ringDistance(0, 15, 16), 1);
    assert.equal(ringDistance(0, 8, 16), 8);
    assert.equal(ringDistance(2, 14, 16), 4);
  });

  it("handles negative / wrapped indices", () => {
    assert.equal(ringDistance(-1, 0, 16), 1);
    assert.equal(ringDistance(16, 1, 16), 1);
  });

  it("returns 0 when n is non-positive", () => {
    assert.equal(ringDistance(0, 5, 0), 0);
    assert.equal(ringDistance(0, 5, -2), 0);
  });
});

describe("ringPathIndices", () => {
  it("includes from and to along the chosen direction", () => {
    assert.deepEqual(ringPathIndices(0, 3, 16, "cw"), [0, 1, 2, 3]);
    assert.deepEqual(ringPathIndices(0, 13, 16, "ccw"), [0, 15, 14, 13]);
  });
});

describe("tileBobSequenceIndex", () => {
  it("skips the player tile and tiles beyond radius", () => {
    assert.equal(tileBobSequenceIndex(0, 0, 16), null);
    assert.equal(tileBobSequenceIndex(6, 0, 16), null);
    assert.equal(tileBobSequenceIndex(8, 0, 16), null);
  });

  it("uses the same step for both directions at equal distance", () => {
    assert.equal(tileBobSequenceIndex(1, 0, 16), 0);
    assert.equal(tileBobSequenceIndex(15, 0, 16), 0);
    assert.equal(tileBobSequenceIndex(2, 0, 16), 1);
    assert.equal(tileBobSequenceIndex(14, 0, 16), 1);
  });

  it("matches sequence length within default radius 5", () => {
    assert.equal(tileBobSequenceLength(16), 5);
    assert.equal(tileBobSequenceIndex(5, 0, 16), 4);
    assert.equal(tileBobSequenceIndex(11, 0, 16), 4);
  });

  it("covers the full ring when using full-ring radius", () => {
    const full = tileBobFullRingRadius(16);
    assert.equal(full, 7);
    assert.equal(tileBobSequenceLength(16, full), 7);
    assert.equal(tileBobSequenceIndex(7, 0, 16, full), 6);
    assert.equal(tileBobSequenceIndex(9, 0, 16, full), 6);
    assert.equal(tileBobSequenceIndex(8, 0, 16, full), null);
  });
});

describe("tileBobCircuitSequenceIndex", () => {
  it("runs clockwise around the ring and skips the player tile", () => {
    assert.equal(tileBobCircuitSequenceIndex(0, 0, 16), null);
    assert.equal(tileBobCircuitSequenceIndex(1, 0, 16), 0);
    assert.equal(tileBobCircuitSequenceIndex(2, 0, 16), 1);
    assert.equal(tileBobCircuitSequenceIndex(15, 0, 16), 14);
    assert.equal(tileBobCircuitSequenceLength(16), 15);
  });
});

describe("tileBobMoveChoiceMeta", () => {
  it("excludes from and target tiles and sets steps along both paths", () => {
    const meta = tileBobMoveChoiceMeta(
      0,
      [
        { dir: "cw", targetTileIndex: 4 },
        { dir: "ccw", targetTileIndex: 12 },
      ],
      16,
    );
    assert.equal(meta.has(0), false);
    assert.equal(meta.has(4), false);
    assert.equal(meta.has(12), false);
    assert.deepEqual(meta.get(1), { step: 1, pathLen: 3 });
    assert.deepEqual(meta.get(2), { step: 2, pathLen: 3 });
    assert.deepEqual(meta.get(3), { step: 3, pathLen: 3 });
    assert.deepEqual(meta.get(15), { step: 1, pathLen: 3 });
    assert.deepEqual(meta.get(14), { step: 2, pathLen: 3 });
    assert.deepEqual(meta.get(13), { step: 3, pathLen: 3 });
    assert.equal(tileBobMoveChoiceSequenceLength(meta), 3);
  });

  it("returns empty when die lands on adjacent tile (no mid tiles)", () => {
    const meta = tileBobMoveChoiceMeta(0, [{ dir: "cw", targetTileIndex: 1 }], 16);
    assert.equal(meta.size, 0);
    assert.equal(tileBobMoveChoiceSequenceLength(meta), 0);
  });
});
