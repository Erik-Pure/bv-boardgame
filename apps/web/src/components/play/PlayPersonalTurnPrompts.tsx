import type { Pending } from "@bv/game-core";
import { CardFlipModalShell } from "../CardFlipModalShell";
import styles from "../../routes/PlayView.module.css";
import u from "../../styles/uiPrimitives.module.css";
import { sv } from "../../lib/uiStrings";

function playLevelBackgroundSrc(levelIndex: number): string {
  const idx = Math.max(0, Math.floor(levelIndex));
  return `/backgrounds/level${idx + 1}bg.webp`;
}

const promptPanelStyle = {
  pointerEvents: "auto" as const,
  width: "100%",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "var(--modal-panel-bg)",
  boxShadow: "0 18px 56px rgba(0,0,0,0.55)",
};

const promptTitleStyle = {
  fontFamily: '"Permanent Marker", var(--heading), sans-serif',
  fontWeight: 500,
  fontSize: "clamp(1.6rem, 6.2vw, 2.2rem)",
  letterSpacing: "0.04em",
  lineHeight: 1.05,
  textTransform: "uppercase" as const,
  textAlign: "center" as const,
  color: "#ffffff",
  textShadow: "0 3px 16px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.55)",
  marginBottom: 16,
};

export function PlayLevelUpOfferPrompt(props: {
  personalTurnPrompt: Extract<Pending, { type: "levelUpOffer" }>;
  cardCoverId: string | undefined;
}) {
  const { personalTurnPrompt, cardCoverId } = props;
  return (
    <CardFlipModalShell
      zIndex={112}
      backdropZIndex={60}
      contentZIndex={112}
      onBackdropMouseDown={undefined}
      simpleEntrance
      cardCoverId={cardCoverId}
      className={styles.promptOfferOverlay}
      style={{ pointerEvents: "none" }}
    >
      <div className={styles.promptOfferPanel} style={promptPanelStyle}>
        <div style={{ padding: 14 }}>
          <div style={promptTitleStyle}>{sv.play.levelUpOfferTitle}</div>
          <div
            aria-hidden
            className={styles.promptOfferArt}
            style={{
              backgroundImage: `url(${playLevelBackgroundSrc(personalTurnPrompt.targetLevelIndex)})`,
            }}
          />
          <div className={`${styles.promptOfferBody} ${u.textCenter}`}>
            {sv.play.levelUpOfferPrompt(personalTurnPrompt.targetLevelIndex + 1)}
          </div>
        </div>
      </div>
    </CardFlipModalShell>
  );
}

export function PlayBrewerPerkChoicePrompt(props: {
  levelsRemaining: number;
  cardCoverId: string | undefined;
}) {
  const { levelsRemaining, cardCoverId } = props;
  return (
    <CardFlipModalShell
      zIndex={120}
      backdropZIndex={118}
      contentZIndex={120}
      onBackdropMouseDown={undefined}
      simpleEntrance
      cardCoverId={cardCoverId}
      className={styles.promptOfferOverlay}
      style={{ pointerEvents: "none" }}
    >
      <div className={styles.promptOfferPanel} style={promptPanelStyle}>
        <div style={{ padding: 14 }}>
          <div style={promptTitleStyle}>{sv.play.brewerPerkTitle}</div>
          <div className={`${styles.promptOfferBody} ${u.textCenter}`}>
            {sv.play.brewerPerkPrompt(levelsRemaining)}
          </div>
        </div>
      </div>
    </CardFlipModalShell>
  );
}
