import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { DEFAULT_SITE_URL, resolveSiteUrl } from "../scripts/seo-site-url.mjs";

const ENV_KEYS = ["VITE_SITE_URL", "VERCEL_ENV", "VERCEL_URL"];
const original = {};

function saveEnv() {
  for (const key of ENV_KEYS) original[key] = process.env[key];
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
}

function clearEnv() {
  for (const key of ENV_KEYS) delete process.env[key];
}

describe("resolveSiteUrl", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("prefers VITE_SITE_URL when set", () => {
    saveEnv();
    clearEnv();
    process.env.VITE_SITE_URL = "https://example.test/";
    assert.equal(resolveSiteUrl(), "https://example.test");
  });

  it("uses the public custom domain on Vercel production", () => {
    saveEnv();
    clearEnv();
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_URL = "bv-boardgame-preview.vercel.app";
    assert.equal(resolveSiteUrl(), DEFAULT_SITE_URL);
  });

  it("uses VERCEL_URL on preview deployments", () => {
    saveEnv();
    clearEnv();
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "bv-boardgame-preview.vercel.app";
    assert.equal(resolveSiteUrl(), "https://bv-boardgame-preview.vercel.app");
  });
});
