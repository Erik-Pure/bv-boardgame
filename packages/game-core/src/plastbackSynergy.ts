import { EQUIPMENT_CATALOG } from "./equipmentDefs.js";
import type { Accessory, EquipmentSlot, Player, Weapon } from "./types.js";

export const PLASTBACK_ACCESSORY_NAME = "Plastback";
export const PLASTBACK_CATALOG_ID = "ex_plastback";
export const TOM_FLASKA_WEAPON_NAME = "Tom flaska";
export const TOM_FLASKA_CATALOG_ID = "ew_empty_bottle";
/** Full synergi: antal monstersegrar Tom flaska håller med Plastback. */
export const PLASTBACK_FULL_FLASK_COUNT = 6;

function plastbackAccessory(p: Player): Accessory | undefined {
  const a = p.equipment.accessory;
  if (a?.name !== PLASTBACK_ACCESSORY_NAME) return undefined;
  return a;
}

/** Flaskor kvar i Plastback-hållaren (default 6 för äldre sparade partier). */
export function plastbackPackRemainingCount(p: Player): number {
  const a = plastbackAccessory(p);
  if (!a) return 0;
  const n = a.plastbackPackRemaining;
  if (typeof n === "number") return Math.max(0, Math.min(PLASTBACK_FULL_FLASK_COUNT, Math.floor(n)));
  return PLASTBACK_FULL_FLASK_COUNT;
}

export function initPlastbackPack(accessory: Accessory): void {
  if (accessory.name !== PLASTBACK_ACCESSORY_NAME) return;
  accessory.plastbackPackRemaining = PLASTBACK_FULL_FLASK_COUNT;
}

/** @deprecated Använd plastbackPackRemainingCount för Plastback-badge; behålls för vapnets vinster. */
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

/** Pant vid försäljning av Plastback (= flaskor kvar i hållaren). */
export function plastbackAccessorySellPant(p: Player): number {
  return plastbackPackRemainingCount(p);
}

/** Minskar pack med 1 om möjligt. */
export function takePlastbackPackBottle(p: Player): boolean {
  const a = plastbackAccessory(p);
  if (!a) return false;
  const left = plastbackPackRemainingCount(p);
  if (left <= 0) return false;
  a.plastbackPackRemaining = left - 1;
  return true;
}

/** Utrusta Tom flaska från katalog (Plastback-synergi via sync). */
export function equipTomFlaskaFromPlastback(p: Player): void {
  const eq = EQUIPMENT_CATALOG.find((e) => e.id === TOM_FLASKA_CATALOG_ID);
  if (!eq || eq.slot !== "weapon") {
    p.equipment.weapon = {
      name: TOM_FLASKA_WEAPON_NAME,
      power: 5,
      breakOnWin: true,
    };
  } else {
    p.equipment.weapon = {
      name: eq.name,
      power: eq.power ?? 5,
      sipAttackBonus: eq.sipAttackBonus,
      sipWeaponBonusGoldCost: eq.sipWeaponBonusGoldCost,
      sipWeaponBonusKlunks: eq.sipWeaponBonusKlunks,
      pvpDieBonus: eq.pvpDieBonus,
      gainGoldOnWin: eq.gainGoldOnWin,
      powerAtGold10: eq.powerAtGold10,
      powerAtGold20: eq.powerAtGold20,
      powerAtGold30: eq.powerAtGold30,
      powerDynamicMax: eq.powerDynamicMax,
      randomOtherDamageOnWin: eq.randomOtherDamageOnWin,
      breakOnWin: eq.breakOnWin,
      monsterLossSipReduction: eq.monsterLossSipReduction,
    };
  }
  syncPlastbackEmptyBottleSynergy(p);
}

/** Tom flaska + Plastback: 6 vinster innan vapnet går sönder; utan Plastback rensas räknaren. */
export function syncPlastbackEmptyBottleSynergy(p: Player): void {
  const w = p.equipment.weapon;
  if (w) ensureTomFlaskaWeaponFlags(w);
  const a = p.equipment.accessory;
  if (w?.name === TOM_FLASKA_WEAPON_NAME && w.breakOnWin === true && a?.name === PLASTBACK_ACCESSORY_NAME) {
    if (w.breakWinsRemaining == null) w.breakWinsRemaining = PLASTBACK_FULL_FLASK_COUNT;
  } else if (w?.name === TOM_FLASKA_WEAPON_NAME && w.breakOnWin === true) {
    if (w.breakWinsRemaining != null) delete w.breakWinsRemaining;
  }
}

/** Äldre sparade vapen kan sakna breakOnWin trots Tom flaska-namn. */
export function ensureTomFlaskaWeaponFlags(weapon: Weapon): void {
  if (weapon.name === TOM_FLASKA_WEAPON_NAME && weapon.breakOnWin !== true) {
    weapon.breakOnWin = true;
  }
}

/** När tillbehör tas bort kan Tom flaskas vinsteräknare behöva synkas om. */
export function onPlayerEquipmentSlotCleared(player: Player, slot: EquipmentSlot): void {
  if (slot === "accessory") syncPlastbackEmptyBottleSynergy(player);
}
