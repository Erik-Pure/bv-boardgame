/** Sabotage/debuff-föremål som angriparen inte får spela på sig själv i egen strid. */
export const ATTACKER_SELF_NEGATIVE_COMBAT_ITEM_IDS = new Set<string>([
  "weak_beer",
  "tripwire",
  "hangover",
  "paidassasin",
  "monster_hype",
  "lengraddad",
  "yeast_sabotage",
]);

export function attackerCannotSelfNegativeCombatItem(
  itemId: string,
  attackerId: string,
  userId: string,
): boolean {
  return userId === attackerId && ATTACKER_SELF_NEGATIVE_COMBAT_ITEM_IDS.has(itemId);
}
