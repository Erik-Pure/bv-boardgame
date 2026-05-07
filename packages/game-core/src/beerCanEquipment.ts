import type { Player } from "./types.js";

/** Tillbehör som räknas in i burk-setet (gamla sparningar kan ha det gamla namnet). */
export const BEER_CAN_SHIELD_NAMES = ["Burksköld", "Pilsnersköld"] as const;

export const BEER_CAN_RUSTNING_NAME = "Burkrustning";
export const BEER_CAN_HELM1_NAME = "Burkhjälm";
export const BEER_CAN_HELM2_NAME = "Legendarisk Burkhjälm";
/** Tidigare visningsnamn (sparade spel). */
export const BEER_CAN_HELM2_LEGACY_NAME = "Burkhjälm II";

/** Legendarisk Burkhjälm aktiveras först från våning/nivå 4. */
export const BEER_HELM2_MIN_LEVEL = 4;

export function isBeerCanShieldName(name: string | undefined): boolean {
  return !!name && (BEER_CAN_SHIELD_NAMES as readonly string[]).includes(name);
}

export function isLegendariskBurkhjälmName(name: string | undefined): boolean {
  return name === BEER_CAN_HELM2_NAME || name === BEER_CAN_HELM2_LEGACY_NAME;
}

/** Extra max HP från Burkrustning per antal set-delar (1 → 3). */
const BURK_TIER_EXTRA_MAX_HP = [2, 4, 10] as const;

/** Sköld-skada bort från Burksköld per antal set-delar (1 → 3). */
const BURK_TIER_SHIELD_NEGATE = [1, 2, 3] as const;

/** Antal utrustade burk-set-delar (rustning, Burkhjälm eller leg. Burkhjälm, burksköld). Högst 3. */
export function beerCanSetPiecesEquippedCount(p: Player): number {
  let n = 0;
  if (p.equipment.armor?.name === BEER_CAN_RUSTNING_NAME && p.gold > 0) n++;
  if (p.equipment.helmet?.name === BEER_CAN_HELM1_NAME) n++;
  if (isLegendariskBurkhjälmName(p.equipment.helmet?.name)) n++;
  if (isBeerCanShieldName(p.equipment.accessory?.name)) n++;
  return n;
}

/** Antal burk-set-delar utrustade, begränsat till 1–3 (index i tier-tabeller). */
function burkSetTierIndex(p: Player): number {
  const n = beerCanSetPiecesEquippedCount(p);
  return Math.min(3, Math.max(0, n));
}

/**
 * Skadereduktion från Burksköld/Pilsnersköld: +1 / +2 / +3 sköld beroende på hur många
 * burk-delar (rustning, Burkhjälm I, leg. Burkhjälm, sköld) du har utrustat totalt.
 */
export function beerCanTrioDamageNegate(p: Player): number {
  if (!isBeerCanShieldName(p.equipment.accessory?.name)) return 0;
  const n = burkSetTierIndex(p);
  if (n < 1) return 0;
  return BURK_TIER_SHIELD_NEGATE[n - 1];
}

/** Extra max HP när Burkrustning är utrustad: +2 / +4 / +10 beroende på antal set-delar. */
export function beerCanBurkrustningBonusMaxHp(p: Player): number {
  if (p.equipment.armor?.name !== BEER_CAN_RUSTNING_NAME) return 0;
  if (p.gold <= 0) return 0;
  const n = burkSetTierIndex(p);
  if (n < 1) return 0;
  return BURK_TIER_EXTRA_MAX_HP[n - 1];
}

/** Extra monster-/stridsattack när Burkhjälm (I) är utrustad: +1 / +2 / +3 beroende på antal set-delar. */
export function beerCanBurkhjälmSetCombatBonus(p: Player): number {
  if (p.equipment.helmet?.name !== BEER_CAN_HELM1_NAME) return 0;
  const n = burkSetTierIndex(p);
  if (n < 1) return 0;
  return n;
}

/** Total stridsattack från hjälmen (bas + klunk-trappor + burk-set), samma som i strid. */
export function helmetAttackBonus(p: Player): number {
  const h = p.equipment.helmet;
  if (!h) return 0;
  let bonus = h.combatBonus ?? 0;
  const k = p.klunkar ?? 0;
  if (typeof h.klunkAttackBonus20 === "number" && k >= 20) {
    bonus += h.klunkAttackBonus20;
  } else if (typeof h.klunkAttackBonus10 === "number" && k >= 10) {
    bonus += h.klunkAttackBonus10;
  }
  if (typeof h.klunkAttackBonusMax === "number") {
    return Math.min(bonus, h.klunkAttackBonusMax) + beerCanBurkhjälmSetCombatBonus(p);
  }
  return bonus + beerCanBurkhjälmSetCombatBonus(p);
}

/** Effektiv skadereduktion från hjälmen (0 under {@link BEER_HELM2_MIN_LEVEL}). */
export function burkhjälmIIEffectiveDamageNegateFrom(
  levelIndex: number,
  helmet: Player["equipment"]["helmet"] | undefined,
): number {
  if (!helmet || !isLegendariskBurkhjälmName(helmet.name)) return 0;
  if (Math.floor(levelIndex) + 1 < BEER_HELM2_MIN_LEVEL) return 0;
  return Math.max(0, helmet.damageNegate ?? 0);
}

export function burkhjälmIIEffectiveDamageNegate(p: Player): number {
  return burkhjälmIIEffectiveDamageNegateFrom(p.levelIndex ?? 0, p.equipment.helmet);
}

/** Effektiv bonus-HP från Legendarisk Burkhjälm (+5 först från nivå 4). */
export function burkhjälmIIEffectiveBonusHpFrom(
  levelIndex: number,
  helmet: Player["equipment"]["helmet"] | undefined,
): number {
  if (!helmet || !isLegendariskBurkhjälmName(helmet.name)) return helmet?.bonusHp ?? 0;
  if (Math.floor(levelIndex) + 1 < BEER_HELM2_MIN_LEVEL) return 0;
  return Math.max(0, helmet.bonusHp ?? 0);
}

export function burkhjälmIIEffectiveBonusHp(p: Player): number {
  return burkhjälmIIEffectiveBonusHpFrom(p.levelIndex ?? 0, p.equipment.helmet);
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
