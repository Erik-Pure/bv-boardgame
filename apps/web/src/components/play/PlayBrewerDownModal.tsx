import { canAffordPant, type ClientAction, type GameState, type Pending, type Player } from "@bv/game-core";
import { ArcadeButton } from "../ArcadeButton";
import { CardFlipModalShell } from "../CardFlipModalShell";
import cardFlipShellStyles from "../CardFlipModalShell.module.css";
import u from "../../styles/uiPrimitives.module.css";
import { sv } from "../../lib/uiStrings";

function deathContinueCost(me: Player): number {
  return Math.max(0, (me.equipment.accessory as { deathContinueCost?: number } | undefined)?.deathContinueCost ?? 0);
}

export function PlayBrewerDownModal(props: {
  pending: Extract<Pending, { type: "brewerDown" }>;
  me: Player;
  state: GameState;
  cardCoverId: string | undefined;
  send: (action: ClientAction) => void;
}) {
  const { pending, me, state, cardCoverId, send } = props;
  const insuredCost = deathContinueCost(me);

  return (
    <CardFlipModalShell
      zIndex={165}
      cardCoverId={cardCoverId}
      faceInnerClassName={cardFlipShellStyles.faceInnerNoVerticalOverflow}
      style={{
        placeItems: "center",
        paddingTop: "max(14px, env(safe-area-inset-top))",
        paddingBottom: "max(108px, env(safe-area-inset-bottom))",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          margin: "0 auto",
          boxSizing: "border-box",
          padding: 22,
          borderRadius: 16,
          border: "1px solid #ffffff22",
          background: "var(--modal-panel-bg)",
          color: "#fff",
          textAlign: "center",
          display: "grid",
          gap: 16,
        }}
      >
        {pending.playerId === me.id ? (
          <>
            <div
              style={{
                fontFamily: '"Permanent Marker", var(--heading), sans-serif',
                fontWeight: 900,
                fontSize: "clamp(1.45rem, 5.8vw, 2rem)",
                letterSpacing: "0.06em",
                lineHeight: 1.1,
                textTransform: "uppercase",
              }}
            >
              {sv.play.brewerDownTitle}
            </div>
            <img
              src="/icons/gameover.svg"
              alt=""
              draggable={false}
              style={{
                width: "min(180px, 52vw)",
                height: "auto",
                margin: "0 auto",
              }}
            />
            <div style={{ fontFamily: "var(--sans)", fontSize: 18, fontWeight: 700 }}>{me.name}</div>
            <p style={{ margin: 0, opacity: 0.9, fontSize: 14, lineHeight: 1.45 }}>{sv.play.brewerDownLead}</p>
            {insuredCost > 0 ? (
              <p style={{ margin: 0, opacity: 0.85, fontSize: 13, lineHeight: 1.4 }}>
                {sv.play.brewerDownInsuredContinue(insuredCost)}
              </p>
            ) : null}
            <div className={u.stack10Mt4}>
              {insuredCost > 0 ? (
                <ArcadeButton
                  variant="blue"
                  fullWidth
                  disabled={!canAffordPant(me, insuredCost)}
                  onClick={() =>
                    send({ type: "brewerDownChoice", playerId: me.id, choice: "insuredContinue" } as ClientAction)
                  }
                >
                  {sv.play.brewerDownInsuredContinue(insuredCost)}
                </ArcadeButton>
              ) : null}
              {!state.config.hardcore ? (
                <ArcadeButton
                  variant="pink"
                  fullWidth
                  onClick={() => send({ type: "brewerDownChoice", playerId: me.id, choice: "retry" })}
                >
                  {sv.play.brewerDownRetry}
                </ArcadeButton>
              ) : null}
              <ArcadeButton
                variant="gray"
                fullWidth
                onClick={() => send({ type: "brewerDownChoice", playerId: me.id, choice: "giveUp" })}
              >
                {sv.play.brewerDownGiveUp}
              </ArcadeButton>
            </div>
          </>
        ) : (
          <div style={{ fontFamily: "var(--sans)", fontSize: 16, fontWeight: 700, lineHeight: 1.4 }}>
            {sv.play.brewerDownWaitOther(state.players.find((pl) => pl.id === pending.playerId)?.name ?? "")}
          </div>
        )}
      </div>
    </CardFlipModalShell>
  );
}
