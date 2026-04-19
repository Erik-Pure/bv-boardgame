import { artKeyForGrantedItem, artKeyFromDuFickAppend } from "@bv/game-core";
import { equipmentCatalogImageSrc, equipmentUniqueImageSrc } from "./equipmentImageSrc";

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
  "monster/pimp": "Pimp, Puff Imperial Porter, Bryggverket & Tempel brygghus",
  "monster/fermentation-hydra": "Lika som bär, Bryggverket",
  "monster/skum-banan": "Skum banan, Bryggverket",
  "monster/rabarbapappa": "Rabarbapappa, Bryggverket",
  "monster/brottningsmatch": "Lengräddad, Bryggverket & Tempel brygghus",
  "item/lengraddad": "Lengräddad, Bryggverket & Tempel brygghus",
  "monster/keg-lifter": "O-beast, Bryggverket & Stockholm Brewing",
  "monster/kapten-interrobang": "Kapten Interrobang, Bryggverket",
  "monster/sura-bar": "Surinamnam, Bryggverket & Poppels bryggeri",
  "monster/barsfisk": "Octobeer, Bryggverket",
  "monster/belgisk-munk": "Sean Claude Maltdamm, Bryggverket & Beer Studio",
  "monster/folke-bengtsson": "Folke B, Bryggverket",
  "monster/unicorn": "Enkelpipa, Bryggverket",
  "monster/store-narcissius": "Den store Narcissus, Bryggverket",
  "item/bro": "BBQ NEIPA, Bryggverket & Rökstugan",
  "item/not-my-round": "Enkelpipa, Bryggverket",
  "item/hops": "Kaakao kaakao, Bryggverket & Mabrouk Chocolate",
  "item/8-bit-beer": "41337, Bryggverket",
  "monster/taproom-titan": "The Bru-Team, Bryggverket",
};

/** Svensk etikettreferens för `artKey`, om definierad. */
export function artAttributionLabel(artKey?: string): string | undefined {
  if (!artKey) return undefined;
  return ART_ATTRIBUTION_SV[artKey];
}

export type ArtImageSources = { avif?: string; webp?: string; fallback: string };

function sourcesFromPath(webpPath: string): ArtImageSources {
  // vi genererar .avif + .webp med samma basnamn; png ligger kvar som säker fallback.
  if (webpPath.endsWith(".webp")) {
    const base = webpPath.slice(0, -".webp".length);
    return { avif: `${base}.avif`, webp: webpPath, fallback: `${base}.png` };
  }
  return { fallback: webpPath };
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
  if (artKey.startsWith("equipment/")) {
    const parts = artKey.split("/");
    const slotRaw = parts[1] ?? "any";
    const encodedName = parts.slice(2).join("/");
    let name = encodedName;
    try {
      name = encodedName ? decodeURIComponent(encodedName) : "";
    } catch {
      name = encodedName ?? "";
    }
    const direct = equipmentUniqueImageSrc(name);
    if (direct) return direct;
    if (slotRaw === "weapon" || slotRaw === "armor" || slotRaw === "helmet" || slotRaw === "accessory") {
      return equipmentCatalogImageSrc(name, slotRaw);
    }
    return "/card-placeholder.png";
  }
  if (artKey.startsWith("tile/")) {
    const key = artKey.slice("tile/".length);
    if (key === "door" || key === "levelup") return "/tiles/levelup.svg";
    return `/tiles/${key}.svg`;
  }
  if (artKey.startsWith("combat/")) return `/combat/${artKey.slice("combat/".length)}.png`;
  if (artKey.startsWith("monster/")) {
    const mKey = artKey.slice("monster/".length);
    if (mKey === "store-narcissius") {
      return "/monsters/den-store-narcissus.webp";
    }
    if (mKey === "onda-bryggverket") {
      return "/monsters/onda-bryggverket.webp";
    }
    if (mKey === "oldomaren") return "/monsters/beer-judge.webp";
    return `/monsters/${mKey}.webp`;
  }
  // Filer i apps/web/public/event/{namn}.png — t.ex. event/rest → public/event/rest.png
  if (artKey.startsWith("event/")) return `/event/${artKey.slice("event/".length)}.webp`;
  if (artKey.startsWith("item/")) {
    const key0 = artKey.slice("item/".length);
    if (key0 === "lengraddad") return "/event/lengraddad.webp";
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
      /** Raster: `public/items/item_early_night.png` (inte `early_night.*`). */
      "early-night": "item_early_night",
    };
    const key = key0;
    const mapped = itemArtMap[key];
    if (mapped) return `/items/${mapped}.webp`;
    const underscored = key.replace(/-/g, "_");
    return `/items/${underscored}.webp`;
  }
  return "/card-placeholder.png";
}

/** AVIF-first (med WebP-fallback) för artKey som pekar på rasterbilder. */
export function artImageSources(artKey?: string): ArtImageSources {
  const fallback = artImageSrc(artKey);
  // svg eller png som inte har optimerade varianter
  if (fallback.endsWith(".svg") || fallback.endsWith(".png")) return { fallback };
  return sourcesFromPath(fallback);
}

/** Bild-URL för kort-pending med valfritt slumpat föremål (mobil + bord). */
export function artImageSrcForPending(artKey?: string, grantedItemId?: string, meta?: CardRevealArtMeta): string {
  return artImageSrc(resolveCardRevealArtKey(artKey, grantedItemId, meta));
}

export function artImageSourcesForPending(
  artKey?: string,
  grantedItemId?: string,
  meta?: CardRevealArtMeta,
): ArtImageSources {
  return artImageSources(resolveCardRevealArtKey(artKey, grantedItemId, meta));
}
