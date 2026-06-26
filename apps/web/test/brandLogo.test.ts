import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { brandLogoPngPath } from "../src/lib/brandLogo.ts";

describe("brandLogo", () => {
  it("returns Swedish stacked logo by default", () => {
    assert.equal(brandLogoPngPath("stacked", "sv"), "/icons/bmm-logo.png");
    assert.equal(brandLogoPngPath("horizontal", "sv"), "/icons/bmm-logo-horisontal.png");
  });

  it("returns English logos when locale is en", () => {
    assert.equal(brandLogoPngPath("stacked", "en"), "/icons/bmm-logo-en.png");
    assert.equal(brandLogoPngPath("horizontal", "en"), "/icons/bmm-logo-horisontal-en.png");
  });
});
