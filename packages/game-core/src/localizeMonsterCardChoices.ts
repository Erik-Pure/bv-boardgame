import { getMonsterDisplay } from "./monsterLocale.js";
import type { MonsterId } from "./monsters.js";
import type { GameLocale } from "./locale.js";

const MONSTER_CARD_PREFIX = "monster:";

const MONSTER_CHOICE_LABEL_EN: Record<string, Record<string, string>> = {
  "monster:belgisk_munk": {
    sip_leave: "Take a sip and pay 5 cans (it disappears)",
    fight: "Fight",
  },
  "monster:demonkrigare": {
    pay_skip: "Pay 10 cans and avoid the fight",
    fight: "Fight",
  },
};

export function monsterIdFromCardId(cardId: string): MonsterId | null {
  if (!cardId.startsWith(MONSTER_CARD_PREFIX)) return null;
  const id = cardId.slice(MONSTER_CARD_PREFIX.length).trim();
  return id ? (id as MonsterId) : null;
}

export function localizeMonsterCombatChoiceLabel(
  cardId: string,
  choiceId: string,
  svLabel: string,
  locale: GameLocale,
): string {
  if (locale === "sv") return svLabel;
  return MONSTER_CHOICE_LABEL_EN[cardId]?.[choiceId] ?? svLabel;
}

export function localizeMonsterCombatCardTitle(
  cardId: string,
  svTitle: string,
  locale: GameLocale,
): string {
  if (locale === "sv") return svTitle;
  const monsterId = monsterIdFromCardId(cardId);
  if (!monsterId) return svTitle;
  return getMonsterDisplay(monsterId, locale).name;
}

export function localizeMonsterCombatCardText(
  cardId: string,
  svText: string,
  locale: GameLocale,
): string {
  if (locale === "sv") return svText;
  const monsterId = monsterIdFromCardId(cardId);
  if (!monsterId) return svText;
  const rules = getMonsterDisplay(monsterId, locale).rulesText.trim();
  return rules || svText;
}
