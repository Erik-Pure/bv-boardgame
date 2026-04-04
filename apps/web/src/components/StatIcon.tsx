import type { CSSProperties } from "react";

export const STAT_ICON_SRC = {
  attack: "/icons/attack.svg",
  hp: "/icons/hp.svg",
  pant: "/icons/pant.svg",
  klunk: "/icons/klunk.svg",
} as const;

export type StatIconKind = keyof typeof STAT_ICON_SRC;

export function StatIcon(props: {
  kind: StatIconKind;
  size?: number;
  style?: CSSProperties;
  /** >1 förstorar ikonen visuellt så den kan sticka utanför sin ruta (layout utgår från `size`). */
  popScale?: number;
}) {
  const { kind, size = 20, style, popScale } = props;
  const img = (
    <img
      src={STAT_ICON_SRC[kind]}
      alt=""
      aria-hidden
      width={size}
      height={size}
      draggable={false}
      style={{
        display: "block",
        flexShrink: 0,
        objectFit: "contain",
        ...style,
      }}
    />
  );
  const s = popScale ?? 1;
  if (s <= 1) return img;
  return (
    <span
      style={{
        display: "inline-flex",
        lineHeight: 0,
        transform: `scale(${s})`,
        transformOrigin: "center center",
      }}
    >
      {img}
    </span>
  );
}
