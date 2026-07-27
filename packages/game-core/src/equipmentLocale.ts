import { EQUIPMENT_CATALOG } from "./equipmentDefs.js";
import type { GameLocale } from "./locale.js";

export interface EquipmentDisplayText {
  name: string;
  rulesText: string;
}

const EQUIPMENT_LOCALE_EN: Record<string, EquipmentDisplayText> = {
  ew_beer_chucks: {
    name: "Beer Nunchucks",
    rulesText:
      "When you win a fight the nunchucks keep spinning — a random other brewer takes a little hit.",
  },
  ew_fathammare: {
    name: "Keg Hammer",
    rulesText:
      "Heavy hammer: extra power in brewer-vs-brewer when the die decides.",
  },
  ew_can_opener: {
    name: "Bottle Opener",
    rulesText: "Practical weapon: after winning a monster fight you get a few cans back.",
  },
  ew_can_sword: {
    name: "Can Sword",
    rulesText:
      "The more cans you've carried, the sharper the blade — up to a max limit. You lose 1 can per fight.",
  },
  ew_padel: {
    name: "Mash Paddle",
    rulesText: "Simple but reliable — +1 attack in monster fights.",
  },
  ew_plastic_cup: {
    name: "Plastic Cup",
    rulesText:
      "−1 attack in monster fights and −2 max HP. All items you play cost 0 cans while Plastic Cup is equipped.",
  },
  ew_humleklubba: {
    name: "Hop Club",
    rulesText: "",
  },
  ew_empty_bottle: {
    name: "Empty Bottle",
    rulesText: "High power but breaks immediately after you win a fight.",
  },
  ew_doublepipe: {
    name: "Double Barrel",
    rulesText: "Pay 4 cans before the die roll for +1 attack.",
  },
  ew_singlepipe: {
    name: "Single Barrel",
    rulesText: "Pay 2 cans before the die roll for +1 attack.",
  },
  ew_seidel: {
    name: "Beer Stein",
    rulesText:
      "+1 attack from the weapon. Optional before the monster die: drink 1 penalty sip and the weapon counts as +3 attack total.",
  },
  ew_powerwash: {
    name: "Pressure Washer",
    rulesText:
      "Sprays away the shame a little — one fewer penalty sip if you lose to a bad batch.",
  },
  eh_cap_front: {
    name: "Cap",
    rulesText: "Removes 1 damage when you lose to a bad batch.",
  },
  eh_cap_back: {
    name: "Backwards Cap",
    rulesText: "Now you look a little younger",
  },
  eh_glass_helmet: {
    name: "Glass Helmet",
    rulesText: "Blocks all damage once, then breaks.",
  },
  eh_keykeg_helmet: {
    name: "Keykeg Helmet",
    rulesText: "Sturdy helmet with strong protection, but it weighs down your swings.",
  },
  eh_foamvisor: {
    name: "Foam Visor",
    rulesText: "Foam and style — but penalty sips stick a little extra on you.",
  },
  eh_beanie: {
    name: "Beanie",
    rulesText: "Cozy hat: +2 max HP.",
  },
  eh_headband: {
    name: "Headband",
    rulesText: "Item effects become +1 stronger.",
  },
  eh_stortkruka: {
    name: "Crash Helmet",
    rulesText: "Safety first! +4 max HP.",
  },
  eh_beer_cap_helm_1: {
    name: "Can Helmet",
    rulesText: "Can set bonus: +1 / +2 / +3 attack in combat.",
  },
  eh_beer_cap_helm_2: {
    name: "Legendary Can Helmet",
    rulesText: "Grants +5 HP and −4 damage per hit from level 4.",
  },
  eh_beer_filled_helmet: {
    name: "Beer-Filled Space Helmet",
    rulesText: "The more you've drunk the stronger you get... oddly enough.",
  },
  ex_buckler: {
    name: "Can Shield",
    rulesText: "Can set bonus: +1 / +2 / +3 shield.",
  },
  ex_gold_chain: {
    name: "Gold Chain",
    rulesText: "Bling at every monster fight: +2 cans when the fight starts.",
  },
  ex_beer_cape: {
    name: "Cape",
    rulesText: "Skip bad batch (−2 cans). No XP, no loot.",
  },
  ex_four_clover: {
    name: "Four-Leaf Clover",
    rulesText:
      "Lucky charm: rolling a 1 on your combat die does not count as an automatic loss.",
  },
  ex_sunglasses: {
    name: "Sunglasses",
    rulesText:
      "Nobody sees what you have: others cannot steal your items or cans with theft effects, and you are protected in BvB trades.",
  },
  ex_ring: {
    name: "Ring",
    rulesText:
      "The price of power is rarely measured in gold, but in blood. Are you ready to pay?",
  },
  ex_black_belt: {
    name: "Black Belt",
    rulesText:
      "Black belt in drunk karate: when you get a penalty sip you drink +1 extra sip.",
  },
  ex_medical_papers: {
    name: "Life Insurance",
    rulesText:
      "When you die you can pay 10 cans to continue with full health. Consumed on use.",
  },
  ex_totebag: {
    name: "Tote Bag",
    rulesText: "Every time you get a penalty sip you gain 2 cans.",
  },
  ex_notebook: {
    name: "Notebook",
    rulesText: "Recipe notes — item effects become +1 stronger.",
  },
  ex_vib_member: {
    name: "VIB Member",
    rulesText:
      "Very Important Brewer — 2 cans cheaper on all goods when you recycle at the merchant.",
  },
  ex_plastback: {
    name: "Plastic Carrier",
    rulesText:
      "Combines with the Empty Bottle weapon: the bottle lasts six bad batches before breaking. Open the accessory in inventory to sell the carrier for cans equal to remaining bottles.",
  },
  ea_linne: {
    name: "Tank Top",
    rulesText: "Light and mobile: you hit harder, but protection is weaker.",
  },
  ea_dunjacka: {
    name: "Down Jacket",
    rulesText:
      "Warm jacket that grants a lot of extra HP, but makes you a little less offensive.",
  },
  ea_cap_bikini: {
    name: "Bottle-Cap Bikini",
    rulesText:
      "Relaxed look: you cannot be challenged to BvB, but you can still challenge others.",
  },
  ea_tshirt: {
    name: "T-Shirt",
    rulesText: "Basic garment with light protection.",
  },
  ea_hawaiishirt: {
    name: "Hawaiian Shirt",
    rulesText: "Tropical style — item effects become +2 stronger.",
  },
  ea_hoodie: {
    name: "Hoodie",
    rulesText: "Soft and cozy — better protection against hits.",
  },
  ea_longsleeve: {
    name: "Long Sleeve",
    rulesText:
      "Looking good has a price — fewer max HP, but more attack in monster fights.",
  },
  ea_six_pack: {
    name: "Six-Pack",
    rulesText: "When you take damage a can rolls out — a few cans as comfort.",
  },
  ea_beer_barrel: {
    name: "Beer Barrel",
    rulesText: "+1 HP every turn",
  },
  ea_can_armor: {
    name: "Can Armor",
    rulesText:
      "Can set bonus: +2 / +4 / +10 max HP. You lose 1 can when you take damage; at 0 cans the bonus is inactive.",
  },
  special_rabarbersvard: {
    name: "Rhubarb sword",
    rulesText: "Can only be obtained by defeating Rhubarbarian.",
  },
  special_korsbarshjalm: {
    name: "Cherry helmet",
    rulesText: "Can only be obtained by defeating Rhubarbarian.",
  },
  special_robotarm: {
    name: "Robot Arm",
    rulesText: "Can only be obtained by defeating Rally Robot. +2 BvB.",
  },
  special_robothjalm: {
    name: "Robot Helmet",
    rulesText: "Can only be obtained by defeating Rally Robot. +2 shield.",
  },
};

