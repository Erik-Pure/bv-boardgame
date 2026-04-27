import type { Player } from "./types.js";
import { beerCanBurkrustningBonusMaxHp } from "./beerCanEquipment.js";

/** Max HP = lobbybas + rustning/hjälm-bonus + burk-rustning (samma som tidigare fast med konfigurerbar bas). */
export function playerMaxHpFromBase(baseMaxHp: number, p: Player): number {
  const arm = p.equipment.armor?.bonusHp ?? 0;
  const helm = p.equipment.helmet?.bonusHp ?? 0;
  return baseMaxHp + arm + helm + beerCanBurkrustningBonusMaxHp(p);
}
