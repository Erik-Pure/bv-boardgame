import type { ItemId } from "./types.js";
import { itemPlayGoldCost } from "./combatReactionAutopass.js";

/** Pant vid försäljning av föremål från inventory (halva spel-/köpkostnaden). */
export function inventoryItemSellPrice(itemId: ItemId | string): number {
  const cost = itemPlayGoldCost(itemId as ItemId);
  if (cost > 0) return Math.max(1, Math.floor(cost / 2));
  return 1;
}
