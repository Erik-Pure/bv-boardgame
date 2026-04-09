import { useCallback, useEffect, useRef, useState } from "react";
import { createClient, type ServerMessage, type WsStatus } from "./ws";

/** Första stegen korta — mobil / bakgrund kan pausa timers; pageshow/online kompletterar. */
const RECONNECT_DELAYS_MS = [800, 1500, 2500, 4000, 6000, 8000, 8000, 8000];

export type WsOverlayPhase = "connecting" | "waiting_retry";

type Args = {
  roomCode: string;
  playerName: string;
  as: "table" | "controller";
  config?: { turnSeconds?: number; gameMode?: "bossKill" };
  connectTimeoutMs?: number;
  onMessage: (m: ServerMessage) => void;
};

/**
 * WebSocket med automatiska återförsök (ökande väntan) efter fel/stängning.
 * Kompletterar med: visibility/pageshow/online + manuell requestReconnect (t.ex. mobil).
 */
export function useWsGameClient(args: Args) {
  const [status, setStatus] = useState<WsStatus>("connecting");
  const [reconnectGen, setReconnectGen] = useState(0);
  const [reconnectAttemptN, setReconnectAttemptN] = useState(0);
  const [overlayPhase, setOverlayPhase] = useState<WsOverlayPhase>("connecting");
  /** Undvik spinner-flimmer vid snabb helloAck — visa "Ansluter" först efter en kort stund. */
  const [showHandshakeOverlay, setShowHandshakeOverlay] = useState(false);

  const intentionalCloseRef = useRef(false);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);
  const onMessageRef = useRef(args.onMessage);
  onMessageRef.current = args.onMessage;
  const prevIdentityRef = useRef("");

  /** Senaste status för event-listeners (undvik stängda över closures). */
  const statusRef = useRef<WsStatus>(status);
  statusRef.current = status;

  /** Tidpunkt när fliken gick i bakgrund — för att tvinga ny socket efter lång frånvaro (mobil zombie-TCP). */
  const hiddenAtRef = useRef(0);

  const configKey =
    args.config == null ? "" : `${args.config.gameMode ?? ""}-${args.config.turnSeconds ?? ""}`;

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current != null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  /** Ny socket direkt (städar timer + stänger via effect cleanup). */
  const requestReconnect = useCallback(() => {
    clearReconnectTimer();
    setReconnectGen((g) => g + 1);
  }, [clearReconnectTimer]);

  useEffect(() => {
    const identity = `${args.roomCode}|${args.playerName}|${args.as}|${configKey}`;
    if (prevIdentityRef.current !== identity) {
      prevIdentityRef.current = identity;
      reconnectAttemptRef.current = 0;
      setReconnectAttemptN(0);
    }

    intentionalCloseRef.current = false;

    clearReconnectTimer();
    setOverlayPhase("connecting");
    setStatus("connecting");

    const scheduleReconnect = () => {
      if (intentionalCloseRef.current || reconnectTimerRef.current != null) return;
      reconnectAttemptRef.current += 1;
      setReconnectAttemptN(reconnectAttemptRef.current);
      setStatus("disconnected");
      setOverlayPhase("waiting_retry");
      const idx = Math.min(reconnectAttemptRef.current - 1, RECONNECT_DELAYS_MS.length - 1);
      const delay = RECONNECT_DELAYS_MS[idx]!;
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        if (intentionalCloseRef.current) return;
        setReconnectGen((g) => g + 1);
      }, delay);
    };

    const handleStatus = (s: WsStatus) => {
      setStatus(s);
      if (s === "connected") {
        reconnectAttemptRef.current = 0;
        setReconnectAttemptN(0);
        setOverlayPhase("connecting");
        return;
      }
      if (s === "disconnected" && !intentionalCloseRef.current) {
        scheduleReconnect();
      }
    };

    const client = createClient({
      roomCode: args.roomCode,
      playerName: args.playerName,
      as: args.as,
      config: args.config,
      connectTimeoutMs: args.connectTimeoutMs,
      onStatus: handleStatus,
      onMessage: (m) => onMessageRef.current(m),
    });
    clientRef.current = client;

    return () => {
      intentionalCloseRef.current = true;
      clearReconnectTimer();
      client.close();
      clientRef.current = null;
    };
  }, [
    args.roomCode,
    args.playerName,
    args.as,
    args.connectTimeoutMs,
    configKey,
    reconnectGen,
    clearReconnectTimer,
  ]);

  /**
   * Mobil: timers pausas i bakgrund; TCP kan vara OPEN utan att data rör sig (ingen onclose).
   * Efter längre frånvaro: alltid ny socket (utom mitt i CONNECTING).
   */
  useEffect(() => {
    const BG_RECONNECT_MS = 5000;

    const maybeHardReconnect = () => {
      const c = clientRef.current;
      const ready = c?.getReadyState() ?? WebSocket.CLOSED;
      const st = statusRef.current;

      // Pågående TCP-handshake — aldrig avbryt (annars flimmer / evig omstart).
      if (ready === WebSocket.CONNECTING) return;

      if (ready === WebSocket.OPEN) {
        // helloAck kan komma strax efter onopen; status kan fortfarande vara "connecting"
        if (st === "connecting") return;
        if (st !== "connected") requestReconnect();
        return;
      }

      // Stängd/stänger: återuppta om vi tror oss vara uppkopplade eller väntar på retry
      if (st === "connected" || st === "disconnected") {
        requestReconnect();
        return;
      }
      if (st === "connecting" && (ready === WebSocket.CLOSED || ready === WebSocket.CLOSING)) {
        requestReconnect();
      }
    };

    /** Efter bakgrund: omstart bara om vi inte redan är inloggade på en öppen socket (annars flimmrar spinnern vid varje resume). */
    const reconnectAfterLongBackground = () => {
      const c = clientRef.current;
      const ready = c?.getReadyState() ?? WebSocket.CLOSED;
      const st = statusRef.current;
      if (ready === WebSocket.CONNECTING) return;
      if (ready === WebSocket.OPEN && st === "connected") return;
      requestReconnect();
    };

    const reconnectAfterBfCache = () => {
      const c = clientRef.current;
      const ready = c?.getReadyState() ?? WebSocket.CLOSED;
      if (ready === WebSocket.CONNECTING) return;
      requestReconnect();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }
      const awayMs = hiddenAtRef.current > 0 ? Date.now() - hiddenAtRef.current : 0;
      hiddenAtRef.current = 0;
      window.setTimeout(() => {
        if (awayMs >= BG_RECONNECT_MS) {
          reconnectAfterLongBackground();
        } else {
          maybeHardReconnect();
        }
      }, 50);
    };

    const onOnline = () => {
      maybeHardReconnect();
    };

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.setTimeout(() => reconnectAfterBfCache(), 0);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", onOnline);
    window.addEventListener("pageshow", onPageShow as EventListener);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pageshow", onPageShow as EventListener);
    };
  }, [requestReconnect]);

  useEffect(() => {
    if (status !== "connecting") {
      setShowHandshakeOverlay(false);
      return;
    }
    const t = window.setTimeout(() => setShowHandshakeOverlay(true), 280);
    return () => window.clearTimeout(t);
  }, [status, reconnectGen]);

  const showReconnectOverlay =
    status === "disconnected" ||
    overlayPhase === "waiting_retry" ||
    (status === "connecting" && showHandshakeOverlay);

  return {
    status,
    reconnectAttemptN,
    overlayPhase,
    clientRef,
    requestReconnect,
    showReconnectOverlay,
  };
}
