import { useEffect, useLayoutEffect, useState } from "react";
import type { GameState } from "@bv/game-core";
import { DiceCube3D } from "../DiceCube3D";
import { sv } from "../../lib/uiStrings";
import { PVP_TABLE_REVEAL_DELAY_MS, PVP_MARKER } from "./tableConstants";

export function TablePvpBoardPanel(props: { state: GameState }) {
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
  }) {
    const rollMod = props2.roll ? props2.roll.total - props2.roll.die : 0;
    const hasRollMod = rollMod !== 0;
    const modLabel = rollMod > 0 ? `+${rollMod}` : `${rollMod}`;
    return (
      <div
        style={{
          flex: "1 1 140px",
          minWidth: 0,
          maxWidth: 280,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          padding: "8px 4px",
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", opacity: 0.72 }}>{props2.role}</div>
        <div
          style={{
            fontFamily: PVP_MARKER,
            fontSize: "clamp(22px, 4.2vw, 34px)",
            lineHeight: 1.05,
            color: props2.player.color,
            transform: `rotate(${props2.nameRotateDeg}deg)`,
            textAlign: "center",
            wordBreak: "break-word",
          }}
        >
          {props2.player.name}
        </div>
        {props2.showRolling ? (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <DiceCube3D key={props2.revealSpinKey ?? "pvp-reveal-spin"} idleSpin size={52} />
          </div>
        ) : props2.roll ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}>
            {hasRollMod ? (
              <div
                style={{
                  fontFamily: PVP_MARKER,
                  fontSize: "clamp(26px, 4.8vw, 38px)",
                  lineHeight: 1,
                  color: rollMod > 0 ? "#86efac" : "#fca5a5",
                  textShadow: "0 0 20px rgba(0,0,0,0.5)",
                }}
              >
                {modLabel}
              </div>
            ) : null}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <DiceCube3D value={props2.roll.die} size={52} />
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <DiceCube3D key={props2.awaitDiceKey} idleSpin size={52} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 43,
        display: "grid",
        placeItems: "start center",
        paddingTop: 22,
        paddingLeft: 12,
        paddingRight: 12,
      }}
    >
      <div
        style={{
          width: "min(760px, 96vw)",
          borderRadius: 20,
          border: "2px solid rgba(251, 191, 36, 0.5)",
          background: "linear-gradient(165deg, rgba(36, 20, 52, 0.97), rgba(11, 18, 38, 0.98))",
          padding: 22,
          textAlign: "center",
          boxShadow: "0 24px 64px rgba(0,0,0,0.55), 0 0 48px rgba(251, 191, 36, 0.12)",
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", opacity: 0.65, marginBottom: 4 }}>
          {sv.table.pvpSubtitle}
        </div>
        <div
          style={{
            fontFamily: PVP_MARKER,
            fontSize: "clamp(36px, 7vw, 52px)",
            lineHeight: 1.05,
            marginBottom: 6,
            color: "#fef9c3",
            textShadow: "0 0 28px rgba(251, 191, 36, 0.35)",
          }}
        >
          {sv.table.pvpDuel}
        </div>
        {awaiting ? (
          <div
            style={{
              fontFamily: PVP_MARKER,
              fontSize: "clamp(16px, 3.2vw, 22px)",
              color: "rgba(255,255,255,0.88)",
              marginBottom: 8,
            }}
          >
            {sv.table.pvpRoundBestOf(pvpRoundN, bestOf)}
          </div>
        ) : roundReveal ? (
          <div
            style={{
              fontFamily: PVP_MARKER,
              fontSize: "clamp(16px, 3.2vw, 22px)",
              color: "rgba(254, 240, 138, 0.95)",
              marginBottom: 8,
            }}
          >
            {sv.table.pvpRoundResultPhase}
          </div>
        ) : preRound ? (
          <div
            style={{
              fontFamily: PVP_MARKER,
              fontSize: "clamp(16px, 3.2vw, 22px)",
              color: "rgba(255,255,255,0.88)",
              marginBottom: 8,
            }}
          >
            {sv.table.pvpPrepPhase}
          </div>
        ) : (
          <div style={{ height: 8 }} />
        )}
        {awaiting ? (
          <div style={{ marginBottom: 16, fontSize: 13, fontWeight: 600, opacity: 0.82 }}>{sv.table.pvpRollPhaseHint}</div>
        ) : roundReveal ? (
          <div style={{ marginBottom: 16, fontSize: 13, fontWeight: 600, opacity: 0.82 }}>{sv.table.pvpRoundResultHint}</div>
        ) : preRound ? (
          <div style={{ marginBottom: 16, fontSize: 13, fontWeight: 600, opacity: 0.82 }}>{sv.table.pvpPrepPhaseHint}</div>
        ) : (
          <div style={{ marginBottom: 8 }} />
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          <PvpFighterColumn
            role={sv.table.roleAttacker}
            player={attacker}
            roll={ra}
            nameRotateDeg={-11}
            showRolling={showRollingReveal}
            awaitDiceKey={`pvp-d6-wait-${pvpRoundN}-${attacker.id}`}
            revealSpinKey={revealKey ? `pvp-d6-reveal-${revealKey}-${attacker.id}` : undefined}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: PVP_MARKER,
              fontSize: "clamp(32px, 6vw, 44px)",
              lineHeight: 1,
              color: "#fff",
              opacity: 0.92,
              padding: "0 2px",
              flex: "0 0 auto",
            }}
          >
            VS
          </div>
          <PvpFighterColumn
            role={sv.table.roleDefender}
            player={defender}
            roll={rd}
            nameRotateDeg={11}
            showRolling={showRollingReveal}
            awaitDiceKey={`pvp-d6-wait-${pvpRoundN}-${defender.id}`}
            revealSpinKey={revealKey ? `pvp-d6-reveal-${revealKey}-${defender.id}` : undefined}
          />
        </div>
        {rt && pvpRevealReady ? (
          <div
            style={{
              marginTop: 18,
              paddingTop: 16,
              borderTop: "1px solid #ffffff22",
              fontSize: 16,
            }}
          >
            <div style={{ marginBottom: 10 }}>
              <span style={{ color: attacker.color, fontWeight: 800 }}>{attacker.name}</span> <b>{rt.attackerTotal}</b>
              <span style={{ opacity: 0.4, margin: "0 8px" }}>—</span>
              <span style={{ color: defender.color, fontWeight: 800 }}>{defender.name}</span> <b>{rt.defenderTotal}</b>
            </div>
            {pending.winnerId ? (
              <div style={{ fontWeight: 800, fontSize: 18, color: "#fef08a" }}>
                {sv.table.winner}: {state.players.find((p) => p.id === pending.winnerId)?.name ?? "—"}
              </div>
            ) : null}
            {pending.phase === "chooseLoot" ? (
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.72 }}>{sv.table.winnerChoosesLoot}</div>
            ) : pending.phase === "roundReveal" ? (
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.72 }}>{sv.table.pvpRoundResultHint}</div>
            ) : null}
          </div>
        ) : null}
        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>
          {sv.table.pvpScoreLine(wins.attacker, wins.defender)}
        </div>
      </div>
    </div>
  );
}

