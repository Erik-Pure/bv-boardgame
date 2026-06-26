import dbJson from "./cards.json" with { type: "json" };
import cardTextEnJson from "./cardText.en.json" with { type: "json" };
import type { GameLocale } from "../locale.js";
import type { ItemId } from "../types.js";
import type { CardChoice, CardDef, CardKind, CardRollOutcomeRow, CardsDb } from "./types.js";

export type { GameLocale } from "../locale.js";

const db = dbJson as unknown as CardsDb;

type CardTextOverlay = {
  title?: string;
  text?: string;
  choices?: CardChoice[];
  rollOutcomes?: CardRollOutcomeRow[];
};

type CardTextEnDb = {
  cards: Record<string, CardTextOverlay>;
};

const cardTextEn = cardTextEnJson as unknown as CardTextEnDb;

const byId = new Map<string, CardDef>();
for (const c of db.cards) byId.set(c.id, c);

function applyLocaleOverlay(def: CardDef, locale: GameLocale): CardDef {
  if (locale === "sv") return def;
  const overlay = cardTextEn.cards[def.id];
  if (!overlay) return def;
  return {
    ...def,
    ...(overlay.title !== undefined ? { title: overlay.title } : {}),
    ...(overlay.text !== undefined ? { text: overlay.text } : {}),
    ...(overlay.rollOutcomes !== undefined ? { rollOutcomes: overlay.rollOutcomes } : {}),
    ...(overlay.choices !== undefined
      ? {
          choices: def.choices?.map((choice) => {
            const choiceOverlay = overlay.choices?.find((c) => c.id === choice.id);
            return choiceOverlay?.label !== undefined
              ? { ...choice, label: choiceOverlay.label }
              : choice;
          }),
        }
      : {}),
  };
}

export function getCard(id: string, locale: GameLocale = "sv"): CardDef {
  const c = byId.get(id);
  if (!c) throw new Error(`Unknown card: ${id}`);
  return applyLocaleOverlay(c, locale);
}

/** Slår upp kortdefinition utan att kasta (t.ex. UI för rik korttext). */
export function getCardDefById(id: string, locale: GameLocale = "sv"): CardDef | undefined {
  const c = byId.get(id);
  if (!c) return undefined;
  return applyLocaleOverlay(c, locale);
}

/** Resolve localized card title from Swedish title stored in server state (sip notices, etc.). */
export function getCardTitleBySvTitle(svTitle: string, locale: GameLocale): string | null {
  const trimmed = svTitle.trim();
  if (!trimmed) return null;
  const found = db.cards.find((c) => c.title === trimmed);
  if (!found) return null;
  return getCardDefById(found.id, locale)?.title ?? null;
}

/** Visningsnamn för ett inventory-`itemId` (samma titel som på kortet `item_${itemId}`). */
export function itemDisplayTitle(itemId: string, locale: GameLocale = "sv"): string {
  try {
    return getCard(`item_${itemId}`, locale).title;
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

/** Pool för slumpade föremål (skatt/händelse/stridsbelöning). */
export function itemDeckItemIdsForRandomGrant(
  disabledCardIds: ReadonlySet<string> | undefined,
  _levelsLength: number,
  _playerLevelIndex: number,
): ItemId[] {
  return itemDeckItemIds(disabledCardIds);
}

export function allCards(): CardDef[] {
  return db.cards.slice();
}
