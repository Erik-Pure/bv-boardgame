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
    Padel: "/equipment/weapon/padel.webp",
    Mäskpaddel: "/equipment/weapon/padel.webp",
    "Cap-front": "/equipment/helmet/cap-front.webp",
    Keps: "/equipment/helmet/cap-front.webp",
    "Cap-back": "/equipment/helmet/cap-back.webp",
    "Bakåtvänd keps": "/equipment/helmet/cap-back.webp",
    "Glass-helmet": "/equipment/helmet/glass-helmet.webp",
    Glashjälm: "/equipment/helmet/glass-helmet.webp",
    "Cap-bikini": "/equipment/armor/cap-bikini.webp",
    Kapsylbikini: "/equipment/armor/cap-bikini.webp",
    "T-shirt": "/equipment/armor/tshirt.webp",
    Hoodie: "/equipment/armor/hoodie.webp",
    "Six-pack": "/equipment/armor/six-pack.webp",
    Sexpack: "/equipment/armor/six-pack.webp",
    "Beer-barrel": "/equipment/armor/beer-barrel.webp",
    Öltunna: "/equipment/armor/beer-barrel.webp",
    "Can-armor": "/equipment/armor/can-armor.webp",
    Burkrustning: "/equipment/armor/can-armor.webp",
    Beanie: "/equipment/helmet/beanie.webp",
    "Beer-cap-helm-1": "/equipment/helmet/beer-cap-helm-1.webp",
    Burkhjälm: "/equipment/helmet/beer-cap-helm-1.webp",
    "Beer-cap-helm-2": "/equipment/helmet/beer-cap-helm-2.webp",
    "Burkhjälm II": "/equipment/helmet/beer-cap-helm-2.webp",
    "Beer-filled-helmet": "/equipment/helmet/beer-filled-helmet.webp",
    "Ölfylld rymdhjälm": "/equipment/helmet/beer-filled-helmet.webp",
    Pilsnersköld: "/equipment/accessory/pilsnerskold.webp",
    Humleklor: "/equipment/accessory/humleklor.webp",
    Skumvisir: "/equipment/helmet/skumvisir.webp",
    "Disig mantel": "/equipment/accessory/disig-mantel.webp",
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
