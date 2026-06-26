import {
  canAffordPant,
  computeMonsterDamage,
  type ClientAction,
  type GameState,
  type MonsterId,
  type Player,
} from "@bv/game-core";
import { DiceCube3D } from "../DiceCube3D";
import { ArcadeButton } from "../ArcadeButton";
import { combatPreviewShowsSkullOnOne } from "../../lib/combatCritFailUi";
import { localizedCombatMonster } from "../../lib/combatUi";
import { useLocale, useUiStrings } from "../../lib/locale/LocaleContext";

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
  const locale = useLocale();
  const ui = useUiStrings();
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
  const damagePreviewPlayer = attacker ?? me;
  const rawFullHp = computeMonsterDamage(pending.monsterId as MonsterId, damagePreviewPlayer, die, false).damage;
  const doubledFullHp =
    (pending.getLuckyRiskPlayerIds?.includes(damagePreviewPlayer.id) ?? false) ? rawFullHp * 2 : rawFullHp;
  const fullDamageHp = Math.max(0, Math.floor(doubledFullHp));
  const pantMitigationCost = isInterrobang ? 5 : isTransporter ? 10 : 0;
  const canPayPantMitigation = pantMitigationCost === 0 || canAffordPant(me, pantMitigationCost);
  const detailText = isInterrobang
    ? canPayPantMitigation
      ? ui.play.hitMitigationInterrobangDetail
      : ui.play.hitMitigationPantOnlyFullDamage(5)
    : isTransporter
      ? canPayPantMitigation
        ? ui.play.hitMitigationTransporterDetail
        : ui.play.hitMitigationPantOnlyFullDamage(10)
      : ui.play.hitChoiceDetail(reduce, full);
  const primaryLabel = isInterrobang
    ? ui.play.hitMitigationInterrobangPrimary
    : isTransporter
      ? ui.play.hitMitigationTransporterPrimary
      : ui.play.takeSipReduce(reduce);
  const secondaryLabel =
    isInterrobang || isTransporter ? ui.play.takeFullDamageHp(fullDamageHp) : ui.play.fullDamageNoSip(fullDamageHp);
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
            <DiceCube3D
              value={broDie}
              size={76}
              oneAsSkullIcon={combatPreviewShowsSkullOnOne(pending.previewCritFailOnOne)}
            />
          ) : null}
        </div>
        <div className={sheetDiceCaptionClass}>
          <span className={sheetDiceCaptionTextClass}>{ui.play.youLostTotal(total, need)}</span>
        </div>
      </div>
      <div style={{ textAlign: "center", opacity: 0.9, fontSize: 14, lineHeight: 1.45 }}>
        {ui.play.hitChoiceIntro(localizedCombatMonster(pending, locale).name)}
        <br />
        <span style={{ opacity: 0.88 }}>{detailText}</span>
      </div>
      {isAttacker ? (
        <div style={{ display: "grid", gap: 8 }}>
          {canPayPantMitigation ? (
            <ArcadeButton
              variant="pink"
              fullWidth
              onClick={() => send({ type: "chooseCombatHitMitigation", playerId: me.id, choice: "sip" })}
            >
              {primaryLabel}
            </ArcadeButton>
          ) : null}
          <ArcadeButton
            variant={canPayPantMitigation ? "gray" : "pink"}
            fullWidth
            onClick={() => send({ type: "chooseCombatHitMitigation", playerId: me.id, choice: "no_sip" })}
          >
            {secondaryLabel}
          </ArcadeButton>
        </div>
      ) : (
        <div style={{ textAlign: "center", opacity: 0.85 }}>
          {ui.play.waitAttackerChoose(attacker?.name ?? ui.play.theAttacker)}
        </div>
      )}
    </div>
  );
}

