import { memo, useEffect, useLayoutEffect, useState, type CSSProperties } from "react";
import type { GameState } from "@bv/game-core";
import { DiceCube3D } from "../DiceCube3D";
import { sv } from "../../lib/uiStrings";
import { PVP_TABLE_REVEAL_DELAY_MS } from "./tableConstants";
import { useTableOverlayContentScale } from "../../lib/tablePresentationScale";
import styles from "./TablePvpBoardPanel.module.css";

/** Föremål + utrustning som påverkar t6-totalen — uppdelat för tydlighet på brädet. */
function pvpTablePreviewAttackParts(state: GameState, playerId: string): { equipment: number; items: number } {
  const p = state.players.find((x) => x.id === playerId);
  if (!p) return { equipment: 0, items: 0 };
  const pend = state.pending?.type === "pvp" ? state.pending : null;
  const items = pend?.pvpAttackMods?.[playerId] ?? 0;
  const e = p.equipment;
  const equipment =
    (e.weapon?.pvpDieBonus ?? 0) +
    (e.armor?.pvpDieBonus ?? 0) +
    (e.helmet?.pvpDieBonus ?? 0) +
    (e.accessory?.pvpDieBonus ?? 0) +
    (p.brewerPvpBonus ?? 0);
  return { equipment, items };
}

