import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPageSeo, isIndexablePath, normalizePath, seoPageKeyForPath } from "../src/lib/seo.ts";
import { getUiStrings } from "../src/lib/uiStrings.ts";

describe("seo", () => {
  it("normalizes trailing slashes", () => {
    assert.equal(normalizePath("/rules/"), "/rules");
    assert.equal(normalizePath("/"), "/");
  });

  it("maps routes to page keys", () => {
    assert.equal(seoPageKeyForPath("/"), "home");
    assert.equal(seoPageKeyForPath("/rules"), "rules");
    assert.equal(seoPageKeyForPath("/cards"), "cards");
    assert.equal(seoPageKeyForPath("/play"), "private");
  });

  it("marks only public pages as indexable", () => {
    assert.equal(isIndexablePath("/"), true);
    assert.equal(isIndexablePath("/rules"), true);
    assert.equal(isIndexablePath("/join"), false);
  });

  it("returns localized metadata for indexable pages", () => {
    const sv = getPageSeo("/", getUiStrings("sv"));
    const en = getPageSeo("/", getUiStrings("en"));

    assert.equal(sv.robots, "index, follow");
    assert.match(sv.title, /Bryggmästarnas Mästare/);
    assert.match(en.title, /Brewmasters/);
    assert.ok(sv.description.length > 20);
  });

  it("noindexes private routes", () => {
    const seo = getPageSeo("/play", getUiStrings("sv"));
    assert.equal(seo.robots, "noindex, nofollow");
  });
});
