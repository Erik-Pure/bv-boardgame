import { useEffect, useState } from "react";
import { isPlayerActiveInMatch, type ClientAction, type GameState, type ItemUseTarget, type Player } from "@bv/game-core";
import { ArcadeButton } from "../ArcadeButton";
import u from "../../styles/uiPrimitives.module.css";
import { sv } from "../../lib/uiStrings";

export type ItemDetailSelection = {
  instanceId: string;
  /** Förvalt mål när arket öppnas (t.ex. BvB-motståndare vid spill_intentional). */
  initialTargetId?: string | null;
};

export type PlayItemDetailSheetProps = {
  itemDetail: ItemDetailSelection | null;
  onClose: () => void;
  state: GameState;
  me: Player;
  send: (action: ClientAction) => void;
  itemMetaForView: (itemId: string) => { title: string; text: string; target: ItemUseTarget };
  isItemPlayableNow: (itemId: string, target: ItemUseTarget) => boolean;
};

export function PlayItemDetailSheet(props: PlayItemDetailSheetProps) {
  const { itemDetail, onClose, state, me, send, itemMetaForView, isItemPlayableNow } = props;
  const [itemTargetId, setItemTargetId] = useState<string | null>(null);
  const [itemUseTargetPhase, setItemUseTargetPhase] = useState(false);
  const [itemSixSenseFace, setItemSixSenseFace] = useState<number | null>(null);

  useEffect(() => {
    setItemTargetId(itemDetail?.initialTargetId ?? null);
    setItemUseTargetPhase(itemDetail?.initialTargetId != null);
    setItemSixSenseFace(null);
  }, [itemDetail?.instanceId, itemDetail?.initialTargetId]);

  if (!itemDetail || !me || !state) return null;
  const inst = (me.inventory ?? []).find((x) => x.instanceId === itemDetail.instanceId);
  if (!inst) {
    return (
      <ArcadeButton variant="gray" fullWidth onClick={() => onClose()}>
        {sv.play.modalClose}
      </ArcadeButton>
    );
  }
  const meta = itemMetaForView(inst.itemId);
  const passive = meta.target === "passive";
  const broPick = meta.target === "combat_bro";
  const needsTarget = meta.target === "other" || meta.target === "self_or_other" || broPick;
  const healingTargetItem = inst.itemId === "healing_potion" || inst.itemId === "pretzel_snack";
  const canUse = isItemPlayableNow(inst.itemId, meta.target);
  const combatAttackerId = state.pending?.type === "combat" ? state.pending.attackerId : null;
  const pvpDuelOpponentId =
    state.pending?.type === "pvp" &&
    (state.pending.phase === "preRoundItems" || state.pending.phase === "awaitingRolls") &&
    (state.pending.attackerId === me.id || state.pending.defenderId === me.id)
      ? state.pending.attackerId === me.id
        ? state.pending.defenderId
        : state.pending.attackerId
      : null;
  const candidates =
    broPick && combatAttackerId
      ? state.players.filter((p) => p.id !== combatAttackerId && isPlayerActiveInMatch(p))
      : meta.target === "other" && pvpDuelOpponentId
        ? state.players.filter((p) => p.id === pvpDuelOpponentId && isPlayerActiveInMatch(p))
        : meta.target === "other"
          ? state.players.filter((p) => p.id !== me.id && isPlayerActiveInMatch(p))
          : meta.target === "self_or_other"
            ? state.players.filter((p) => p.id === me.id || isPlayerActiveInMatch(p))
            : [];
  const chosen = needsTarget ? (itemTargetId ?? (healingTargetItem ? me.id : null)) : null;
  const targetPrompt = broPick ? sv.play.chooseBeerBroPartner : sv.play.chooseTarget;
  const showTargetPicker = needsTarget && itemUseTargetPhase;
  const needsSixSenseFace = inst.itemId === "six_sense" && canUse;
  const usePrimaryDisabled =
    passive ||
    !canUse ||
    (broPick && !combatAttackerId) ||
    (needsTarget && itemUseTargetPhase && !chosen) ||
    (needsSixSenseFace && itemSixSenseFace == null);
  return (
    <div className={u.stack10}>
      {passive ? (
        <div className={u.itemsHint13}>{sv.play.itemsPassiveHint}</div>
      ) : !canUse ? (
        <div className={u.itemsHint13}>{sv.play.itemsUseHint}</div>
      ) : null}
      {showTargetPicker ? (
        <div className={u.stack8}>
          <div className={u.itemsTarget12}>{targetPrompt}</div>
          <div className={u.stack8}>
            {candidates.map((p) => (
              <ArcadeButton
                key={p.id}
                variant="pink"
                selected={chosen === p.id}
                fullWidth
                onClick={() => setItemTargetId(p.id)}
              >
                {inst.itemId === "split_the_g"
                  ? `${p.name} (+${Math.floor((p.gold ?? 0) / 2)} pant)`
                  : inst.itemId === "shuffle"
                    ? `${p.name} (${(p.inventory ?? []).length} föremål)`
                  : healingTargetItem && p.id === me.id
                    ? "Använd själv"
                    : p.name}
              </ArcadeButton>
            ))}
          </div>
        </div>
      ) : null}
      {needsSixSenseFace ? (
        <div className={u.stack8}>
          <div className={u.itemsTarget12}>{sv.play.itemsChooseDiceFace}</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 8,
            }}
          >
            {([1, 2, 3, 4, 5, 6] as const).map((n) => (
              <ArcadeButton
                key={n}
                variant="pink"
                selected={itemSixSenseFace === n}
                fullWidth
                onClick={() => setItemSixSenseFace(n)}
              >
                {String(n)}
              </ArcadeButton>
            ))}
          </div>
        </div>
      ) : null}
      {passive ? (
        <ArcadeButton variant="gray" fullWidth onClick={() => onClose()}>
          {sv.play.modalClose}
        </ArcadeButton>
      ) : (
        <div className={u.grid2Equal10}>
          <ArcadeButton variant="gray" fullWidth onClick={() => onClose()}>
            {sv.play.modalClose}
          </ArcadeButton>
          <ArcadeButton
            variant="blue"
            fullWidth
            disabled={usePrimaryDisabled}
            onClick={() => {
              if (needsTarget && !itemUseTargetPhase) {
                if (healingTargetItem) setItemTargetId(me.id);
                setItemUseTargetPhase(true);
                return;
              }
              send({
                type: "useItem",
                playerId: me.id,
                instanceId: inst.instanceId,
                targetPlayerId: chosen ?? undefined,
                chosenDieFace:
                  inst.itemId === "six_sense" && typeof itemSixSenseFace === "number"
                    ? itemSixSenseFace
                    : undefined,
              });
              onClose();
            }}
          >
            {sv.play.use}
          </ArcadeButton>
        </div>
      )}
    </div>
  );
}
