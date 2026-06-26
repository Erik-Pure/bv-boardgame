import type { GameState } from "@bv/game-core";
import { ArcadeButton } from "../ArcadeButton";
import { BeerBackdropLayers } from "../BeerBackdropLayers";
import { EndedScoreboardTable } from "../EndedScoreboardTable";
import { EndedSpotlightCarousel } from "../EndedSpotlightCarousel";
import u from "../../styles/uiPrimitives.module.css";
import { buildFeedbackFormUrl, isFeedbackFormConfigured } from "../../lib/feedbackFormUrl";
import { useUiStrings } from "../../lib/locale/LocaleContext";

export function PlayEndedOverlay(props: { state: GameState; onLeaveHome: () => void }) {
  const ui = useUiStrings();
  const { state, onLeaveHome } = props;
  if (state.phase !== "ended") return null;
  const feedbackUrl = isFeedbackFormConfigured() ? buildFeedbackFormUrl(state) : null;
  return (
    <div
      role="dialog"
      aria-label={ui.play.gameOver}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "max(12px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom))",
        boxSizing: "border-box",
        overflow: "hidden",
        background: "transparent",
      }}
    >
      <BeerBackdropLayers />
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "min(560px, 100%)",
          maxHeight: "min(90dvh, 100%)",
          overflow: "auto",
          WebkitOverflowScrolling: "touch",
          borderRadius: 16,
          border: "1px solid #ffffff22",
          background: "var(--modal-panel-bg)",
          padding: "clamp(20px, 5vw, 28px)",
          color: "#f8fafc",
          boxShadow: "0 24px 56px rgba(0, 0, 0, 0.45)",
        }}
      >
        <h2 className={u.gameOverTitle}>{ui.play.gameOver}</h2>
        <p className={u.gameOverWinnerLine}>
          {ui.play.winner}: <b>{state.winnerName ?? "—"}</b>
        </p>
        <EndedScoreboardTable players={state.players} winnerId={state.winnerId} />
        <EndedSpotlightCarousel players={state.players} />
        <div style={{ marginTop: 20, width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
          {feedbackUrl ? (
            <ArcadeButton
              variant="gray"
              fullWidth
              onClick={() => window.open(feedbackUrl, "_blank", "noopener,noreferrer")}
            >
              {ui.play.gameOverFeedback}
            </ArcadeButton>
          ) : null}
          <ArcadeButton variant="pink" fullWidth onClick={onLeaveHome}>
            {ui.play.gameOverLeaveToHome}
          </ArcadeButton>
        </div>
      </div>
    </div>
  );
}
