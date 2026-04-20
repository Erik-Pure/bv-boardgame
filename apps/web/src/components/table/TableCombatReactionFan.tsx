import type { TableFanCardModel } from "../../lib/tableItemPlayFanCards";
import { TableItemPlayCard } from "./TableItemPlayCard";

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
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: "min(64vh, 520px)",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <style>
        {`@keyframes tableFanCardSlideInFromBelow {
  0% {
    opacity: 0;
    transform: translateX(calc(-50% + var(--fan-tx, 0px))) translateY(32px) rotate(var(--fan-rot, 0deg));
  }
  100% {
    opacity: 1;
    transform: translateX(calc(-50% + var(--fan-tx, 0px))) translateY(calc(-1 * var(--fan-lift, 0px))) rotate(var(--fan-rot, 0deg));
  }
}`}
      </style>
      {cards.map((card, i) => {
        const rot = n === 1 ? -2.75 : baseRot + i * rotStep;
        const spread = 48;
        const tx = n === 1 ? 0 : (i - (n - 1) / 2) * Math.min(spread, 260 / Math.max(1, n - 1));

        return (
          <div
            key={card.key}
            style={{
              position: "absolute",
              left: "50%",
              bottom: 0,
              width: "min(280px, 40vw)",
              transformOrigin: "50% 100%",
              transform: `translateX(calc(-50% + ${tx}px)) translateY(-${liftPx}px) rotate(${rot}deg)`,
              zIndex: i + 1,
              filter: "drop-shadow(0 -6px 18px rgba(0,0,0,0.38))",
              opacity: 1,
              animation: "tableFanCardSlideInFromBelow 300ms cubic-bezier(.2,.75,.18,1) both",
              animationDelay: `${Math.min(i * 38, 140)}ms`,
              willChange: "transform, opacity",
              ["--fan-tx" as string]: `${tx}px`,
              ["--fan-rot" as string]: `${rot}deg`,
              ["--fan-lift" as string]: `${liftPx}px`,
            }}
          >
            <div style={{ transform: "scale(0.98)", transformOrigin: "50% 100%" }}>
              <TableItemPlayCard
                title={card.title}
                actorName={card.actorName}
                imageSrc={card.imageSrc}
                targetPlayerName={card.targetPlayerName}
                modifierBadge={card.modifierBadge}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
