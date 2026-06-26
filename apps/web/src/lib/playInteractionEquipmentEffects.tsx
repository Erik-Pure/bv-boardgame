import type { EquipmentSlot, GameLocale, Player, ShopItem, Weapon } from "@bv/game-core";
import { getEquipmentDisplay, getEquipmentDisplayByEquippedName } from "@bv/game-core";
import {
  equipmentCatalogByEquippedName,
  equipmentCatalogById,
} from "./inventoryEffectBadges";
import { formatLocalizedShopItemEffectSummary } from "./equipmentEffectSummary";
import { merchantEquippedName } from "./playInteractionHelpers";
import type { UiStrings } from "./uiStrings";
import u from "../styles/uiPrimitives.module.css";

function localizedEquippedDisplayName(
  equippedName: string | undefined,
  locale: GameLocale,
): string | undefined {
  if (!equippedName) return undefined;
  return getEquipmentDisplayByEquippedName(equippedName, locale)?.name ?? equippedName;
}

function catalogEffectSummaryLines(
  catalogId: string,
  locale: GameLocale,
  cat: ShopItem,
  ui: UiStrings,
): string[] {
  const s = formatLocalizedShopItemEffectSummary(cat, locale, ui);
  if (s && s !== "—") return s.split(" · ").map((x) => x.trim()).filter(Boolean);
  const rulesText = getEquipmentDisplay(catalogId, locale).rulesText?.trim();
  if (rulesText) return [rulesText];
  return [];
}

function equipmentReplaceEffectSummaryLines(
  slot: EquipmentSlot,
  piece: Player["equipment"][EquipmentSlot] | undefined,
  pieceName: string | undefined,
  ui: UiStrings,
  locale: GameLocale,
  catalogId?: string,
): string[] {
  const cat = catalogId ? equipmentCatalogById(catalogId) : equipmentCatalogByEquippedName(pieceName);
  if (cat) {
    return catalogEffectSummaryLines(cat.id, locale, cat, ui);
  }
  return equipmentModalDetailLines(slot, piece, pieceName, ui, locale);
}

