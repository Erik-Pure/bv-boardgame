import Fastify from "fastify";
import { WebSocketServer, type WebSocket } from "ws";
import {
  clientMessageSchema,
  CURRENT_PROTOCOL_VERSION,
  MIN_SUPPORTED_CLIENT_PROTOCOL,
  type ServerMessage,
} from "./protocol.js";
import { createLogger } from "./logger.js";
import {
  broadcastState,
  closeRoomByCode,
  forceRemovePlayer,
  getRuntimeStats,
  getRoom,
  getOrCreateRoom,
  handleAction,
  hasControllerConnection,
  joinRoom,
  listRoomSummaries,
  listPersistedRooms,
  pruneIdleRooms,
  removeConn,
  restorePersistedRooms,
  scheduleBroadcastState,
  sendStateSnapshot,
  sendError,
  touchRoom,
} from "./rooms.js";
import { loadRoomSnapshot, saveRoomSnapshot } from "./roomPersistence.js";
import type { PersistedRoom } from "./rooms.js";

const PORT = Number(process.env.PORT ?? 3001);
/** 0.0.0.0 = lyssna på alla nätverksgränssnitt så mobiler på LAN kan ansluta. Sätt HOST=127.0.0.1 om du bara vill lokalt. */
const HOST = process.env.HOST ?? "0.0.0.0";
const MAX_WS_MESSAGE_BYTES = 64 * 1024;
const ROOM_SNAPSHOT_PATH = process.env.ROOM_SNAPSHOT_PATH ?? "./.data/rooms-snapshot.json";
const ROOM_SNAPSHOT_INTERVAL_MS = Number(process.env.ROOM_SNAPSHOT_INTERVAL_MS ?? 10_000);
const DISCONNECTED_PLAYER_GRACE_MS = Number(process.env.DISCONNECTED_PLAYER_GRACE_MS ?? 45_000);
const HELLO_RATE_LIMIT_PER_MIN = Number(process.env.HELLO_RATE_LIMIT_PER_MIN ?? 40);
const SERVER_AUTH_TOKEN = process.env.SERVER_AUTH_TOKEN?.trim() || "";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN?.trim() || "";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

const log = createLogger("ws");
const persistLog = createLogger("persist");
const securityLog = createLogger("security");
const startupLog = createLogger("startup");

const runtimeCounters = {
  wsMessagesRejectedTooLarge: 0,
  wsHelloRateLimited: 0,
  wsOriginBlocked: 0,
  wsBadAuthToken: 0,
  wsProtocolMismatch: 0,
  snapshotLoadDurationMs: 0,
  snapshotLoadFailures: 0,
  snapshotSaveDurationMs: 0,
  snapshotSaveFailures: 0,
};

const app = Fastify({ logger: false });

app.get("/health", async () => ({ ok: true, protocolVersion: CURRENT_PROTOCOL_VERSION }));
app.get("/ready", async () => ({ ok: true, protocolVersion: CURRENT_PROTOCOL_VERSION, runtime: getRuntimeStats() }));
app.get("/metrics", async () => ({
  ...getRuntimeStats(),
  security: {
    wsMessagesRejectedTooLarge: runtimeCounters.wsMessagesRejectedTooLarge,
    wsHelloRateLimited: runtimeCounters.wsHelloRateLimited,
    wsOriginBlocked: runtimeCounters.wsOriginBlocked,
    wsBadAuthToken: runtimeCounters.wsBadAuthToken,
    wsProtocolMismatch: runtimeCounters.wsProtocolMismatch,
  },
  persistence: {
    snapshotLoadDurationMs: runtimeCounters.snapshotLoadDurationMs,
    snapshotLoadFailures: runtimeCounters.snapshotLoadFailures,
    snapshotSaveDurationMs: runtimeCounters.snapshotSaveDurationMs,
    snapshotSaveFailures: runtimeCounters.snapshotSaveFailures,
  },
  protocol: {
    current: CURRENT_PROTOCOL_VERSION,
    minSupportedClient: MIN_SUPPORTED_CLIENT_PROTOCOL,
  },
  uptimeSec: Math.floor(process.uptime()),
}));
function hasValidAdminToken(req: { headers: Record<string, unknown> }): boolean {
  if (!ADMIN_TOKEN) return false;
  const raw = String(req.headers["x-admin-token"] ?? "");
  return raw.length > 0 && raw === ADMIN_TOKEN;
}

