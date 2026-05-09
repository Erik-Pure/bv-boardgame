/** Explicita XP-trösklar för bryggnivå (UI visar intern nivå + 1, minimum 1). */
export const BREWER_LEVEL_XP_THRESHOLDS = [120, 300, 620, 980, 1380] as const;

export function xpThresholdForBrewerLevel(level: number): number {
  const lvl = Math.max(0, Math.floor(level));
  if (lvl <= 0) return 0;
  if (lvl <= BREWER_LEVEL_XP_THRESHOLDS.length) return BREWER_LEVEL_XP_THRESHOLDS[lvl - 1] ?? 0;
  const lastKnown = BREWER_LEVEL_XP_THRESHOLDS[BREWER_LEVEL_XP_THRESHOLDS.length - 1] ?? 0;
  const prevKnown = BREWER_LEVEL_XP_THRESHOLDS[BREWER_LEVEL_XP_THRESHOLDS.length - 2] ?? lastKnown;
  const tailStep = Math.max(1, lastKnown - prevKnown);
  return lastKnown + (lvl - BREWER_LEVEL_XP_THRESHOLDS.length) * tailStep;
}

/** Bryggnivåindex från XP (samma interna skala som {@link brewerLevel} i engine). */
export function brewerLevelFromXp(xp: number): number {
  const totalXp = Math.max(0, Math.floor(xp));
  let level = 0;
  for (let i = 0; i < BREWER_LEVEL_XP_THRESHOLDS.length; i++) {
    const threshold = BREWER_LEVEL_XP_THRESHOLDS[i] ?? 0;
    if (totalXp < threshold) break;
    level = i + 1;
  }
  if (level < BREWER_LEVEL_XP_THRESHOLDS.length) return level;
  const lastKnown = BREWER_LEVEL_XP_THRESHOLDS[BREWER_LEVEL_XP_THRESHOLDS.length - 1] ?? 0;
  const prevKnown = BREWER_LEVEL_XP_THRESHOLDS[BREWER_LEVEL_XP_THRESHOLDS.length - 2] ?? lastKnown;
  const tailStep = Math.max(1, lastKnown - prevKnown);
  return BREWER_LEVEL_XP_THRESHOLDS.length + Math.floor((totalXp - lastKnown) / tailStep);
}
