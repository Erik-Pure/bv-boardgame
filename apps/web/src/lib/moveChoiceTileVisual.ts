import type { TileType } from "@bv/game-core";

export type MoveChoiceTileVisual = {
  src: string;
  /** Monokrom SVG → vit glyf på färgbadge */
  monochrome: boolean;
  accent: string;
  buttonBorder: string;
  buttonFocus: string;
  buttonBg: string;
  buttonShadow: string;
  buttonShadowPressed: string;
};

const VISUAL: Record<TileType, MoveChoiceTileVisual> = {
  empty: {
    src: "/icons/circular-shine.svg",
    monochrome: true,
    accent: "#475569",
    buttonBorder: "rgba(148, 163, 184, 0.48)",
    buttonFocus: "rgba(148, 163, 184, 0.95)",
    buttonBg:
      "radial-gradient(115% 140% at 24% 8%, rgba(148, 163, 184, 0.32), transparent 56%), linear-gradient(180deg, #3f4f62 0%, #2f3f55 52%, #1b2533 100%)",
    buttonShadow: "0 10px 24px rgba(15, 23, 42, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
    buttonShadowPressed: "0 6px 14px rgba(15, 23, 42, 0.36), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
  },
  event: {
    src: "/icons/event-icon.svg",
    monochrome: true,
    accent: "#0ea5e9",
    buttonBorder: "rgba(125, 211, 252, 0.56)",
    buttonFocus: "rgba(125, 211, 252, 0.96)",
    buttonBg:
      "radial-gradient(115% 140% at 24% 8%, rgba(125, 211, 252, 0.4), transparent 56%), linear-gradient(180deg, #2fa9df 0%, #0b95d2 50%, #0274b0 100%)",
    buttonShadow: "0 10px 24px rgba(8, 47, 73, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
    buttonShadowPressed: "0 6px 14px rgba(8, 47, 73, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
  },
  combat: {
    src: "/icons/monster-icon.svg",
    monochrome: true,
    accent: "#b91c1c",
    buttonBorder: "rgba(248, 113, 113, 0.58)",
    buttonFocus: "rgba(248, 113, 113, 0.96)",
    buttonBg:
      "radial-gradient(115% 135% at 24% 8%, rgba(252, 165, 165, 0.38), transparent 56%), linear-gradient(180deg, #db3b3b 0%, #c92222 48%, #891818 100%)",
    buttonShadow: "0 10px 24px rgba(127, 29, 29, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.11)",
    buttonShadowPressed: "0 6px 14px rgba(127, 29, 29, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.09)",
  },
  merchant: {
    src: "/icons/panta-icon.svg",
    monochrome: true,
    accent: "#f97316",
    buttonBorder: "rgba(251, 191, 36, 0.56)",
    buttonFocus: "rgba(251, 191, 36, 0.94)",
    buttonBg:
      "radial-gradient(115% 135% at 24% 8%, rgba(253, 224, 71, 0.4), transparent 56%), linear-gradient(180deg, #df920b 0%, #e56613 52%, #cf4c0b 100%)",
    buttonShadow: "0 10px 24px rgba(120, 53, 15, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
    buttonShadowPressed: "0 6px 14px rgba(120, 53, 15, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
  },
  door: {
    src: "/icons/lvlup.svg",
    monochrome: true,
    accent: "#9333ea",
    buttonBorder: "rgba(196, 181, 253, 0.56)",
    buttonFocus: "rgba(196, 181, 253, 0.95)",
    buttonBg:
      "radial-gradient(115% 135% at 24% 8%, rgba(196, 181, 253, 0.42), transparent 56%), linear-gradient(180deg, #964de0 0%, #832ed3 50%, #6f1fba 100%)",
    buttonShadow: "0 10px 24px rgba(59, 7, 100, 0.44), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
    buttonShadowPressed: "0 6px 14px rgba(59, 7, 100, 0.36), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
  },
  rest: {
    src: "/icons/heart-icon.svg",
    monochrome: true,
    accent: "#16a34a",
    buttonBorder: "rgba(134, 239, 172, 0.56)",
    buttonFocus: "rgba(134, 239, 172, 0.95)",
    buttonBg:
      "radial-gradient(115% 140% at 24% 8%, rgba(134, 239, 172, 0.42), transparent 56%), linear-gradient(180deg, #22c55e 0%, #16a34a 50%, #15803d 100%)",
    buttonShadow: "0 10px 24px rgba(20, 83, 45, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.11)",
    buttonShadowPressed: "0 6px 14px rgba(20, 83, 45, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.09)",
  },
  treasure: {
    src: "/icons/reward-icon.svg",
    monochrome: true,
    accent: "#ca8a04",
    buttonBorder: "rgba(250, 204, 21, 0.56)",
    buttonFocus: "rgba(250, 204, 21, 0.95)",
    buttonBg:
      "radial-gradient(115% 140% at 24% 8%, rgba(253, 224, 71, 0.42), transparent 56%), linear-gradient(180deg, #e6bc13 0%, #d59f07 50%, #b37703 100%)",
    buttonShadow: "0 10px 24px rgba(69, 26, 3, 0.44), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
    buttonShadowPressed: "0 6px 14px rgba(69, 26, 3, 0.36), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
  },
  boss: {
    src: "/icons/skull-icon.svg",
    monochrome: true,
    accent: "#dc2626",
    buttonBorder: "rgba(248, 113, 113, 0.58)",
    buttonFocus: "rgba(248, 113, 113, 0.96)",
    buttonBg:
      "radial-gradient(115% 135% at 24% 8%, rgba(252, 165, 165, 0.38), transparent 56%), linear-gradient(180deg, #db3b3b 0%, #c92222 48%, #891818 100%)",
    buttonShadow: "0 10px 24px rgba(127, 29, 29, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
    buttonShadowPressed: "0 6px 14px rgba(127, 29, 29, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
  },
};

export function moveChoiceTileVisual(tileType: string): MoveChoiceTileVisual {
  const v = VISUAL[tileType as TileType];
  if (v) return v;
  return VISUAL.empty;
}