app.get("/admin/rooms", async (req, reply) => {
  if (!hasValidAdminToken(req)) return reply.code(401).send({ ok: false, error: "unauthorized" });
  return { ok: true, rooms: listRoomSummaries() };
});

app.post("/admin/rooms/:code/close", async (req, reply) => {
  if (!hasValidAdminToken(req)) return reply.code(401).send({ ok: false, error: "unauthorized" });
  const code = String((req.params as { code?: string }).code ?? "").trim().toUpperCase();
  if (!code) return reply.code(400).send({ ok: false, error: "missing room code" });
  const closed = closeRoomByCode(code, "stängd av admin-endpoint");
  if (!closed) return reply.code(404).send({ ok: false, error: "room not found" });
  securityLog.warn("room closed via admin endpoint", { code });
  return { ok: true, code };
});

const snapshotLoadStartedAt = Date.now();
let loadedSnapshotRooms: PersistedRoom[] = [];
try {
  loadedSnapshotRooms = await loadRoomSnapshot(ROOM_SNAPSHOT_PATH);
} catch (e) {
  runtimeCounters.snapshotLoadFailures += 1;
  startupLog.warn("room snapshot load failed", e);
}
runtimeCounters.snapshotLoadDurationMs = Date.now() - snapshotLoadStartedAt;
const restored = restorePersistedRooms(loadedSnapshotRooms);
if (restored > 0) {
  persistLog.info(`Restored ${restored} room snapshots from ${ROOM_SNAPSHOT_PATH}`);
}

await app.listen({ port: PORT, host: HOST });

const wss = new WebSocketServer({ server: app.server });
const pendingDisconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
const helloRateByIp = new Map<string, { windowStartMs: number; count: number }>();
setInterval(() => {
  pruneIdleRooms();
  const now = Date.now();
  for (const [ip, bucket] of helloRateByIp) {
    if (now - bucket.windowStartMs >= 60_000) helloRateByIp.delete(ip);
  }
}, 60_000).unref?.();

async function flushRoomSnapshot(): Promise<void> {
  const rooms = listPersistedRooms();
  const startedAt = Date.now();
  try {
    await saveRoomSnapshot(ROOM_SNAPSHOT_PATH, rooms);
    runtimeCounters.snapshotSaveDurationMs = Date.now() - startedAt;
  } catch (e) {
    runtimeCounters.snapshotSaveFailures += 1;
    runtimeCounters.snapshotSaveDurationMs = Date.now() - startedAt;
    throw e;
  }
}

setInterval(() => {
  void flushRoomSnapshot().catch((e) => {
    persistLog.warn("room snapshot save failed", e);
  });
}, Math.max(1000, ROOM_SNAPSHOT_INTERVAL_MS)).unref?.();

for (const sig of ["SIGTERM", "SIGINT"] as const) {
  process.once(sig, () => {
    void flushRoomSnapshot().finally(() => process.exit(0));
  });
}

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

