import type { ClientAction, GameState, Player } from "@bv/game-core";
import { DiceCube3D } from "../DiceCube3D";
import { ArcadeButton } from "../ArcadeButton";
import { sv } from "../../lib/uiStrings";

export function CombatRollPreviewSheet(props: {
  state: GameState;
  me: Player;
  pending: Extract<NonNullable<GameState["pending"]>, { type: "combat"; phase: "rollPreview" }>;
  send: (action: ClientAction) => void;
  sheetDiceBlockClass: string;
  sheetDiceCaptionClass: string;
  sheetDiceCaptionTextClass: string;
}) {
  const { state, me, pending, send, sheetDiceBlockClass, sheetDiceCaptionClass, sheetDiceCaptionTextClass } = props;
  const isAttacker = pending.attackerId === me.id;
  const attacker = state.players.find((p) => p.id === pending.attackerId);
  const die = pending.previewDie ?? 1;
  const total = pending.previewTotal ?? 0;
  const need = pending.previewNeed ?? 0;
  const broDie = pending.previewBroDie;
  const effAtt = pending.previewAttackDiceDoubled ? die * 2 : die;
  const effBro = broDie != null ? (pending.previewBroAttackDiceDoubled ? broDie * 2 : broDie) : null;
  const baseDiceTotal = effAtt + (effBro ?? 0);
  const bonus = total - baseDiceTotal;
  const bonusText = bonus === 0 ? "" : bonus > 0 ? ` (+${bonus})` : ` (${bonus})`;
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
          <DiceCube3D value={die} size={76} oneAsMonsterIcon />
          {broDie != null ? <DiceCube3D value={broDie} size={76} oneAsMonsterIcon /> : null}
        </div>
        <div className={sheetDiceCaptionClass}>
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
            <span>{`Attack totalt ${total}${bonusText} mot`}</span>
            <img
              src="/icons/combat-icon.svg"
              alt=""
              aria-hidden
              style={{ width: 16, height: 16, display: "block", filter: "brightness(0) invert(1)" }}
            />
            <span>{need}</span>
          </span>
        </div>
        {pending.previewAttackDiceDoubled || pending.previewBroAttackDiceDoubled ? (
          <div style={{ textAlign: "center", fontSize: 12, opacity: 0.85, marginTop: 4 }}>
            {sv.play.combatAttackDoubledHint}
          </div>
        ) : null}
      </div>
      {isAttacker ? (
        <ArcadeButton variant="pink" fullWidth onClick={() => send({ type: "combatRollAck", playerId: me.id })}>
          {sv.play.continue}
        </ArcadeButton>
      ) : (
        <div style={{ textAlign: "center", opacity: 0.85 }}>
          {sv.play.waitAttackerContinue(attacker?.name ?? sv.play.theAttacker)}
        </div>
      )}
    </div>
  );
}

