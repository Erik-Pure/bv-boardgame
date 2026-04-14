/** Unik PNG per utrustningsnamn (samma som PlayView EquipIcon). */
export function equipmentUniqueImageSrc(name?: string): string | null {
  if (!name) return null;
  const map: Record<string, string> = {
    Dubbelpipa: "/equipment/weapon/dubbelpipa.png",
    Enkelpipa: "/equipment/weapon/enkelpipa.png",
    "Can-opener": "/equipment/weapon/can-opener.png",
    Flasköppnare: "/equipment/weapon/can-opener.png",
    "Can-sword": "/equipment/weapon/can-sword.png",
    Burksvärd: "/equipment/weapon/can-sword.png",
    "Beer-chucks": "/equipment/weapon/beer-chucks.png",
    "Öl-nunchucks": "/equipment/weapon/beer-chucks.png",
    Fathammare: "/equipment/weapon/fathammare.png",
    Padel: "/equipment/weapon/padel.png",
    Mäskpaddel: "/equipment/weapon/padel.png",
    "Cap-front": "/equipment/helmet/cap-front.png",
    Keps: "/equipment/helmet/cap-front.png",
    "Cap-back": "/equipment/helmet/cap-back.png",
    "Bakåtvänd keps": "/equipment/helmet/cap-back.png",
    "Glass-helmet": "/equipment/helmet/glass-helmet.png",
    Glashjälm: "/equipment/helmet/glass-helmet.png",
    "Cap-bikini": "/equipment/armor/cap-bikini.png",
    Kapsylbikini: "/equipment/armor/cap-bikini.png",
    "T-shirt": "/equipment/armor/tshirt.png",
    Hoodie: "/equipment/armor/hoodie.png",
    "Six-pack": "/equipment/armor/six-pack.png",
    Sexpack: "/equipment/armor/six-pack.png",
    "Beer-barrel": "/equipment/armor/beer-barrel.png",
    Öltunna: "/equipment/armor/beer-barrel.png",
    "Can-armor": "/equipment/armor/can-armor.png",
    Burkrustning: "/equipment/armor/can-armor.png",
    Beanie: "/equipment/helmet/beanie.png",
    "Beer-cap-helm-1": "/equipment/helmet/beer-cap-helm-1.png",
    Burkhjälm: "/equipment/helmet/beer-cap-helm-1.png",
    "Beer-cap-helm-2": "/equipment/helmet/beer-cap-helm-2.png",
    "Burkhjälm II": "/equipment/helmet/beer-cap-helm-2.png",
    "Beer-filled-helmet": "/equipment/helmet/beer-filled-helmet.png",
    "Ölfylld rymdhjälm": "/equipment/helmet/beer-filled-helmet.png",
    Pilsnersköld: "/equipment/accessory/pilsnerskold.png",
    Humleklor: "/equipment/accessory/humleklor.png",
    Skumvisir: "/equipment/helmet/skumvisir.png",
    "Disig mantel": "/equipment/accessory/disig-mantel.png",
    "Taproom-nyckelring": "/equipment/accessory/taproom-nyckelring.png",
    Robotarm: "/equipment/weapon/robot-arm.png",
    Robothjälm: "/equipment/helmet/robot-helm.png",
  };
  if (map[name]) return map[name]!;
  const can = /^Burkrustning\s+(\d+)$/.exec(name);
  if (can) return `/equipment/armor/burkrustning-${can[1]}.png`;
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
