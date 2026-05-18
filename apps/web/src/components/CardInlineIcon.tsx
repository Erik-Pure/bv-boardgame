import type { CSSProperties } from "react";
import type { CardRichIconKind } from "@bv/game-core";

const ICON_SRC: Record<CardRichIconKind, string> = {
  pant: "/icons/pant-icon.svg",
  hp: "/icons/heart-icon.svg",
  klunk: "/icons/klunk-icon.svg",
  combat: "/icons/combat-icon.svg",
  dice: "/icons/dice-icon.svg",
};

const ICON_COLOR: Record<CardRichIconKind, string> = {
  pant: "#d1d5db",
  hp: "#f472b6",
  klunk: "#facc15",
  combat: "#f87171",
  dice: "#e5e7eb",
};

export function CardInlineIcon(props: { kind: CardRichIconKind; size?: number }) {
  const size = props.size ?? 18;
  const src = ICON_SRC[props.kind];
  const color = ICON_COLOR[props.kind];
  return (
    <span
      aria-hidden
      style={
        {
          display: "inline-block",
          width: size,
          height: size,
          margin: "0 3px",
          verticalAlign: "-0.2em",
          flexShrink: 0,
          backgroundColor: color,
          maskImage: `url(${src})`,
          WebkitMaskImage: `url(${src})`,
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
        } as CSSProperties
      }
    />
  );
}
