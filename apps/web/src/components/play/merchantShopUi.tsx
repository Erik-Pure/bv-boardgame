import type { CSSProperties } from "react";
import type { ShopItem } from "@bv/game-core";
import { equipmentUniqueImageSrc } from "../../lib/equipmentImageSrc";
import { itemImageSrc } from "../../lib/itemImageSrc";
import { PictureImg } from "../PictureImg";
import { StatIcon } from "../StatIcon";
import { EquipIcon } from "./EquipIcon";

/** Samma ton som `EquipIcon` för generiska siluetter (vit + lätt blå glow). */
const MERCHANT_TYPE_ICON_FILTER =
  "brightness(0) invert(0.98) drop-shadow(0 0 6px rgba(96,165,250,0.38))";

const MERCHANT_ART_FRAME: CSSProperties = {
  width: 52,
  height: 52,
  flexShrink: 0,
  borderRadius: 8,
  overflow: "hidden",
  display: "grid",
  placeItems: "center",
  background: "rgba(0,0,0,0.45)",
  border: "1px solid rgba(72, 75, 85, 0.95)",
  boxSizing: "border-box",
};

const MERCHANT_DETAIL_ART_FRAME: CSSProperties = {
  width: 120,
  height: 120,
  flexShrink: 0,
  borderRadius: 12,
  overflow: "hidden",
  display: "grid",
  placeItems: "center",
  background: "rgba(0,0,0,0.45)",
  border: "1px solid rgba(72, 75, 85, 0.95)",
  boxSizing: "border-box",
};

/** Halv storlek jämfört med tidigare typ-badge (~36px → 18px). */
export const MERCHANT_TYPE_ICON_PX = 18;

function merchantHealArtSrc(name: string): string {
  return equipmentUniqueImageSrc(name) ?? "/items/healing-potion.webp";
}

export function MerchantShopItemArt(props: { item: ShopItem; variant?: "row" | "detail" }) {
  const { item, variant = "row" } = props;
  const frameStyle = variant === "detail" ? MERCHANT_DETAIL_ART_FRAME : MERCHANT_ART_FRAME;
  const pantSize = variant === "detail" ? 56 : 30;
  if (item.slot === "heal") {
    const src = merchantHealArtSrc(item.name);
    const sources = src.endsWith(".webp")
      ? { avif: src.slice(0, -".webp".length) + ".avif", webp: src, fallback: src }
      : { fallback: src };
    return (
      <div style={frameStyle}>
        <PictureImg
          sources={sources}
          alt=""
          aria-hidden
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/items/healing-potion.png";
          }}
        />
      </div>
    );
  }
  if (item.slot === "gold") {
    return (
      <div style={frameStyle}>
        <StatIcon kind="pant" size={pantSize} popScale={1.05} />
      </div>
    );
  }
  if (item.slot === "inventory" && item.inventoryItemId) {
    return (
      <div style={frameStyle}>
        <img
          src={itemImageSrc(item.inventoryItemId)}
          alt=""
          aria-hidden
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>
    );
  }
  if (item.slot === "weapon" || item.slot === "armor" || item.slot === "helmet" || item.slot === "accessory") {
    return (
      <div style={frameStyle}>
        <EquipIcon
          slot={item.slot}
          disabled={false}
          equippedName={item.name}
          iconSize={variant === "detail" ? 72 : undefined}
        />
      </div>
    );
  }
  return null;
}

export function MerchantShopTypeIcon(props: { item: ShopItem }) {
  const { item } = props;
  const s = MERCHANT_TYPE_ICON_PX;
  if (item.slot === "heal") {
    return (
      <img
        src="/icons/heart-icon.svg"
        width={s}
        height={s}
        alt=""
        aria-hidden
        draggable={false}
        style={{ display: "block", filter: MERCHANT_TYPE_ICON_FILTER }}
      />
    );
  }
  if (item.slot === "gold") {
    return null;
  }
  if (item.slot === "inventory") {
    return (
      <img
        src="/icons/combat-icon.svg"
        width={s}
        height={s}
        alt=""
        aria-hidden
        draggable={false}
        style={{ display: "block", filter: MERCHANT_TYPE_ICON_FILTER }}
      />
    );
  }
  if (item.slot === "weapon" || item.slot === "armor" || item.slot === "helmet" || item.slot === "accessory") {
    return <EquipIcon slot={item.slot} disabled={false} genericOnly iconSize={s} />;
  }
  return null;
}
