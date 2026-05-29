import { scaledCombatMod } from "./scaledCombatMod.js";

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

export function combatItemAttackModForBoardLevel(itemId: string, boardLevelIndex: number): number | null {
  const base = COMBAT_ITEM_BASE_ATTACK_MODS[itemId];
  if (base == null) return null;
  return scaledCombatMod(base, boardLevelIndex);
}
