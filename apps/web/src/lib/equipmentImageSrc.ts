/** Unik PNG per utrustningsnamn (samma som PlayView EquipIcon). */
export function equipmentUniqueImageSrc(name?: string): string | null {
  if (!name) return null;
  const map: Record<string, string> = {
    Dubbelpipa: "/equipment/unique/dubbelpipa.png",
    Enkelpipa: "/equipment/unique/enkelpipa.png",
    Stouthjälm: "/equipment/unique/stouthjalm.png",
    Burkplåtsbrynja: "/equipment/unique/burkplatsbrynja.png",
    Pilsnersköld: "/equipment/unique/pilsnerskold.png",
    Humleklor: "/equipment/unique/humleklor.png",
    Kristallmaltsrustning: "/equipment/unique/kristallmaltsrustning.png",
    Skumvisir: "/equipment/unique/skumvisir.png",
    "Fatknytnävs-vaddering": "/equipment/unique/fatknytnavs-vaddering.png",
    "Disig mantel": "/equipment/unique/disig-mantel.png",
    "Taproom-nyckelring": "/equipment/unique/taproom-nyckelring.png",
    Fatlädersväst: "/equipment/unique/fatladersvast.png",
    "Första hjälpen-lager": "/equipment/unique/forsta-hjalpen-lager.png",
    Mäskpaddel: "/equipment/unique/maskpaddel-3.png",
    Burkrustning: "/equipment/unique/burkrustning-3.png",
    Robotarm: "/equipment/unique/robot-arm.png",
    Robothjälm: "/equipment/unique/robot-helm.png",
  };
  if (map[name]) return map[name]!;
  const mash = /^Mäskpaddel\s+(\d+)$/.exec(name);
  if (mash) return `/equipment/unique/maskpaddel-${mash[1]}.png`;
  const can = /^Burkrustning\s+(\d+)$/.exec(name);
  if (can) return `/equipment/unique/burkrustning-${can[1]}.png`;
  return null;
}

const SLOT_FALLBACK: Record<"weapon" | "armor" | "helmet" | "accessory", string> = {
  weapon: "/equipment/weapon.svg",
  armor: "/equipment/armor.svg",
  helmet: "/equipment/helmet.svg",
  accessory: "/equipment/accesory.svg",
};

export function equipmentCatalogImageSrc(
  name: string,
  slot: "weapon" | "armor" | "helmet" | "accessory",
): string {
  return equipmentUniqueImageSrc(name) ?? SLOT_FALLBACK[slot];
}
