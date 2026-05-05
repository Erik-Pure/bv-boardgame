import type { ItemPlayModifierBadge } from "../../lib/tableItemPlayModifier";
import type { CSSProperties } from "react";
import styles from "./TableItemPlayCard.module.css";

type Props = {
  title: string;
  /** Spelare som spelade kortet — under bilden (ev. med pil till mål) */
  actorName: string;
  actorColor?: string;
  imageSrc: string;
  /** Annan spelare kortet riktades mot; visas efter pil när satt */
  targetPlayerName?: string;
  targetPlayerColor?: string;
  modifierBadge: ItemPlayModifierBadge | null;
};

/** Föremålskort för bräd-tv (grå ram). */
export function TableItemPlayCard(props: Props) {
  const { title, actorName, actorColor, imageSrc, targetPlayerName, targetPlayerColor, modifierBadge } = props;
  const showTarget =
    typeof targetPlayerName === "string" &&
    targetPlayerName.trim().length > 0 &&
    targetPlayerName.trim() !== actorName.trim();
  const actorStyle = actorColor ? ({ color: actorColor } as CSSProperties) : undefined;
  const targetStyle = targetPlayerColor ? ({ color: targetPlayerColor } as CSSProperties) : undefined;
  return (
    <div className={styles.card}>
      <div className={styles.inner}>
        <div className={styles.titleRow}>
          {modifierBadge ? (
            <div
              className={[
                styles.modifierBadge,
                modifierBadge.isNegative ? styles.modifierBadgeNegative : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <img
                src={modifierBadge.iconSrc}
                alt=""
                width={20}
                height={20}
                draggable={false}
                className={styles.modifierIcon}
              />
              <span className={styles.modifierValue}>{modifierBadge.value}</span>
            </div>
          ) : null}
          <div className={styles.title}>{title}</div>
        </div>
        <div className={styles.imageFrame}>
          <img src={imageSrc} alt="" draggable={false} className={styles.coverImg} />
        </div>
        <div
          className={styles.actorLine}
          aria-label={
            showTarget
              ? `${actorName} spelade mot ${targetPlayerName?.trim()}`
              : `${actorName} spelade kortet`
          }
        >
          <span className={styles.playerName} style={actorStyle}>
            {actorName}
          </span>
          {showTarget ? (
            <>
              <span aria-hidden className={styles.arrow}>
                →
              </span>
              <span className={styles.playerName} style={targetStyle}>
                {targetPlayerName?.trim()}
              </span>
            </>
          ) : null}
        </div>
        <div className={styles.flexGrowSpacer} aria-hidden />
      </div>
    </div>
  );
}
