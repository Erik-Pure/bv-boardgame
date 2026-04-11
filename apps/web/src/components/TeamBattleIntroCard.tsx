import type { CSSProperties } from "react";
import { CardFlipModalShell } from "./CardFlipModalShell";
import cardFlipShellStyles from "./CardFlipModalShell.module.css";
import { sv } from "../lib/uiStrings";

const CARD_INNER: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "clamp(22px, 5vw, 36px)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  gap: 20,
  minHeight: 280,
};

const TITLE_STYLE: CSSProperties = {
  margin: 0,
  fontFamily: '"Permanent Marker", var(--heading), sans-serif',
  fontWeight: 400,
  fontSize: "clamp(2.35rem, 7.5vw, 3.5rem)",
  lineHeight: 1.05,
  letterSpacing: "0.02em",
  color: "#fef9c3",
  textShadow: "0 0 32px rgba(251, 191, 36, 0.35)",
};

const CARD_BOX: CSSProperties = {
  width: "min(520px, 92vw)",
  maxWidth: "100%",
  aspectRatio: "5 / 7",
  maxHeight: "min(88vh, 640px)",
  borderRadius: 20,
  border: "2px solid rgba(251, 191, 36, 0.45)",
  background: "linear-gradient(165deg, rgba(36, 20, 52, 0.97), rgba(11, 18, 38, 0.98))",
  boxShadow: "0 24px 64px rgba(0,0,0,0.55), 0 0 48px rgba(251, 191, 36, 0.14)",
  boxSizing: "border-box",
};

/** Stor kort-yta innan monster visas: team battle + instruktion (bord eller mobil). */
export function TeamBattleIntroCard(props: {
  attackerName: string;
  variant: "table" | "play";
  /** Bord: samma overlay-anim som övriga stridsmodaler */
  tableOverlayAnimation?: string;
  tableCardEntranceAnimation?: string;
}) {
  const body = (
    <>
      <h2 style={TITLE_STYLE}>{sv.table.teamBattleIntroTitle}</h2>
      <p
        style={{
          margin: 0,
          fontSize: "clamp(1rem, 3.1vw, 1.2rem)",
          fontWeight: 700,
          opacity: 0.94,
          lineHeight: 1.45,
          color: "#f1f5f9",
          maxWidth: 400,
        }}
      >
        {sv.table.teamBattleIntroBody(props.attackerName)}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: 14,
          opacity: 0.78,
          lineHeight: 1.45,
          color: "#e2e8f0",
          maxWidth: 380,
        }}
      >
        {sv.table.teamBattleIntroHint}
      </p>
    </>
  );

  if (props.variant === "table") {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 42,
          display: "grid",
          placeItems: "center",
          padding: "max(20px, env(safe-area-inset-top)) 16px max(24px, env(safe-area-inset-bottom))",
          background: "rgba(2, 6, 23, 0.4)",
          animation: props.tableOverlayAnimation,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            ...CARD_BOX,
            animation: props.tableCardEntranceAnimation,
            transformOrigin: "center center",
          }}
        >
          <div style={CARD_INNER}>{body}</div>
        </div>
      </div>
    );
  }

  return (
    <CardFlipModalShell
      zIndex={105}
      maxWidth={440}
      instantFront
      blockPointerUntilFlipped={false}
      faceInnerClassName={cardFlipShellStyles.faceInnerNoVerticalOverflow}
    >
      <div style={{ ...CARD_BOX, maxHeight: "none", aspectRatio: "auto", minHeight: 320 }}>
        <div style={CARD_INNER}>{body}</div>
      </div>
    </CardFlipModalShell>
  );
}
