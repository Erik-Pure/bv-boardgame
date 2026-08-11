import type { CSSProperties, ReactNode } from "react";
import { Fragment } from "react";
import type { EquipmentSlot, GameLocale, Player, ShopItem, Weapon } from "@bv/game-core";
import { getCard, getEquipmentDisplay, getEquipmentDisplayByEquippedName } from "@bv/game-core";
import { CardRichText } from "../components/CardRichText";
import {
  equipmentCatalogByEquippedName,
  equipmentCatalogById,
  effectBadgeIconFilter,
  ITEM_EFFECT_BADGE_ICONS,
  shopItemEffectSupplementText,
  type EffectBadgeData,
} from "./inventoryEffectBadges";
import {
  formatLocalizedShopItemEffectSummary,
  shopItemMechanicalEffectParts,
} from "./equipmentEffectSummary";
import { merchantEquippedName } from "./playInteractionHelpers";
import type { UiStrings } from "./uiStrings";
import u from "../styles/uiPrimitives.module.css";

type StatIconKind = keyof typeof ITEM_EFFECT_BADGE_ICONS;

function localizedEquippedDisplayName(
  equippedName: string | undefined,
  locale: GameLocale,
): string | undefined {
  if (!equippedName) return undefined;
  return getEquipmentDisplayByEquippedName(equippedName, locale)?.name ?? equippedName;
}

const inlineBadgeWrap: CSSProperties = {
  display: "inline-flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "0.15em 0.35em",
  lineHeight: 1.35,
};

const inlineBadgeItem: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  fontWeight: 800,
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "-0.02em",
};

/** Tonad bakgrund så effekttext läses mot regnbågs-/spelbakgrund. */
export const effectDescPanelStyle: CSSProperties = {
  background: "rgba(6, 10, 22, 0.78)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  padding: "10px 12px",
  boxShadow: "0 4px 18px rgba(0,0,0,0.35)",
};

function StatImg(props: { kind: StatIconKind; danger?: boolean; px?: number }) {
  const px = props.px ?? 15;
  return (
    <img
      src={ITEM_EFFECT_BADGE_ICONS[props.kind]}
      alt=""
      width={px}
      height={px}
      draggable={false}
      style={{
        display: "inline-block",
        width: px,
        height: px,
        objectFit: "contain",
        verticalAlign: "-0.2em",
        margin: "0 2px",
        flexShrink: 0,
        filter: effectBadgeIconFilter(props.kind, props.danger, "md"),
      }}
    />
  );
}

/**
 * Ikon + siffra i textflödet (ingen pill) — samma språk som förrådsikoner / CombatItemButtonSuffix.
 * Separeras med " · ".
 */
export function renderInlineEffectBadges(
  badges: EffectBadgeData[],
  opts?: { iconPx?: number; fontSize?: number },
): ReactNode {
  if (badges.length === 0) return null;
  const iconPx = opts?.iconPx ?? 15;
  const fontSize = opts?.fontSize ?? 13;
  return (
    <span style={inlineBadgeWrap} aria-hidden>
      {badges.map((b, idx) => {
        const danger = b.labelTone === "danger";
        const icon = <StatImg kind={b.icon} danger={danger} px={iconPx} />;
        const label = (
          <span
            style={{
              fontSize,
              fontWeight: 800,
              fontVariantNumeric: "tabular-nums",
              color: danger ? "#fca5a5" : "inherit",
              lineHeight: 1,
            }}
          >
            {b.label}
          </span>
        );
        return (
          <span key={`${idx}-${b.icon}:${b.label}:${b.labelTone ?? ""}`} style={{ display: "inline-flex", alignItems: "center" }}>
            {idx > 0 ? (
              <span style={{ opacity: 0.55, fontWeight: 600, margin: "0 0.2em" }}>·</span>
            ) : null}
            <span style={inlineBadgeItem}>
              {b.iconAfter ? (
                <>
                  {label}
                  {icon}
                </>
              ) : (
                <>
                  {icon}
                  {label}
                </>
              )}
            </span>
          </span>
        );
      })}
    </span>
  );
}

type ProseTok =
  | { t: "text"; v: string }
  | { t: "icon"; kind: StatIconKind; danger?: boolean };

