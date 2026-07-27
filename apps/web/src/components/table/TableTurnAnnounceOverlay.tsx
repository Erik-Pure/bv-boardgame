import styles from "../../routes/TableView.module.css";

function TurnAnnounceHeading({ text }: { text: string }) {
  const chars = Array.from(text);
  const staggerMs = 38;
  return (
    <div className={styles.turnAnnounceText} aria-hidden>
      {chars.map((ch, i) => (
        <span
          key={`${i}-${ch}`}
          className={styles.turnAnnounceLetter}
          style={{ animationDelay: `${i * staggerMs}ms` }}
        >
          {ch === " " ? "\u00a0" : ch}
        </span>
      ))}
    </div>
  );
}

/** Kort stor «X:s tur»-banner över brädet vid turbyte (samma stil som mobilens «Din tur»). */
export function TableTurnAnnounceOverlay(props: { label: string }) {
  const { label } = props;
  return (
    <div className={styles.turnAnnounceOverlay} aria-live="polite" aria-label={label}>
      <TurnAnnounceHeading text={label} />
    </div>
  );
}
