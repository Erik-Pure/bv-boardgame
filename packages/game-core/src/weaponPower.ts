import type { Weapon } from "./types.js";

/** Vapnets kraft efter pant-trösklar (samma som i strid). */
export function effectiveWeaponPiecePower(weapon: Weapon | undefined, gold: number): number {
  if (!weapon) return 0;
  let pow = weapon.power ?? 0;
  if (typeof weapon.powerAtGold30 === "number" && gold >= 30) {
    pow = weapon.powerAtGold30;
  } else if (typeof weapon.powerAtGold20 === "number" && gold >= 20) {
    pow = weapon.powerAtGold20;
  } else if (typeof weapon.powerAtGold10 === "number" && gold >= 10) {
    pow = weapon.powerAtGold10;
  }
  if (typeof weapon.powerDynamicMax === "number") {
    pow = Math.min(pow, weapon.powerDynamicMax);
  }
  return pow;
}
