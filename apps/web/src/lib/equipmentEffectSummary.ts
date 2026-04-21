import type { ShopItem } from "@bv/game-core";

/**
 * Kort svensk beskrivning av affärsrad / katalograd så att siffror stämmer med spelet.
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

  const parts: string[] = [];
  if (typeof it.power === "number") parts.push(`Kraft +${it.power}`);
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
  if (typeof it.randomOtherDamageOnWin === "number" && it.randomOtherDamageOnWin > 0) {
    parts.push(`Vid vinst: slumpad annan −${it.randomOtherDamageOnWin} HP`);
  }
  if (typeof it.powerAtGold10 === "number") parts.push(`Vid 10+ pant: Kraft +${it.powerAtGold10}`);
  if (typeof it.powerAtGold20 === "number") parts.push(`Vid 20+ pant: Kraft +${it.powerAtGold20}`);
  if (typeof it.powerAtGold30 === "number") parts.push(`Vid 30+ pant: Kraft +${it.powerAtGold30}`);
  if (typeof it.combatBonus === "number" && it.combatBonus > 0) parts.push(`Attack +${it.combatBonus}`);
  if (typeof it.sipAttackBonus === "number") {
    parts.push(`Strid mot monster: valfri straffklunk före slag för +${it.sipAttackBonus} attack`);
  }
  if (typeof it.bonusHp === "number" && it.bonusHp > 0) parts.push(`+${it.bonusHp} max HP`);
  if (typeof it.healHpPerTurn === "number" && it.healHpPerTurn > 0) {
    parts.push(`Per drag: +${it.healHpPerTurn} HP`);
  }
  const beerSetPieceIds = new Set(["ea_can_armor", "eh_beer_cap_helm_1", "ex_buckler"]);
  if (beerSetPieceIds.has(it.id)) {
    if (it.id === "ea_can_armor") parts.push("Burk-set rustning: +2 / +4 / +10 max HP (1–3 delar)");
    else if (it.id === "eh_beer_cap_helm_1") parts.push("Burk-set hjälm: +1 / +2 / +3 attack (1–3 delar)");
    else parts.push("Burk-set sköld: +1 / +2 / +3 skada bort (1–3 delar)");
  } else if (it.id === "eh_beer_cap_helm_2" && typeof it.damageNegate === "number" && it.damageNegate > 0) {
    parts.push(`Skada −${it.damageNegate} (aktiv från 15 klunkar)`);
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
  return parts.length ? parts.join(" · ") : "—";
}
