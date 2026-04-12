import type { ItemId, ItemInstance } from "./types.js";

/** Antal rörelsetärningar med +1 pant medan Canman ligger i inventory. */
export const CANMAN_DRAWS_INITIAL = 10;

export function createItemInstance(itemId: ItemId, instanceId: string): ItemInstance {
  if (itemId === "canman") {
    return { instanceId, itemId, canmanDrawsRemaining: CANMAN_DRAWS_INITIAL };
  }
  return { instanceId, itemId };
}
