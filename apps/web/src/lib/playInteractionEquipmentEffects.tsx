import type { EquipmentSlot, Player, Weapon } from "@bv/game-core";
import {
  equipmentCatalogByEquippedName,
  equipmentCatalogById,
} from "./inventoryEffectBadges";
import { formatShopItemEffectSummary } from "./equipmentEffectSummary";
import { merchantEquippedName } from "./playInteractionHelpers";
import u from "../styles/uiPrimitives.module.css";
import { sv } from "./uiStrings";

function equipmentReplaceEffectSummaryLines(
  slot: EquipmentSlot,
  piece: Player["equipment"][EquipmentSlot] | undefined,
  pieceName: string | undefined,
  catalogId?: string,
): string[] {
  const cat = catalogId ? equipmentCatalogById(catalogId) : equipmentCatalogByEquippedName(pieceName);
  if (cat) {
    const s = formatShopItemEffectSummary(cat);
    if (s && s !== "—") return s.split(" · ").map((x) => x.trim()).filter(Boolean);
    if (cat.rulesText?.trim()) return [cat.rulesText.trim()];
  }
  return equipmentModalDetailLines(slot, piece, pieceName);
}

export function renderEquipmentReplaceEffects(
  slot: EquipmentSlot,
  player: Player,
  newName: string,
  newCatalogId?: string,
) {
  const currentPiece = player.equipment[slot];
  const currentName = merchantEquippedName(player, slot);
  const currentLines = equipmentReplaceEffectSummaryLines(slot, currentPiece, currentName);
  const newLines = equipmentReplaceEffectSummaryLines(slot, undefined, newName, newCatalogId);
  if (currentLines.length === 0 && newLines.length === 0) return null;
  return (
    <div
      className={u.stack8}
      style={{ textAlign: "left", fontSize: 13, lineHeight: 1.45, color: "#e8ecf4", padding: "0 4px" }}
    >
      {currentLines.length > 0 ? (
        <div>
          <strong>{sv.play.equipmentReplaceCurrentEffects}</strong> ({currentName}):{" "}
          {currentLines.join(" · ")}
        </div>
      ) : null}
      {newLines.length > 0 ? (
        <div>
          <strong>{sv.play.equipmentReplaceNewEffects}</strong> ({newName}): {newLines.join(" · ")}
        </div>
      ) : null}
    </div>
  );
}

/** Effektrader för modal: samma sammandrag som i affären när prylen finns i katalogen (annars fallback). */
export function equipmentModalDetailLines(
  slot: EquipmentSlot,
  piece: Player["equipment"][EquipmentSlot] | undefined,
  pieceName: string | undefined,
): string[] {
  const cat = equipmentCatalogByEquippedName(pieceName);
  if (cat) {
    const s = formatShopItemEffectSummary(cat);
    if (s && s !== "—") return s.split(" · ").map((x) => x.trim());
    if (cat.rulesText?.trim()) return [cat.rulesText.trim()];
    return [];
  }
  return equipmentModalEffectLines(slot, piece);
}

