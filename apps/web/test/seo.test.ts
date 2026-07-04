import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildBreadcrumbStructuredData,
  buildStructuredData,
  getPageSeo,
  isIndexablePath,
  normalizePath,
  OG_IMAGE,
  PRODUCT_SITE_URL,
  seoPageKeyForPath,
} from "../src/lib/seo.ts";
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

  it("builds structured data for indexable routes", () => {
    const graphs = buildStructuredData("/", getUiStrings("sv"), "sv", PRODUCT_SITE_URL);
    assert.ok(graphs);
    assert.ok(graphs.some((node) => node["@type"] === "WebApplication"));
    assert.ok(graphs.some((node) => node["@type"] === "Organization"));
  });

  it("omits structured data for private routes", () => {
    assert.equal(buildStructuredData("/play", getUiStrings("sv"), "sv", PRODUCT_SITE_URL), null);
  });

  it("uses Bryggverket game logo for social previews", () => {
    assert.equal(OG_IMAGE.width, 779);
    assert.equal(OG_IMAGE.height, 582);
    assert.match(getPageSeo("/", getUiStrings("sv")).image, /\/icons\/bmm-logo\.png$/);
  });

  it("builds breadcrumb JSON-LD for rules and cards", () => {
    const rulesCrumb = buildBreadcrumbStructuredData("/rules", getUiStrings("sv"), PRODUCT_SITE_URL);
    assert.ok(rulesCrumb);
    const items = rulesCrumb.itemListElement as Array<{ position: number; name: string }>;
    assert.equal(items.length, 2);
    assert.equal(items[0]?.name, "Start");
    assert.equal(items[1]?.name, "Spelregler");

    assert.equal(buildBreadcrumbStructuredData("/", getUiStrings("sv"), PRODUCT_SITE_URL), null);
  });
});
