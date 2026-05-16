import type { ReactNode } from "react";
import styles from "../../routes/PlayView.module.css";

/** Lägger vänt-caption i botten-sheet utan emote (emotes är flytande utanför panelen). */
export function withIdleEmotes(
  content: ReactNode | null,
  ctx: { caption: string } | null,
): ReactNode | null {
  if (!ctx) return content;
  if (!content) {
    return <div className={styles.waitingTurnCaption}>{ctx.caption}</div>;
  }
  return (
    <div className={styles.waitingTurnEmotePanel}>
      <div className={styles.waitingTurnEmoteStackedBody}>{content}</div>
    </div>
  );
}

