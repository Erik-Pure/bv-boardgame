import { useEffect, useRef } from "react";
import type { GameState } from "@bv/game-core";
import { clearTableSfxQueue, playTableSfx } from "../lib/tableSfx";
import { readBoardPerformancePrefs } from "../lib/boardPerformancePrefs";

/** Spelar SFX lokalt på mobil (/play) för snabbare respons än brädets WS-kedja. */
export function usePlaySfxSync(props: {
  state: GameState | null;
  meId: string | null;
}) {
  const { state, meId } = props;
  const prevRollRef = useRef<string | null>(null);
  const prevPvpRollRef = useRef<string | null>(null);

  useEffect(() => {
    if (!state || !meId) return;
    const prefs = readBoardPerformancePrefs();
    if (!prefs.mobileSfxEnabled) return;

    const rollKey =
      state.lastDiceRollerId === meId && typeof state.lastDiceRoll === "number"
        ? `${state.lastDiceRoll}:${state.logSeq ?? 0}`
        : null;
    if (rollKey && rollKey !== prevRollRef.current) {
      prevRollRef.current = rollKey;
      playTableSfx("roll", { enabled: true });
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

    return () => {
      if (!state) clearTableSfxQueue();
    };
  }, [state, meId]);
}
