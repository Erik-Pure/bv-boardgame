import type { GameLocale, ShopItem } from "@bv/game-core";
import { formatCanAmount, getCard, getEquipmentDisplay } from "@bv/game-core";
import { formatInventoryItemShopEffectSummary } from "./inventoryEffectBadges";
import type { UiStrings } from "./uiStrings";

function isEquipmentShopItem(
  it: ShopItem,
): it is ShopItem & { slot: "weapon" | "armor" | "helmet" | "accessory" } {
  return (
    it.slot === "weapon" || it.slot === "armor" || it.slot === "helmet" || it.slot === "accessory"
  );
}

function localizedShopItemSupplement(it: ShopItem, locale: GameLocale, ui: UiStrings): string | undefined {
  if (it.id === "ex_plastback") {
    return locale === "en" ? ui.play.shopPlastbackSupplement : "Tom flaska: 6 strider";
  }
  return undefined;
}

function formatShopItemEffectSummaryEn(it: ShopItem, ui: UiStrings): string {
  const p = ui.play;
  if (it.slot === "heal") {
    const n = it.healAmount ?? 4;
    return `+${n} HP`;
  }
  if (it.slot === "gold" && typeof it.goldAmount === "number") {
    return p.shopGoldDeposit(it.goldAmount);
  }
  if (it.slot === "inventory" && it.inventoryItemId) {
    return formatInventoryItemShopEffectSummary(it.inventoryItemId);
  }

  const parts: string[] = [];
  if (typeof it.power === "number") {
    parts.push(p.shopPower(it.power));
  }
  if (typeof it.pvpDieBonus === "number" && it.pvpDieBonus !== 0) {
    parts.push(p.shopPvpOnRoll(it.pvpDieBonus));
  }
  if (typeof it.gainGoldOnWin === "number" && it.gainGoldOnWin > 0) {
    parts.push(p.equipmentWinGold(it.gainGoldOnWin));
  }
  if (typeof it.gainGoldPerCombat === "number" && it.gainGoldPerCombat > 0) {
    parts.push(p.shopPerFightGold(it.gainGoldPerCombat));
  }
  if (typeof it.gainGoldPerPenaltyKlunk === "number" && it.gainGoldPerPenaltyKlunk > 0) {
    parts.push(p.equipmentGoldPerPenaltyKlunk(it.gainGoldPerPenaltyKlunk));
  }
  if (typeof it.randomOtherDamageOnWin === "number" && it.randomOtherDamageOnWin > 0) {
    parts.push(p.equipmentRandomOtherDamage(it.randomOtherDamageOnWin));
  }
  if (it.breakOnWin) {
    parts.push(p.shopBreaksAfterWin);
  }
  if (typeof it.powerAtGold10 === "number") parts.push(p.equipmentPowerAtGold10(it.powerAtGold10));
  if (typeof it.powerAtGold20 === "number") parts.push(p.equipmentPowerAtGold20(it.powerAtGold20));
  if (typeof it.powerAtGold30 === "number") parts.push(p.equipmentPowerAtGold30(it.powerAtGold30));
  if (typeof it.combatBonus === "number" && it.combatBonus !== 0) {
    parts.push(p.shopAttackSigned(it.combatBonus));
  }
  if (typeof it.sipAttackBonus === "number" && it.sipAttackBonus > 0) {
    const kl = Math.max(0, Math.floor(it.sipWeaponBonusKlunks ?? 0));
    if (kl > 0) {
      const basePow = typeof it.power === "number" ? it.power : 1;
      const tot = basePow + it.sipAttackBonus;
      parts.push(p.equipmentSipWeaponKlunkBonus(kl, tot, basePow));
    } else {
      const cost =
        typeof it.sipWeaponBonusGoldCost === "number"
          ? Math.max(0, Math.floor(it.sipWeaponBonusGoldCost))
          : it.name === "Dubbelpipa"
            ? 4
            : it.name === "Enkelpipa"
              ? 2
              : 0;
      if (cost > 0) parts.push(p.equipmentSipWeaponPantBonus(cost, it.sipAttackBonus));
      else parts.push(p.equipmentSipWeaponFreeBonus(it.sipAttackBonus));
    }
  }
  if (typeof it.monsterLossSipReduction === "number" && it.monsterLossSipReduction > 0) {
    parts.push(p.shopMonsterLossSip(it.monsterLossSipReduction));
  }
  if (typeof it.bonusHp === "number" && it.bonusHp !== 0) {
    parts.push(it.bonusHp > 0 ? `+${it.bonusHp} max HP` : `${it.bonusHp} max HP`);
  }
  if (typeof it.healHpPerTurn === "number" && it.healHpPerTurn > 0) {
    parts.push(p.healHpPerTurn(it.healHpPerTurn));
  }
  const beerSetPieceIds = new Set(["ea_can_armor", "eh_beer_cap_helm_1", "ex_buckler"]);
  if (beerSetPieceIds.has(it.id)) {
    if (it.id === "ea_can_armor") parts.push(p.shopBeerSetArmor);
    else if (it.id === "eh_beer_cap_helm_1") parts.push(p.shopBeerSetHelm);
    else parts.push(p.shopBeerSetShield);
  } else if (it.id === "eh_beer_cap_helm_2" && typeof it.damageNegate === "number" && it.damageNegate > 0) {
    parts.push(p.shopDamageNegateFromLevel4(it.damageNegate));
  } else if (typeof it.damageNegate === "number") {
    parts.push(p.shopDamageNegate(it.damageNegate));
  }
  if (typeof it.gainKlunkPerCombat === "number" && it.gainKlunkPerCombat > 0) {
    parts.push(p.shopPerFightSip(it.gainKlunkPerCombat));
  }
  if (it.preventTheft) parts.push(p.shopCannotBeStolen);
  if (typeof it.levelUpDiscountGold === "number" && it.levelUpDiscountGold > 0) {
    parts.push(p.shopLevelUpDiscount(it.levelUpDiscountGold));
  }
  if (typeof it.merchantDiscountGold === "number" && it.merchantDiscountGold > 0) {
    parts.push(p.shopMerchantDiscount(it.merchantDiscountGold));
  }
  if (it.canSkipMonsterEncounter) parts.push(p.shopCanSkipMonsterFight);
  if (typeof it.bossDamageNegateBonus === "number" && it.bossDamageNegateBonus > 0) {
    parts.push(p.equipmentBossDamageNegate(it.bossDamageNegateBonus));
  }
  if (typeof it.penaltySipExtra === "number" && it.penaltySipExtra > 0) {
    parts.push(p.equipmentPenaltySipExtra(it.penaltySipExtra));
  }
  if (typeof it.gainGoldOnDamageTaken === "number" && it.gainGoldOnDamageTaken > 0) {
    parts.push(p.equipmentGoldOnDamage(it.gainGoldOnDamageTaken));
  }
  if (typeof it.klunkAttackBonus10 === "number") parts.push(p.equipmentKlunkAttack10(it.klunkAttackBonus10));
  if (typeof it.klunkAttackBonus20 === "number") parts.push(p.equipmentKlunkAttack20(it.klunkAttackBonus20));
  if (it.negateAllOnce) parts.push(p.shopNegateAllOnce);
  if (it.pvpCannotBeChallenged) parts.push(p.shopCannotBeChallengedBvb);
  if (typeof it.moveBonus === "number") parts.push(p.moveSteps(it.moveBonus));
  if (it.ignoreCombatCritFailOnOne) {
    parts.push(p.shopIgnoreCritFailOnOne);
  }
  if (typeof it.deathContinueCost === "number" && it.deathContinueCost > 0) {
    parts.push(p.shopDeathContinue(it.deathContinueCost));
  }
  if (typeof it.itemCardBonus === "number" && it.itemCardBonus > 0) {
    parts.push(p.shopItemCardBonus(it.itemCardBonus));
  }
  if (it.freeInventoryItemPlay) {
    parts.push(p.shopFreeItemPlay);
  }
  if (parts.length > 0) return parts.join(" · ");
  const supplement = localizedShopItemSupplement(it, "en", ui);
  if (supplement) return supplement;
  return "—";
}

