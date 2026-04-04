/** Mappar `artKey` från game-core till public-bild (monster/event/item). */
export function artImageSrc(artKey?: string): string {
  if (!artKey) return "/card-placeholder.png";
  if (artKey.startsWith("combat/")) return `/combat/${artKey.slice("combat/".length)}.png`;
  if (artKey.startsWith("monster/")) return `/monsters/${artKey.slice("monster/".length)}.png`;
  if (artKey.startsWith("event/")) return `/event/${artKey.slice("event/".length)}.png`;
  if (artKey.startsWith("item/")) {
    const itemArtMap: Record<string, string> = {
      heal: "healing-potion",
      sleep: "sleep-potion",
      sip: "sip-card",
      weak: "drunk-too-much",
      "light-beer": "light-beer",
      "folk-beer": "folk-beer",
      tripwire: "tripwire",
      pretzel: "brezel",
      coin: "coin-purse",
      hops: "double-hops",
      "beer-bomb": "beer-bomb",
      "beard-back": "beard-back",
      hangover: "hangover",
      hype: "monster-hype",
      sabotage: "yeast-sabotage",
      bro: "beer-bro",
    };
    const key = artKey.slice("item/".length);
    const mapped = itemArtMap[key];
    if (mapped) return `/items/${mapped}.png`;
  }
  return "/card-placeholder.png";
}
