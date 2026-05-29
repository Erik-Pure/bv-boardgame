/** Skala strids-/sabotagemod baserat på brädnivå (0-baserad). */
export function scaledCombatMod(baseMod: number, boardLevelIndex: number): number {
  const level = Math.max(0, Math.floor(boardLevelIndex));
  const scale = 1 + level * 0.12;
  const scaled = Math.round(baseMod * scale);
  if (baseMod < 0) return Math.min(-1, scaled);
  if (baseMod > 0) return Math.max(1, scaled);
  return 0;
}
