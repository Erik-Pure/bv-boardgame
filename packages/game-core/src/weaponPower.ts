import { helmetAttackBonus } from "./beerCanEquipment.js";
import type { Player, Weapon } from "./types.js";

/** Vapnets kraft efter pant-trösklar (samma som i strid). */
/**
 * Pant resp. straffklunk(ar) för valfri vapenbonus (`sipAttackBonus`) före monstertärning.
 * Om `sipWeaponBonusKlunks` är positivt används klunkar; annars pant enligt `sipWeaponBonusGoldCost` eller äldre vapennamn (Enkel-/Dubbelpipa).
 */
export function sipWeaponExtraAttackCosts(w: Weapon | undefined): { gold: number; klunks: number } {
  if (!w || typeof w.sipAttackBonus !== "number" || w.sipAttackBonus <= 0) return { gold: 0, klunks: 0 };
  const kl = Math.max(0, Math.floor(w.sipWeaponBonusKlunks ?? 0));
  if (kl > 0) return { gold: 0, klunks: kl };
  const fallbackGold = w.name === "Dubbelpipa" ? 4 : w.name === "Enkelpipa" ? 2 : 0;
  const gold =
    typeof w.sipWeaponBonusGoldCost === "number"
      ? Math.max(0, Math.floor(w.sipWeaponBonusGoldCost))
      : fallbackGold;
  return { gold, klunks: 0 };
}

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

/**
 * All utrustningsattack som läggs till utöver t6 i monsterstrid (vapen efter pant-trappor + rustning/hjälm/tillbehör).
 * Ska matcha summan av `weaponPower` i motorn.
 */
export function monsterCombatEquipmentAttackBonus(p: Player): number {
  return (
    effectiveWeaponPiecePower(p.equipment.weapon, p.gold) +
    (p.equipment.armor?.combatBonus ?? 0) +
    helmetAttackBonus(p) +
    (p.equipment.accessory?.combatBonus ?? 0) +
    (p.brewerAttackBonus ?? 0)
  );
}

/**
 * BvB-tärning: summa av `pvpDieBonus` på vapen, rustning, hjälm och tillbehör (samma som tidigare `pvpRollStrengthBonus` i motorn).
 */
export function pvpEquipmentDieBonusTotal(p: Player): number {
  const e = p.equipment;
  return (
    (e.weapon?.pvpDieBonus ?? 0) +
    (e.armor?.pvpDieBonus ?? 0) +
    (e.helmet?.pvpDieBonus ?? 0) +
    (e.accessory?.pvpDieBonus ?? 0) +
    (p.brewerPvpBonus ?? 0)
  );
}
