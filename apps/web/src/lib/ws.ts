import { createLogger } from "./logger";
import type { GameConfig } from "@bv/game-core";

const log = createLogger("ws");

export type WsStatus = "disconnected" | "connecting" | "connected";

export type ServerMessage =
  | { type: "helloAck"; playerId: string; roomCode: string }
  | { type: "state"; state: unknown; seq?: number }
  | { type: "stateDelta"; seq: number; patch: unknown }
  | { type: "error"; message: string };

function storageKey(roomCode: string): string {
  return `bv:playerId:${roomCode.toUpperCase()}`;
}

export function clearRememberedPlayerId(roomCode: string): void {
  try {
    window.sessionStorage.removeItem(storageKey(roomCode));
  } catch {
    // ignore
  }
}

function getRememberedPlayerId(roomCode: string): string | null {
  // sessionStorage är per-flik → låter dig testa flera spelare i samma browser.
  try {
    return window.sessionStorage.getItem(storageKey(roomCode));
  } catch {
    return null;
  }
}

function rememberPlayerId(roomCode: string, playerId: string): void {
  try {
    window.sessionStorage.setItem(storageKey(roomCode), playerId);
  } catch {
    // ignore
  }
}

export function wsUrl(): string {
  // ?ws=… tvingar annan WebSocket-URL (t.ex. wss://…)
  try {
    const u = new URL(window.location.href);
    const qp = u.searchParams.get("ws");
    if (qp) {
      const t = decodeURIComponent(qp.trim());
      if (t) return t;
    }
  } catch {
    // ignore
  }
  const fromEnv = import.meta.env.VITE_WS_URL as string | undefined;
  if (fromEnv) return fromEnv;

  const proto = window.location.protocol === "https:" ? "wss" : "ws";

  /**
   * `npm run dev`: Vite proxar `ws(s)://…/bv-ws` → spelserver (vite.config).
   * Direkt `ws://…:3001` funkar ofta lokalt men blockeras ofta från mobil/LAN (brandvägg).
   */
  if (typeof window !== "undefined" && import.meta.env.DEV && window.location.port === "5173") {
    return `${proto}://${window.location.host}/bv-ws`;
  }

  /** Produktion / preview: samma värd som sidan, spelserver på 3001. */
  const host = window.location.hostname === "localhost" ? "127.0.0.1" : window.location.hostname;
  return `${proto}://${host}:3001`;
}

export function createClient(params: {
  roomCode: string;
  playerName: string;
  as: "table" | "controller";
  config?: Partial<GameConfig>;
  onMessage: (msg: ServerMessage) => void;
  onStatus: (s: WsStatus) => void;
  /** Standard 15s; kortare värde ger snabbare återförsök vid dåligt nät (t.ex. mobil). */
  connectTimeoutMs?: number;
}): {
  send: (payload: unknown) => void;
  close: () => void;
  /** WebSocket.CONNECTING | OPEN | CLOSING | CLOSED — för mobil / visibility-kontroller */
  getReadyState: () => number;
} {
  const url = wsUrl();
  params.onStatus("connecting");
  const ws = new WebSocket(url);
  const rememberedId = params.as === "controller" ? getRememberedPlayerId(params.roomCode) : null;

  const connectTimeoutMs = params.connectTimeoutMs ?? 15000;
  let helloAcked = false;
  let actionSeq = 0;
  let handshakeTimeoutId: number | null = null;

  const clearHandshakeTimeout = () => {
    if (handshakeTimeoutId != null) {
      window.clearTimeout(handshakeTimeoutId);
      handshakeTimeoutId = null;
    }
  };

  const timeoutId = window.setTimeout(() => {
    if (ws.readyState === WebSocket.CONNECTING) {
      log.warn("connect timeout", url);
      ws.close();
      params.onStatus("disconnected");
      params.onMessage({
        type: "error",
        message:
          "Kunde inte ansluta till spelservern. Kör `npm run dev` (Vite + server) eller `npm run dev:server` och öppna sidan på http://127.0.0.1:5173 (dev använder då WebSocket via /bv-ws, inte port 3001 i webbläsaren). På mobil i dev: http://<datorns-IP>:5173 — servern måste fortfarande köra lokalt.",
      });
    }
  }, connectTimeoutMs);

  const clearConnTimeout = () => window.clearTimeout(timeoutId);

  ws.onopen = () => {
    clearConnTimeout();
    // Viktigt: inte "connected" förrän helloAck — annars tror mobil-UI att allt är OK när TCP-zombie är OPEN.
    log.debug("open", { as: params.as, roomCode: params.roomCode });
    handshakeTimeoutId = window.setTimeout(() => {
      handshakeTimeoutId = null;
      if (!helloAcked && ws.readyState === WebSocket.OPEN) {
        log.warn("handshake timeout (no helloAck)", url);
        ws.close();
        params.onStatus("disconnected");
        params.onMessage({
          type: "error",
          message:
            "Anslutningen svarade inte (hello). Kontrollera spelservern eller försök igen.",
        });
      }
    }, connectTimeoutMs);
    ws.send(
      JSON.stringify({
        type: "hello",
        roomCode: params.roomCode,
        playerName: params.playerName,
        as: params.as,
        playerId: rememberedId ?? undefined,
        config: params.as === "table" ? params.config : undefined,
      }),
    );
  };

  ws.onclose = () => {
    clearConnTimeout();
    clearHandshakeTimeout();
    params.onStatus("disconnected");
    log.debug("close");
  };
  ws.onerror = () => {
    clearConnTimeout();
    clearHandshakeTimeout();
    params.onStatus("disconnected");
    log.debug("error");
  };

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(String(ev.data)) as ServerMessage;
      log.debug("recv", msg.type);
      if (msg.type === "helloAck") {
        if (!helloAcked) {
          helloAcked = true;
          clearHandshakeTimeout();
          params.onStatus("connected");
        }
        if (params.as === "controller") {
          rememberPlayerId(params.roomCode, msg.playerId);
        }
      }
      params.onMessage(msg);
    } catch {
      // ignore
    }
  };

  return {
    getReadyState: () => ws.readyState,
    send: (payload) => {
      if (ws.readyState !== WebSocket.OPEN) {
        log.debug("send blocked; readyState=", ws.readyState);
        params.onMessage({
          type: "error",
          message: "Not connected to the server (WebSocket not open).",
        });
        return;
      }
      const p = payload as { type?: string; actionId?: string };
      if (p?.type === "action" && !p.actionId) {
        actionSeq += 1;
        p.actionId = `${Date.now().toString(36)}-${actionSeq.toString(36)}`;
      }
      log.debug("send", p?.type ?? payload);
      ws.send(JSON.stringify(payload));
    },
    close: () => {
      clearConnTimeout();
      clearHandshakeTimeout();
      ws.close();
    },
  };
}