/** Monster-specials finns inte i EQUIPMENT_CATALOG (ska inte dyka upp i handeln). */
const SPECIAL_EQUIPMENT_SV: Record<string, EquipmentDisplayText> = {
  special_robotarm: {
    name: "Robotarm",
    rulesText: "Kan endast erhållas genom att vinna mot Rally Robot. +2 BvB.",
  },
  special_robothjalm: {
    name: "Robothjälm",
    rulesText: "Kan endast erhållas genom att vinna mot Rally Robot. +2 sköld.",
  },
  special_rabarbersvard: {
    name: "Rabarbersvärd",
    rulesText: "Kan endast erhållas genom att vinna mot Rabarbar.",
  },
  special_korsbarshjalm: {
    name: "Körsbärshjälm",
    rulesText: "Kan endast erhållas genom att vinna mot Rabarbar.",
  },
};

function equipmentDisplayFromCatalog(catalogId: string): EquipmentDisplayText {
  const special = SPECIAL_EQUIPMENT_SV[catalogId];
  if (special) return special;
  const item = EQUIPMENT_CATALOG.find((x) => x.id === catalogId);
  if (!item) {
    return { name: catalogId, rulesText: "" };
  }
  return { name: item.name, rulesText: item.rulesText ?? "" };
}

export function getEquipmentDisplay(
  catalogId: string,
  locale: GameLocale,
): EquipmentDisplayText {
  if (locale === "en") {
    return EQUIPMENT_LOCALE_EN[catalogId] ?? equipmentDisplayFromCatalog(catalogId);
  }
  return equipmentDisplayFromCatalog(catalogId);
}

function findEquipmentCatalogIdByEquippedName(equippedName: string): string | undefined {
  if (equippedName === "Rabarbersvärd") return "special_rabarbersvard";
  if (equippedName === "Körsbärshjälm") return "special_korsbarshjalm";
  if (equippedName === "Robotarm") return "special_robotarm";
  if (equippedName === "Robothjälm") return "special_robothjalm";
  const direct = EQUIPMENT_CATALOG.find((e) => e.name === equippedName);
  if (direct) return direct.id;
  if (equippedName === "Pilsnersköld") return "ex_buckler";
  if (equippedName === "Burkhjälm II") return "eh_beer_cap_helm_2";
  return undefined;
}

/** Resolve localized display from equipped piece name (server stores Swedish catalog name). */
export function getEquipmentDisplayByEquippedName(
  equippedName: string | undefined,
  locale: GameLocale,
): EquipmentDisplayText | null {
  if (!equippedName?.trim()) return null;
  const catalogId = findEquipmentCatalogIdByEquippedName(equippedName);
  if (catalogId) return getEquipmentDisplay(catalogId, locale);
  return { name: equippedName, rulesText: "" };
}
