import type { CSSProperties } from "react";
import {
  type EffectBadgeData,
  effectBadgeIconFilter,
  ITEM_EFFECT_BADGE_ICONS,
} from "../lib/inventoryEffectBadges";

const pillBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  padding: "3px 6px",
  borderRadius: 999,
  background: "rgba(11,18,38,0.92)",
  border: "1px solid rgba(255,255,255,0.2)",
  boxShadow: "0 1px 4px rgba(0,0,0,0.45)",
};

export function EffectBadgePillStrip(props: {
  badges: EffectBadgeData[];
  size?: "sm" | "md";
  className?: string;
  style?: CSSProperties;
}) {
  const { badges, size = "sm", className, style } = props;
  if (badges.length === 0) return null;
  const iconPx = size === "md" ? 16 : 14;
  const fontSize = size === "md" ? 11 : 10;
  return (
    <span
      className={className}
      aria-hidden
      style={{
        display: "inline-flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 5,
        ...style,
      }}
    >
      {badges.map((b, idx) => {
        const src = ITEM_EFFECT_BADGE_ICONS[b.icon];
        const danger = b.labelTone === "danger";
        const pillStyle: CSSProperties = {
          ...pillBase,
          border: danger ? "1px solid rgba(248,113,113,0.42)" : pillBase.border,
        };
        const labelStyle: CSSProperties = {
          fontSize,
          fontWeight: 900,
          fontVariantNumeric: "tabular-nums",
          color: danger ? "#fca5a5" : "#f8fafc",
          lineHeight: 1,
          letterSpacing: "-0.02em",
          textShadow: danger ? "0 0 6px rgba(248,113,113,0.45)" : undefined,
        };
        const imgStyle: CSSProperties = {
          display: "block",
          width: iconPx,
          height: iconPx,
          objectFit: "contain",
          filter: effectBadgeIconFilter(b.icon, danger, size),
        };
        if (b.iconAfter) {
          return (
            <span key={`${idx}-${b.icon}-${b.label}`} style={pillStyle}>
              <span style={labelStyle}>{b.label}</span>
              <img src={src} alt="" width={iconPx} height={iconPx} draggable={false} style={imgStyle} />
            </span>
          );
        }
        return (
          <span key={`${idx}-${b.icon}-${b.label}`} style={pillStyle}>
            <img src={src} alt="" width={iconPx} height={iconPx} draggable={false} style={imgStyle} />
            <span style={labelStyle}>{b.label}</span>
          </span>
        );
      })}
    </span>
  );
}
