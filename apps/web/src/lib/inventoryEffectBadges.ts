import type { EquipmentShopItem } from "@bv/game-core";
import {
  BEER_CAN_HELM1_NAME,
  BEER_CAN_RUSTNING_NAME,
  BEER_HELM2_MIN_LEVEL,
  burkhjälmIIEffectiveDamageNegateFrom,
  CANMAN_DRAWS_INITIAL,
  EQUIPMENT_CATALOG,
  effectiveWeaponPiecePower,
  helmetAttackBonus,
  isBeerCanShieldName,
  isLegendariskBurkhjälmName,
  type EquipmentSlot,
  type ItemInstance,
  type Player,
  type ShopItem,
  type Weapon,
} from "@bv/game-core";

export const ITEM_EFFECT_BADGE_ICONS = {
  heart: "/icons/heart-icon.svg",
  monster: "/icons/monster-icon.svg",
  attack: "/icons/combat-icon.svg",
  armor: "/icons/armor-icon.svg",
  klunk: "/icons/klunk-icon.svg",
  pant: "/icons/pant-icon.svg",
  bvb: "/icons/bvb-icon.svg",
  level: "/icons/lvlup.svg",
} as const;

export type EffectBadgeData = {
  icon: keyof typeof ITEM_EFFECT_BADGE_ICONS;
  label: string;
  labelTone?: "danger";
};

