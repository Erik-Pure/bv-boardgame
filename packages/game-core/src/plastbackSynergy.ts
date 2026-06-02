import type { Player } from "./types.js";

export const PLASTBACK_ACCESSORY_NAME = "Plastback";
export const TOM_FLASKA_WEAPON_NAME = "Tom flaska";
/** Full synergi: antal monstersegrar Tom flaska håller med Plastback. */
export const PLASTBACK_FULL_FLASK_COUNT = 6;

/** Kvarvarande Tom flaska-vinster med Plastback utrustad; null om synergin inte gäller. */
export function plastbackFlasksRemainingCount(p: Player): number | null {
  const w = p.equipment.weapon;
  if (
    p.equipment.accessory?.name !== PLASTBACK_ACCESSORY_NAME ||
    w?.name !== TOM_FLASKA_WEAPON_NAME ||
    w.breakOnWin !== true
  ) {
    return null;
  }
  const n = w.breakWinsRemaining;
  if (typeof n === "number") return Math.max(0, Math.floor(n));
  return PLASTBACK_FULL_FLASK_COUNT;
}

/** Pant vid försäljning av Plastback (= kvarvarande flaskor om Tom flaska-synergi). */
export function plastbackAccessorySellPant(p: Player): number {
  return plastbackFlasksRemainingCount(p) ?? 0;
}

/** Tom flaska + Plastback: 6 vinster innan vapnet går sönder; utan Plastback rensas räknaren. */
export function syncPlastbackEmptyBottleSynergy(p: Player): void {
  const w = p.equipment.weapon;
  const a = p.equipment.accessory;
  if (w?.name === TOM_FLASKA_WEAPON_NAME && w.breakOnWin === true && a?.name === PLASTBACK_ACCESSORY_NAME) {
    if (w.breakWinsRemaining == null) w.breakWinsRemaining = PLASTBACK_FULL_FLASK_COUNT;
  } else if (w?.name === TOM_FLASKA_WEAPON_NAME && w.breakOnWin === true) {
    if (w.breakWinsRemaining != null) delete w.breakWinsRemaining;
  }
}
