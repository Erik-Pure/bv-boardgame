import Fastify from "fastify";
import { WebSocketServer, type WebSocket } from "ws";
import { clientMessageSchema, type ServerMessage } from "./protocol.js";
import { createLogger } from "./logger.js";
import {
  broadcastState,
  getRuntimeStats,
  getOrCreateRoom,
  handleAction,
  joinRoom,
  removeConn,
  scheduleBroadcastState,
  sendError,
} from "./rooms.js";

const PORT = Number(process.env.PORT ?? 3001);
/** 0.0.0.0 = lyssna på alla nätverksgränssnitt så mobiler på LAN kan ansluta. Sätt HOST=127.0.0.1 om du bara vill lokalt. */
const HOST = process.env.HOST ?? "0.0.0.0";

const log = createLogger("ws");

const app = Fastify({ logger: false });

app.get("/health", async () => ({ ok: true }));
app.get("/metrics", async () => getRuntimeStats());

await app.listen({ port: PORT, host: HOST });

const wss = new WebSocketServer({ server: app.server });

/** Stäng halvöppna klienter (t.ex. mobil i bakgrund) så att onclose triggas och de kan återansluta. */
type TrackedWs = WebSocket & { isAlive?: boolean };
const PING_INTERVAL_MS = 20_000;
setInterval(() => {
  for (const client of wss.clients) {
    const ws = client as TrackedWs;
    if (ws.readyState !== ws.OPEN) continue;
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    try {
      ws.ping();
    } catch {
      // ignore
    }
  }
}, PING_INTERVAL_MS).unref?.();

wss.on("connection", (ws) => {
  const tracked = ws as TrackedWs;
  tracked.isAlive = true;
  ws.on("pong", () => {
    tracked.isAlive = true;
  });
  let joined:
    | { roomCode: string; playerId: string; conn: Parameters<typeof removeConn>[0] }
    | null = null;
  let actionWindowStartMs = Date.now();
  let actionWindowCount = 0;

  ws.on("message", (data) => {
    try {
      const msg = clientMessageSchema.parse(JSON.parse(String(data)));

      if (msg.type === "hello") {
        if (joined) return;
        const res = joinRoom({
          ws,
          roomCode: msg.roomCode,
          playerName: msg.playerName,
          role: msg.as,
          requestedPlayerId: msg.playerId,
          config: msg.config,
        });
        if ("error" in res) {
          sendError(ws, res.error);
          ws.close();
          return;
        }
        joined = {
          roomCode: res.room.code,
          playerId: res.conn.playerId,
          conn: res.conn,
        };
        const ack: ServerMessage = {
          type: "helloAck",
          roomCode: res.room.code,
          playerId: res.conn.playerId,
        };
        ws.send(JSON.stringify(ack));
        broadcastState(res.room);
        log.debug("helloAck + broadcastState", res.room.code, res.conn.playerId);
        return;
      }

      if (!joined) {
        sendError(ws, "Not connected (send hello first)");
        return;
      }

      if (msg.type === "action") {
        const now = Date.now();
        if (now - actionWindowStartMs >= 1000) {
          actionWindowStartMs = now;
          actionWindowCount = 0;
        }
        actionWindowCount += 1;
        if (actionWindowCount > 20) {
          sendError(ws, "För många actions per sekund. Vänta lite och försök igen.");
          return;
        }

        const room = getOrCreateRoom(joined.roomCode).room;
        log.debug("action", joined.roomCode, joined.playerId, (msg.action as any)?.type);
        const err = handleAction(room, joined.conn, msg.action);
        if (err) {
          sendError(ws, err);
          return;
        }
        scheduleBroadcastState(room);
        log.debug("broadcast state", joined.roomCode);
      }
    } catch (e) {
      sendError(ws, e instanceof Error ? e.message : "Unknown error");
    }
  });

  ws.on("close", () => {
    if (!joined) return;
    removeConn(joined.conn);
  });
});

createLogger("server").info(
  `HTTP + WebSocket on port ${PORT} (host ${HOST}). Health: http://127.0.0.1:${PORT}/health — mobiler använder samma port mot datorns LAN-IP.`,
);

