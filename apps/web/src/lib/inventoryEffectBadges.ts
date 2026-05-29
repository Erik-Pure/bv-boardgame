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
  shortcutDisplayPantGold,
  type EquipmentSlot,
  type ItemInstance,
  type Player,
  type ShopItem,
  type Weapon,
} from "@bv/game-core";

const PLASTBACK_ACCESSORY_NAME = "Plastback";
const TOM_FLASKA_WEAPON_NAME = "Tom flaska";
const PLASTBACK_FULL_FLASK_COUNT = 6;

/** Kvarvarande Tom flaska-vinster när Plastback + Tom flaska är utrustade. */
export function plastbackFlasksRemaining(player?: Player): number | null {
  if (!player) return null;
  const w = player.equipment.weapon;
  if (
    player.equipment.accessory?.name !== PLASTBACK_ACCESSORY_NAME ||
    w?.name !== TOM_FLASKA_WEAPON_NAME ||
    w.breakOnWin !== true
  ) {
    return null;
  }
  const n = w.breakWinsRemaining;
  if (typeof n === "number") return Math.max(0, n);
  return PLASTBACK_FULL_FLASK_COUNT;
}

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

export function effectBadgeIconFilter(
  _icon: keyof typeof ITEM_EFFECT_BADGE_ICONS,
  labelTone?: "danger" | boolean,
  size: "sm" | "md" = "sm",
): string | undefined {
  const glow = size === "md" ? "5px" : "4px";
  const danger = labelTone === "danger" || labelTone === true;
  return danger
    ? `brightness(0) invert(1) drop-shadow(0 0 ${glow} rgba(248,113,113,0.95))`
    : "brightness(0) invert(1)";
}

export type EffectBadgeData = {
  icon: keyof typeof ITEM_EFFECT_BADGE_ICONS;
  label: string;
  labelTone?: "danger";
  /** Ikon efter texten — t.ex. pantkostnad för Genväg/Taproom (samma ordning som övriga pantkostnader). */
  iconAfter?: boolean;
};

export type ItemInventoryBadgeOpts = {
  playerLevelIndex: number;
  levelCount: number;
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

export function equipmentCatalogById(catalogId: string | undefined) {
  if (!catalogId) return undefined;
  return EQUIPMENT_CATALOG.find((e) => e.id === catalogId);
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
  const gainGoldPerPenaltyKlunk =
    "gainGoldPerPenaltyKlunk" in piece
      ? Math.max(0, Math.floor((piece as { gainGoldPerPenaltyKlunk?: number }).gainGoldPerPenaltyKlunk ?? 0))
      : typeof catalog?.gainGoldPerPenaltyKlunk === "number"
        ? Math.max(0, Math.floor(catalog.gainGoldPerPenaltyKlunk))
        : 0;
  const skipPenaltyKlunkEffectBadge =
    catalog?.id === "ex_totebag" || piece.name === "Tygkasse";
  if (gainGoldPerPenaltyKlunk > 0 && !skipPenaltyKlunkEffectBadge) {
    badges.push({
      icon: "pant",
      label: `+${gainGoldPerPenaltyKlunk}/str.kl`,
    });
  }
  const merchantDisc =
    "merchantDiscountGold" in piece &&
    typeof (piece as { merchantDiscountGold?: number }).merchantDiscountGold === "number"
      ? Math.max(0, Math.floor((piece as { merchantDiscountGold?: number }).merchantDiscountGold ?? 0))
      : 0;
  if (merchantDisc > 0) {
    badges.push({ icon: "pant", label: `−${merchantDisc}` });
  }
  if (piece.name === PLASTBACK_ACCESSORY_NAME) {
    const flasks = plastbackFlasksRemaining(player);
    badges.push({
      icon: "pant",
      label: String(flasks ?? PLASTBACK_FULL_FLASK_COUNT),
    });
  }
  const bwr =
    "breakWinsRemaining" in piece && typeof (piece as Weapon).breakWinsRemaining === "number"
      ? (piece as Weapon).breakWinsRemaining
      : undefined;
  if (typeof bwr === "number" && bwr > 0 && (piece as Weapon).breakOnWin) {
    const plastbackShowsFlasks =
      piece.name === TOM_FLASKA_WEAPON_NAME && player?.equipment.accessory?.name === PLASTBACK_ACCESSORY_NAME;
    if (!plastbackShowsFlasks) {
      badges.push({ icon: "attack", label: String(bwr) });
    }
  }
  return badges;
}

export function itemInventoryEffectBadge(
  itemId: string,
  instance?: ItemInstance | null,
  opts?: ItemInventoryBadgeOpts,
): EffectBadgeData | null {
  if (itemId === "canman") {
    const left = instance?.canmanDrawsRemaining ?? CANMAN_DRAWS_INITIAL;
    return { icon: "pant", label: String(left) };
  }
  if (
    (itemId === "shortcut" || itemId === "taproom_key") &&
    opts &&
    Number.isFinite(opts.levelCount) &&
    opts.levelCount > 0 &&
    Number.isFinite(opts.playerLevelIndex)
  ) {
    const n = shortcutDisplayPantGold(itemId, opts.playerLevelIndex, opts.levelCount);
    return { icon: "pant", label: `-${n}`, labelTone: "danger", iconAfter: true };
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
    shuffle: { icon: "pant", label: "10" },
    lengraddad: { icon: "attack", label: "−2", labelTone: "danger" },
    early_night: { icon: "monster", label: "skip" },
    bribes: { icon: "monster", label: "skip" },
    beer_bro: { icon: "attack", label: "×2" },
    sleep_potion: { icon: "monster", label: "Zzz" },
    beard_back: { icon: "attack", label: "×2" },
    not_my_round: { icon: "attack", label: "−", labelTone: "danger" },
    spill_intentional: { icon: "attack", label: "×" },
  };
  return m[String(itemId)] ?? null;
}

/** Effektrad i Panta burkar för köpta stridsföremål (samma attack-texter som förrådsbrickor). */
export function formatInventoryItemShopEffectSummary(itemId: string): string {
  const badge = itemInventoryEffectBadge(itemId);
  if (!badge) return "—";
  if (badge.icon === "attack") return `Attack ${badge.label}`;
  if (badge.icon === "heart") {
    const n = badge.label.replace(/^\+/, "");
    return `+${n} HP`;
  }
  return badge.label;
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
      breakWinsRemaining: item.breakWinsRemaining,
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
    gainGoldPerPenaltyKlunk: item.gainGoldPerPenaltyKlunk,
    preventTheft: item.preventTheft,
    levelUpDiscountGold: item.levelUpDiscountGold,
    canSkipMonsterEncounter: item.canSkipMonsterEncounter,
    pvpDieBonus: item.pvpDieBonus,
    ignoreCombatCritFailOnOne: item.ignoreCombatCritFailOnOne,
    deathContinueCost: item.deathContinueCost,
    merchantDiscountGold: item.merchantDiscountGold,
  };
}

