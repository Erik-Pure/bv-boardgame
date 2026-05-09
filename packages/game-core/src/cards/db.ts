import dbJson from "./cards.json" with { type: "json" };
import type { ItemId } from "../types.js";
import type { CardDef, CardKind, CardsDb } from "./types.js";

const db = dbJson as unknown as CardsDb;

const byId = new Map<string, CardDef>();
for (const c of db.cards) byId.set(c.id, c);

export function getCard(id: string): CardDef {
  const c = byId.get(id);
  if (!c) throw new Error(`Unknown card: ${id}`);
  return c;
}

/** Visningsnamn för ett inventory-`itemId` (samma titel som på kortet `item_${itemId}`). */
export function itemDisplayTitle(itemId: string): string {
  try {
    return getCard(`item_${itemId}`).title;
  } catch {
    return itemId;
  }
}

export function drawFromDeck(
  kind: CardKind,
  rng: () => number,
  disabledCardIds?: ReadonlySet<string>,
): CardDef {
  const deck = db.decks?.[kind];
  if (!deck || deck.length === 0) throw new Error(`No deck for kind: ${kind}`);
  const filtered = disabledCardIds?.size
    ? deck.filter((id) => !disabledCardIds.has(id))
    : deck;
  const source = filtered.length > 0 ? filtered : deck;
  const id = source[Math.floor(rng() * source.length)]!;
  return getCard(id);
}

/**
 * Item-kortens `decks.item` i cards.json — samma pool som `grantRandomCombatRewardItem` ska använda
 * (tidigare fanns en hårdkodad lista som utelämnade t.ex. canman).
 */
export function itemDeckItemIds(disabledCardIds?: ReadonlySet<string>): ItemId[] {
  const deck = db.decks?.item;
  if (!deck?.length) throw new Error("cards.json: decks.item is missing or empty");
  const filtered = disabledCardIds?.size
    ? deck.filter((id) => !disabledCardIds.has(id))
    : deck;
  const source = filtered.length > 0 ? filtered : deck;
  return source.map((cardId) => {
    if (!cardId.startsWith("item_")) {
      throw new Error(`cards.json decks.item: expected id to start with "item_": ${cardId}`);
    }
    return cardId.slice(5) as ItemId;
  });
}

/** Genväg / Taproom-nyckel har ingen effekt på sista brädnivån (ingen nästa våning). */
export const ITEM_IDS_USELESS_ON_FINAL_BOARD_LEVEL: readonly ItemId[] = ["shortcut", "taproom_key"];

/** Pool för slumpade föremål (skatt/händelse/stridsbelöning); utelämnar genvägs-kort på sista nivån om möjligt. */
export function itemDeckItemIdsForRandomGrant(
  disabledCardIds: ReadonlySet<string> | undefined,
  levelsLength: number,
  playerLevelIndex: number,
): ItemId[] {
  const pool = itemDeckItemIds(disabledCardIds);
  const lastLevelIndex = Math.max(0, levelsLength - 1);
  if (playerLevelIndex !== lastLevelIndex) return pool;
  const filtered = pool.filter((id) => !ITEM_IDS_USELESS_ON_FINAL_BOARD_LEVEL.includes(id));
  return filtered.length > 0 ? filtered : pool;
}

export function allCards(): CardDef[] {
  return db.cards.slice();
}

