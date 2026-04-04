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

function devUseViteWsProxy(): boolean {
  if (!import.meta.env.DEV) return false;
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return false;
  return true;
}

export function wsUrl(): string {
  // ?ws=… tvingar direktanslutning till port 3001 (kräver ofta öppen brandvägg från mobilen)
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

  // Mobil på LAN + Vite dev: WebSocket via :5173/bv-ws (proxy → localhost:3001)
  if (devUseViteWsProxy()) {
    const port = window.location.port || "5173";
    return `${proto}://${window.location.hostname}:${port}/bv-ws`;
  }

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
}): { send: (payload: unknown) => void; close: () => void } {
  const url = wsUrl();
  params.onStatus("connecting");
  const ws = new WebSocket(url);
  const rememberedId = params.as === "controller" ? getRememberedPlayerId(params.roomCode) : null;

  const connectTimeoutMs = 15000;
  const timeoutId = window.setTimeout(() => {
    if (ws.readyState === WebSocket.CONNECTING) {
      // eslint-disable-next-line no-console
      console.warn("[ws] connect timeout", url);
      ws.close();
      params.onStatus("disconnected");
      params.onMessage({
        type: "error",
        message:
          "Kunde inte ansluta till spelservern. Kontrollera att `npm run dev` (eller server på port 3001) körs. På mobil: öppna sidan utan ?ws=… i adressen så används port 5173 för WebSocket.",
      });
    }
  }, connectTimeoutMs);

  const clearConnTimeout = () => window.clearTimeout(timeoutId);

  ws.onopen = () => {
    clearConnTimeout();
    params.onStatus("connected");
    // eslint-disable-next-line no-console
    console.log("[ws] open", { as: params.as, roomCode: params.roomCode });
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
    params.onStatus("disconnected");
    // eslint-disable-next-line no-console
    console.log("[ws] close");
  };
  ws.onerror = () => {
    clearConnTimeout();
    params.onStatus("disconnected");
    // eslint-disable-next-line no-console
    console.log("[ws] error");
  };

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(String(ev.data)) as ServerMessage;
      // eslint-disable-next-line no-console
      console.log("[ws] recv", msg);
      if (msg.type === "helloAck" && params.as === "controller") {
        rememberPlayerId(params.roomCode, msg.playerId);
      }
      params.onMessage(msg);
    } catch {
      // ignore
    }
  };

  return {
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
      ws.close();
    },
  };
}

