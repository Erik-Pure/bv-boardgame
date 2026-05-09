import styles from "./LevelRingCell.module.css";

export type LevelRingCellProps = {
  ariaLabel: string;
  level: number;
  ratio: number;
  /** Mindre ring för tabell-rader m.m. */
  size?: "default" | "compact";
};

export function LevelRingCell(props: LevelRingCellProps) {
  const clamped = Number.isFinite(props.ratio) ? Math.max(0, Math.min(1, props.ratio)) : 0;
  const fillPercent = Math.round(clamped * 100);
  const uiLevel = Math.max(1, Math.floor(props.level || 1));
  const frameLevel = Math.max(1, Math.min(5, uiLevel));
  const compact = props.size === "compact";
  return (
    <div
      className={[styles.levelRingCell, compact ? styles.compact : ""].filter(Boolean).join(" ")}
      role="group"
      aria-label={props.ariaLabel}
    >
      <div className={styles.levelRingOuter}>
        <div className={styles.levelRingInner}>
          <div
            className={styles.levelRingProgress}
            style={{
              background: `linear-gradient(0deg, rgba(234,88,12,0.72) 0%, rgba(249,115,22,0.9) ${fillPercent}%, rgba(148,163,184,0.08) ${fillPercent}% 100%)`,
            }}
            aria-hidden
          />
          <img
            src={`/icons/lvl${frameLevel}.svg`}
            alt=""
            aria-hidden
            draggable={false}
            className={styles.levelRingFrame}
          />
          <span className={styles.levelRingValue}>{uiLevel}</span>
        </div>
      </div>
    </div>
  );
}
