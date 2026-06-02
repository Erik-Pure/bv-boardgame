import { sv } from "../../lib/uiStrings";
import styles from "./CombatCritFailDiceCaption.module.css";

export function CombatCritFailDiceCaption(props: { variant?: "play" | "table" }) {
  const variant = props.variant ?? "play";
  return (
    <p
      className={[styles.caption, variant === "table" ? styles.table : styles.play].join(" ")}
      role="status"
      aria-live="polite"
    >
      {sv.play.combatCritFailOnOneNearDice}
    </p>
  );
}
