import styles from "./CombatOutcomeThumb.module.css";

const THUMB_UP = "/icons/thumbup-icon.svg";
const THUMB_DOWN = "/icons/thumbdown-icon.svg";
const KLUNK_SVG = "/icons/klunk.svg";

export type CombatOutcomeVisual = "win" | "loss" | "klunk";

export function CombatOutcomeThumb(props: { outcome: CombatOutcomeVisual }) {
  if (props.outcome === "klunk") {
    return (
      <div className={`${styles.badge} ${styles.klunk}`} aria-hidden>
        <img src={KLUNK_SVG} alt="" className={styles.klunkIcon} draggable={false} />
      </div>
    );
  }
  const win = props.outcome === "win";
  return (
    <div
      className={`${styles.badge} ${win ? styles.win : styles.loss}`}
      aria-hidden
    >
      <img src={win ? THUMB_UP : THUMB_DOWN} alt="" className={styles.icon} draggable={false} />
    </div>
  );
}
