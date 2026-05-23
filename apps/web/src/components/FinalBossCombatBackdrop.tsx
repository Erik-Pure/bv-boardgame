import { BossCombatBackdropLayers } from "./BossCombatBackdropLayers";
import styles from "./finalBossCombatBackdropShell.module.css";

type FinalBossCombatBackdropProps = {
  sessionKey: string;
  variant: "table" | "play";
};

export function FinalBossCombatBackdrop({ sessionKey, variant }: FinalBossCombatBackdropProps) {
  const rootClass = [styles.root, variant === "table" ? styles.rootTable : styles.rootPlay]
    .filter(Boolean)
    .join(" ");

  return (
    <div key={sessionKey} className={rootClass} aria-hidden>
      <BossCombatBackdropLayers showPulse />
    </div>
  );
}