export function formatSigned(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

export function equipmentCatalogByEquippedName(name: string | undefined) {
  if (!name) return undefined;
  const direct = EQUIPMENT_CATALOG.find((e) => e.name === name);
  if (direct) return direct;
  if (name === "Pilsnersköld") return EQUIPMENT_CATALOG.find((e) => e.id === "ex_buckler");
  if (name === "Burkhjälm II") return EQUIPMENT_CATALOG.find((e) => e.id === "eh_beer_cap_helm_2");
  return undefined;
}

export function equipmentInventoryEffectBadges(
  piece?: Player["equipment"][EquipmentSlot],
  playerGold?: number,
  burkSetEquippedCount?: number,
  player?: Player,
): EffectBadgeData[] {
  if (!piece) return [];
  const badges: EffectBadgeData[] = [];
  const catalog = equipmentCatalogByEquippedName(piece.name);
  const liveHelmet = !!player && piece === player.equipment.helmet;
  const burkN =
    typeof burkSetEquippedCount === "number" && burkSetEquippedCount >= 1
      ? Math.min(3, burkSetEquippedCount)
      : 0;
  if (piece.name === BEER_CAN_RUSTNING_NAME && burkN >= 1) {
    const hp = [2, 4, 10][burkN - 1]!;
    badges.push({ icon: "heart", label: `+${hp}` });
  }
  if (!liveHelmet && piece.name === BEER_CAN_HELM1_NAME && burkN >= 1) {
    badges.push({ icon: "attack", label: formatSigned(burkN) });
  }
  if (isBeerCanShieldName(piece.name) && burkN >= 1) {
    badges.push({ icon: "armor", label: `+${burkN}` });
  }
  const powerPart =
    "power" in piece
      ? typeof playerGold === "number"
        ? effectiveWeaponPiecePower(piece as Weapon, playerGold)
        : (piece as Weapon).power ?? 0
      : 0;
  const combatBonus = "combatBonus" in piece ? ((piece as { combatBonus?: number }).combatBonus ?? 0) : 0;
  if (liveHelmet) {
    const ha = helmetAttackBonus(player);
    if (ha !== 0) {
      badges.push({
        icon: "attack",
        label: formatSigned(ha),
        labelTone: ha < 0 ? "danger" : undefined,
      });
    }
  } else {
    const attackMod = powerPart + combatBonus;
    if (attackMod !== 0) {
      badges.push({
        icon: "attack",
        label: formatSigned(attackMod),
        labelTone: attackMod < 0 ? "danger" : undefined,
      });
    }
  }
  const bonusHpPiece =
    "bonusHp" in piece
      ? ((piece as { bonusHp?: number }).bonusHp ?? 0)
      : typeof catalog?.bonusHp === "number"
        ? catalog.bonusHp
        : 0;
  if (bonusHpPiece > 0) badges.push({ icon: "heart", label: `+${bonusHpPiece}` });
  else if (bonusHpPiece < 0) {
    badges.push({ icon: "heart", label: String(bonusHpPiece), labelTone: "danger" });
  }
  const healPerTurn =
    "healHpPerTurn" in piece
      ? ((piece as { healHpPerTurn?: number }).healHpPerTurn ?? 0)
      : typeof catalog?.healHpPerTurn === "number"
        ? catalog.healHpPerTurn
        : 0;
  if (healPerTurn > 0) badges.push({ icon: "heart", label: `+${healPerTurn}/drag` });
  const pvpDieBonus =
    "pvpDieBonus" in piece && typeof (piece as Weapon).pvpDieBonus === "number"
      ? ((piece as Weapon).pvpDieBonus ?? 0)
      : 0;
  if (pvpDieBonus !== 0) {
    badges.push({
      icon: "bvb",
      label: formatSigned(pvpDieBonus),
      labelTone: pvpDieBonus < 0 ? "danger" : undefined,
    });
  }
  const monsterLossSipRed =
    "monsterLossSipReduction" in piece && typeof (piece as Weapon).monsterLossSipReduction === "number"
      ? Math.max(0, Math.floor((piece as Weapon).monsterLossSipReduction ?? 0))
      : 0;
  if (monsterLossSipRed > 0) {
    badges.push({ icon: "klunk", label: `−${monsterLossSipRed}` });
  }
  const damageNegateRaw =
    "damageNegate" in piece
      ? (piece.damageNegate ?? 0)
      : typeof catalog?.damageNegate === "number"
        ? catalog.damageNegate
        : 0;
  const negateAllOnce = "negateAllOnce" in piece && !!piece.negateAllOnce;
  if (isLegendariskBurkhjälmName(piece.name)) {
    const xp = player?.xp ?? 0;
    const eff = burkhjälmIIEffectiveDamageNegateFrom(xp, piece as Player["equipment"]["helmet"]);
    if (negateAllOnce) {
      badges.push({ icon: "armor", label: eff > 0 ? `+${eff}+ALL` : "+ALL" });
    } else if (eff > 0) {
      badges.push({ icon: "armor", label: `+${eff}` });
    } else if (damageNegateRaw > 0) {
      badges.push({ icon: "level", label: String(BEER_HELM2_MIN_LEVEL) });
    }
  } else if (damageNegateRaw < 0) {
    badges.push({ icon: "armor", label: String(damageNegateRaw), labelTone: "danger" });
  } else if (negateAllOnce || damageNegateRaw > 0) {
    const defenseLabel = negateAllOnce
      ? damageNegateRaw > 0
        ? `+${damageNegateRaw}+ALL`
        : "+ALL"
      : `+${damageNegateRaw}`;
    badges.push({ icon: "armor", label: defenseLabel });
  }
  return badges;
}

export function itemInventoryEffectBadge(
  itemId: string,
  instance?: ItemInstance | null,
): EffectBadgeData | null {
  if (itemId === "canman") {
    const left = instance?.canmanDrawsRemaining ?? CANMAN_DRAWS_INITIAL;
    return { icon: "pant", label: String(left) };
  }
  const m: Record<string, EffectBadgeData> = {
    healing_potion: { icon: "heart", label: "+3" },
    pretzel_snack: { icon: "heart", label: "+2" },
    coin_purse: { icon: "pant", label: "+4" },
    charity: { icon: "pant", label: "HP" },
    shortcut: { icon: "pant", label: "↑" },
    taproom_key: { icon: "pant", label: "↑" },
    weak_beer: { icon: "attack", label: "−2", labelTone: "danger" },
    light_beer: { icon: "attack", label: "+1" },
    folk_beer: { icon: "attack", label: "+2" },
    tripwire: { icon: "attack", label: "−1", labelTone: "danger" },
    double_hops: { icon: "attack", label: "+2" },
    beer_bomb: { icon: "attack", label: "+3" },
    hangover: { icon: "attack", label: "−3", labelTone: "danger" },
    paidassasin: { icon: "attack", label: "−5", labelTone: "danger" },
    monster_hype: { icon: "attack", label: "−2", labelTone: "danger" },
    yeast_sabotage: { icon: "attack", label: "−1", labelTone: "danger" },
    get_lucky: { icon: "attack", label: "+4" },
    manopositiv: { icon: "attack", label: "+4" },
    sip_card: { icon: "klunk", label: "+1" },
    split_the_g: { icon: "pant", label: "½" },
    lengraddad: { icon: "attack", label: "−2", labelTone: "danger" },
    early_night: { icon: "monster", label: "skip" },
    bribes: { icon: "monster", label: "skip" },
    beer_bro: { icon: "attack", label: "×2" },
    sleep_potion: { icon: "monster", label: "Zzz" },
    beard_back: { icon: "attack", label: "×2" },
    six_sense: { icon: "bvb", label: "t6" },
    rigged_game: { icon: "armor", label: "⇄" },
    not_my_round: { icon: "attack", label: "−", labelTone: "danger" },
    spill_intentional: { icon: "attack", label: "×" },
  };
  return m[String(itemId)] ?? null;
}

/** Samma fält som vid köp/equip — för förhandsvisning av effektbrickor (katalog m.m.). */
export function shopItemToEquipmentPreviewPiece(
  item: ShopItem & { slot: EquipmentSlot },
): Player["equipment"][EquipmentSlot] {
  if (item.slot === "weapon") {
    return {
      name: item.name,
      power: item.power ?? 1,
      sipAttackBonus: item.sipAttackBonus,
      sipWeaponBonusGoldCost: item.sipWeaponBonusGoldCost,
      sipWeaponBonusKlunks: item.sipWeaponBonusKlunks,
      pvpDieBonus: item.pvpDieBonus,
      gainGoldOnWin: item.gainGoldOnWin,
      powerAtGold10: item.powerAtGold10,
      powerAtGold20: item.powerAtGold20,
      powerAtGold30: item.powerAtGold30,
      powerDynamicMax: item.powerDynamicMax,
      randomOtherDamageOnWin: item.randomOtherDamageOnWin,
      breakOnWin: item.breakOnWin,
      monsterLossSipReduction: item.monsterLossSipReduction,
    };
  }
  if (item.slot === "armor") {
    return {
      name: item.name,
      bonusHp: item.bonusHp ?? 0,
      combatBonus: item.combatBonus ?? 0,
      damageNegate: item.damageNegate,
      bossDamageNegateBonus: item.bossDamageNegateBonus,
      negateAllOnce: item.negateAllOnce,
      pvpCannotBeChallenged: item.pvpCannotBeChallenged,
      pvpDieBonus: item.pvpDieBonus,
      gainGoldOnDamageTaken: item.gainGoldOnDamageTaken,
      healHpPerTurn: item.healHpPerTurn,
    };
  }
  if (item.slot === "helmet") {
    return {
      name: item.name,
      bonusHp: item.bonusHp ?? 0,
      combatBonus: item.combatBonus ?? 0,
      damageNegate: item.damageNegate,
      bossDamageNegateBonus: item.bossDamageNegateBonus,
      negateAllOnce: item.negateAllOnce,
      penaltySipExtra: item.penaltySipExtra,
      klunkAttackBonus10: item.klunkAttackBonus10,
      klunkAttackBonus20: item.klunkAttackBonus20,
      klunkAttackBonusMax: item.klunkAttackBonusMax,
      pvpDieBonus: item.pvpDieBonus,
    };
  }
  return {
    name: item.name,
    damageNegate: item.damageNegate,
    combatBonus: item.combatBonus,
    penaltySipExtra: item.penaltySipExtra,
    moveBonus: item.moveBonus,
    gainGoldPerCombat: item.gainGoldPerCombat,
    gainKlunkPerCombat: item.gainKlunkPerCombat,
    preventTheft: item.preventTheft,
    levelUpDiscountGold: item.levelUpDiscountGold,
    canSkipMonsterEncounter: item.canSkipMonsterEncounter,
    pvpDieBonus: item.pvpDieBonus,
    ignoreCombatCritFailOnOne: item.ignoreCombatCritFailOnOne,
  };
}

export function equipmentShopCatalogBadges(item: EquipmentShopItem): EffectBadgeData[] {
  const piece = shopItemToEquipmentPreviewPiece(item);
  return equipmentInventoryEffectBadges(piece, item.slot === "weapon" ? 0 : undefined, 0, undefined);
}
