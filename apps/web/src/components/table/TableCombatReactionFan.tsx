import type { TableFanCardModel } from "../../lib/tableItemPlayFanCards";
import { TableItemPlayCard } from "./TableItemPlayCard";
import styles from "./TableCombatReactionFan.module.css";

type Props = {
  cards: TableFanCardModel[];
  /** Samma vertikala lyft som enkelkort (px), pivot vid banner-botten */
  liftPx: number;
};

/**
 * Solfjäder av föremålskort på bräd-tv (stridsreaktioner eller tur utan strid).
 */
export function TableCombatReactionFan(props: Props) {
  const { cards, liftPx } = props;
  const n = cards.length;
  if (n === 0) return null;

  const maxRot = Math.min(18, 6 + n * 2.5);
  const rotStep = n <= 1 ? 0 : (2 * maxRot) / Math.max(1, n - 1);
  const baseRot = n <= 1 ? -2.75 : -maxRot;

  return (
    <div className={styles.fanRoot}>
      {cards.map((card, i) => {
        const rot = n === 1 ? -2.75 : baseRot + i * rotStep;
        const spread = 48;
        const tx = n === 1 ? 0 : (i - (n - 1) / 2) * Math.min(spread, 260 / Math.max(1, n - 1));

        return (
          <div
            key={card.key}
            className={styles.fanCard}
            style={{
              zIndex: i + 1,
              animationDelay: `${Math.min(i * 38, 140)}ms`,
              ["--fan-tx" as string]: `${tx}px`,
              ["--fan-rot" as string]: `${rot}deg`,
              ["--fan-lift" as string]: `${liftPx}px`,
            }}
          >
            <div className={styles.fanCardScaleWrap}>
              <TableItemPlayCard
                title={card.title}
                actorName={card.actorName}
                actorColor={card.actorColor}
                imageSrc={card.imageSrc}
                targetPlayerName={card.targetPlayerName}
                targetPlayerColor={card.targetPlayerColor}
                modifierBadge={card.modifierBadge}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
