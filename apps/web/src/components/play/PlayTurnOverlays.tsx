import styles from "../../routes/PlayView.module.css";
import { sv } from "../../lib/uiStrings";

function MyTurnOverlayHeading({ text }: { text: string }) {
  const chars = Array.from(text);
  const staggerMs = 38;
  return (
    <div className={styles.myTurnOverlayText} aria-hidden>
      {chars.map((ch, i) => (
        <span
          key={`${i}-${ch}`}
          className={styles.myTurnOverlayLetter}
          style={{ animationDelay: `${i * staggerMs}ms` }}
        >
          {ch === " " ? "\u00a0" : ch}
        </span>
      ))}
    </div>
  );
}

export function PlayTurnOverlays(props: {
  showMyTurnOverlay: boolean;
  showLevelUpOverlay: number | null;
}) {
  const { showMyTurnOverlay, showLevelUpOverlay } = props;

  return (
    <>
      {showMyTurnOverlay ? (
        <div className={styles.myTurnOverlay} aria-live="polite" aria-label={sv.play.footerTurnYou}>
          <MyTurnOverlayHeading text={sv.play.footerTurnYou} />
        </div>
      ) : null}
      {showLevelUpOverlay != null ? (
        <div
          className={styles.levelUpOverlay}
          aria-live="polite"
          aria-label={`Level up! Bryggnivå ${showLevelUpOverlay}`}
        >
          <div className={styles.levelUpOverlayText}>Level up!</div>
        </div>
      ) : null}
    </>
  );
}