/** Väver in stat-ikoner i en mekanisk effektrad (t.ex. "+5 max HP", "Vid 10+ klunkar: +1 attack"). */
export function renderProseWithStatIcons(line: string, iconPx = 15): ReactNode {
  const tokens: ProseTok[] = [];
  let rest = line;
  const rules: Array<{ re: RegExp; to: (m: RegExpExecArray) => ProseTok[] }> = [
    {
      re: /([+-]?\d+)\s*max\s*HP\b/i,
      to: (m) => [{ t: "text", v: m[1]! }, { t: "icon", kind: "heart" }],
    },
    {
      re: /Skada\s+([−\-+]?\d+)/i,
      to: (m) => [{ t: "icon", kind: "armor" }, { t: "text", v: ` ${m[1]!}` }],
    },
    {
      re: /Damage\s+([−\-+]?\d+)/i,
      to: (m) => [{ t: "icon", kind: "armor" }, { t: "text", v: ` ${m[1]!}` }],
    },
    {
      re: /(?:Attack|Kraft|Power)\s+([+-]?\d+)/i,
      to: (m) => {
        const n = Number(m[1]);
        return [{ t: "icon", kind: "attack", danger: n < 0 }, { t: "text", v: ` ${m[1]!}` }];
      },
    },
    {
      re: /([+-]?\d+)\s*attack\b/i,
      to: (m) => {
        const n = Number(m[1]);
        return [{ t: "text", v: m[1]! }, { t: "icon", kind: "attack", danger: n < 0 }];
      },
    },
    {
      re: /([+-]?\d+)\s*HP\b/i,
      to: (m) => [{ t: "text", v: m[1]! }, { t: "icon", kind: "heart" }],
    },
    {
      re: /(\d+)\+\s*klunkar?\b/i,
      to: (m) => [{ t: "text", v: `${m[1]!}+` }, { t: "icon", kind: "klunk" }],
    },
    {
      re: /([+-]?\d+)\s*klunk(?:ar)?\b/i,
      to: (m) => [{ t: "text", v: m[1]! }, { t: "icon", kind: "klunk", danger: Number(m[1]) < 0 }],
    },
    {
      re: /(\d+)\+\s*sips?\b/i,
      to: (m) => [{ t: "text", v: `${m[1]!}+` }, { t: "icon", kind: "klunk" }],
    },
    {
      re: /([+-]?\d+)\s*(?:pant|cans?)\b/i,
      to: (m) => [{ t: "text", v: m[1]! }, { t: "icon", kind: "pant" }],
    },
    {
      re: /\bBvB\b/,
      to: () => [{ t: "icon", kind: "bvb" }, { t: "text", v: " BvB" }],
    },
  ];

  while (rest.length > 0) {
    let best: { idx: number; len: number; toks: ProseTok[] } | null = null;
    for (const rule of rules) {
      const m = rule.re.exec(rest);
      if (!m || m.index == null) continue;
      if (!best || m.index < best.idx || (m.index === best.idx && m[0].length > best.len)) {
        best = { idx: m.index, len: m[0].length, toks: rule.to(m) };
      }
    }
    if (!best) {
      tokens.push({ t: "text", v: rest });
      break;
    }
    if (best.idx > 0) tokens.push({ t: "text", v: rest.slice(0, best.idx) });
    tokens.push(...best.toks);
    rest = rest.slice(best.idx + best.len);
  }

  return (
    <span style={{ lineHeight: 1.45 }}>
      {tokens.map((tok, i) =>
        tok.t === "icon" ? (
          <StatImg key={i} kind={tok.kind} danger={tok.danger} px={iconPx} />
        ) : (
          <Fragment key={i}>{tok.v}</Fragment>
        ),
      )}
    </span>
  );
}

/** Burk-set: mekanisk set-rad duplicerar rulesText (+2/+4/+10 m.m.). */
const BEER_SET_SHOP_IDS = new Set(["ea_can_armor", "eh_beer_cap_helm_1", "ex_buckler"]);

