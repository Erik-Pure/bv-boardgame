import type { GameState } from "@bv/game-core";
import { isGameState, mergeGameStateDelta } from "./gameTypes";

export type StateSeqTracker = {
  lastSeq: number | null;
};

export function createStateSeqTracker(): StateSeqTracker {
  return { lastSeq: null };
}

export function resetStateSeqTracker(tracker: StateSeqTracker): void {
  tracker.lastSeq = null;
}

export function applyFullGameState(
  tracker: StateSeqTracker,
  state: unknown,
  seq?: number,
): GameState | null {
  if (!isGameState(state)) return null;
  if (typeof seq === "number" && Number.isFinite(seq)) {
    tracker.lastSeq = Math.max(0, Math.floor(seq));
  }
  return state;
}

export function applyGameStateDelta(
  tracker: StateSeqTracker,
  prev: GameState | null,
  seq: number,
  patch: unknown,
  onSeqGap: () => void,
): GameState | null {
  const safeSeq = Math.max(0, Math.floor(seq));
  if (tracker.lastSeq != null) {
    if (safeSeq <= tracker.lastSeq) return prev;
    if (safeSeq !== tracker.lastSeq + 1) {
      onSeqGap();
      return prev;
    }
  }
  tracker.lastSeq = safeSeq;
  return mergeGameStateDelta(prev, patch);
}