wss.on("connection", (ws, req) => {
  if (ALLOWED_ORIGINS.length > 0) {
    const origin = String(req.headers.origin ?? "");
    if (!ALLOWED_ORIGINS.includes(origin)) {
      runtimeCounters.wsOriginBlocked += 1;
      securityLog.warn("ws blocked by origin policy", { origin });
      ws.close();
      return;
    }
  }
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

  function wsDataSize(data: unknown): number {
    if (typeof data === "string") return Buffer.byteLength(data);
    if (data instanceof Buffer) return data.byteLength;
    if (data instanceof ArrayBuffer) return data.byteLength;
    if (Array.isArray(data)) {
      let total = 0;
      for (const part of data) total += wsDataSize(part);
      return total;
    }
    return 0;
  }

  ws.on("message", (data) => {
    try {
      if (wsDataSize(data) > MAX_WS_MESSAGE_BYTES) {
        runtimeCounters.wsMessagesRejectedTooLarge += 1;
        sendError(ws, "Meddelandet är för stort.");
        ws.close();
        return;
      }
      const msg = clientMessageSchema.parse(JSON.parse(String(data)));

      if (msg.type === "hello") {
        if (joined) return;
        const remoteIp = req.socket.remoteAddress ?? "unknown";
        const now = Date.now();
        const bucket = helloRateByIp.get(remoteIp);
        if (!bucket || now - bucket.windowStartMs >= 60_000) {
          helloRateByIp.set(remoteIp, { windowStartMs: now, count: 1 });
        } else {
          bucket.count += 1;
          if (bucket.count > HELLO_RATE_LIMIT_PER_MIN) {
            runtimeCounters.wsHelloRateLimited += 1;
            securityLog.warn("hello rate limited", { remoteIp, count: bucket.count });
            sendError(ws, "För många anslutningsförsök. Vänta en stund och prova igen.");
            ws.close();
            return;
          }
        }
        if (
          typeof msg.protocolVersion === "number" &&
          (msg.protocolVersion > CURRENT_PROTOCOL_VERSION || msg.protocolVersion < MIN_SUPPORTED_CLIENT_PROTOCOL)
        ) {
          runtimeCounters.wsProtocolMismatch += 1;
          sendError(
            ws,
            `Inkompatibel klient/server-version (client=${msg.protocolVersion}, server=${CURRENT_PROTOCOL_VERSION}, min=${MIN_SUPPORTED_CLIENT_PROTOCOL}). Uppdatera sidan.`,
          );
          ws.close();
          return;
        }
        const trusted = SERVER_AUTH_TOKEN.length === 0 || msg.authToken === SERVER_AUTH_TOKEN;
        if (!trusted) {
          runtimeCounters.wsBadAuthToken += 1;
          securityLog.warn("hello rejected: bad auth token", { remoteIp });
          sendError(ws, "Ogiltig auth-token.");
          ws.close();
          return;
        }
        const res = joinRoom({
          ws,
          roomCode: msg.roomCode,
          playerName: msg.playerName,
          role: msg.as,
          trusted,
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
        if (joined && msg.as === "controller") {
          const reconnectKey = `${joined.roomCode}:${joined.playerId}`;
          const timer = pendingDisconnectTimers.get(reconnectKey);
          if (timer != null) {
            clearTimeout(timer);
            pendingDisconnectTimers.delete(reconnectKey);
          }
        }
        const ack: ServerMessage = {
          type: "helloAck",
          roomCode: res.room.code,
          playerId: res.conn.playerId,
          protocolVersion: CURRENT_PROTOCOL_VERSION,
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
    const closedConn = joined;
    if (closedConn.conn.role === "controller") {
      const timerKey = `${closedConn.roomCode}:${closedConn.playerId}`;
      const existing = pendingDisconnectTimers.get(timerKey);
      if (existing != null) {
        clearTimeout(existing);
        pendingDisconnectTimers.delete(timerKey);
      }
      const tid = setTimeout(() => {
        pendingDisconnectTimers.delete(timerKey);
        const room = getRoom(closedConn.roomCode);
        if (!room) return;
        if (room.state.phase !== "playing") return;
        if (hasControllerConnection(room, closedConn.playerId)) return;
        if (!forceRemovePlayer(room, closedConn.playerId, "frånkopplad")) return;
        scheduleBroadcastState(room);
      }, Math.max(5000, DISCONNECTED_PLAYER_GRACE_MS));
      pendingDisconnectTimers.set(timerKey, tid);
    }
    removeConn(closedConn.conn);
  });
});

createLogger("server").info(
  `HTTP + WebSocket on port ${PORT} (host ${HOST}). Health: http://127.0.0.1:${PORT}/health — mobiler använder samma port mot datorns LAN-IP.`,
);

