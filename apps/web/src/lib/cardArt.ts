import { artKeyForGrantedItem, artKeyFromDuFickAppend } from "@bv/game-core";

/**
 * Kort vars bild bygger på en verklig öletikett — kort etikettreferens under bilden.
 * Nyckel = samma `artKey` som i kortdata / game-core.
 */
const ART_ATTRIBUTION_SV: Record<string, string> = {
  "event/rest": "Ale Day Long, Bryggverket",
  "event/astronomisk-fylla": "Kveik my breath away, Bryggverket",
  "event/ljuset-i-tunneln": "Saison in the abyss, Bryggverket",
  "event/munchies": "Kaakao Kaakao, Bryggverket & Mabrouk Chocolate",
  "event/loser-wins": "UÅ West Coast IPA, Bryggverket",
  "monster/stoorn": "Stoorn, Bryggverket",
  "monster/bottling-bot": "Rally Hallon Soda, Bryggverket & Red Barn",
  "monster/humlan": "Humlan sommaröl, Bryggverket",
  "monster/megasouruz": "Megasouruz, Bryggverket & Brygghus 19",
  "monster/skum-banan": "Skum banan, Bryggverket",
  "monster/rabarbapappa": "Rabarbapappa, Bryggverket",
  "monster/brottningsmatch": "Lengräddad, Bryggverket & Tempel brygghus",
  "monster/keg-lifter": "O-beast, Bryggverket & Stockholm Brewing",
  "monster/kapten-interrobang": "Kapten Interrobang, Bryggverket",
  "monster/sura-bar": "Surinamnam, Bryggverket & Poppels bryggeri",
  "monster/barsfisk": "Octobeer, Bryggverket",
  "monster/belgisk-munk": "Sean Claude Maltdamm, Bryggverket & Beer Studio",
  "monster/pimp": "Pimp - Puff imperial stout, Bryggverket & Tempel brygghus",
  "monster/folke-bengtsson": "Folke B, Bryggverket",
  "monster/unicorn": "Enkelpipa, Bryggverket",
  "item/bro": "BBQ NEIPA, Bryggverket & Rökstugan",
  "item/not-my-round": "Enkelpipa, Bryggverket",
  "item/8-bit-beer": "41337, Bryggverket",
};

/** Svensk etikettreferens för `artKey`, om definierad. */
export function artAttributionLabel(artKey?: string): string | undefined {
  if (!artKey) return undefined;
  return ART_ATTRIBUTION_SV[artKey];
}

function randomItemRevealStillGeneric(artKey: string | undefined, cardId: string | undefined): boolean {
  if (!cardId) return false;
  if (cardId.startsWith("treasure_item_")) return (artKey ?? "").startsWith("tile/treasure");
  if (cardId.startsWith("event_find_item_")) {
    const a = artKey ?? "";
    return a === "event/item" || a.startsWith("event/item");
  }
  return false;
}

export type CardRevealArtMeta = { cardText?: string; cardId?: string };

/** Slår upp rätt `artKey` när server skickat `grantedItemId` (slumpat föremål). */
export function resolveCardRevealArtKey(
  artKey?: string,
  grantedItemId?: string,
  meta?: CardRevealArtMeta,
): string | undefined {
  const resolved = grantedItemId ? (artKeyForGrantedItem({ grantedItemId }, artKey) ?? artKey) : artKey;
  const cid = meta?.cardId;
  const txt = meta?.cardText;
  const isRandomItem = cid?.startsWith("treasure_item_") || cid?.startsWith("event_find_item_");
  if (isRandomItem && txt && randomItemRevealStillGeneric(resolved, cid)) {
    const fromText = artKeyFromDuFickAppend(txt);
    if (fromText) return fromText;
  }
  return resolved;
}

/** Mappar `artKey` från game-core till public-bild (monster/event/item/tile). */
export function artImageSrc(artKey?: string): string {
  if (!artKey) return "/card-placeholder.png";
  if (artKey.startsWith("tile/")) {
    const key = artKey.slice("tile/".length);
    if (key === "door" || key === "levelup") return "/tiles/levelup.svg";
    return `/tiles/${key}.svg`;
  }
  if (artKey.startsWith("combat/")) return `/combat/${artKey.slice("combat/".length)}.png`;
  if (artKey.startsWith("monster/")) return `/monsters/${artKey.slice("monster/".length)}.png`;
  // Filer i apps/web/public/event/{namn}.png — t.ex. event/rest → public/event/rest.png
  if (artKey.startsWith("event/")) return `/event/${artKey.slice("event/".length)}.png`;
  if (artKey.startsWith("item/")) {
    const itemArtMap: Record<string, string> = {
      heal: "healing-potion",
      sleep: "sleep-potion",
      sip: "sip-card",
      weak: "drunk-too-much",
      "light-beer": "energy-drink",
      "8-bit-beer": "8-bit-beer",
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
      "not-my-round": "not_my_round",
      canman: "canman",
      "split-the-g": "split-the-g",
    };
    const key = artKey.slice("item/".length);
    const mapped = itemArtMap[key];
    if (mapped) return `/items/${mapped}.png`;
    const underscored = key.replace(/-/g, "_");
    return `/items/${underscored}.png`;
  }
  return "/card-placeholder.png";
}

/** Bild-URL för kort-pending med valfritt slumpat föremål (mobil + bord). */
export function artImageSrcForPending(artKey?: string, grantedItemId?: string, meta?: CardRevealArtMeta): string {
  return artImageSrc(resolveCardRevealArtKey(artKey, grantedItemId, meta));
}
