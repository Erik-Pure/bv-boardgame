import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeFitToViewportScale,
  FIT_MAX_SCALE,
  FIT_MIN_SCALE,
  softReservedBottom,
} from "../src/hooks/useFitToViewportScale.ts";

describe("computeFitToViewportScale", () => {
  it("krymper under 1 när innehållet är högre än viewporten (tablet)", () => {
    const s = computeFitToViewportScale({
      contentW: 720,
      contentH: 900,
      viewportW: 1024,
      viewportH: 768,
      reservedTop: 70,
      reservedBottom: 0,
      sidePadPx: 24,
      desiredScale: 1,
    });
    // fitByHeight = (768 - 70) / 900 ≈ 0.776
    assert.ok(s < 1);
    assert.equal(s, Math.round(((768 - 70) / 900) * 1000) / 1000);
  });

  it("behåller önskad uppskalning på stor skärm när höjden räcker", () => {
    const s = computeFitToViewportScale({
      contentW: 720,
      contentH: 800,
      viewportW: 2560,
      viewportH: 1440,
      reservedTop: 70,
      reservedBottom: 0,
      sidePadPx: 24,
      desiredScale: 1.48,
    });
    assert.equal(s, 1.48);
  });

  it("sänker önskad uppskalning när höjden inte räcker", () => {
    const s = computeFitToViewportScale({
      contentW: 720,
      contentH: 800,
      viewportW: 1920,
      viewportH: 900,
      reservedTop: 70,
      reservedBottom: 0,
      desiredScale: 1.48,
    });
    // fitByHeight = 830 / 800 = 1.0375 < 1.48
    assert.equal(s, Math.round((830 / 800) * 1000) / 1000);
  });

  it("reserverad bottenyta (solfjäder) minskar skalan", () => {
    const base = computeFitToViewportScale({
      contentW: 720,
      contentH: 700,
      viewportW: 1024,
      viewportH: 768,
      reservedTop: 44,
      reservedBottom: 0,
      desiredScale: 1,
    });
    const withFan = computeFitToViewportScale({
      contentW: 720,
      contentH: 700,
      viewportW: 1024,
      viewportH: 768,
      reservedTop: 44,
      reservedBottom: 260,
      desiredScale: 1,
    });
    assert.ok(withFan < base);
  });

  it("begränsas av bredden när innehållet är bredare än viewporten", () => {
    const s = computeFitToViewportScale({
      contentW: 720,
      contentH: 300,
      viewportW: 600,
      viewportH: 900,
      sidePadPx: 24,
      desiredScale: 1,
    });
    assert.equal(s, Math.round(((600 - 24) / 720) * 1000) / 1000);
  });

  it("golvas vid minScale även när utrymmet är extremt litet", () => {
    const s = computeFitToViewportScale({
      contentW: 720,
      contentH: 900,
      viewportW: 800,
      viewportH: 600,
      reservedTop: 70,
      reservedBottom: 480,
      desiredScale: 1,
    });
    assert.equal(s, FIT_MIN_SCALE);
  });

  it("takas vid maxScale", () => {
    const s = computeFitToViewportScale({
      contentW: 100,
      contentH: 100,
      viewportW: 4000,
      viewportH: 4000,
      desiredScale: 99,
    });
    assert.equal(s, FIT_MAX_SCALE);
  });

  it("returnerar önskad skala (clampad) innan innehållet är mätt", () => {
    const s = computeFitToViewportScale({
      contentW: 0,
      contentH: 0,
      viewportW: 1024,
      viewportH: 768,
      desiredScale: 1.2,
    });
    assert.equal(s, 1.2);
  });
});

describe("softReservedBottom", () => {
  it("behåller full reserv när innehållszonen ryms (stor TV)", () => {
    const r = softReservedBottom({
      reservedBottom: 474,
      viewportH: 1440,
      reservedTop: 84,
      minContentPx: 560,
    });
    assert.equal(r, 474);
  });

  it("krymper reserven på låg/bred skärm (ultrawide) så innehållszonen garanteras", () => {
    const r = softReservedBottom({
      reservedBottom: 474,
      viewportH: 850,
      reservedTop: 84,
      minContentPx: Math.min(560, Math.round(850 * 0.62)),
    });
    // 850 - 84 - 527 = 239 < 474
    assert.equal(r, 239);
  });

  it("går aldrig under 0", () => {
    const r = softReservedBottom({
      reservedBottom: 400,
      viewportH: 500,
      reservedTop: 70,
      minContentPx: 560,
    });
    assert.equal(r, 0);
  });
});
