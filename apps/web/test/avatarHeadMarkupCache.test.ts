import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("avatarHeadMarkupCache", () => {
  it("module exports loadTintedAvatarHeadMarkup", async () => {
    const mod = await import("../src/lib/avatarHeadMarkupCache.ts");
    assert.equal(typeof mod.loadTintedAvatarHeadMarkup, "function");
  });
});
