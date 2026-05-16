/**
 * Temporärt boss-test — sätt `enabled` till false innan release/commit.
 * Flera boss-rutor på våning 1 (källare), 1 slutboss-liv, låg styrka.
 */
export const DEV_QUICK_BOSS_TEST = {
  enabled: false,
  /** Antal boss-rutor på våning 0 (visas som nivå 1 i UI). */
  bossTilesOnLevel0: 4,
  /** Slutboss-liv i state (`finalBossLivesRemaining`). */
  bossLives: 1,
  /** Styrka på boss-rutor (lätt att vinna med vilken t6 som helst). */
  bossCombatValue: 1,
} as const;
