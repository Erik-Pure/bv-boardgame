import { itemDisplayTitle } from "./cards/db.js";
import type { ItemId, ShopItem } from "./types.js";

/** Föremål som ger +attack (eller motsv.) i strid — slumpas en per spelare vid spelstart. */
export const START_COMBAT_BUFF_ITEM_IDS: readonly ItemId[] = [
  "light_beer",
  "folk_beer",
  "double_hops",
  "beer_bomb",
  "beard_back",
] as const;

/** Föremål som ger −attack (eller motsv.) mot motståndare / nästa strid — slumpas en per spelare vid spelstart. */
export const START_COMBAT_DEBUFF_ITEM_IDS: readonly ItemId[] = [
  "weak_beer",
  "tripwire",
  "hangover",
  "monster_hype",
  "yeast_sabotage",
  "lengraddad",
] as const;

/** Pool för fjärde hyllplatsen i Panta burkar (+/− i strid, samma som startföremål). */
export const MERCHANT_SELLABLE_COMBAT_ITEM_IDS: readonly ItemId[] = [
  ...new Set<ItemId>([...START_COMBAT_BUFF_ITEM_IDS, ...START_COMBAT_DEBUFF_ITEM_IDS]),
];

export const MERCHANT_INVENTORY_ITEM_PRICE = 5;

/** Fast pris för Taproom-nyckel på sista brädnivån i Panta burkar. */
export const MERCHANT_TAPROOM_KEY_PRICE = 20;

export function isLastBoardLevel(levelIndex: number, levelsLength: number | undefined): boolean {
  return levelsLength != null && levelsLength > 0 && levelIndex === levelsLength - 1;
}

export function taproomKeyAllowedInMerchant(disabledCardIds?: ReadonlySet<string>): boolean {
  return !disabledCardIds?.has("item_taproom_key");
}

export function taproomKeyMerchantShopItem(uniqueIdSuffix?: number): ShopItem {
  const base = combatItemToMerchantShopItem("taproom_key", MERCHANT_TAPROOM_KEY_PRICE);
  if (uniqueIdSuffix == null) return base;
  return { ...base, id: `c-taproom_key-${uniqueIdSuffix}` };
}

export function combatItemToMerchantShopItem(
  itemId: ItemId,
  price = MERCHANT_INVENTORY_ITEM_PRICE,
): ShopItem {
  return {
    id: `inv_${itemId}`,
    slot: "inventory",
    inventoryItemId: itemId,
    name: itemDisplayTitle(itemId),
    price,
  };
}

export function filterMerchantSellableCombatItems(
  disabledCardIds?: ReadonlySet<string>,
): ItemId[] {
  if (!disabledCardIds?.size) return [...MERCHANT_SELLABLE_COMBAT_ITEM_IDS];
  return MERCHANT_SELLABLE_COMBAT_ITEM_IDS.filter(
    (id) => !disabledCardIds.has(`item_${id}`),
  );
}
