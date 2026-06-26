import { getCardTitleBySvTitle } from "./cards/db.js";
import { getEquipmentDisplayByEquippedName } from "./equipmentLocale.js";
import type { GameLocale } from "./locale.js";

/** Localize combat/event reward label stored in Swedish server state (equipment or item card title). */
export function localizeRewardDisplayTitle(title: string, locale: GameLocale): string {
  if (locale === "sv") return title;
  const trimmed = title.trim();
  if (!trimmed) return title;

  const equipment = getEquipmentDisplayByEquippedName(trimmed, locale);
  if (equipment?.name) {
    const svEquipment = getEquipmentDisplayByEquippedName(trimmed, "sv");
    if (svEquipment && equipment.name !== svEquipment.name) {
      return equipment.name;
    }
  }

  const cardTitle = getCardTitleBySvTitle(trimmed, locale);
  if (cardTitle && cardTitle !== trimmed) return cardTitle;

  return title;
}

export function localizeRewardDisplayTitles(titles: string[], locale: GameLocale): string[] {
  return titles.map((t) => localizeRewardDisplayTitle(t, locale));
}
