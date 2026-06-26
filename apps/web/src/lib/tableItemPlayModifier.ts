/**
 * Ikon + värde i huvudet på föremålskort (bräd-tv), i linje med monsterkortets attack-chip.
 * Saknar tydlig siffra → null (döljs i UI).
 */
export type ItemPlayModifierBadge = {
  iconSrc: string;
  value: string;
  isNegative?: boolean;
};

import {
  combatItemAttackModForBoardLevel,
  flatItemUseAmount,
  type ItemId,
} from "@bv/game-core";

export function tableItemPlayModifierBadge(
  itemId: string,
  boardLevelIndex = 0,
  itemCardBonus = 0,
): ItemPlayModifierBadge | null {
  const ICON = {
    combat: "/icons/combat-icon.svg",
    pant: "/icons/pant-icon.svg",
    klunk: "/icons/klunk-icon.svg",
    heart: "/icons/heart-icon.svg",
    monster: "/icons/monster-icon.svg",
  } as const;

  const scaled = combatItemAttackModForBoardLevel(itemId, boardLevelIndex, itemCardBonus);
  if (scaled != null) {
    return {
      iconSrc: ICON.combat,
      value: scaled > 0 ? `+${scaled}` : String(scaled),
      isNegative: scaled < 0,
    };
  }

  const flatUse = flatItemUseAmount(itemId as ItemId, itemCardBonus);
  if (flatUse != null) {
    switch (itemId) {
      case "healing_potion":
      case "pretzel_snack":
        return { iconSrc: ICON.heart, value: `+${flatUse}` };
      case "coin_purse":
        return { iconSrc: ICON.pant, value: `+${flatUse}` };
      case "sip_card":
        return { iconSrc: ICON.klunk, value: `+${flatUse}` };
    }
  }

  switch (itemId) {
    case "charity":
      return { iconSrc: ICON.pant, value: "♥" };
    case "shortcut":
      return { iconSrc: ICON.pant, value: "10" };
    case "taproom_key":
      return { iconSrc: ICON.pant, value: "↑" };
    case "beard_back":
      return { iconSrc: ICON.combat, value: "×2" };
    case "beer_bro":
      return { iconSrc: ICON.combat, value: "2" };
    case "split_the_g":
      return { iconSrc: ICON.pant, value: "½" };
    case "shuffle":
      return { iconSrc: ICON.pant, value: "10" };
    case "sleep_potion":
      return { iconSrc: "/icons/thumbdown-icon.svg", value: "1", isNegative: true };
    case "early_night":
      return { iconSrc: ICON.monster, value: "↷" };
    case "bribes":
      return { iconSrc: ICON.monster, value: "↷" };
    case "six_sense":
      return { iconSrc: "/icons/bvb-icon.svg", value: "t6" };
    case "rigged_game":
      return { iconSrc: "/icons/armor-icon.svg", value: "⇄" };
    default:
      return null;
  }
}
