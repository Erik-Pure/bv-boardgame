/** Kort paus efter modalen visas innan exit. */
export const BOSS_FINALE_PAUSE_MS = 400;

/** Tid att läsa vinsttext på kortet innan snurr (mobil + bord). */
export const BOSS_FINALE_CARD_HOLD_MS = 5200;

/** Snurr + krymp — jämn rotation, ingen mittpaus. */
export const BOSS_FINALE_EXIT_MS = 1800;

/** Stjärna visas sent i exit (andel av {@link BOSS_FINALE_EXIT_MS}). */
export const BOSS_FINALE_STAR_AT_EXIT_FRACTION = 0.82;

/** Stjärn-glimt efter att kortet nästan försvunnit. */
export const BOSS_FINALE_STAR_MS = 750;

/** CSS-variabler för exit-animation (synka med konstanterna ovan). */
export function bossFinaleExitCssVars(): Record<string, string> {
  return {
    "--boss-finale-exit-ms": `${BOSS_FINALE_EXIT_MS}ms`,
    "--boss-finale-star-ms": `${BOSS_FINALE_STAR_MS}ms`,
  };
}
