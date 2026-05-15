import type { Player } from "./types.js";

export const PLASTBACK_ACCESSORY_NAME = "Plastback";
export const TOM_FLASKA_WEAPON_NAME = "Tom flaska";

/** Tom flaska + Plastback: 6 vinster innan vapnet går sönder; utan Plastback rensas räknaren. */
export function syncPlastbackEmptyBottleSynergy(p: Player): void {
  const w = p.equipment.weapon;
  const a = p.equipment.accessory;
  if (w?.name === TOM_FLASKA_WEAPON_NAME && w.breakOnWin === true && a?.name === PLASTBACK_ACCESSORY_NAME) {
    if (w.breakWinsRemaining == null) w.breakWinsRemaining = 6;
  } else if (w?.name === TOM_FLASKA_WEAPON_NAME && w.breakOnWin === true) {
    if (w.breakWinsRemaining != null) delete w.breakWinsRemaining;
  }
}
