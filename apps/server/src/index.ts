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
  pruneIdleRooms,
  removeConn,
  scheduleBroadcastState,
  sendStateSnapshot,
  sendError,
  touchRoom,
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
setInterval(() => {
  pruneIdleRooms();
}, 60_000).unref?.();

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
  const seenActionIds = new Map<string, number>();
  const ACTION_ID_TTL_MS = 5 * 60_000;

  function rememberActionId(actionId: string, now: number): void {
    seenActionIds.set(actionId, now);
    for (const [id, ts] of seenActionIds) {
      if (now - ts > ACTION_ID_TTL_MS) seenActionIds.delete(id);
    }
    if (seenActionIds.size > 300) {
      const oldest = [...seenActionIds.entries()].sort((a, b) => a[1] - b[1]).slice(0, seenActionIds.size - 300);
      for (const [id] of oldest) seenActionIds.delete(id);
    }
  }

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
        sendStateSnapshot(res.conn, res.room);
        touchRoom(res.room);
        log.debug("helloAck + stateSnapshot", res.room.code, res.conn.playerId);
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
        if (msg.actionId) {
          const prev = seenActionIds.get(msg.actionId);
          if (prev && now - prev <= ACTION_ID_TTL_MS) {
            return;
          }
          rememberActionId(msg.actionId, now);
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

