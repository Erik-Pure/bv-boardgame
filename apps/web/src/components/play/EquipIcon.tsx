import { equipmentImageSources, equipmentUniqueImageSrc } from "../../lib/equipmentImageSrc";
import { PictureImg } from "../PictureImg";

export function EquipIcon(props: {
  slot: "weapon" | "armor" | "helmet" | "accessory";
  disabled: boolean;
  equippedName?: string;
  /** Endast slot-siluett (vapen/tröja/mössa/accessoar), aldrig unik art — t.ex. typmärke bredvid varubild. */
  genericOnly?: boolean;
  /** Pixelstorlek för generisk siluett (unik art: max storlek inom föräldern, `object-fit: contain`). */
  iconSize?: number;
}) {
  const uniqueSrc = props.genericOnly ? null : equipmentUniqueImageSrc(props.equippedName);
  const src =
    uniqueSrc ??
    (props.slot === "weapon"
      ? "/equipment/weapon/weapon.svg"
      : props.slot === "armor"
        ? "/equipment/armor/armor.svg"
        : props.slot === "helmet"
          ? "/equipment/helmet/helmet.svg"
          : "/equipment/accessory/accesory.svg");
  const tintFilter = uniqueSrc
    ? props.disabled
      ? "grayscale(0.6) brightness(0.9) opacity(0.72)"
      : "drop-shadow(0 0 8px rgba(96,165,250,0.28))"
    : props.disabled
      ? "brightness(0) invert(0.78) opacity(0.72)"
      : "brightness(0) invert(0.98) drop-shadow(0 0 8px rgba(96,165,250,0.38))";
  const genericPx = props.iconSize ?? 36;
  const size = uniqueSrc ? undefined : genericPx;
  const sources =
    uniqueSrc != null
      ? equipmentImageSources(props.equippedName ?? "", props.slot)
      : { fallback: src };
  if (!uniqueSrc) {
    return (
      <img
        src={src}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src =
            props.slot === "weapon"
              ? "/equipment/weapon/weapon.svg"
              : props.slot === "armor"
                ? "/equipment/armor/armor.svg"
                : props.slot === "helmet"
                  ? "/equipment/helmet/helmet.svg"
                  : "/equipment/accessory/accesory.svg";
        }}
        alt=""
        aria-hidden
        style={{
          width: size,
          height: size,
          margin: "auto",
          objectFit: "contain",
          objectPosition: "center",
          borderRadius: 0,
          display: "block",
          flexShrink: 0,
          filter: tintFilter,
        }}
      />
    );
  }
  return (
    <PictureImg
      sources={sources}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src =
          props.slot === "weapon"
            ? "/equipment/weapon/weapon.svg"
            : props.slot === "armor"
              ? "/equipment/armor/armor.svg"
              : props.slot === "helmet"
                ? "/equipment/helmet/helmet.svg"
                : "/equipment/accessory/accesory.svg";
      }}
      alt=""
      aria-hidden
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        objectPosition: "center",
        borderRadius: uniqueSrc ? 12 : 0,
        display: "block",
        flexShrink: 0,
        filter: tintFilter,
      }}
    />
  );
}
