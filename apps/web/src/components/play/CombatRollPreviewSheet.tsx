import type { ClientAction, GameState, Player } from "@bv/game-core";
import { DiceCube3D } from "../DiceCube3D";
import { ArcadeButton } from "../ArcadeButton";
import { CombatCritFailDiceCaption } from "../combat/CombatCritFailDiceCaption";
import { combatPreviewShowsSkullOnOne } from "../../lib/combatCritFailUi";
import { useUiStrings } from "../../lib/locale/LocaleContext";
import playStyles from "../../routes/PlayView.module.css";

type CombatRollPreviewPending = Extract<NonNullable<GameState["pending"]>, { type: "combat" }>;

export function CombatRollPreviewSheet(props: {
  state: GameState;
  me: Player;
  pending: CombatRollPreviewPending;
  send: (action: ClientAction) => void;
  sheetDiceBlockClass: string;
  sheetDiceCaptionClass: string;
  sheetDiceCaptionTextClass: string;
}) {
  const ui = useUiStrings();
  const { state, me, pending, send, sheetDiceBlockClass, sheetDiceCaptionClass, sheetDiceCaptionTextClass } = props;
  const isAttacker = pending.attackerId === me.id;
  const attacker = state.players.find((p) => p.id === pending.attackerId);
  const die = pending.previewDie ?? 1;
  const total = pending.previewTotal ?? 0;
  const need = pending.previewNeed ?? 0;
  const broDie = pending.previewBroDie;
  const isCritFailOnOne = pending.previewCritFailOnOne === true;
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className={sheetDiceBlockClass}>
        <div
          style={{
            display: "flex",
            gap: 14,
            justifyContent: "center",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <DiceCube3D value={die} size={76} oneAsSkullIcon={combatPreviewShowsSkullOnOne(pending.previewCritFailOnOne)} />
          {broDie != null ? (
            <DiceCube3D value={broDie} size={76} oneAsSkullIcon={combatPreviewShowsSkullOnOne(pending.previewCritFailOnOne)} />
          ) : null}
        </div>
        <div
          className={[
            sheetDiceCaptionClass,
            isCritFailOnOne ? playStyles.sheetDiceCaptionFilled : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {isCritFailOnOne ? (
            <CombatCritFailDiceCaption variant="play" />
          ) : (
            <span
              className={sheetDiceCaptionTextClass}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              <span>{ui.play.combatRollAttackTotalLabel} </span>
              <span
                style={{
                  fontWeight: 900,
                  fontSize: "1.28em",
                  lineHeight: 1,
                  letterSpacing: "-0.01em",
                  textShadow: "0 1px 8px rgba(0,0,0,0.45)",
                }}
              >
                {total}
              </span>
              <span>{ui.play.combatRollVsLabel}</span>
              <img
                src="/icons/combat-icon.svg"
                alt=""
                aria-hidden
                style={{ width: 16, height: 16, display: "block", filter: "brightness(0) invert(1)" }}
              />
              <span>{need}</span>
            </span>
          )}
        </div>
        {pending.previewAttackDiceDoubled || pending.previewBroAttackDiceDoubled ? (
          <div style={{ textAlign: "center", fontSize: 12, opacity: 0.85, marginTop: 4 }}>
            {ui.play.combatAttackDoubledHint}
          </div>
        ) : null}
      </div>
      {isAttacker ? (
        <ArcadeButton variant="pink" fullWidth onClick={() => send({ type: "combatRollAck", playerId: me.id })}>
          {ui.play.continue}
        </ArcadeButton>
      ) : (
        <div style={{ textAlign: "center", opacity: 0.85 }}>
          {ui.play.waitAttackerContinue(attacker?.name ?? ui.play.theAttacker)}
        </div>
      )}
    </div>
  );
}

