import type { ClientAction, GameState, Player } from "@bv/game-core";
import { DiceCube3D } from "../DiceCube3D";
import { ArcadeButton } from "../ArcadeButton";
import { sv } from "../../lib/uiStrings";

type CombatHitMitigationPending = Extract<NonNullable<GameState["pending"]>, { type: "combat" }>;

export function CombatHitMitigationSheet(props: {
  state: GameState;
  me: Player;
  pending: CombatHitMitigationPending;
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
  const reduce = pending.monsterId === "kapten_interrobang" ? 3 : 2;
  const full = pending.monsterId === "kapten_interrobang" ? 5 : 4;
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
          <DiceCube3D value={die} size={76} oneAsSkullIcon />
          {broDie != null ? <DiceCube3D value={broDie} size={76} oneAsSkullIcon /> : null}
        </div>
        <div className={sheetDiceCaptionClass}>
          <span className={sheetDiceCaptionTextClass}>{sv.play.youLostTotal(total, need)}</span>
        </div>
      </div>
      <div style={{ textAlign: "center", opacity: 0.9, fontSize: 14, lineHeight: 1.45 }}>
        {sv.play.hitChoiceIntro(pending.enemyName)}
        <br />
        <span style={{ opacity: 0.88 }}>{sv.play.hitChoiceDetail(reduce, full)}</span>
      </div>
      {isAttacker ? (
        <div style={{ display: "grid", gap: 8 }}>
          <ArcadeButton
            variant="pink"
            fullWidth
            onClick={() => send({ type: "chooseCombatHitMitigation", playerId: me.id, choice: "sip" })}
          >
            {sv.play.takeSipReduce(reduce)}
          </ArcadeButton>
          <ArcadeButton
            variant="gray"
            fullWidth
            onClick={() => send({ type: "chooseCombatHitMitigation", playerId: me.id, choice: "no_sip" })}
          >
            {sv.play.fullDamageNoSip(full)}
          </ArcadeButton>
        </div>
      ) : (
        <div style={{ textAlign: "center", opacity: 0.85 }}>
          {sv.play.waitAttackerChoose(attacker?.name ?? sv.play.theAttacker)}
        </div>
      )}
    </div>
  );
}

