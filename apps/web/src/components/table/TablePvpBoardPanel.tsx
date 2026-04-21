import { memo, useEffect, useLayoutEffect, useState, type CSSProperties } from "react";
import type { GameState, Player } from "@bv/game-core";
import { DiceCube3D } from "../DiceCube3D";
import { sv } from "../../lib/uiStrings";
import { PVP_TABLE_REVEAL_DELAY_MS } from "./tableConstants";
import styles from "./TablePvpBoardPanel.module.css";

/** Samma som serverns BvB-tärnings-tillägg från utrustning (`pvpDieBonus` per del). */
function equipmentPvpDieBonusTotal(p: Player): number {
  const e = p.equipment;
  return (
    (e.weapon?.pvpDieBonus ?? 0) +
    (e.armor?.pvpDieBonus ?? 0) +
    (e.helmet?.pvpDieBonus ?? 0) +
    (e.accessory?.pvpDieBonus ?? 0)
  );
}

/** Föremål + utrustning som påverkar t6-totalen innan (och utan) kastat värde — uppdateras direkt på brädet. */
function pvpTablePreviewAttackMod(state: GameState, playerId: string): number {
  const p = state.players.find((x) => x.id === playerId);
  if (!p) return 0;
  const pend = state.pending?.type === "pvp" ? state.pending : null;
  const item = pend?.pvpAttackMods?.[playerId] ?? 0;
  return item + equipmentPvpDieBonusTotal(p);
}

function TablePvpBoardPanelInner(props: { state: GameState }) {
  const { state } = props;
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
  const bestOf = pending?.bestOf ?? 3;
  const wins = pending?.wins ?? { attacker: 0, defender: 0 };
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
  const showRollingReveal = !!rt && !pvpRevealReady;
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
  }) {
    const rollMod = props2.roll ? props2.roll.total - props2.roll.die : 0;
    const previewMod = props2.previewAttackMod;
    const showPreviewMod = !props2.roll && !props2.showRolling && previewMod !== 0;
    const hasRollMod = props2.roll ? rollMod !== 0 : false;
    const modValue = props2.roll ? rollMod : previewMod;
    const hasMod = props2.roll ? hasRollMod : showPreviewMod;
    const modLabel = modValue > 0 ? `+${modValue}` : `${modValue}`;
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
          <div className={styles.flexCenter}>
            <DiceCube3D key={props2.revealSpinKey ?? "pvp-reveal-spin"} idleSpin size={52} />
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
              <DiceCube3D key={props2.awaitDiceKey} idleSpin size={52} />
            </div>
          </div>
        )}
      </div>
    );
  }

  const attackerPreviewMod = pvpTablePreviewAttackMod(state, attacker.id);
  const defenderPreviewMod = pvpTablePreviewAttackMod(state, defender.id);

  return (
    <div className={styles.overlay}>
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
        <div className={styles.duelTitle}>{sv.table.pvpDuel}</div>
        {awaiting ? (
          <div className={styles.phaseLineMuted}>{sv.table.pvpRoundBestOf(pvpRoundN, bestOf)}</div>
        ) : roundReveal ? (
          <div className={styles.phaseLineGold}>{sv.table.pvpRoundResultPhase}</div>
        ) : preRound ? (
          <div className={styles.phaseLineMuted}>{sv.table.pvpPrepPhase}</div>
        ) : (
          <div className={styles.spacer8} />
        )}
        {awaiting ? (
          <div className={styles.hint16}>{sv.table.pvpRollPhaseHint}</div>
        ) : roundReveal ? (
          <div className={styles.hint16}>{sv.table.pvpRoundResultHint}</div>
        ) : preRound ? (
          <div className={styles.hint16}>{sv.table.pvpPrepPhaseHint}</div>
        ) : (
          <div className={styles.spacerMb8} />
        )}
        <div className={styles.fightersRow}>
          <PvpFighterColumn
            role={sv.table.roleAttacker}
            player={attacker}
            roll={ra}
            nameRotateDeg={-11}
            showRolling={showRollingReveal}
            awaitDiceKey={`pvp-d6-wait-${pvpRoundN}-${attacker.id}`}
            revealSpinKey={revealKey ? `pvp-d6-reveal-${revealKey}-${attacker.id}` : undefined}
            previewAttackMod={attackerPreviewMod}
          />
          <div className={styles.vsBadge}>VS</div>
          <PvpFighterColumn
            role={sv.table.roleDefender}
            player={defender}
            roll={rd}
            nameRotateDeg={11}
            showRolling={showRollingReveal}
            awaitDiceKey={`pvp-d6-wait-${pvpRoundN}-${defender.id}`}
            revealSpinKey={revealKey ? `pvp-d6-reveal-${revealKey}-${defender.id}` : undefined}
            previewAttackMod={defenderPreviewMod}
          />
        </div>
        {rt && pvpRevealReady ? (
          <div className={styles.resultsBlock}>
            <div className={styles.totalsLine}>
              <span className={styles.totalsPlayerName}>{attacker.name}</span>{" "}
              <b>{rt.attackerTotal}</b>
              <span className={styles.dashSep}>—</span>
              <span className={styles.totalsPlayerName}>{defender.name}</span>{" "}
              <b>{rt.defenderTotal}</b>
            </div>
            {pending.winnerId ? (
              <div className={styles.winnerLine}>
                {sv.table.winner}: {state.players.find((p) => p.id === pending.winnerId)?.name ?? "—"}
              </div>
            ) : null}
            {pending.phase === "chooseLoot" ? (
              <div className={styles.smallHint}>{sv.table.winnerChoosesLoot}</div>
            ) : pending.phase === "roundReveal" ? (
              <div className={styles.smallHint}>{sv.table.pvpRoundResultHint}</div>
            ) : null}
          </div>
        ) : null}
        <div className={styles.scoreLine}>{sv.table.pvpScoreLine(wins.attacker, wins.defender)}</div>
      </div>
    </div>
  );
}

export const TablePvpBoardPanel = memo(TablePvpBoardPanelInner);
