import type { BrewerPerkChoice, GameState, Pending, Player, ShopItem } from "@bv/game-core";

export type MerchantEquipmentSlot = "weapon" | "armor" | "helmet" | "accessory";

export const CONTRACT_ICON_PANT_COLOR = "#d1d5db";
export const CONTRACT_ICON_REWARD_COLOR = "#facc15";

export const BREWER_PERK_BUTTONS: {
  choice: BrewerPerkChoice;
  icon: string;
  variant: "pink" | "blue";
}[] = [
  { choice: "attack", icon: "/icons/attack.svg", variant: "pink" },
  { choice: "shield", icon: "/icons/armor-icon.svg", variant: "blue" },
  { choice: "hp", icon: "/icons/hp.svg", variant: "pink" },
  { choice: "pvp", icon: "/icons/bvb-icon.svg", variant: "blue" },
  { choice: "items", icon: "/icons/cards-icon.svg", variant: "pink" },
];

export type BrewerPerkChoiceLabels = {
  brewerPerkAttack: string;
  brewerPerkShield: string;
  brewerPerkHp: string;
  brewerPerkPvp: string;
  brewerPerkItems: string;
};

export function brewerPerkChoiceLabel(labels: BrewerPerkChoiceLabels, choice: BrewerPerkChoice): string {
  switch (choice) {
    case "attack":
      return labels.brewerPerkAttack;
    case "shield":
      return labels.brewerPerkShield;
    case "hp":
      return labels.brewerPerkHp;
    case "pvp":
      return labels.brewerPerkPvp;
    case "items":
      return labels.brewerPerkItems;
    default:
      return choice;
  }
}

/** Föremål som kan spelas vid ingripande i andras PvE-strid (reaktionsfasen). */
export const COMBAT_INTERVENE_PLAYABLE_ITEM_IDS = new Set<string>([
  "weak_beer",
  "light_beer",
  "folk_beer",
  "tripwire",
  "double_hops",
  "beer_bomb",
  "manopositiv",
  "hangover",
  "paidassasin",
  "monster_hype",
  "yeast_sabotage",
  "beer_bro",
  "get_lucky",
  "lengraddad",
  "not_my_round",
  "spill_intentional",
]);

export function isMyPending(pending: Pending | null, me: Player | null) {
  if (!pending || !me) return false;
  if (pending.type === "moveChoice") return pending.playerId === me.id;
  if (pending.type === "card") return pending.playerId === me.id;
  if (pending.type === "equipmentReplaceOffer") return pending.playerId === me.id;
  if (pending.type === "merchant") return pending.playerId === me.id;
  if (pending.type === "door") return pending.playerId === me.id;
  if (pending.type === "levelUpOffer") return pending.playerId === me.id;
  if (pending.type === "brewerPerkChoice") return pending.playerId === me.id;
  if (pending.type === "encounterChoice") return pending.moverId === me.id;
  if (pending.type === "pvp") {
    if (
      pending.phase === "preRoundItems" ||
      pending.phase === "awaitingRolls" ||
      pending.phase === "roundReveal"
    ) {
      return pending.attackerId === me.id || pending.defenderId === me.id;
    }
    return pending.winnerId === me.id || pending.loserId === me.id;
  }
  return false;
}

export function myOffTurnCombatEquipReplace(state: GameState | null, me: Player | null) {
  const off = state?.offTurnPersonalPending;
  if (
    off?.type === "equipmentReplaceOffer" &&
    off.fromCombatLoot === true &&
    off.playerId === me?.id
  ) {
    return off;
  }
  return null;
}

export function isShopItemEquipment(it: ShopItem): it is ShopItem & { slot: MerchantEquipmentSlot } {
  const s = it.slot;
  return s === "weapon" || s === "armor" || s === "helmet" || s === "accessory";
}

export function merchantSlotOccupied(me: Player, slot: MerchantEquipmentSlot): boolean {
  return !!me.equipment[slot];
}

export function merchantEquippedName(me: Player, slot: MerchantEquipmentSlot): string {
  return me.equipment[slot]?.name ?? "";
}
