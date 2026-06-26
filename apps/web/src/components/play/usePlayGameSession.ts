import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NavigateFunction } from "react-router-dom";
import type { ClientAction, GameState } from "@bv/game-core";
import {
  applyFullGameState,
  applyGameStateDelta,
  createStateSeqTracker,
  resetStateSeqTracker,
} from "../../lib/gameStateWsSync";
import { isGameState } from "../../lib/gameTypes";
import { createLogger } from "../../lib/logger";
import { clearRememberedPlayerId, type ServerMessage } from "../../lib/ws";
import { useWsGameClient } from "../../lib/useWsGameClient";
import { useUiStrings } from "../../lib/locale/LocaleContext";
import { findMe } from "./playSessionHelpers";

export function usePlayGameSession(options: {
  room: string;
  name: string;
  showToast: (message: string, durationMs?: number) => void;
  navigate: NavigateFunction;
}) {
  const ui = useUiStrings();
  const { room, name, showToast, navigate } = options;
  const log = useMemo(() => createLogger("play"), []);

  const [state, setState] = useState<GameState | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const actionBusyRef = useRef(false);
  const actionBusyTimerRef = useRef<number | null>(null);
  const stateSeqTrackerRef = useRef(createStateSeqTracker());
  const requestSnapshotRef = useRef<() => void>(() => undefined);

  const clearActionBusy = useCallback(() => {
    actionBusyRef.current = false;
    setActionBusy(false);
    if (actionBusyTimerRef.current != null) {
      window.clearTimeout(actionBusyTimerRef.current);
      actionBusyTimerRef.current = null;
    }
  }, []);

  const markActionBusy = useCallback(() => {
    actionBusyRef.current = true;
    setActionBusy(true);
    if (actionBusyTimerRef.current != null) window.clearTimeout(actionBusyTimerRef.current);
    actionBusyTimerRef.current = window.setTimeout(() => {
      actionBusyRef.current = false;
      setActionBusy(false);
      actionBusyTimerRef.current = null;
    }, 8000);
  }, []);

  const {
    status,
    clientRef,
    reconnectAttemptN,
    overlayPhase,
    requestReconnect,
    showReconnectOverlay,
  } = useWsGameClient({
    roomCode: room,
    playerName: name,
    as: "controller",
    connectTimeoutMs: 10_000,
    onMessage: (m: ServerMessage) => {
      if (m.type === "helloAck") {
        setMyId(m.playerId);
        setState((prev) => {
          if (!prev) return prev;
          if (prev.players.some((p) => p.id === m.playerId)) return prev;
          return null;
        });
      }
      if (m.type === "error") showToast(m.message);
      if (m.type === "state" && isGameState(m.state)) {
        const next = applyFullGameState(stateSeqTrackerRef.current, m.state, m.seq) ?? m.state;
        setState(next);
        clearActionBusy();
      }
      if (m.type === "stateDelta") {
        setState((prev) =>
          applyGameStateDelta(stateSeqTrackerRef.current, prev, m.seq, m.patch, () =>
            requestSnapshotRef.current(),
          ) ??
          prev,
        );
        clearActionBusy();
      }
      if (m.type === "error") clearActionBusy();
    },
  });

  requestSnapshotRef.current = () => {
    clientRef.current?.send({ type: "requestStateSnapshot" });
  };

  const me = findMe(state, myId);

  useEffect(() => {
    if (status !== "connected" || !state || !myId) return;
    if (state.players.some((p) => p.id === myId)) return;
    setState(null);
  }, [status, state, myId]);

  const iAmEliminated = useMemo(() => {
    if (!state || !myId) return false;
    return !!state.players.find((p) => p.id === myId)?.eliminated;
  }, [state, myId]);

  useEffect(() => {
    if (!iAmEliminated) return;
    clientRef.current?.send({ type: "action", action: { type: "leaveGame" } });
    clearRememberedPlayerId(room);
    navigate("/", { replace: true });
  }, [iAmEliminated, navigate, room, clientRef]);

  const send = useCallback(
    (action: ClientAction) => {
      if (status !== "connected") {
        showToast(ui.play.notConnected);
        log.debug("blocked send; ws status:", status, (action as { type?: string }).type ?? action);
        return;
      }
      if (actionBusyRef.current) {
        log.debug("blocked duplicate action", (action as { type?: string }).type ?? action);
        return;
      }
      markActionBusy();
      log.debug("send action", (action as { type?: string }).type ?? action);
      clientRef.current?.send({ type: "action", action });
    },
    [status, showToast, log, clientRef, markActionBusy],
  );

  useEffect(() => () => clearActionBusy(), [clearActionBusy]);

  useEffect(() => {
    if (status === "connecting") resetStateSeqTracker(stateSeqTrackerRef.current);
  }, [status]);

  const leaveCurrentGame = useCallback(() => {
    clientRef.current?.send({ type: "action", action: { type: "leaveGame" } });
    window.setTimeout(() => {
      clientRef.current?.close();
      clearRememberedPlayerId(room);
      navigate("/", { replace: true });
    }, 90);
  }, [clientRef, room, navigate]);

  return {
    state,
    myId,
    me,
    status,
    clientRef,
    reconnectAttemptN,
    overlayPhase,
    requestReconnect,
    showReconnectOverlay,
    send,
    actionBusy,
    leaveCurrentGame,
  };
}
