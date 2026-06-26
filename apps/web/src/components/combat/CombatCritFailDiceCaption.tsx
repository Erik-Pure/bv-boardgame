import { useUiStrings } from "../../lib/locale/LocaleContext";
import styles from "./CombatCritFailDiceCaption.module.css";

export function CombatCritFailDiceCaption(props: { variant?: "play" | "table" }) {
  const ui = useUiStrings();
  const variant = props.variant ?? "play";
  return (
    <p
      className={[styles.caption, variant === "table" ? styles.table : styles.play].join(" ")}
      role="status"
      aria-live="polite"
    >
      {ui.play.combatCritFailOnOneNearDice}
    </p>
  );
}