/**
 * Kort beskrivning av affärsrad / katalograd så att siffror stämmer med spelet.
 * Används i Panta burkar och kortkatalogens utrustningsöversikt.
 */
export function formatShopItemEffectSummary(it: ShopItem): string {
  if (it.slot === "heal") {
    const n = it.healAmount ?? 4;
    return `+${n} HP`;
  }
  if (it.slot === "gold" && typeof it.goldAmount === "number") {
    return `+${it.goldAmount} pant`;
  }
  if (it.slot === "inventory" && it.inventoryItemId) {
    return formatInventoryItemShopEffectSummary(it.inventoryItemId);
  }

  const parts: string[] = [];
  if (typeof it.power === "number") {
    parts.push(it.power >= 0 ? `Kraft +${it.power}` : `Kraft ${it.power}`);
  }
  if (typeof it.pvpDieBonus === "number" && it.pvpDieBonus !== 0) {
    parts.push(
      it.pvpDieBonus > 0 ? `BvB: +${it.pvpDieBonus} på slag` : `BvB: ${it.pvpDieBonus} på slag`,
    );
  }
  if (typeof it.gainGoldOnWin === "number" && it.gainGoldOnWin > 0) {
    parts.push(`Vid vinst: +${it.gainGoldOnWin} pant`);
  }
  if (typeof it.gainGoldPerCombat === "number" && it.gainGoldPerCombat > 0) {
    parts.push(`Per strid: +${it.gainGoldPerCombat} pant`);
  }
  if (typeof it.gainGoldPerPenaltyKlunk === "number" && it.gainGoldPerPenaltyKlunk > 0) {
    parts.push(`Per straffklunk: +${it.gainGoldPerPenaltyKlunk} pant`);
  }
  if (typeof it.randomOtherDamageOnWin === "number" && it.randomOtherDamageOnWin > 0) {
    parts.push(`Vid vinst: slumpad annan −${it.randomOtherDamageOnWin} HP`);
  }
  if (it.breakOnWin) {
    parts.push("Går sönder efter vinst");
  }
  if (typeof it.powerAtGold10 === "number") parts.push(`Vid 10+ pant: Kraft +${it.powerAtGold10}`);
  if (typeof it.powerAtGold20 === "number") parts.push(`Vid 20+ pant: Kraft +${it.powerAtGold20}`);
  if (typeof it.powerAtGold30 === "number") parts.push(`Vid 30+ pant: Kraft +${it.powerAtGold30}`);
  if (typeof it.combatBonus === "number" && it.combatBonus !== 0) {
    parts.push(it.combatBonus > 0 ? `Attack +${it.combatBonus}` : `Attack ${it.combatBonus}`);
  }
  if (typeof it.sipAttackBonus === "number" && it.sipAttackBonus > 0) {
    const kl = Math.max(0, Math.floor(it.sipWeaponBonusKlunks ?? 0));
    if (kl > 0) {
      const basePow = typeof it.power === "number" ? it.power : 1;
      const tot = basePow + it.sipAttackBonus;
      parts.push(`Strid mot monster: valfritt ${kl} klunk före slag → +${tot} attack från vapnet (+${basePow} utan klunk)`);
    } else {
      const cost =
        typeof it.sipWeaponBonusGoldCost === "number"
          ? Math.max(0, Math.floor(it.sipWeaponBonusGoldCost))
          : it.name === "Dubbelpipa"
            ? 4
            : it.name === "Enkelpipa"
              ? 2
              : 0;
      if (cost > 0) parts.push(`Strid mot monster: valfri betalning ${cost} pant före slag för +${it.sipAttackBonus} attack`);
      else parts.push(`Strid mot monster: valfri bonus före slag för +${it.sipAttackBonus} attack`);
    }
  }
  if (typeof it.monsterLossSipReduction === "number" && it.monsterLossSipReduction > 0) {
    parts.push(`Vid förlust mot monster: −${it.monsterLossSipReduction} straffklunk`);
  }
  if (typeof it.bonusHp === "number" && it.bonusHp !== 0) {
    parts.push(it.bonusHp > 0 ? `+${it.bonusHp} max HP` : `${it.bonusHp} max HP`);
  }
  if (typeof it.healHpPerTurn === "number" && it.healHpPerTurn > 0) {
    parts.push(`Per drag: +${it.healHpPerTurn} HP`);
  }
  const beerSetPieceIds = new Set(["ea_can_armor", "eh_beer_cap_helm_1", "ex_buckler"]);
  if (beerSetPieceIds.has(it.id)) {
    if (it.id === "ea_can_armor") parts.push("Burk-set rustning: +2 / +4 / +10 max HP (1–3 delar)");
    else if (it.id === "eh_beer_cap_helm_1") parts.push("Burk-set hjälm: +1 / +2 / +3 attack (1–3 delar)");
    else parts.push("Burk-set sköld: +1 / +2 / +3 skada bort (1–3 delar)");
  } else if (it.id === "eh_beer_cap_helm_2" && typeof it.damageNegate === "number" && it.damageNegate > 0) {
    parts.push(`Skada −${it.damageNegate} (aktiv från nivå 4)`);
  } else if (typeof it.damageNegate === "number") {
    const v = it.damageNegate;
    parts.push(v >= 0 ? `Skada −${v}` : `Skada +${Math.abs(v)}`);
  }
  if (typeof it.gainKlunkPerCombat === "number" && it.gainKlunkPerCombat > 0) {
    parts.push(`Per strid: +${it.gainKlunkPerCombat} klunk`);
  }
  if (it.preventTheft) parts.push("Kan inte bli bestulen");
  if (typeof it.levelUpDiscountGold === "number" && it.levelUpDiscountGold > 0) {
    parts.push(`Nivå upp: −${it.levelUpDiscountGold} pant`);
  }
  if (typeof it.merchantDiscountGold === "number" && it.merchantDiscountGold > 0) {
    parts.push(`Handel: −${it.merchantDiscountGold} billigare i affären`);
  }
  if (it.canSkipMonsterEncounter) parts.push("Kan välja att undvika monsterstrid");
  if (typeof it.bossDamageNegateBonus === "number" && it.bossDamageNegateBonus > 0) {
    parts.push(`Boss-skada −${it.bossDamageNegateBonus} extra`);
  }
  if (typeof it.penaltySipExtra === "number" && it.penaltySipExtra > 0) {
    parts.push(`Straffklunk: +${it.penaltySipExtra} extra`);
  }
  if (typeof it.gainGoldOnDamageTaken === "number" && it.gainGoldOnDamageTaken > 0) {
    parts.push(`När du tar skada: +${it.gainGoldOnDamageTaken} pant`);
  }
  if (typeof it.klunkAttackBonus10 === "number") parts.push(`Vid 10+ klunkar: +${it.klunkAttackBonus10} attack`);
  if (typeof it.klunkAttackBonus20 === "number") parts.push(`Vid 20+ klunkar: +${it.klunkAttackBonus20} attack`);
  if (it.negateAllOnce) parts.push("Blockar all skada en gång");
  if (it.pvpCannotBeChallenged) parts.push("Kan inte utmanas i BvB");
  if (typeof it.moveBonus === "number") parts.push(`Rörelse +${it.moveBonus}`);
  if (it.ignoreCombatCritFailOnOne) {
    parts.push("Etta på stridstärning ger inte automatisk förlust");
  }
  if (typeof it.deathContinueCost === "number" && it.deathContinueCost > 0) {
    parts.push(`Vid död: betala ${it.deathContinueCost} pant för fullt liv`);
  }
  if (typeof it.itemCardBonus === "number" && it.itemCardBonus > 0) {
    parts.push(`+${it.itemCardBonus} föremålskort`);
  }
  if (it.freeInventoryItemPlay) {
    parts.push("Föremål: gratis att spela");
  }
  if (parts.length > 0) return parts.join(" · ");
  if (it.id === "ex_plastback") return "Tom flaska: 6 strider";
  return "—";
}

/** Locale-aware shop item description (detail view, replace preview, catalog). */
export function formatLocalizedShopItemEffectSummary(
  it: ShopItem,
  locale: GameLocale,
  ui: UiStrings,
): string {
  if (locale === "en") {
    if (isEquipmentShopItem(it)) {
      const rulesText = getEquipmentDisplay(it.id, locale).rulesText?.trim();
      if (rulesText) return rulesText;
    }
    if (it.slot === "inventory" && it.inventoryItemId) {
      try {
        const text = getCard(`item_${it.inventoryItemId}`, "en").text?.trim();
        if (text) return text;
      } catch {
        // fall through
      }
    }
    if (it.slot === "gold" && typeof it.goldAmount === "number") {
      return ui.play.shopGoldDeposit(it.goldAmount);
    }
    return formatShopItemEffectSummaryEn(it, ui);
  }
  return formatShopItemEffectSummary(it);
}
