import { ArcadeButton } from "../ArcadeButton";
import { StatIcon } from "../StatIcon";
import { PlayModal } from "./PlayModal";
import u from "../../styles/uiPrimitives.module.css";
import { sv } from "../../lib/uiStrings";

export function PlayResponsibleReminderModal(props: {
  open: boolean;
  cardCoverId: string | undefined;
  onDismiss: () => void;
}) {
  const { open, cardCoverId, onDismiss } = props;
  if (!open) return null;

  return (
    <PlayModal
      cardCoverId={cardCoverId}
      title={sv.play.responsibleReminderTitle}
      onClose={onDismiss}
      instantFront
      hideClose
      backdropCloses={false}
      zIndex={130}
      centered
      panelStyle={{ paddingTop: 24, paddingBottom: 24, paddingLeft: 16, paddingRight: 16 }}
      titleBelow={<StatIcon kind="hp" size={88} />}
      titleStyle={{
        fontFamily: '"Permanent Marker", var(--heading), sans-serif',
        fontWeight: 400,
        fontSize: "clamp(22px, 5.2vw, 30px)",
        letterSpacing: "0.03em",
        lineHeight: 1.15,
        color: "#fef9c3",
        textShadow: "0 2px 14px rgba(0,0,0,0.75), 0 0 22px rgba(250, 204, 21, 0.25)",
      }}
    >
      <div className={u.stack12} style={{ width: "100%", alignItems: "center" }}>
        <p
          style={{
            margin: 0,
            fontSize: 15,
            lineHeight: 1.5,
            color: "rgba(248, 250, 252, 0.95)",
            textAlign: "center",
            maxWidth: "100%",
          }}
        >
          {sv.play.responsibleReminderBody}
        </p>
        <ArcadeButton variant="pink" fullWidth onClick={onDismiss}>
          {sv.play.responsibleReminderOk}
        </ArcadeButton>
      </div>
    </PlayModal>
  );
}
