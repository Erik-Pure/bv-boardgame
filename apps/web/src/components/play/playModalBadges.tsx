import type { CSSProperties } from "react";
import type { EquipmentSlot, ItemInstance, Player } from "@bv/game-core";
import {
  effectBadgeIconFilter,
  equipmentInventoryEffectBadges,
  itemInventoryEffectBadge,
  ITEM_EFFECT_BADGE_ICONS,
  type ItemInventoryBadgeOpts,
} from "../../lib/inventoryEffectBadges";

export const ITEM_MODAL_TITLE_STYLE: CSSProperties = {
  fontFamily: '"Permanent Marker", var(--heading), sans-serif',
  fontWeight: 400,
  fontSize: "clamp(1.05rem, 4.2vw, 1.35rem)",
  letterSpacing: "0.02em",
  lineHeight: 1.15,
};

/** Rubrik höger i föremålsmodal: samma data som inventory-brickan, större och i rad. */
export function ItemModalEffectBadge({
  itemId,
  instance,
  opts,
}: {
  itemId: string;
  instance?: ItemInstance | null;
  opts?: ItemInventoryBadgeOpts;
}) {
  const b = itemInventoryEffectBadge(itemId, instance, opts);
  if (!b) return null;
  const danger = b.labelTone === "danger";
  const src = ITEM_EFFECT_BADGE_ICONS[b.icon];
  if (b.iconAfter) {
    return (
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 12,
          background: "rgba(11,18,38,0.88)",
          border: danger ? "1px solid rgba(248,113,113,0.45)" : "1px solid rgba(255,255,255,0.22)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 15,
            fontWeight: 900,
            fontVariantNumeric: "tabular-nums",
            color: danger ? "#fca5a5" : "#f8fafc",
            textShadow: danger ? "0 0 10px rgba(248,113,113,0.5)" : undefined,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {b.label}
        </span>
        <img
          src={src}
          alt=""
          width={20}
          height={20}
          draggable={false}
          style={{
            display: "block",
            objectFit: "contain",
            filter: effectBadgeIconFilter(b.icon, danger, "md"),
          }}
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 12,
        background: "rgba(11,18,38,0.88)",
        border: danger ? "1px solid rgba(248,113,113,0.45)" : "1px solid rgba(255,255,255,0.22)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
        flexShrink: 0,
      }}
    >
      <img
        src={src}
        alt=""
        width={20}
        height={20}
        draggable={false}
        style={{
          display: "block",
          objectFit: "contain",
          filter: effectBadgeIconFilter(b.icon, danger, "md"),
        }}
      />
      <span
        style={{
          fontSize: 15,
          fontWeight: 900,
          fontVariantNumeric: "tabular-nums",
          color: danger ? "#fca5a5" : "#f8fafc",
          textShadow: danger ? "0 0 10px rgba(248,113,113,0.5)" : undefined,
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {b.label}
      </span>
    </span>
  );
}

export function EquipmentModalEffectBadge(props: {
  piece?: Player["equipment"][EquipmentSlot];
  playerGold?: number;
  burkSetEquippedCount?: number;
  player?: Player;
}) {
  const badges = equipmentInventoryEffectBadges(
    props.piece,
    props.playerGold,
    props.burkSetEquippedCount,
    props.player,
  );
  if (badges.length === 0) return null;
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        flexShrink: 0,
      }}
    >
      {badges.map((b, idx) => {
        const src = ITEM_EFFECT_BADGE_ICONS[b.icon];
        const danger = b.labelTone === "danger";
        return (
          <span
            key={`${idx}-${b.icon}:${b.label}:${b.labelTone ?? ""}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
              borderRadius: 12,
              background: "rgba(11,18,38,0.88)",
              border: danger ? "1px solid rgba(248,113,113,0.45)" : "1px solid rgba(255,255,255,0.22)",
              boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
            }}
          >
            <img
              src={src}
              alt=""
              width={20}
              height={20}
              draggable={false}
              style={{
                display: "block",
                objectFit: "contain",
                filter: effectBadgeIconFilter(b.icon, danger, "md"),
              }}
            />
            <span
              style={{
                fontSize: 15,
                fontWeight: 900,
                fontVariantNumeric: "tabular-nums",
                color: danger ? "#fca5a5" : "#f8fafc",
                textShadow: danger ? "0 0 10px rgba(248,113,113,0.5)" : undefined,
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
