import type { ReactNode } from "react";
import { PanelToggleIcon } from "./playHeaderUi";
import styles from "../../routes/PlayView.module.css";
import { sv } from "../../lib/uiStrings";

export function PlayBottomSheet(props: {
  visible: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  controlsAbovePx: number | null;
  showRainbowPulse: boolean;
  enterDone: boolean;
  turnAnim: "in" | "out" | null;
  animatedHeight: number | null;
  heightInstant: boolean;
  measureRef: React.RefObject<HTMLDivElement | null>;
  sheetFlash: boolean;
  raiseAboveCard: boolean;
  children: ReactNode;
}) {
  const {
    visible,
    collapsed,
    onToggleCollapsed,
    controlsAbovePx,
    showRainbowPulse,
    enterDone,
    turnAnim,
    animatedHeight,
    heightInstant,
    measureRef,
    sheetFlash,
    raiseAboveCard,
    children,
  } = props;

  if (!visible) return null;

  return (
    <>
      <button
        type="button"
        aria-label={collapsed ? sv.play.panelMaximize : sv.play.panelMinimize}
        title={collapsed ? sv.play.panelMaximize : sv.play.panelMinimize}
        onClick={onToggleCollapsed}
        style={{
          position: "fixed",
          right: "max(10px, env(safe-area-inset-right))",
          bottom: controlsAbovePx ?? "max(10px, env(safe-area-inset-bottom))",
          zIndex: 92,
          width: 34,
          height: 34,
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.35)",
          background: "rgba(11,18,38,0.86)",
          color: "#fff",
          display: "grid",
          placeItems: "center",
          boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <PanelToggleIcon collapsed={collapsed} />
      </button>

      <div
        className={[
          styles.bottomSheet,
          turnAnim === "in"
            ? styles.bottomSheetTurnSwapIn
            : turnAnim === "out"
              ? styles.bottomSheetTurnSwapOut
              : showRainbowPulse || enterDone
                ? ""
                : styles.bottomSheetEnter,
          showRainbowPulse ? styles.bottomSheetActiveTurn : "",
          raiseAboveCard ? styles.bottomSheetAboveCard : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {showRainbowPulse ? <div className={styles.bottomSheetActiveTurnBg} aria-hidden /> : null}
        <div
          className={[styles.bottomSheetHeightAnim, heightInstant ? styles.bottomSheetHeightInstant : ""]
            .filter(Boolean)
            .join(" ")}
          style={animatedHeight == null ? undefined : { height: animatedHeight }}
        >
          <div
            ref={measureRef}
            className={[
              styles.bottomSheetInner,
              sheetFlash && styles.bottomSheetInnerFlash,
              collapsed && styles.bottomSheetButtonsOnly,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