function equipmentModalEffectLines(
  slot: EquipmentSlot,
  piece?: Player["equipment"][EquipmentSlot],
): string[] {
  if (!piece) return [];
  const lines: string[] = [];
  if ("power" in piece && typeof piece.power === "number" && piece.power > 0) {
    lines.push(sv.play.powerPlus(piece.power));
  }
  if ("gainGoldOnWin" in piece && typeof piece.gainGoldOnWin === "number" && piece.gainGoldOnWin > 0) {
    lines.push(`Vid vinst: +${piece.gainGoldOnWin} pant.`);
  }
  if ("randomOtherDamageOnWin" in piece && typeof piece.randomOtherDamageOnWin === "number" && piece.randomOtherDamageOnWin > 0) {
    lines.push(`Vid vinst: slumpad annan spelare tar ${piece.randomOtherDamageOnWin} skada.`);
  }
  if ("powerAtGold10" in piece && typeof piece.powerAtGold10 === "number") {
    lines.push(`Vid 10+ pant: kraft +${piece.powerAtGold10}.`);
  }
  if ("powerAtGold20" in piece && typeof piece.powerAtGold20 === "number") {
    lines.push(`Vid 20+ pant: kraft +${piece.powerAtGold20}.`);
  }
  if ("powerAtGold30" in piece && typeof piece.powerAtGold30 === "number") {
    lines.push(`Vid 30+ pant: kraft +${piece.powerAtGold30}.`);
  }
  if ("combatBonus" in piece && typeof piece.combatBonus === "number" && piece.combatBonus > 0) {
    lines.push(sv.play.combatBonus(piece.combatBonus));
  }
  if ("bonusHp" in piece && typeof (piece as { bonusHp?: number }).bonusHp === "number") {
    const bh = (piece as { bonusHp?: number }).bonusHp ?? 0;
    if (bh > 0) lines.push(sv.play.bonusHp(bh));
  }
  if ("healHpPerTurn" in piece && typeof (piece as { healHpPerTurn?: number }).healHpPerTurn === "number") {
    const ht = (piece as { healHpPerTurn?: number }).healHpPerTurn ?? 0;
    if (ht > 0) lines.push(sv.play.healHpPerTurn(ht));
  }
  if ("damageNegate" in piece && typeof piece.damageNegate === "number" && piece.damageNegate > 0) {
    lines.push(sv.play.negatePerHit(piece.damageNegate));
  }
  if ("negateAllOnce" in piece && piece.negateAllOnce) {
    lines.push(sv.play.armorNegateAllOnce);
  }
  if ("moveBonus" in piece && typeof piece.moveBonus === "number" && piece.moveBonus > 0) {
    lines.push(sv.play.moveSteps(piece.moveBonus));
  }
  if ("pvpDieBonus" in piece && typeof piece.pvpDieBonus === "number") {
    lines.push(sv.play.pvpWeaponDieBonus(piece.pvpDieBonus));
  }
  if ("sipAttackBonus" in piece && typeof piece.sipAttackBonus === "number" && piece.sipAttackBonus > 0) {
    const wp = piece as Weapon;
    const kl = Math.max(0, Math.floor(wp.sipWeaponBonusKlunks ?? 0));
    if (kl > 0) {
      const basePow = typeof wp.power === "number" ? wp.power : 1;
      const tot = basePow + piece.sipAttackBonus;
      lines.push(
        `Strid mot monster: valfritt ${kl} klunk före stridstärningen → +${tot} attack från vapnet (+${basePow} utan klunk).`,
      );
    } else {
      const weaponPantCost =
        typeof wp.sipWeaponBonusGoldCost === "number"
          ? Math.max(0, Math.floor(wp.sipWeaponBonusGoldCost))
          : piece.name === "Dubbelpipa"
            ? 4
            : piece.name === "Enkelpipa"
              ? 2
              : 0;
      lines.push(
        weaponPantCost > 0
          ? `Strid mot monster: valfri betalning ${weaponPantCost} pant före stridstärningen för +${piece.sipAttackBonus} attack.`
          : `Strid mot monster: valfri bonus före stridstärningen för +${piece.sipAttackBonus} attack.`,
      );
    }
  }
  if ("pvpCannotBeChallenged" in piece && piece.pvpCannotBeChallenged) {
    lines.push("Andra spelare kan inte utmana dig till BvB, men du kan utmana dem.");
  }
  if ("gainGoldOnDamageTaken" in piece && typeof piece.gainGoldOnDamageTaken === "number" && piece.gainGoldOnDamageTaken > 0) {
    lines.push(`När du tar skada: få +${piece.gainGoldOnDamageTaken} pant.`);
  }
  if ("bossDamageNegateBonus" in piece && typeof piece.bossDamageNegateBonus === "number" && piece.bossDamageNegateBonus > 0) {
    lines.push(`Mot boss: nollställ ytterligare ${piece.bossDamageNegateBonus} skada per träff.`);
  }
  if ("penaltySipExtra" in piece && typeof piece.penaltySipExtra === "number" && piece.penaltySipExtra > 0) {
    lines.push(`När du får straffklunk: drick ${piece.penaltySipExtra} extra klunk.`);
  }
  if (
    "gainGoldPerPenaltyKlunk" in piece &&
    typeof (piece as { gainGoldPerPenaltyKlunk?: number }).gainGoldPerPenaltyKlunk === "number"
  ) {
    const gpk = Math.max(0, Math.floor((piece as { gainGoldPerPenaltyKlunk?: number }).gainGoldPerPenaltyKlunk ?? 0));
    if (gpk > 0) lines.push(`Per straffklunk: +${gpk} pant.`);
  }
  if ("klunkAttackBonus10" in piece && typeof piece.klunkAttackBonus10 === "number") {
    lines.push(`Vid 10+ klunkar: +${piece.klunkAttackBonus10} attack.`);
  }
  if ("klunkAttackBonus20" in piece && typeof piece.klunkAttackBonus20 === "number") {
    lines.push(`Vid 20+ klunkar: +${piece.klunkAttackBonus20} attack.`);
  }
  if (slot === "helmet" && lines.length === 0) return [];
  return lines;
}
