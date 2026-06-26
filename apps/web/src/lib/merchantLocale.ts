import type { GameLocale, ShopItem } from "@bv/game-core";
import { getCard, getEquipmentDisplay, itemDisplayTitle } from "@bv/game-core";

/** Display name for merchant shelf items (server stores Swedish `name`). */
export function merchantShopItemDisplayName(item: ShopItem, locale: GameLocale): string {
  if (locale === "sv") return item.name;
  if (item.slot === "heal") {
    try {
      return getCard("item_healing_potion", locale).title;
    } catch {
      return item.name;
    }
  }
  if (item.slot === "inventory" && item.inventoryItemId) {
    return itemDisplayTitle(item.inventoryItemId, locale);
  }
  if (
    item.slot === "weapon" ||
    item.slot === "armor" ||
    item.slot === "helmet" ||
    item.slot === "accessory"
  ) {
    return getEquipmentDisplay(item.id, locale).name;
  }
  return item.name;
}
