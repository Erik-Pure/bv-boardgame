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
  const isInterrobang = pending.monsterId === "kapten_interrobang";
  const isTransporter = pending.monsterId === "transporter";
  const reduce = isInterrobang ? 3 : isTransporter ? 999 : 2;
  const full = isInterrobang ? 5 : isTransporter ? 3 : 4;
  const detailText = isInterrobang
    ? "Betala 5 pant för att minska skadan med 3, eller ta full skada."
    : isTransporter
      ? "Betala 10 pant för att ta 0 skada, eller ta full skada."
      : sv.play.hitChoiceDetail(reduce, full);
  const primaryLabel = isInterrobang
    ? "Betala 5 pant (−3 skada)"
    : isTransporter
      ? "Betala 10 pant (0 skada)"
      : sv.play.takeSipReduce(reduce);
  const secondaryLabel = isInterrobang || isTransporter ? "Ta full skada (ingen betalning)" : sv.play.fullDamageNoSip(full);
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
        <span style={{ opacity: 0.88 }}>{detailText}</span>
      </div>
      {isAttacker ? (
        <div style={{ display: "grid", gap: 8 }}>
          <ArcadeButton
            variant="pink"
            fullWidth
            onClick={() => send({ type: "chooseCombatHitMitigation", playerId: me.id, choice: "sip" })}
          >
            {primaryLabel}
          </ArcadeButton>
          <ArcadeButton
            variant="gray"
            fullWidth
            onClick={() => send({ type: "chooseCombatHitMitigation", playerId: me.id, choice: "no_sip" })}
          >
            {secondaryLabel}
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

