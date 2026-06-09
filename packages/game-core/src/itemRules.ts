import type { ItemId, Player } from "./types.js";

/** Positiva attack-/hjälpföremål som kan spelas i stridshjälp (Begär hjälp). */
export const POSITIVE_HELP_ITEM_IDS: ReadonlySet<ItemId> = new Set([
  "light_beer",
  "folk_beer",
  "double_hops",
  "beer_bomb",
  "manopositiv",
  "get_lucky",
]);

/** Föremål som får spelas i BvB-förberedelsefasen (`preRoundItems`). */
export const PVP_PRE_ROUND_ITEM_IDS: ReadonlySet<ItemId> = new Set([
  "weak_beer",
  "light_beer",
  "folk_beer",
  "tripwire",
  "double_hops",
  "beer_bomb",
  "manopositiv",
  "hangover",
  "monster_hype",
  "yeast_sabotage",
  "spill_intentional",
  "beard_back",
  "six_sense",
  "paidassasin",
  "lengraddad",
]);

export function isPositiveHelpItemId(itemId: ItemId): boolean {
  return POSITIVE_HELP_ITEM_IDS.has(itemId);
}

export function playerHasPvpPreRoundItem(player: Player): boolean {
  return (player.inventory ?? []).some((it) => PVP_PRE_ROUND_ITEM_IDS.has(it.itemId));
}

/** Föremål som får spelas under BvB-slag (`awaitingRolls`), utöver helande föremål. */
export const PVP_ROLL_PHASE_ITEM_IDS: ReadonlySet<ItemId> = new Set([
  "six_sense",
  "beard_back",
  "spill_intentional",
]);
