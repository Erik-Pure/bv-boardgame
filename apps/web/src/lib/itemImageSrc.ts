/** Publik sökväg till föremålsbild (PNG/WebP) för kort, inventory och bräd-tv. */
export function itemImageSrc(itemId: string): string {
  const m: Record<string, string> = {
    healing_potion: "/items/healing-potion.png",
    sleep_potion: "/items/sleep-potion.png",
    sip_card: "/items/sip-card.png",
    weak_beer: "/items/drunk-too-much.png",
    light_beer: "/items/energy-drink.png",
    folk_beer: "/items/8-bit-beer.png",
    tripwire: "/items/tripwire.webp",
    pretzel_snack: "/items/brezel.png",
    coin_purse: "/items/coin-purse.png",
    double_hops: "/items/double-hops.png",
    beer_bomb: "/items/beer-bomb.webp",
    beard_back: "/items/beard-back.png",
    hangover: "/items/hangover.png",
    monster_hype: "/items/monster-hype.png",
    yeast_sabotage: "/items/yeast-sabotage.png",
    beer_bro: "/items/beer-bro.png",
    split_the_g: "/items/split-the-g.png",
    lengraddad: "/event/lengraddad.png",
    canman: "/items/canman.png",
    not_my_round: "/items/not_my_round.png",
    spill_intentional: "/items/spill_intentional.png",
    early_night: "/items/item_early_night.webp",
  };
  return m[itemId] ?? "/card-placeholder.png";
}
