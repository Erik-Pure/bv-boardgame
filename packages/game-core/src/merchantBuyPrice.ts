import type { Player } from "./types.js";

/** Pant att betala i Panta burkar efter VIB-rabatt (golv 1). */
export function effectiveMerchantBuyPrice(player: Player, listPrice: number): number {
  const d = Math.max(0, Math.floor(player.equipment.accessory?.merchantDiscountGold ?? 0));
  const base = Math.max(0, Math.floor(listPrice));
  return Math.max(1, base - d);
}