/** Utförlig affärsdetalj: mekaniska rader med ikoner + ev. rulesText. */
export function renderShopItemEffectDetail(
  it: ShopItem,
  locale: GameLocale,
  ui: UiStrings,
): ReactNode {
  const supplement = shopItemEffectSupplementText(it);
  let rulesText: string | undefined;
  if (it.slot === "weapon" || it.slot === "armor" || it.slot === "helmet" || it.slot === "accessory") {
    rulesText = getEquipmentDisplay(it.id, locale).rulesText?.trim() || undefined;
  } else if (it.slot === "inventory" && it.inventoryItemId) {
    try {
      rulesText = getCard(`item_${it.inventoryItemId}`, locale).text?.trim() || undefined;
    } catch {
      rulesText = undefined;
    }
  }

  // Burk-set: hoppa över mekanisk set-sammanfattning när rulesText redan beskriver bonusen.
  const parts =
    BEER_SET_SHOP_IDS.has(it.id) && rulesText
      ? []
      : shopItemMechanicalEffectParts(it, locale, ui);

  const hasParts = parts.length > 0;
  const showRules =
    !!rulesText &&
    !(parts.length === 1 && parts[0] === rulesText) &&
    rulesText !== parts.join(" · ");

  if (!hasParts && !showRules && !supplement) return null;

  return (
    <div
      className={u.stack8}
      style={{
        ...effectDescPanelStyle,
        textAlign: "left",
        fontSize: 14,
        lineHeight: 1.45,
        color: "rgba(232,236,244,0.95)",
      }}
      aria-label={formatLocalizedShopItemEffectSummary(it, locale, ui)}
    >
      {hasParts
        ? parts.map((line, i) => <div key={i}>{renderProseWithStatIcons(line)}</div>)
        : null}
      {showRules ? (
        <CardRichText
          text={rulesText!}
          style={{ opacity: 0.9, fontSize: 13.5, lineHeight: 1.5 }}
        />
      ) : null}
      {supplement && !parts.includes(supplement) ? (
        <div style={{ fontSize: 13, opacity: 0.85 }}>{supplement}</div>
      ) : null}
    </div>
  );
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

function resolveNewEquipmentShopItem(
  newName: string,
  newCatalogId?: string,
): ShopItem | undefined {
  return newCatalogId
    ? equipmentCatalogById(newCatalogId)
    : equipmentCatalogByEquippedName(newName);
}

/** Fallback när prylen saknas i katalogen — samma prosa/ikon-stil som affärsdetalj. */
function renderReplaceEffectFallback(
  label: string,
  displayName: string | undefined,
  lines: string[],
) {
  if (lines.length === 0) return null;
  return (
    <div className={u.stack8}>
      <div style={{ fontSize: 14, color: "rgba(232,236,244,0.95)" }}>
        <strong>{label}</strong>
        {displayName ? ` (${displayName})` : null}
      </div>
      <div
        className={u.stack8}
        style={{
          ...effectDescPanelStyle,
          textAlign: "left",
          fontSize: 14,
          lineHeight: 1.45,
          color: "rgba(232,236,244,0.95)",
        }}
      >
        {lines.map((line, i) => (
          <div key={i}>{renderProseWithStatIcons(line)}</div>
        ))}
      </div>
    </div>
  );
}

function renderReplaceEffectSide(
  label: string,
  displayName: string | undefined,
  cat: ShopItem | undefined,
  fallbackLines: string[],
  locale: GameLocale,
  ui: UiStrings,
) {
  if (cat) {
    const detail = renderShopItemEffectDetail(cat, locale, ui);
    if (!detail) return null;
    return (
      <div className={u.stack8}>
        <div style={{ fontSize: 14, color: "rgba(232,236,244,0.95)" }}>
          <strong>{label}</strong>
          {displayName ? ` (${displayName})` : null}
        </div>
        {detail}
      </div>
    );
  }
  return renderReplaceEffectFallback(label, displayName, fallbackLines);
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

  const currentCat = equipmentCatalogByEquippedName(currentName);
  const currentLines = equipmentReplaceEffectSummaryLines(slot, currentPiece, currentName, ui, locale);

  const newCat = resolveNewEquipmentShopItem(newName, newCatalogId);
  const newLines = equipmentReplaceEffectSummaryLines(slot, undefined, newName, ui, locale, newCatalogId);

  const currentBlock = renderReplaceEffectSide(
    ui.play.equipmentReplaceCurrentEffects,
    currentDisplayName,
    currentCat,
    currentLines,
    locale,
    ui,
  );
  const newBlock = renderReplaceEffectSide(
    ui.play.equipmentReplaceNewEffects,
    newDisplayName,
    newCat,
    newLines,
    locale,
    ui,
  );
  if (!currentBlock && !newBlock) return null;

  return (
    <div className={u.stack8}>
      {currentBlock}
      {newBlock}
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
  {
    const goldTiers: string[] = [];
    if ("powerAtGold10" in piece && typeof piece.powerAtGold10 === "number") {
      goldTiers.push(ui.play.equipmentPowerAtGold10(piece.powerAtGold10).replace(/\.$/, ""));
    }
    if ("powerAtGold20" in piece && typeof piece.powerAtGold20 === "number") {
      goldTiers.push(ui.play.equipmentPowerAtGold20(piece.powerAtGold20).replace(/\.$/, ""));
    }
    if ("powerAtGold30" in piece && typeof piece.powerAtGold30 === "number") {
      goldTiers.push(ui.play.equipmentPowerAtGold30(piece.powerAtGold30).replace(/\.$/, ""));
    }
    if (goldTiers.length > 0) lines.push(goldTiers.join(", "));
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
  {
    const klunkTiers: string[] = [];
    if ("klunkAttackBonus10" in piece && typeof piece.klunkAttackBonus10 === "number") {
      klunkTiers.push(ui.play.equipmentKlunkAttack10(piece.klunkAttackBonus10).replace(/\.$/, ""));
    }
    if ("klunkAttackBonus20" in piece && typeof piece.klunkAttackBonus20 === "number") {
      klunkTiers.push(ui.play.equipmentKlunkAttack20(piece.klunkAttackBonus20).replace(/\.$/, ""));
    }
    if (klunkTiers.length > 0) lines.push(klunkTiers.join(", "));
  }
  if (slot === "helmet" && lines.length === 0) return [];
  return lines;
}
