import type { Player } from "./types.js";

/** Tillbehör som räknas in i burk-trio (gamla sparningar kan ha det gamla namnet). */
export const BEER_CAN_SHIELD_NAMES = ["Burksköld", "Pilsnersköld"] as const;

export const BEER_CAN_RUSTNING_NAME = "Burkrustning";
export const BEER_CAN_HELM1_NAME = "Burkhjälm";
export const BEER_CAN_HELM2_NAME = "Legendarisk Burkhjälm";
/** Tidigare visningsnamn (sparade spel). */
export const BEER_CAN_HELM2_LEGACY_NAME = "Burkhjälm II";

/** Legendarisk Burkhjälm ger ingen skadereduktion under denna klunk-gräns. */
export const BEER_HELM2_MIN_KLUNKAR = 15;

export function isBeerCanShieldName(name: string | undefined): boolean {
  return !!name && (BEER_CAN_SHIELD_NAMES as readonly string[]).includes(name);
}

export function isLegendariskBurkhjälmName(name: string | undefined): boolean {
  return name === BEER_CAN_HELM2_NAME || name === BEER_CAN_HELM2_LEGACY_NAME;
}

/**
 * Extra skadereduktion från burk-setet (rustning + Burkhjälm I + sköld).
 * Rustning + hjälm I räknas ihop max −2; sköld bidrar alltid högst −1 till totalen.
 * Alltså: 1 del → −1, 2 delar → −2, alla tre → −3.
 */
export function beerCanTrioDamageNegate(p: Player): number {
  const rust = p.equipment.armor?.name === BEER_CAN_RUSTNING_NAME ? 1 : 0;
  const h1 = p.equipment.helmet?.name === BEER_CAN_HELM1_NAME ? 1 : 0;
  const rustHelm = Math.min(rust + h1, 2);
  const sh = isBeerCanShieldName(p.equipment.accessory?.name) ? 1 : 0;
  return Math.min(rustHelm + sh, 3);
}

export function burkhjälmIIEffectiveDamageNegate(p: Player): number {
  const h = p.equipment.helmet;
  if (!h || !isLegendariskBurkhjälmName(h.name)) return 0;
  if ((p.klunkar ?? 0) < BEER_HELM2_MIN_KLUNKAR) return 0;
  return Math.max(0, h.damageNegate ?? 0);
}

export function armorDamageNegateExcludingBeerCanSet(p: Player): number {
  const a = p.equipment.armor;
  if (!a) return 0;
  if (a.name === BEER_CAN_RUSTNING_NAME) return 0;
  return a.damageNegate ?? 0;
}

export function helmetDamageNegateExcludingBeerCanSet(p: Player): number {
  const h = p.equipment.helmet;
  if (!h) return 0;
  if (h.name === BEER_CAN_HELM1_NAME) return 0;
  if (isLegendariskBurkhjälmName(h.name)) return burkhjälmIIEffectiveDamageNegate(p);
  return h.damageNegate ?? 0;
}

export function accessoryDamageNegateExcludingBeerCanSet(p: Player): number {
  const x = p.equipment.accessory;
  if (!x) return 0;
  if (isBeerCanShieldName(x.name)) return 0;
  return x.damageNegate ?? 0;
}