function TablePvpBoardPanelInner(props: { state: GameState; boardAnimationsEnabled?: boolean }) {
  const { state, boardAnimationsEnabled = true } = props;
  const overlayScale = useTableOverlayContentScale();
  const pending = state.pending?.type === "pvp" ? state.pending : null;
  const attacker = pending ? state.players.find((p) => p.id === pending.attackerId) : undefined;
  const defender = pending ? state.players.find((p) => p.id === pending.defenderId) : undefined;
  const ra = pending?.rolls?.[pending?.attackerId];
  const rd = pending?.rolls?.[pending?.defenderId];
  const rt = pending?.resolvedTotals;
  const pvpRoundN = pending?.roundNumber ?? pending?.pvpRound ?? 1;
  const awaiting = pending?.phase === "awaitingRolls";
  const roundReveal = pending?.phase === "roundReveal";
  const preRound = pending?.phase === "preRoundItems";
  const chooseLoot = pending?.phase === "chooseLoot";
  /** Tärningar snurrar bara medan spelare väntar på kast — inte efter avgjord rond/match. */
  const diceMaySpin = awaiting && boardAnimationsEnabled;
  const bestOf = pending?.bestOf ?? 1;
  const showPvpMatchMeta = bestOf > 1;
  const wins = pending?.wins ?? { attacker: 0, defender: 0 };
  const tieRound = !!rt && rt.attackerTotal === rt.defenderTotal;
  const revealKey =
    pending && rt
      ? `${pending.attackerId}:${pending.defenderId}:${pvpRoundN}:${rt.attackerTotal}:${rt.defenderTotal}`
      : null;
  const [pvpRevealReady, setPvpRevealReady] = useState(true);
  /** Synka *före* paint så första bildrutan med `resolvedTotals` inte visar sluttärning utan snurr (`pvpRevealReady` hann vara true). */
  useLayoutEffect(() => {
    if (!revealKey) {
      setPvpRevealReady(true);
      return;
    }
    setPvpRevealReady(false);
  }, [revealKey]);
  useEffect(() => {
    if (!revealKey) return;
    const t = window.setTimeout(() => setPvpRevealReady(true), PVP_TABLE_REVEAL_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [revealKey]);
  const showRollingReveal = roundReveal && !!rt && !pvpRevealReady;
  const attackerHasRoll = !!ra;
  const defenderHasRoll = !!rd;
  const attackerShowRolling = (awaiting && !attackerHasRoll) || (showRollingReveal && !attackerHasRoll);
  const defenderShowRolling = (awaiting && !defenderHasRoll) || (showRollingReveal && !defenderHasRoll);
  if (!pending || !attacker || !defender) return null;

  function PvpFighterColumn(props2: {
    role: string;
    player: (typeof state.players)[0];
    roll: { die: number; total: number } | undefined;
    nameRotateDeg: number;
    showRolling: boolean;
    /** Remount idle-tärning per rond så CSS-animationen alltid startar om (annars kan samma fiber se “stilla” ut en stund). */
    awaitDiceKey: string;
    revealSpinKey?: string;
    /** Live +X / −X bredvid tärning före kast (föremål + utrustning BvB). */
    previewAttackMod: number;
    previewEquipmentMod?: number;
    previewItemMod?: number;
    diceSpinning: boolean;
  }) {
    const rollMod = props2.roll ? props2.roll.total - props2.roll.die : 0;
    const previewMod = props2.previewAttackMod;
    const showPreviewMod = !props2.roll && previewMod !== 0;
    const hasRollMod = props2.roll ? rollMod !== 0 : false;
    const modValue = props2.roll ? rollMod : previewMod;
    const hasMod = props2.roll ? hasRollMod : showPreviewMod;
    const modLabel = modValue > 0 ? `+${modValue}` : `${modValue}`;
    const breakdown =
      props2.previewEquipmentMod != null &&
      props2.previewItemMod != null &&
      (props2.previewEquipmentMod !== 0 || props2.previewItemMod !== 0) ? (
        <div className={styles.smallHint} style={{ fontSize: 11, opacity: 0.85 }}>
          {props2.previewEquipmentMod !== 0
            ? `utr ${props2.previewEquipmentMod > 0 ? "+" : ""}${props2.previewEquipmentMod}`
            : null}
          {props2.previewEquipmentMod !== 0 && props2.previewItemMod !== 0 ? " · " : null}
          {props2.previewItemMod !== 0
            ? `kort ${props2.previewItemMod > 0 ? "+" : ""}${props2.previewItemMod}`
            : null}
        </div>
      ) : null;
    return (
      <div className={styles.fighterCol}>
        <div className={styles.roleLabel}>{props2.role}</div>
        <div
          className={styles.playerName}
          style={{
            transform: `rotate(${props2.nameRotateDeg}deg)`,
          }}
        >
          {props2.player.name}
        </div>
        {props2.showRolling ? (
          <div className={styles.flexCenterGap10}>
            {hasMod ? (
              <div
                className={`${styles.rollMod} ${modValue > 0 ? styles.rollModPos : styles.rollModNeg}`}
              >
                {modLabel}
              </div>
            ) : null}
            <div className={styles.flexCenter}>
            <DiceCube3D
              key={props2.revealSpinKey ?? "pvp-reveal-spin"}
              idleSpin
              spinning={props2.diceSpinning}
              size={52}
            />
            </div>
          </div>
        ) : props2.roll ? (
          <div className={styles.flexCenterGap10}>
            {hasMod ? (
              <div
                className={`${styles.rollMod} ${modValue > 0 ? styles.rollModPos : styles.rollModNeg}`}
              >
                {modLabel}
              </div>
            ) : null}
            <div className={styles.flexCenter}>
              <DiceCube3D value={props2.roll.die} size={52} />
            </div>
          </div>
        ) : (
          <div className={styles.flexCenterGap10}>
            {hasMod ? (
              <div
                className={`${styles.rollMod} ${modValue > 0 ? styles.rollModPos : styles.rollModNeg}`}
              >
                {modLabel}
              </div>
            ) : null}
            <div className={styles.flexCenter}>
              <DiceCube3D key={props2.awaitDiceKey} idleSpin spinning={props2.diceSpinning} size={52} />
            </div>
          </div>
        )}
        {breakdown}
      </div>
    );
  }

  const attackerParts = pvpTablePreviewAttackParts(state, attacker.id);
  const defenderParts = pvpTablePreviewAttackParts(state, defender.id);
  const attackerPreviewMod = attackerParts.equipment + attackerParts.items;
  const defenderPreviewMod = defenderParts.equipment + defenderParts.items;

  const panelInner = (
    <div
      className={styles.panel}
      style={
        {
          ["--pvp-c-attacker" as string]: attacker.color,
          ["--pvp-c-defender" as string]: defender.color,
        } as CSSProperties
      }
    >
        <div className={styles.subtitle}>{sv.table.pvpSubtitle}</div>
        {showPvpMatchMeta ? (
          <div
            className={styles.duelTitleRow}
            aria-label={sv.table.pvpScoreLine(wins.attacker, wins.defender)}
          >
            <div className={`${styles.scoreNumber} ${styles.scoreNumberAttacker}`}>{wins.attacker}</div>
            <div className={styles.duelTitle}>{sv.table.pvpDuel}</div>
            <div className={`${styles.scoreNumber} ${styles.scoreNumberDefender}`}>{wins.defender}</div>
          </div>
        ) : (
          <div className={styles.duelTitleRowSingle}>
            <div className={styles.duelTitle}>{sv.table.pvpDuel}</div>
          </div>
        )}
        {awaiting && showPvpMatchMeta ? (
          <div className={styles.phaseLineMuted}>{sv.table.pvpRoundBestOf(pvpRoundN, bestOf)}</div>
        ) : roundReveal ? (
          <div className={styles.phaseLineGold}>{sv.table.pvpRoundResultPhase}</div>
        ) : preRound ? (
          <div className={styles.phaseLineMuted}>{sv.table.pvpPrepPhase}</div>
        ) : chooseLoot ? (
          <div className={styles.phaseLineGold}>{sv.table.winnerChoosesLoot}</div>
        ) : (
          <div className={styles.spacer8} />
        )}
        {awaiting ? (
          <div className={styles.hint16}>{sv.table.pvpRollPhaseHint}</div>
        ) : roundReveal ? (
          <div className={styles.hint16}>{tieRound ? sv.table.pvpTieRerollHint : sv.table.pvpRoundResultHint}</div>
        ) : preRound ? (
          <div className={styles.hint16}>{sv.table.pvpPrepPhaseHint}</div>
        ) : chooseLoot ? (
          <div className={styles.spacerMb8} />
        ) : (
          <div className={styles.spacerMb8} />
        )}
        <div className={styles.fightersRow}>
          <PvpFighterColumn
            role={sv.table.roleAttacker}
            player={attacker}
            roll={ra}
            nameRotateDeg={-11}
            showRolling={attackerShowRolling}
            awaitDiceKey={`pvp-d6-wait-${pvpRoundN}-${attacker.id}`}
            revealSpinKey={revealKey ? `pvp-d6-reveal-${revealKey}-${attacker.id}` : undefined}
            previewAttackMod={attackerPreviewMod}
            previewEquipmentMod={attackerParts.equipment}
            previewItemMod={attackerParts.items}
            diceSpinning={diceMaySpin}
          />
          <div className={styles.vsBadge}>VS</div>
          <PvpFighterColumn
            role={sv.table.roleDefender}
            player={defender}
            roll={rd}
            nameRotateDeg={11}
            showRolling={defenderShowRolling}
            awaitDiceKey={`pvp-d6-wait-${pvpRoundN}-${defender.id}`}
            revealSpinKey={revealKey ? `pvp-d6-reveal-${revealKey}-${defender.id}` : undefined}
            previewAttackMod={defenderPreviewMod}
            previewEquipmentMod={defenderParts.equipment}
            previewItemMod={defenderParts.items}
            diceSpinning={diceMaySpin}
          />
        </div>
        {rt && pvpRevealReady ? (
          <div className={styles.resultsBlock}>
            {pending.winnerId ? (
              <div className={styles.winnerLine}>
                {sv.table.winner}: {state.players.find((p) => p.id === pending.winnerId)?.name ?? "—"}
              </div>
            ) : null}
            {pending.phase === "chooseLoot" ? (
              <div className={styles.smallHint}>{sv.table.winnerChoosesLoot}</div>
            ) : null}
          </div>
        ) : null}
    </div>
  );

  return (
    <div className={styles.overlay}>
      {overlayScale !== 1 ? (
        <div
          style={{
            transform: `scale(${overlayScale})`,
            transformOrigin: "top center",
            width: "100%",
            display: "grid",
            justifyItems: "center",
          }}
        >
          {panelInner}
        </div>
      ) : (
        panelInner
      )}
    </div>
  );
}

export const TablePvpBoardPanel = memo(TablePvpBoardPanelInner);
