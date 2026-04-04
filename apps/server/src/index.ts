import Fastify from "fastify";
import { WebSocketServer } from "ws";
import { clientMessageSchema, type ServerMessage } from "./protocol.js";
import {
  broadcastState,
  getOrCreateRoom,
  handleAction,
  joinRoom,
  removeConn,
  sendError,
} from "./rooms.js";

const PORT = Number(process.env.PORT ?? 3001);
/** 0.0.0.0 = lyssna på alla nätverksgränssnitt så mobiler på LAN kan ansluta. Sätt HOST=127.0.0.1 om du bara vill lokalt. */
const HOST = process.env.HOST ?? "0.0.0.0";

const app = Fastify({ logger: false });

app.get("/health", async () => ({ ok: true }));

await app.listen({ port: PORT, host: HOST });

const wss = new WebSocketServer({ server: app.server });

wss.on("connection", (ws) => {
  let joined:
    | { roomCode: string; playerId: string; conn: Parameters<typeof removeConn>[0] }
    | null = null;

  ws.on("message", (data) => {
    try {
      const msg = clientMessageSchema.parse(JSON.parse(String(data)));
      // Minimal runtime debug (MVP)
      // eslint-disable-next-line no-console
      console.log("[ws] recv", msg.type);

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
        // eslint-disable-next-line no-console
        console.log("[ws] helloAck + state", res.room.code, res.conn.playerId);
        return;
      }

      if (!joined) {
        sendError(ws, "Not connected (send hello first)");
        return;
      }

      if (msg.type === "action") {
        const room = getOrCreateRoom(joined.roomCode).room;
        // eslint-disable-next-line no-console
        console.log(
          "[ws] action",
          joined.roomCode,
          joined.playerId,
          (msg.action as any)?.type,
        );
        const err = handleAction(room, joined.playerId, msg.action);
        if (err) {
          sendError(ws, err);
          return;
        }
        broadcastState(room);
        // eslint-disable-next-line no-console
        console.log("[ws] broadcast state", joined.roomCode);
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

// eslint-disable-next-line no-console
console.log(
  `[server] HTTP + WebSocket on port ${PORT} (host ${HOST}). Health: http://127.0.0.1:${PORT}/health — mobiler använder samma port mot datorns LAN-IP.`,
);

