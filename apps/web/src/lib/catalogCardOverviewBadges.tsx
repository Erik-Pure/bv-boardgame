import type { CSSProperties } from "react";
import type { CardDef, Effect } from "@bv/game-core";
import {
  type EffectBadgeData,
  formatSigned,
  ITEM_EFFECT_BADGE_ICONS,
  itemInventoryEffectBadge,
} from "./inventoryEffectBadges";

function collectCardEffects(card: CardDef): Effect[] {
  const out: Effect[] = [...(card.effects ?? [])];
  for (const c of card.choices ?? []) out.push(...c.effects);
  return out;
}

function pushUnique(badges: EffectBadgeData[], b: EffectBadgeData, seen: Set<string>) {
  const k = `${b.icon}:${b.label}:${b.labelTone ?? ""}`;
  if (seen.has(k)) return;
  seen.add(k);
  badges.push(b);
}

/** Effektbrickor för kortkatalogens kort — samma ikonuppsättning som inventory. */
export function cardDefOverviewBadges(card: CardDef): EffectBadgeData[] {
  const effects = collectCardEffects(card);
  let gold = 0;
  let klunk = 0;
  let heal = 0;
  let damage = 0;
  let nextCombatMod = 0;
  let goldRollLo = 0;
  let goldRollHi = 0;
  let hasGoldRoll = false;
  let hasRandomItem = false;
  const badges: EffectBadgeData[] = [];
  const seen = new Set<string>();

  for (const ef of effects) {
    switch (ef.type) {
      case "gold":
        gold += ef.amount;
        break;
      case "goldRoll":
        hasGoldRoll = true;
        goldRollLo += ef.base + 1;
        goldRollHi += ef.base + ef.die;
        break;
      case "heal":
        heal += ef.amount;
        break;
      case "damage":
        damage += ef.amount;
        break;
      case "klunkar":
        klunk += ef.amount;
        break;
      case "item": {
        const b = itemInventoryEffectBadge(ef.itemId, null);
        if (b) pushUnique(badges, b, seen);
        break;
      }
      case "randomItem":
        hasRandomItem = true;
        break;
      case "nextCombatMod":
        nextCombatMod += ef.amount;
        break;
      default:
        break;
    }
  }

  if (gold > 0) pushUnique(badges, { icon: "pant", label: `+${gold}` }, seen);
  if (gold < 0) pushUnique(badges, { icon: "pant", label: String(gold), labelTone: "danger" }, seen);
  if (hasGoldRoll) pushUnique(badges, { icon: "pant", label: `+${goldRollLo}–${goldRollHi}` }, seen);
  if (heal > 0) pushUnique(badges, { icon: "heart", label: `+${heal}` }, seen);
  if (damage > 0) pushUnique(badges, { icon: "attack", label: `−${damage}`, labelTone: "danger" }, seen);
  if (klunk > 0) pushUnique(badges, { icon: "klunk", label: `+${klunk}` }, seen);
  if (klunk < 0) pushUnique(badges, { icon: "klunk", label: String(klunk), labelTone: "danger" }, seen);
  if (hasRandomItem) pushUnique(badges, { icon: "pant", label: "?" }, seen);
  if (nextCombatMod !== 0) {
    pushUnique(
      badges,
      {
        icon: "attack",
        label: formatSigned(nextCombatMod),
        labelTone: nextCombatMod < 0 ? "danger" : undefined,
      },
      seen,
    );
  }

  if (badges.length === 0 && card.kind === "item" && card.id.startsWith("item_")) {
    const raw = card.id.slice("item_".length);
    const b = itemInventoryEffectBadge(raw, null);
    if (b) pushUnique(badges, b, seen);
  }
  if (badges.length === 0 && card.kind === "combat") pushUnique(badges, { icon: "monster", label: "PvE" }, seen);
  if (badges.length === 0 && card.kind === "treasure") pushUnique(badges, { icon: "pant", label: "?" }, seen);
  if (badges.length === 0 && card.kind === "rest") pushUnique(badges, { icon: "heart", label: "+" }, seen);

  return badges;
}

const pill: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  padding: "3px 6px",
  borderRadius: 999,
  background: "rgba(11,18,38,0.92)",
  border: "1px solid rgba(255,255,255,0.2)",
  boxShadow: "0 1px 4px rgba(0,0,0,0.45)",
};

/** Överlägg på kortbilden (höger botten), samma stil som inventory-brickor. */
export function CatalogImageBadgeStrip({ badges }: { badges: EffectBadgeData[] }) {
  if (badges.length === 0) return null;
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        right: 6,
        bottom: 6,
        left: 6,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "flex-end",
        gap: 5,
        pointerEvents: "none",
        zIndex: 2,
      }}
    >
      {badges.map((b, idx) => {
        const src = ITEM_EFFECT_BADGE_ICONS[b.icon];
        const danger = b.labelTone === "danger";
        return (
          <span key={`${idx}-${b.icon}-${b.label}`} style={pill}>
            <img
              src={src}
              alt=""
              width={14}
              height={14}
              draggable={false}
              style={{
                display: "block",
                objectFit: "contain",
                filter: danger
                  ? "brightness(0) invert(1) drop-shadow(0 0 3px rgba(248,113,113,0.85))"
                  : "brightness(0) invert(1)",
              }}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: 900,
                fontVariantNumeric: "tabular-nums",
                color: danger ? "#fca5a5" : "#f8fafc",
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              {b.label}
            </span>
          </span>
        );
      })}
    </span>
  );
}
