import { useEffect, useMemo, useRef } from "react";
import type { GameState } from "@bv/game-core";
import { cardPendingKey, combatSessionKey, type PendingCard } from "../lib/gameSfxSyncHelpers";
import { readBoardPerformancePrefs } from "../lib/boardPerformancePrefs";
import { playTableSfx, primeTableSfx } from "../lib/tableSfx";
import { useGameSfxSync } from "./useGameSfxSync";

/** Spelar SFX lokalt på mobil (/play) för snabbare respons än brädets WS-kedja. */
export function usePlaySfxSync(props: {
  state: GameState | null;
  meId: string | null;
}) {
  const { state, meId } = props;
  const prevPvpRollRef = useRef<string | null>(null);
  const prevPvpRoundRevealRef = useRef<string | null>(null);
  const pvpSfxSessionRef = useRef<string | null>(null);
  const sfxEnabled = readBoardPerformancePrefs().mobileSfxEnabled;

  /** Bakgrundsladdning så första ljudet inte väntar på decode (ingen UI). */
  useEffect(() => {
    if (sfxEnabled) primeTableSfx();
  }, [sfxEnabled]);

  useEffect(() => {
    if (!sfxEnabled) return;
    const primeOnce = () => primeTableSfx();
    window.addEventListener("pointerdown", primeOnce, { once: true, passive: true });
    return () => window.removeEventListener("pointerdown", primeOnce);
  }, [sfxEnabled]);

  const myCardPending = useMemo((): PendingCard | null => {
    if (!state || state.phase !== "playing" || !meId) return null;
    if (state.pending?.type !== "card") return null;
    return state.pending.playerId === meId ? state.pending : null;
  }, [state?.pending, state?.phase, meId]);

  const myCardKey = myCardPending ? cardPendingKey(myCardPending) : null;
  const cardSfxReady = !!myCardPending;

  /** Stridsintro-ljud bara för angriparen (samma som monster-modalen i PlayView). */
  const combatSessionKeyVal = useMemo(() => {
    if (!state || !meId) return null;
    const pend = state.pending;
    if (pend?.type !== "combat" || pend.attackerId !== meId) return null;
    return combatSessionKey(pend);
  }, [state?.pending, meId, state]);

  const combatIntroVisible =
    combatSessionKeyVal != null &&
    state?.pending?.type === "combat" &&
    state.pending.phase === "enemyIntro";

  useGameSfxSync({
    state,
    sfxEnabled: sfxEnabled && !!meId,
    localPlayerId: meId,
    cardOverlay: {
      pendingKey: myCardKey,
      pendingCard: myCardPending,
      visible: !!myCardPending && cardSfxReady,
      modalReady: cardSfxReady,
    },
    combatOverlay: {
      sessionKey: combatSessionKeyVal,
      introVisible: combatIntroVisible,
      monsterOutcomeSfxKey: null,
    },
  });

  useEffect(() => {
    if (!state || !meId || !sfxEnabled) return;

    const sessionKey = `${state.roomCode ?? ""}:${state.phase}`;
    if (pvpSfxSessionRef.current !== sessionKey) {
      pvpSfxSessionRef.current = sessionKey;
      prevPvpRollRef.current = null;
      prevPvpRoundRevealRef.current = null;
    }

    const pvp = state.pending?.type === "pvp" ? state.pending : null;
    if (pvp?.phase === "awaitingRolls" && pvp.rolls?.[meId]) {
      const myRoll = pvp.rolls[meId]!;
      const key = `${pvp.roundNumber ?? 1}:${myRoll.die}:${myRoll.total}`;
      if (key !== prevPvpRollRef.current) {
        prevPvpRollRef.current = key;
        playTableSfx("dieRoll", { enabled: true });
      }
    }

    if (pvp?.phase !== "roundReveal" || !pvp.resolvedTotals) {
      if (pvp?.phase !== "roundReveal") prevPvpRoundRevealRef.current = null;
      return;
    }
    if (pvp.attackerId !== meId && pvp.defenderId !== meId) return;

    const round = pvp.roundNumber ?? pvp.pvpRound ?? 1;
    const rt = pvp.resolvedTotals;
    const revealKey = `${round}:${rt.attackerTotal}:${rt.defenderTotal}:${pvp.winnerId ?? ""}`;
    if (revealKey === prevPvpRoundRevealRef.current) return;
    prevPvpRoundRevealRef.current = revealKey;

    if (rt.attackerTotal === rt.defenderTotal) return;

    const myTotal = meId === pvp.attackerId ? rt.attackerTotal : rt.defenderTotal;
    const oppTotal = meId === pvp.attackerId ? rt.defenderTotal : rt.attackerTotal;
    if (myTotal > oppTotal) {
      playTableSfx("levelUp", { enabled: true });
    } else if (myTotal < oppTotal) {
      playTableSfx("lose", { enabled: true });
    }
  }, [state, meId, sfxEnabled]);
}
