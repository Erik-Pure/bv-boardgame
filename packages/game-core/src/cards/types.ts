export type CardKind = "event" | "combat" | "rest" | "treasure" | "empty" | "item";

export type Effect =
  | { type: "gold"; amount: number }
  | { type: "goldRoll"; base: number; die: number }
  | { type: "damage"; amount: number; source?: string }
  | { type: "heal"; amount: number }
  | { type: "klunkar"; amount: number }
  | { type: "item"; itemId: string };

export interface CardChoice {
  id: string;
  label: string;
  effects: Effect[];
}

export interface CardDef {
  id: string;
  kind: CardKind;
  title: string;
  text: string;
  artKey?: string;
  effects?: Effect[];
  choices?: CardChoice[];
}

export interface CardsDb {
  version: number;
  cards: CardDef[];
  decks?: Partial<Record<CardKind, string[]>>;
}