export function renderEquipmentReplaceEffects(
  slot: EquipmentSlot,
  player: Player,
  newName: string,
  ui: UiStrings,
  newCatalogId?: string,
  locale: GameLocale = "sv",
) {
  const currentPiece = player.equipment[slot];
  const currentName = merchantEquippedName(player, slot);
  const currentDisplayName = localizedEquippedDisplayName(currentName, locale) ?? currentName;
  const newDisplayName = newCatalogId
    ? getEquipmentDisplay(newCatalogId, locale).name
    : localizedEquippedDisplayName(newName, locale) ?? newName;
  const currentLines = equipmentReplaceEffectSummaryLines(slot, currentPiece, currentName, ui, locale);
  const newLines = equipmentReplaceEffectSummaryLines(slot, undefined, newName, ui, locale, newCatalogId);
  if (currentLines.length === 0 && newLines.length === 0) return null;
  return (
    <div
      className={u.stack8}
      style={{ textAlign: "left", fontSize: 13, lineHeight: 1.45, color: "#e8ecf4", padding: "0 4px" }}
    >
      {currentLines.length > 0 ? (
        <div>
          <strong>{ui.play.equipmentReplaceCurrentEffects}</strong> ({currentDisplayName}):{" "}
          {currentLines.join(" · ")}
        </div>
      ) : null}
      {newLines.length > 0 ? (
        <div>
          <strong>{ui.play.equipmentReplaceNewEffects}</strong> ({newDisplayName}): {newLines.join(" · ")}
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
  ui: UiStrings,
  locale: GameLocale = "sv",
): string[] {
  const cat = equipmentCatalogByEquippedName(pieceName);
  if (cat) {
    return catalogEffectSummaryLines(cat.id, locale, cat, ui);
  }
  return equipmentModalEffectLines(slot, piece, ui);
}

function equipmentModalEffectLines(
  slot: EquipmentSlot,
  piece: Player["equipment"][EquipmentSlot] | undefined,
  ui: UiStrings,
): string[] {
  if (!piece) return [];
  const lines: string[] = [];
  if ("power" in piece && typeof piece.power === "number" && piece.power > 0) {
    lines.push(ui.play.powerPlus(piece.power));
  }
  if ("gainGoldOnWin" in piece && typeof piece.gainGoldOnWin === "number" && piece.gainGoldOnWin > 0) {
    lines.push(ui.play.equipmentWinGold(piece.gainGoldOnWin));
  }
  if ("randomOtherDamageOnWin" in piece && typeof piece.randomOtherDamageOnWin === "number" && piece.randomOtherDamageOnWin > 0) {
    lines.push(ui.play.equipmentRandomOtherDamage(piece.randomOtherDamageOnWin));
  }
  if ("powerAtGold10" in piece && typeof piece.powerAtGold10 === "number") {
    lines.push(ui.play.equipmentPowerAtGold10(piece.powerAtGold10));
  }
  if ("powerAtGold20" in piece && typeof piece.powerAtGold20 === "number") {
    lines.push(ui.play.equipmentPowerAtGold20(piece.powerAtGold20));
  }
  if ("powerAtGold30" in piece && typeof piece.powerAtGold30 === "number") {
    lines.push(ui.play.equipmentPowerAtGold30(piece.powerAtGold30));
  }
  if ("combatBonus" in piece && typeof piece.combatBonus === "number" && piece.combatBonus > 0) {
    lines.push(ui.play.combatBonus(piece.combatBonus));
  }
  if ("bonusHp" in piece && typeof (piece as { bonusHp?: number }).bonusHp === "number") {
    const bh = (piece as { bonusHp?: number }).bonusHp ?? 0;
    if (bh > 0) lines.push(ui.play.bonusHp(bh));
  }
  if ("healHpPerTurn" in piece && typeof (piece as { healHpPerTurn?: number }).healHpPerTurn === "number") {
    const ht = (piece as { healHpPerTurn?: number }).healHpPerTurn ?? 0;
    if (ht > 0) lines.push(ui.play.healHpPerTurn(ht));
  }
  if ("damageNegate" in piece && typeof piece.damageNegate === "number" && piece.damageNegate > 0) {
    lines.push(ui.play.negatePerHit(piece.damageNegate));
  }
  if ("negateAllOnce" in piece && piece.negateAllOnce) {
    lines.push(ui.play.armorNegateAllOnce);
  }
  if ("moveBonus" in piece && typeof piece.moveBonus === "number" && piece.moveBonus > 0) {
    lines.push(ui.play.moveSteps(piece.moveBonus));
  }
  if ("pvpDieBonus" in piece && typeof piece.pvpDieBonus === "number") {
    lines.push(ui.play.pvpWeaponDieBonus(piece.pvpDieBonus));
  }
  if ("sipAttackBonus" in piece && typeof piece.sipAttackBonus === "number" && piece.sipAttackBonus > 0) {
    const wp = piece as Weapon;
    const kl = Math.max(0, Math.floor(wp.sipWeaponBonusKlunks ?? 0));
    if (kl > 0) {
      const basePow = typeof wp.power === "number" ? wp.power : 1;
      const tot = basePow + piece.sipAttackBonus;
      lines.push(ui.play.equipmentSipWeaponKlunkBonus(kl, tot, basePow));
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
          ? ui.play.equipmentSipWeaponPantBonus(weaponPantCost, piece.sipAttackBonus)
          : ui.play.equipmentSipWeaponFreeBonus(piece.sipAttackBonus),
      );
    }
  }
  if ("pvpCannotBeChallenged" in piece && piece.pvpCannotBeChallenged) {
    lines.push(ui.play.equipmentPvpCannotBeChallenged);
  }
  if ("gainGoldOnDamageTaken" in piece && typeof piece.gainGoldOnDamageTaken === "number" && piece.gainGoldOnDamageTaken > 0) {
    lines.push(ui.play.equipmentGoldOnDamage(piece.gainGoldOnDamageTaken));
  }
  if ("bossDamageNegateBonus" in piece && typeof piece.bossDamageNegateBonus === "number" && piece.bossDamageNegateBonus > 0) {
    lines.push(ui.play.equipmentBossDamageNegate(piece.bossDamageNegateBonus));
  }
  if ("penaltySipExtra" in piece && typeof piece.penaltySipExtra === "number" && piece.penaltySipExtra > 0) {
    lines.push(ui.play.equipmentPenaltySipExtra(piece.penaltySipExtra));
  }
  if (
    "gainGoldPerPenaltyKlunk" in piece &&
    typeof (piece as { gainGoldPerPenaltyKlunk?: number }).gainGoldPerPenaltyKlunk === "number"
  ) {
    const gpk = Math.max(0, Math.floor((piece as { gainGoldPerPenaltyKlunk?: number }).gainGoldPerPenaltyKlunk ?? 0));
    if (gpk > 0) lines.push(ui.play.equipmentGoldPerPenaltyKlunk(gpk));
  }
  if ("klunkAttackBonus10" in piece && typeof piece.klunkAttackBonus10 === "number") {
    lines.push(ui.play.equipmentKlunkAttack10(piece.klunkAttackBonus10));
  }
  if ("klunkAttackBonus20" in piece && typeof piece.klunkAttackBonus20 === "number") {
    lines.push(ui.play.equipmentKlunkAttack20(piece.klunkAttackBonus20));
  }
  if (slot === "helmet" && lines.length === 0) return [];
  return lines;
}
