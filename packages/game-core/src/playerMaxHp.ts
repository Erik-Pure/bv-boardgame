import type { Player } from "./types.js";
import { beerCanBurkrustningBonusMaxHp, burkhjälmIIEffectiveBonusHpFrom } from "./beerCanEquipment.js";

/** Max HP = lobbybas + rustning/hjälm/vapen-bonus + burk-rustning (samma som tidigare fast med konfigurerbar bas). */
export function playerMaxHpFromBase(baseMaxHp: number, p: Player): number {
  const arm = p.equipment.armor?.bonusHp ?? 0;
  const helm = burkhjälmIIEffectiveBonusHpFrom(p.xp ?? 0, p.equipment.helmet);
  const weapon = p.equipment.weapon?.bonusHp ?? 0;
  return baseMaxHp + arm + helm + weapon + beerCanBurkrustningBonusMaxHp(p) + (p.brewerHpBonus ?? 0);
}
