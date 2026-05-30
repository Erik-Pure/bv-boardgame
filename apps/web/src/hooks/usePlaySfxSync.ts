import { useEffect, useMemo, useRef } from "react";
import type { GameState } from "@bv/game-core";
import {
  cardPendingKey,
  combatSessionKey,
  isCombatParticipant,
  type PendingCard,
} from "../lib/gameSfxSyncHelpers";
import { readBoardPerformancePrefs } from "../lib/boardPerformancePrefs";
import { playTableSfx } from "../lib/tableSfx";
import { useGameSfxSync } from "./useGameSfxSync";

/** Spelar SFX lokalt på mobil (/play) för snabbare respons än brädets WS-kedja. */
export function usePlaySfxSync(props: {
  state: GameState | null;
  meId: string | null;
}) {
  const { state, meId } = props;
  const prevPvpRollRef = useRef<string | null>(null);
  const sfxEnabled = readBoardPerformancePrefs().mobileSfxEnabled;

  const myCardPending = useMemo((): PendingCard | null => {
    if (!state || state.phase !== "playing" || !meId) return null;
    if (state.pending?.type !== "card") return null;
    return state.pending.playerId === meId ? state.pending : null;
  }, [state?.pending, state?.phase, meId]);

  const myCardKey = myCardPending ? cardPendingKey(myCardPending) : null;
  const cardSfxReady = !!myCardPending;

  const combatSessionKeyVal = useMemo(() => {
    if (!state || !meId) return null;
    const pend = state.pending;
    if (pend?.type !== "combat" || !isCombatParticipant(pend, meId)) return null;
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

    const pvp = state.pending?.type === "pvp" ? state.pending : null;
    if (pvp?.phase === "awaitingRolls" && pvp.rolls?.[meId]) {
      const myRoll = pvp.rolls[meId]!;
      const key = `${pvp.roundNumber ?? 1}:${myRoll.die}:${myRoll.total}`;
      if (key !== prevPvpRollRef.current) {
        prevPvpRollRef.current = key;
        playTableSfx("dieRoll", { enabled: true });
      }
    }
  }, [state, meId, sfxEnabled]);
}
