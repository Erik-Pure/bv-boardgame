/**
 * Ikon + värde i huvudet på föremålskort (bräd-tv), i linje med monsterkortets attack-chip.
 * Saknar tydlig siffra → null (döljs i UI).
 */
export type ItemPlayModifierBadge = {
  iconSrc: string;
  value: string;
};

export function tableItemPlayModifierBadge(itemId: string): ItemPlayModifierBadge | null {
  const ICON = {
    combat: "/icons/combat-icon.svg",
    pant: "/icons/pant-icon.svg",
    klunk: "/icons/klunk-icon.svg",
    heart: "/icons/heart-icon.svg",
    monster: "/icons/monster-icon.svg",
  } as const;

  const attack: Record<string, number> = {
    weak_beer: -2,
    light_beer: 1,
    folk_beer: 2,
    tripwire: -1,
    double_hops: 2,
    beer_bomb: 3,
    hangover: -3,
    monster_hype: -2,
    yeast_sabotage: -1,
  };
  if (itemId in attack) {
    const n = attack[itemId]!;
    return { iconSrc: ICON.combat, value: n > 0 ? `+${n}` : String(n) };
  }

  switch (itemId) {
    case "healing_potion":
      return { iconSrc: ICON.heart, value: "+3" };
    case "pretzel_snack":
      return { iconSrc: ICON.heart, value: "+2" };
    case "coin_purse":
      return { iconSrc: ICON.pant, value: "+4" };
    case "sip_card":
      return { iconSrc: ICON.klunk, value: "+1" };
    case "lengraddad":
      return { iconSrc: ICON.combat, value: "-2" };
    case "beard_back":
      return { iconSrc: ICON.combat, value: "×2" };
    case "beer_bro":
      return { iconSrc: ICON.combat, value: "2" };
    case "split_the_g":
      return { iconSrc: ICON.pant, value: "½" };
    case "sleep_potion":
      return { iconSrc: "/icons/thumbdown-icon.svg", value: "1" };
    case "early_night":
      return { iconSrc: ICON.monster, value: "↷" };
    default:
      return null;
  }
}
