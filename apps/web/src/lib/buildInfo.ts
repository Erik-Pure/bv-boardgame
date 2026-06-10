/** Visningssträng för live-version (t.ex. `v0.9.0 · a1b2c3d`). Bumpa `apps/web/package.json` vid release. */
export function appVersionLabel(): string {
  const base = `v${__APP_VERSION__}`;
  const build = __APP_BUILD_ID__.trim();
  if (!build) return base;
  return `${base} · ${build}`;
}
