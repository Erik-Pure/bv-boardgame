import type { ItemId } from "@bv/game-core";

/**
 * Föremål som räknas som negativa/hostile när de spelas mot en annan spelare.
 * Används för bräd-SFX (dieroll) och mobil toast-färg (röd).
 * Positiva (t.ex. Manopositiv, Ljusöl) → item-SFX / grön toast.
 */
export const NEGATIVE_ITEM_PLAY_ON_OTHER_IDS = new Set<ItemId>([
  "weak_beer",
  "tripwire",
  "hangover",
  "paidassasin",
  "monster_hype",
  "lengraddad",
  "not_my_round",
  "spill_intentional",
  "yeast_sabotage",
  "sleep_potion",
  "sip_card",
  "rigged_game",
  "split_the_g",
  "shuffle",
]);

export function isNegativeItemPlayOnOther(itemId: ItemId | string): boolean {
  return NEGATIVE_ITEM_PLAY_ON_OTHER_IDS.has(itemId as ItemId);
}

export type ItemPlayToastTone = "positive" | "negative";

export function itemPlayToastTone(itemId: ItemId | string): ItemPlayToastTone {
  return isNegativeItemPlayOnOther(itemId) ? "negative" : "positive";
}
