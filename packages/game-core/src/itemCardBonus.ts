import { scaledCombatMod } from "./scaledCombatMod.js";
import type { ItemId, Player } from "./types.js";

/** Bas-attackmod per föremål (innan brädnivå-skalning). */
export const COMBAT_ITEM_BASE_ATTACK_MODS: Record<string, number> = {
  weak_beer: -2,
  light_beer: 1,
  folk_beer: 2,
  tripwire: -1,
  double_hops: 2,
  beer_bomb: 3,
  hangover: -3,
  paidassasin: -5,
  monster_hype: -2,
  yeast_sabotage: -1,
  lengraddad: -2,
  manopositiv: 4,
  get_lucky: 4,
};

/** Platta använd-effekter (HP/pant/klunk) — inte stridsattackmods. */
export const FLAT_ITEM_USE_BASE_AMOUNTS: Partial<Record<ItemId, number>> = {
  healing_potion: 3,
  pretzel_snack: 2,
  coin_purse: 4,
  sip_card: 1,
};

/** Riktning bevaras: base −2 + bonus 1 → −3; base +3 + bonus 1 → +4. */
export function adjustFlatItemValue(base: number, bonus: number): number {
  const b = Math.max(0, Math.floor(bonus ?? 0));
  if (b === 0 || base === 0) return base;
  if (base > 0) return base + b;
  return base - b;
}

export function normalizeItemCardBonus(raw: number | undefined): number {
  return Math.max(0, Math.floor(raw ?? 0));
}

/** Summa från rustning, hjälm och tillbehör (ej bryggnivå). */
export function equipmentItemCardBonus(p: { equipment: Player["equipment"] }): number {
  let sum = 0;
  for (const piece of [p.equipment.armor, p.equipment.helmet, p.equipment.accessory]) {
    if (typeof piece?.itemCardBonus === "number") {
      sum += normalizeItemCardBonus(piece.itemCardBonus);
    }
  }
  return sum;
}

/** Bryggnivå + utrustning — används vid platta föremålseffekter. */
export function playerTotalItemCardBonus(p: {
  brewerItemCardBonus?: number;
  equipment: Player["equipment"];
}): number {
  return normalizeItemCardBonus(p.brewerItemCardBonus) + equipmentItemCardBonus(p);
}

/** Stridsföremål: justera bas, sedan brädnivå-skalning. */
export function combatItemAttackModForPlayer(
  itemId: string,
  boardLevelIndex: number,
  itemCardBonus: number | undefined,
): number | null {
  const base = COMBAT_ITEM_BASE_ATTACK_MODS[itemId];
  if (base == null) return null;
  const adjusted = adjustFlatItemValue(base, normalizeItemCardBonus(itemCardBonus));
  return scaledCombatMod(adjusted, boardLevelIndex);
}

/** Använd-föremål med fast bas (heal/pant/klunk). null om föremålet saknar platt värde. */
export function flatItemUseAmount(itemId: ItemId, itemCardBonus: number | undefined): number | null {
  const base = FLAT_ITEM_USE_BASE_AMOUNTS[itemId];
  if (base == null) return null;
  return adjustFlatItemValue(base, normalizeItemCardBonus(itemCardBonus));
}

/** Visningsvärde för platta attack-brickor (före brädskalning). */
export function flatCombatItemAttackDisplayBase(
  itemId: string,
  itemCardBonus: number | undefined,
): number | null {
  const base = COMBAT_ITEM_BASE_ATTACK_MODS[itemId];
  if (base == null) return null;
  return adjustFlatItemValue(base, normalizeItemCardBonus(itemCardBonus));
}

export function combatItemAttackModForBoardLevel(
  itemId: string,
  boardLevelIndex: number,
  itemCardBonus?: number,
): number | null {
  return combatItemAttackModForPlayer(itemId, boardLevelIndex, itemCardBonus);
}
