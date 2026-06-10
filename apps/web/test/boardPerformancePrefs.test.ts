import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isMobileTouchDevice, lowEndPerformanceProfile } from "../src/lib/boardPerformancePrefs.ts";

describe("lowEndPerformanceProfile", () => {
  it("flags reduced motion", () => {
    assert.equal(lowEndPerformanceProfile({ prefersReducedMotion: true }), true);
  });

  it("flags low core count", () => {
    assert.equal(lowEndPerformanceProfile({ hardwareConcurrency: 4 }), true);
    assert.equal(lowEndPerformanceProfile({ hardwareConcurrency: 8 }), false);
  });

  it("flags mobile with low device memory", () => {
    assert.equal(
      lowEndPerformanceProfile({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        deviceMemory: 3,
      }),
      true,
    );
    assert.equal(
      lowEndPerformanceProfile({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        deviceMemory: 8,
      }),
      false,
    );
  });
});

describe("isMobileTouchDevice", () => {
  it("exports a boolean probe function", () => {
    assert.equal(typeof isMobileTouchDevice(), "boolean");
  });
});
