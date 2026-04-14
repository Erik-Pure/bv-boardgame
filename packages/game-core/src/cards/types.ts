export type CardKind = "event" | "combat" | "rest" | "treasure" | "empty" | "item";

export type Effect =
  | { type: "gold"; amount: number }
  | { type: "goldRoll"; base: number; die: number }
  | { type: "damage"; amount: number; source?: string }
  | { type: "heal"; amount: number }
  | { type: "klunkar"; amount: number }
  | { type: "item"; itemId: string }
  /** Slumpa loot (oftast föremål från `decks.item`, ibland utrustning om slot är tom). */
  | { type: "randomItem" }
  | { type: "nextCombatMod"; amount: number };

/** Resultatmetadata från {@link applyEffects} (siffror + `grantedItemId` vid `randomItem`). */
export type EffectApplyOut = {
  gold?: number;
  klunkar?: number;
  item?: number;
  heal?: number;
  damage?: number;
  prevented?: number;
  nextCombatMod?: number;
  grantedItemId?: string;
  grantedEquipmentName?: string;
  grantedEquipmentSlot?: "weapon" | "armor" | "helmet" | "accessory";
};

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

