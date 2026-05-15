/** Samma bas som `shortcutItemGoldCostForTargetLevel` i motorn (nivåindex 0 = nivå 1 → 10 pant, osv.). */
function shortcutPantForTargetLevelIndex(targetLevelIndex: number): number {
  const levelNumber = Math.max(1, Math.floor(targetLevelIndex) + 1);
  return Math.max(0, levelNumber * 10);
}

/**
 * Pant som visas för Genväg / Taproom-nyckel (UI), samma logik som `useItem` i motorn:
 * sista våningen → kostnad utifrån nuvarande `levelIndex`; annars nästa våning (`levelIndex + 1`).
 * Taproom: 10 pant mindre än Genväg, golv 0.
 */
export function shortcutDisplayPantGold(
  itemId: "shortcut" | "taproom_key",
  levelIndex: number,
  levelCount: number,
): number {
  if (!Number.isFinite(levelCount) || levelCount < 1) {
    return shortcutPantForTargetLevelIndex(0);
  }
  const lastIdx = levelCount - 1;
  const onFinalFloor = levelIndex >= lastIdx;
  const base = onFinalFloor
    ? shortcutPantForTargetLevelIndex(levelIndex)
    : shortcutPantForTargetLevelIndex(levelIndex + 1);
  return itemId === "taproom_key" ? Math.max(0, base - 10) : base;
}
