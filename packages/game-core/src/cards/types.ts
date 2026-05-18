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
  /** Utrustning hittad men slot upptagen — byte erbjuds efter kortbekräftelse. */
  equipmentReplaceOffer?: {
    slot: "weapon" | "armor" | "helmet" | "accessory";
    catalogId: string;
    newName: string;
  };
};

export interface CardChoice {
  id: string;
  label: string;
  effects: Effect[];
}

/** En rad i utfallstabellen för tärningshändelser (visas före slag). */
export interface CardRollOutcomeRow {
  /** T.ex. "1", "2–3", "5+" */
  range: string;
  /** Brödtext för raden (rik text med ikoner i UI). */
  text: string;
}

export interface CardDef {
  id: string;
  kind: CardKind;
  title: string;
  text: string;
  /** Om satt: visa utfallista före tärningsslag (tillsammans med kort `text` som intro). */
  rollOutcomes?: CardRollOutcomeRow[];
  /** Valfri smaktext — visas före {@link text} i kortkatalogen när den sätts. */
  flavourText?: string;
  artKey?: string;
  effects?: Effect[];
  choices?: CardChoice[];
}

export interface CardsDb {
  version: number;
  cards: CardDef[];
  decks?: Partial<Record<CardKind, string[]>>;
}

