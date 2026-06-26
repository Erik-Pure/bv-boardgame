import styles from "../../routes/PlayView.module.css";
import { BOSS_FINALE_EXIT_MS } from "../../lib/bossFinaleTiming";
import { useUiStrings } from "../../lib/locale/LocaleContext";

export function BossFinaleOverlay(props: {
  roundLabel: string;
  winnerName: string;
  bossName?: string;
  /** Efter Fortsätt — tonar ut tillsammans med bordets kort-exit. */
  exiting?: boolean;
}) {
  const ui = useUiStrings();
  return (
    <div
      className={styles.bossFinaleOverlay}
      aria-live="polite"
      aria-label={`${props.roundLabel}. ${ui.play.bossFinaleVictory}. ${ui.play.bossFinaleWinner(props.winnerName)}`}
    >
      <div
        className={[
          styles.bossFinaleOverlayStack,
          props.exiting ? styles.bossFinaleOverlayStackExiting : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={props.exiting ? { animationDuration: `${BOSS_FINALE_EXIT_MS}ms` } : undefined}
      >
        <div className={styles.bossFinaleRoundLabel}>{props.roundLabel}</div>
        <div className={styles.bossFinaleVictoryText}>{ui.play.bossFinaleVictory}</div>
        <div className={styles.bossFinaleWinnerText}>{ui.play.bossFinaleWinner(props.winnerName)}</div>
        {props.bossName ? <div className={styles.bossFinaleBossName}>{props.bossName}</div> : null}
      </div>
    </div>
  );
}
