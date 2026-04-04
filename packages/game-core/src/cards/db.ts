import dbJson from "./cards.json" with { type: "json" };
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

export function allCards(): CardDef[] {
  return db.cards.slice();
}

