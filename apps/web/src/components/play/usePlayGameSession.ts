import { useCallback, useEffect, useMemo, useState } from "react";
import type { NavigateFunction } from "react-router-dom";
import type { ClientAction, GameState } from "@bv/game-core";
import { isGameState, mergeGameStateDelta } from "../../lib/gameTypes";
import { createLogger } from "../../lib/logger";
import { clearRememberedPlayerId, type ServerMessage } from "../../lib/ws";
import { useWsGameClient } from "../../lib/useWsGameClient";
import { sv } from "../../lib/uiStrings";
import { findMe } from "./playSessionHelpers";

export function usePlayGameSession(options: {
  room: string;
  name: string;
  showToast: (message: string, durationMs?: number) => void;
  navigate: NavigateFunction;
}) {
  const { room, name, showToast, navigate } = options;
  const log = useMemo(() => createLogger("play"), []);

  const [state, setState] = useState<GameState | null>(null);
  const [myId, setMyId] = useState<string | null>(null);

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
        setState(m.state);
      }
      if (m.type === "stateDelta") {
        setState((prev) => mergeGameStateDelta(prev, m.patch));
      }
    },
  });

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
        showToast(sv.play.notConnected);
        log.debug("blocked send; ws status:", status, (action as { type?: string }).type ?? action);
        return;
      }
      log.debug("send action", (action as { type?: string }).type ?? action);
      clientRef.current?.send({ type: "action", action });
    },
    [status, showToast, log, clientRef],
  );

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
    leaveCurrentGame,
  };
}
