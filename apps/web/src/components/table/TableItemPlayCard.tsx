import type { ItemPlayModifierBadge } from "../../lib/tableItemPlayModifier";
import styles from "./TableItemPlayCard.module.css";

type Props = {
  title: string;
  /** Spelare som spelade kortet — under bilden (ev. med pil till mål) */
  actorName: string;
  imageSrc: string;
  /** Annan spelare kortet riktades mot; visas efter pil när satt */
  targetPlayerName?: string;
  modifierBadge: ItemPlayModifierBadge | null;
};

/** Föremålskort för bräd-tv (grå ram). */
export function TableItemPlayCard(props: Props) {
  const { title, actorName, imageSrc, targetPlayerName, modifierBadge } = props;
  const showTarget =
    typeof targetPlayerName === "string" &&
    targetPlayerName.trim().length > 0 &&
    targetPlayerName.trim() !== actorName.trim();
  return (
    <div className={styles.card}>
      <div className={styles.inner}>
        <div className={styles.titleRow}>
          <div className={styles.title}>{title}</div>
          {modifierBadge ? (
            <div className={styles.modifierBadge}>
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
          <span>{actorName}</span>
          {showTarget ? (
            <>
              <span aria-hidden className={styles.arrow}>
                →
              </span>
              <span>{targetPlayerName?.trim()}</span>
            </>
          ) : null}
        </div>
        <div className={styles.flexGrowSpacer} aria-hidden />
      </div>
    </div>
  );
}