export function equipmentShopCatalogBadges(item: EquipmentShopItem): EffectBadgeData[] {
  const piece = shopItemToEquipmentPreviewPiece(item);
  return equipmentInventoryEffectBadges(piece, item.slot === "weapon" ? 0 : undefined, 0, undefined);
}

function pushShopBadge(badges: EffectBadgeData[], seen: Set<string>, b: EffectBadgeData) {
  const k = `${b.icon}:${b.label}:${b.labelTone ?? ""}:${b.iconAfter ?? ""}`;
  if (seen.has(k)) return;
  seen.add(k);
  badges.push(b);
}

/** Ikoner för Panta burkar — samma uppsättning som inventariet där det går. */
export function shopItemEffectBadges(it: ShopItem): EffectBadgeData[] {
  const badges: EffectBadgeData[] = [];
  const seen = new Set<string>();

  if (it.slot === "heal") {
    pushShopBadge(badges, seen, { icon: "heart", label: `+${it.healAmount ?? 4}` });
    return badges;
  }
  if (it.slot === "gold" && typeof it.goldAmount === "number") {
    pushShopBadge(badges, seen, { icon: "pant", label: `+${it.goldAmount}` });
    return badges;
  }
  if (it.slot === "inventory" && it.inventoryItemId) {
    const b = itemInventoryEffectBadge(it.inventoryItemId, null);
    if (b) pushShopBadge(badges, seen, b);
    return badges;
  }

  if (it.slot !== "weapon" && it.slot !== "armor" && it.slot !== "helmet" && it.slot !== "accessory") {
    return badges;
  }

  const eq = it as EquipmentShopItem;
  for (const b of equipmentShopCatalogBadges(eq)) {
    pushShopBadge(badges, seen, b);
  }

  const beerSetPieceIds = new Set(["ea_can_armor", "eh_beer_cap_helm_1", "ex_buckler"]);
  if (beerSetPieceIds.has(it.id)) {
    if (it.id === "ea_can_armor") pushShopBadge(badges, seen, { icon: "heart", label: "2·4·10" });
    else if (it.id === "eh_beer_cap_helm_1") pushShopBadge(badges, seen, { icon: "attack", label: "1·2·3" });
    else pushShopBadge(badges, seen, { icon: "armor", label: "1·2·3" });
  }

  if (typeof it.powerAtGold30 === "number") {
    const base = typeof it.power === "number" ? it.power : 1;
    const max = it.powerDynamicMax ?? it.powerAtGold30;
    if (max > base) pushShopBadge(badges, seen, { icon: "attack", label: `${base}→${max}` });
  }

  if (typeof it.gainGoldOnWin === "number" && it.gainGoldOnWin > 0) {
    pushShopBadge(badges, seen, { icon: "pant", label: `+${it.gainGoldOnWin}` });
  }
  if (typeof it.gainGoldPerCombat === "number" && it.gainGoldPerCombat > 0) {
    pushShopBadge(badges, seen, { icon: "monster", label: `+${it.gainGoldPerCombat}` });
  }
  if (
    typeof it.randomOtherDamageOnWin === "number" &&
    it.randomOtherDamageOnWin > 0
  ) {
    pushShopBadge(badges, seen, {
      icon: "attack",
      label: `−${it.randomOtherDamageOnWin}`,
      labelTone: "danger",
    });
  }
  if (it.breakOnWin) {
    const winsLeft =
      eq.slot === "weapon" && typeof eq.breakWinsRemaining === "number" ? eq.breakWinsRemaining : 0;
    if (winsLeft <= 0) pushShopBadge(badges, seen, { icon: "attack", label: "1×" });
  }
  if (typeof it.sipAttackBonus === "number" && it.sipAttackBonus > 0) {
    const basePow = typeof it.power === "number" ? it.power : 1;
    const tot = basePow + it.sipAttackBonus;
    const kl = Math.max(0, Math.floor(it.sipWeaponBonusKlunks ?? 0));
    pushShopBadge(badges, seen, { icon: "monster", label: `+${tot}` });
    if (kl > 0) {
      pushShopBadge(badges, seen, { icon: "klunk", label: String(kl), labelTone: "danger" });
    } else {
      const cost =
        typeof it.sipWeaponBonusGoldCost === "number"
          ? Math.max(0, Math.floor(it.sipWeaponBonusGoldCost))
          : it.name === "Dubbelpipa"
            ? 4
            : it.name === "Enkelpipa"
              ? 2
              : 0;
      if (cost > 0) {
        pushShopBadge(badges, seen, {
          icon: "pant",
          label: `-${cost}`,
          labelTone: "danger",
          iconAfter: true,
        });
      }
    }
  }
  if (typeof it.klunkAttackBonus10 === "number") {
    const p20 = typeof it.klunkAttackBonus20 === "number" ? it.klunkAttackBonus20 : 0;
    const pMax =
      typeof it.klunkAttackBonusMax === "number" ? it.klunkAttackBonusMax : Math.max(p20, it.klunkAttackBonus10);
    pushShopBadge(badges, seen, {
      icon: "klunk",
      label: `${it.klunkAttackBonus10}·${p20}·${pMax}`,
    });
    pushShopBadge(badges, seen, { icon: "attack", label: `+${pMax}` });
  }
  if (typeof it.bossDamageNegateBonus === "number" && it.bossDamageNegateBonus > 0) {
    pushShopBadge(badges, seen, { icon: "armor", label: `+${it.bossDamageNegateBonus}` });
  }
  if (typeof it.levelUpDiscountGold === "number" && it.levelUpDiscountGold > 0) {
    pushShopBadge(badges, seen, { icon: "pant", label: `−${it.levelUpDiscountGold}` });
  }
  if (typeof it.gainGoldOnDamageTaken === "number" && it.gainGoldOnDamageTaken > 0) {
    pushShopBadge(badges, seen, { icon: "pant", label: `+${it.gainGoldOnDamageTaken}` });
  }
  if (it.canSkipMonsterEncounter) {
    pushShopBadge(badges, seen, { icon: "monster", label: "skip" });
  }
  if (it.ignoreCombatCritFailOnOne) {
    pushShopBadge(badges, seen, { icon: "attack", label: "≠1" });
  }
  if (typeof it.deathContinueCost === "number" && it.deathContinueCost > 0) {
    pushShopBadge(badges, seen, {
      icon: "pant",
      label: String(it.deathContinueCost),
      labelTone: "danger",
      iconAfter: true,
    });
    pushShopBadge(badges, seen, { icon: "heart", label: "↺" });
  }
  if (it.preventTheft) {
    pushShopBadge(badges, seen, { icon: "bvb", label: "ST" });
  }
  if (typeof it.moveBonus === "number" && it.moveBonus > 0) {
    pushShopBadge(badges, seen, { icon: "level", label: `+${it.moveBonus}` });
  }
  if (it.pvpCannotBeChallenged) {
    pushShopBadge(badges, seen, { icon: "bvb", label: "PvB" });
  }

  return badges;
}

/** Kort text under ikonerna när effekten saknar egen bricka. */
export function shopItemEffectSupplementText(it: ShopItem): string | undefined {
  if (it.id === "ex_plastback") return "Tom flaska: 6 strider";
  return undefined;
}
