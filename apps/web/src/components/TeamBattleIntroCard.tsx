import { useRef, type CSSProperties } from "react";
import { CardFlipModalShell } from "./CardFlipModalShell";
import cardFlipShellStyles from "./CardFlipModalShell.module.css";
import { useFitToViewportScale } from "../hooks/useFitToViewportScale";
import { useTableOverlayContentScale } from "../lib/tablePresentationScale";
import { useUiStrings } from "../lib/locale/LocaleContext";
import type { MonsterEncounterCardProps } from "./MonsterEncounterCard";
import { MonsterEncounterCard } from "./MonsterEncounterCard";

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

const CARD_BOX_BASE: CSSProperties = {
  width: "min(520px, 92vw)",
  maxWidth: "100%",
  borderRadius: 20,
  border: "2px solid rgba(251, 191, 36, 0.45)",
  background: "linear-gradient(165deg, rgba(36, 20, 52, 0.97), rgba(11, 18, 38, 0.98))",
  boxShadow: "0 24px 64px rgba(0,0,0,0.55), 0 0 48px rgba(251, 191, 36, 0.14)",
  boxSizing: "border-box",
};

/** Utan monster: samma proportioner som tidigare. */
const CARD_BOX_TEXT_ONLY: CSSProperties = {
  ...CARD_BOX_BASE,
  aspectRatio: "5 / 7",
  maxHeight: "min(88vh, 640px)",
};

/** Med monster: scrollbar yta, ingen fast 5∶7 (annars klipps kort + text). */
const CARD_BOX_WITH_MONSTER: CSSProperties = {
  ...CARD_BOX_BASE,
  maxHeight: "min(92dvh, 900px)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const CARD_INNER_BASE: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "clamp(22px, 5vw, 36px)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  gap: 16,
};

const CARD_INNER_TEXT_ONLY: CSSProperties = {
  ...CARD_INNER_BASE,
  justifyContent: "center",
  minHeight: 280,
};

const CARD_INNER_WITH_MONSTER: CSSProperties = {
  ...CARD_INNER_BASE,
  justifyContent: "flex-start",
  flex: "1 1 auto",
  minHeight: 0,
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
};

/** Stor kort-yta innan monster visas: team battle + instruktion (bord eller mobil). */
export function TeamBattleIntroCard(props: {
  attackerName: string;
  variant: "table" | "play";
  /** Lobby: vilken kortbaksida som visas vid flip (mobil). */
  cardCoverId?: string | null;
  /** Bord: samma overlay-anim som övriga stridsmodaler */
  tableOverlayAnimation?: string;
  tableCardEntranceAnimation?: string;
  /** Visas under rubriken — samma data som i monsterintro efter medkämpeval. */
  monster?: MonsterEncounterCardProps;
}) {
  const ui = useUiStrings();
  const overlayScale = useTableOverlayContentScale();
  /** Bord: skal-till-passa (mätt) så kort + text alltid ryms; mobil: ingen skalning. */
  const tableMeasureRef = useRef<HTMLDivElement | null>(null);
  const tableFitScale = useFitToViewportScale(tableMeasureRef, {
    reservedTop: 24,
    reservedBottom: 28,
    sidePadPx: 32,
    desiredScale: overlayScale,
  });
  const tableScale = props.variant === "table" ? tableFitScale : 1;
  const isPlayVariant = props.variant === "play";
  const hasMonster = !!props.monster;
  const teamBattleTitle = <h2 style={TITLE_STYLE}>{ui.table.teamBattleIntroTitle}</h2>;
  const centeredMonsterColumnStyle: CSSProperties = {
    width: isPlayVariant ? "min(400px, 100%)" : "auto",
    display: "grid",
    justifyItems: "center",
    gap: 12,
    marginInline: "auto",
    boxSizing: "border-box",
  };
  const monsterCardOnly = hasMonster ? (
    <div
      style={{
        width: isPlayVariant ? "100%" : "min(400px, 92vw)",
        maxWidth: isPlayVariant ? "100%" : "calc(100vw - 32px)",
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      <MonsterEncounterCard {...props.monster!} />
    </div>
  ) : null;

  const textBlock = (
    <>
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
        {ui.table.teamBattleIntroBody(props.attackerName)}
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
        {ui.table.teamBattleIntroHint}
      </p>
    </>
  );

  const body = (
    <>
      {teamBattleTitle}
      {monsterCardOnly}
      {textBlock}
    </>
  );

  const boxStyle = hasMonster ? CARD_BOX_WITH_MONSTER : CARD_BOX_TEXT_ONLY;
  const innerStyle = hasMonster ? CARD_INNER_WITH_MONSTER : CARD_INNER_TEXT_ONLY;

  if (props.variant === "table") {
    if (hasMonster) {
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
              transform: tableScale !== 1 ? `scale(${tableScale})` : undefined,
              transformOrigin: "center center",
            }}
          >
            {/* Otransformerat mät-element (entré-animationens transform påverkar inte offset-mått). */}
            <div
              ref={tableMeasureRef}
              style={{
                animation: props.tableCardEntranceAnimation,
                transformOrigin: "center center",
                display: "grid",
                justifyItems: "center",
                gap: 12,
              }}
            >
              {teamBattleTitle}
              {monsterCardOnly}
            </div>
          </div>
        </div>
      );
    }
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
            transform: tableScale !== 1 ? `scale(${tableScale})` : undefined,
            transformOrigin: "center center",
          }}
        >
          <div
            ref={tableMeasureRef}
            style={{
              ...boxStyle,
              animation: props.tableCardEntranceAnimation,
              transformOrigin: "center center",
            }}
          >
            <div style={innerStyle}>{body}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CardFlipModalShell
      zIndex={105}
      maxWidth={hasMonster ? 520 : 440}
      instantFront
      simpleEntrance={hasMonster}
      blockPointerUntilFlipped={false}
      cardCoverId={props.cardCoverId}
      faceInnerClassName={hasMonster ? undefined : cardFlipShellStyles.faceInnerNoVerticalOverflow}
    >
      {hasMonster ? (
        <div style={centeredMonsterColumnStyle}>
          {teamBattleTitle}
          {monsterCardOnly}
        </div>
      ) : (
      <div
        style={{
          ...boxStyle,
          ...(hasMonster
            ? { width: "min(520px, 92vw)" }
            : { maxHeight: "none", aspectRatio: "auto", minHeight: 320 }),
        }}
      >
        <div style={innerStyle}>{body}</div>
      </div>
      )}
    </CardFlipModalShell>
  );
}
