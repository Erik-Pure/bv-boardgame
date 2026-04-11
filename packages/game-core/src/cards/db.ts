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

export function drawFromDeck(kind: CardKind, rng: () => number): CardDef {
  const deck = db.decks?.[kind];
  if (!deck || deck.length === 0) throw new Error(`No deck for kind: ${kind}`);
  const id = deck[Math.floor(rng() * deck.length)]!;
  return getCard(id);
}

/**
 * Item-kortens `decks.item` i cards.json — samma pool som `grantRandomCombatRewardItem` ska använda
 * (tidigare fanns en hårdkodad lista som utelämnade t.ex. canman).
 */
export function itemDeckItemIds(): ItemId[] {
  const deck = db.decks?.item;
  if (!deck?.length) throw new Error("cards.json: decks.item is missing or empty");
  return deck.map((cardId) => {
    if (!cardId.startsWith("item_")) {
      throw new Error(`cards.json decks.item: expected id to start with "item_": ${cardId}`);
    }
    return cardId.slice(5) as ItemId;
  });
}

export function allCards(): CardDef[] {
  return db.cards.slice();
}

