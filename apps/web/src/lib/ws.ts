export type WsStatus = "disconnected" | "connecting" | "connected";

export type ServerMessage =
  | { type: "helloAck"; playerId: string; roomCode: string }
  | { type: "state"; state: unknown }
  | { type: "error"; message: string };

function storageKey(roomCode: string): string {
  return `bv:playerId:${roomCode.toUpperCase()}`;
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
  /** Samma värd som sidan; spelserver alltid port 3001 (lyssnar 0.0.0.0 — funkar från mobil på LAN om brandvägg tillåter). */
  const host = window.location.hostname === "localhost" ? "127.0.0.1" : window.location.hostname;
  return `${proto}://${host}:3001`;
}

export function createClient(params: {
  roomCode: string;
  playerName: string;
  as: "table" | "controller";
  config?: { turnSeconds?: number; gameMode?: "bossKill" | "goldenBeerEscape" };
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
  let handshakeTimeoutId: number | null = null;

  const clearHandshakeTimeout = () => {
    if (handshakeTimeoutId != null) {
      window.clearTimeout(handshakeTimeoutId);
      handshakeTimeoutId = null;
    }
  };

  const timeoutId = window.setTimeout(() => {
    if (ws.readyState === WebSocket.CONNECTING) {
      // eslint-disable-next-line no-console
      console.warn("[ws] connect timeout", url);
      ws.close();
      params.onStatus("disconnected");
      params.onMessage({
        type: "error",
        message:
          "Kunde inte ansluta till spelservern. Kontrollera att den körs på port 3001 (t.ex. `npm run dev` eller `npm run -w server start`). På mobil: samma Wi‑Fi, öppna http://<datorns-IP>:5173 — WebSocket går till ws://<samma-IP>:3001 (tillåt inkommande på 3001 i brandväggen om det behövs).",
      });
    }
  }, connectTimeoutMs);

  const clearConnTimeout = () => window.clearTimeout(timeoutId);

  ws.onopen = () => {
    clearConnTimeout();
    // Viktigt: inte "connected" förrän helloAck — annars tror mobil-UI att allt är OK när TCP-zombie är OPEN.
    // eslint-disable-next-line no-console
    console.log("[ws] open", { as: params.as, roomCode: params.roomCode });
    handshakeTimeoutId = window.setTimeout(() => {
      handshakeTimeoutId = null;
      if (!helloAcked && ws.readyState === WebSocket.OPEN) {
        // eslint-disable-next-line no-console
        console.warn("[ws] handshake timeout (no helloAck)", url);
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
    // eslint-disable-next-line no-console
    console.log("[ws] close");
  };
  ws.onerror = () => {
    clearConnTimeout();
    clearHandshakeTimeout();
    params.onStatus("disconnected");
    // eslint-disable-next-line no-console
    console.log("[ws] error");
  };

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(String(ev.data)) as ServerMessage;
      // eslint-disable-next-line no-console
      console.log("[ws] recv", msg);
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
        // eslint-disable-next-line no-console
        console.log("[ws] send blocked; readyState=", ws.readyState);
        params.onMessage({
          type: "error",
          message: "Not connected to the server (WebSocket not open).",
        });
        return;
      }
      // eslint-disable-next-line no-console
      console.log("[ws] send", payload);
      ws.send(JSON.stringify(payload));
    },
    close: () => {
      clearConnTimeout();
      clearHandshakeTimeout();
      ws.close();
    },
  };
}

