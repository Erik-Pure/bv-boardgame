import type { EquipmentSlot, ShopItem } from "./types.js";

export type EquipmentShopItem = ShopItem & { slot: EquipmentSlot };

export const EQUIPMENT_CATALOG: EquipmentShopItem[] = [
  { id: "ew_doublepipe", slot: "weapon", name: "Dubbelpipa", price: 15, power: 2, sipAttackBonus: 3 },
  { id: "ew_singlepipe", slot: "weapon", name: "Enkelpipa", price: 11, power: 1, sipAttackBonus: 2 },
  // Your originals (renamed a bit)
  { id: "eh_stoutcap", slot: "helmet", name: "Stouthjälm", price: 7, damageNegate: 1 },
  { id: "ea_canplate", slot: "armor", name: "Burkplåtsbrynja", price: 9, bonusHp: 0, damageNegate: 1 },
  { id: "ex_buckler", slot: "accessory", name: "Pilsnersköld", price: 8, damageNegate: 1 },
  { id: "ex_hoptalon", slot: "accessory", name: "Humleklor", price: 8, moveBonus: 1 },
  { id: "ea_crystal", slot: "armor", name: "Kristallmaltsrustning", price: 11, bonusHp: 0, negateAllOnce: true },

  // 5 new fun ones (none negate >2)
  { id: "eh_foamvisor", slot: "helmet", name: "Skumvisir", price: 8, damageNegate: 1 },
  { id: "ea_kegpad", slot: "armor", name: "Fatknytnävs-vaddering", price: 10, bonusHp: 0, damageNegate: 2 },
  { id: "ex_hazycloak", slot: "accessory", name: "Disig mantel", price: 7, damageNegate: 1 },
  { id: "ex_tapkey", slot: "accessory", name: "Taproom-nyckelring", price: 6, moveBonus: 1 },
  { id: "ea_barrelhide", slot: "armor", name: "Fatlädersväst", price: 9, bonusHp: 0, damageNegate: 1 },
];

