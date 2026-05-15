/** Unik bild per utrustningsnamn (samma som PlayView EquipIcon). */
export function equipmentUniqueImageSrc(name?: string): string | null {
  if (!name) return null;
  const map: Record<string, string> = {
    Dubbelpipa: "/equipment/weapon/dubbelpipa.webp",
    Enkelpipa: "/equipment/weapon/enkelpipa.webp",
    "Can-opener": "/equipment/weapon/can-opener.webp",
    Flasköppnare: "/equipment/weapon/can-opener.webp",
    "Can-sword": "/equipment/weapon/can-sword.webp",
    Burksvärd: "/equipment/weapon/can-sword.webp",
    "Beer-chucks": "/equipment/weapon/beer-chucks.webp",
    "Öl-nunchucks": "/equipment/weapon/beer-chucks.webp",
    Fathammare: "/equipment/weapon/fathammare.webp",
    Humleklubba: "/equipment/weapon/humleklubba.webp",
    "Tom flaska": "/equipment/weapon/emptybottle.webp",
    "VIB Member": "/equipment/accessory/vib.webp",
    Plastback: "/equipment/accessory/karta.webp",
    Padel: "/equipment/weapon/padel.webp",
    Mäskpaddel: "/equipment/weapon/padel.webp",
    Högtryckstvätt: "/equipment/weapon/powerwash.webp",
    Ölsejdel: "/equipment/weapon/tankard.webp",
    "Cap-front": "/equipment/helmet/cap-front.webp",
    Keps: "/equipment/helmet/cap-front.webp",
    "Cap-back": "/equipment/helmet/cap-back.webp",
    "Bakåtvänd keps": "/equipment/helmet/cap-back.webp",
    "Glass-helmet": "/equipment/helmet/glass-helmet.webp",
    Glashjälm: "/equipment/helmet/glass-helmet.webp",
    "Cap-bikini": "/equipment/armor/cap-bikini.webp",
    Kapsylbikini: "/equipment/armor/cap-bikini.webp",
    "T-shirt": "/equipment/armor/tshirt.webp",
    Linne: "/equipment/armor/linne.webp",
    Dunjacka: "/equipment/armor/dunjacka.webp",
    Hoodie: "/equipment/armor/hoodie.webp",
    Longsleeve: "/equipment/armor/longsleeve.webp",
    "Six-pack": "/equipment/armor/six-pack.webp",
    Sexpack: "/equipment/armor/six-pack.webp",
    "Beer-barrel": "/equipment/armor/beer-barrel.webp",
    Öltunna: "/equipment/armor/beer-barrel.webp",
    "Can-armor": "/equipment/armor/can-armor.webp",
    Burkrustning: "/equipment/armor/can-armor.webp",
    Beanie: "/equipment/helmet/beanie.webp",
    Störtkruka: "/equipment/helmet/stortkruka.webp",
    "Beer-cap-helm-1": "/equipment/helmet/beer-cap-helm-1.webp",
    Burkhjälm: "/equipment/helmet/beer-cap-helm-1.webp",
    "Beer-cap-helm-2": "/equipment/helmet/beer-cap-helm-2.webp",
    "Legendarisk Burkhjälm": "/equipment/helmet/beer-cap-helm-2.webp",
    "Burkhjälm II": "/equipment/helmet/beer-cap-helm-2.webp",
    "Beer-filled-helmet": "/equipment/helmet/beer-filled-helmet.webp",
    "Ölfylld rymdhjälm": "/equipment/helmet/beer-filled-helmet.webp",
    Keykeghjälm: "/equipment/helmet/keykeg-helmet.webp",
    Burksköld: "/equipment/accessory/pilsnerskold.webp",
    /** Äldre sparade tillstånd / namn före omdöpning */
    Pilsnersköld: "/equipment/accessory/pilsnerskold.webp",
    Guldkedja: "/equipment/accessory/gold-chain.webp",
    Livförsäkring: "/equipment/accessory/medicalpapers.webp",
    Tygkasse: "/equipment/accessory/totebag.webp",
    Mantel: "/equipment/accessory/beer-cape.webp",
    Solbrillor: "/equipment/accessory/sunglasses.webp",
    "Taproom nyckel": "/equipment/accessory/taproom-nyckelring.webp",
    Ring: "/equipment/accessory/ring.webp",
    "Svart bälte": "/equipment/accessory/beer-belt.webp",
    Fyrklöver: "/equipment/accessory/fourclover.webp",
    Skumvisir: "/equipment/helmet/skumvisir.webp",
    "Taproom-nyckelring": "/equipment/accessory/taproom-nyckelring.webp",
    Robotarm: "/equipment/weapon/robot-arm.webp",
    Robothjälm: "/equipment/helmet/robot-helm.webp",
  };
  if (map[name]) return map[name]!;
  const can = /^Burkrustning\s+(\d+)$/.exec(name);
  if (can) return `/equipment/armor/burkrustning-${can[1]}.webp`;
  return null;
}

const SLOT_FALLBACK: Record<"weapon" | "armor" | "helmet" | "accessory", string> = {
  weapon: "/equipment/weapon/weapon.svg",
  armor: "/equipment/armor/armor.svg",
  helmet: "/equipment/helmet/helmet.svg",
  accessory: "/equipment/accessory/accesory.svg",
};

export function equipmentCatalogImageSrc(
  name: string,
  slot: "weapon" | "armor" | "helmet" | "accessory",
): string {
  return equipmentUniqueImageSrc(name) ?? SLOT_FALLBACK[slot];
}

export type EquipmentImageSources = { avif?: string; webp?: string; fallback: string };

export function equipmentImageSources(
  name: string,
  slot: "weapon" | "armor" | "helmet" | "accessory",
): EquipmentImageSources {
  const fallback = equipmentCatalogImageSrc(name, slot);
  if (fallback.endsWith(".webp")) {
    const base = fallback.slice(0, -".webp".length);
    return { avif: `${base}.avif`, webp: fallback, fallback };
  }
  return { fallback };
}
