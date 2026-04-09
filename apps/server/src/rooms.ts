import type WebSocket from "ws";
import {
  applyAction,
  createEmptyLobby,
  lobbyAddPlayer,
  startGame,
  type ClientAction,
  type GameState,
} from "@bv/game-core";
import { v4 as uuidv4 } from "uuid";

export type ClientRole = "table" | "controller";

export interface ClientConn {
  ws: WebSocket;
  role: ClientRole;
  roomCode: string;
  playerId: string;
}

export interface Room {
  code: string;
  state: GameState;
  conns: Set<ClientConn>;
}

const rooms = new Map<string, Room>();

export function getOrCreateRoom(code: string): { room: Room; created: boolean } {
  const roomCode = code.trim().toUpperCase();
  const existing = rooms.get(roomCode);
  if (existing) return { room: existing, created: false };
  const state = createEmptyLobby(roomCode);
  state.log.push({ at: Date.now(), message: `Ny lobby skapad (${roomCode}).` });
  const room: Room = { code: roomCode, state, conns: new Set() };
  rooms.set(roomCode, room);
  return { room, created: true };
}

export function removeConn(conn: ClientConn): void {
  const room = rooms.get(conn.roomCode);
  if (!room) return;
  room.conns.delete(conn);
  if (room.conns.size === 0) {
    rooms.delete(conn.roomCode);
  }
}

export function broadcastState(room: Room): void {
  const payload = JSON.stringify({ type: "state", state: room.state });
  for (const c of room.conns) {
    if (c.ws.readyState === c.ws.OPEN) c.ws.send(payload);
  }
}

export function sendError(ws: WebSocket, message: string): void {
  ws.send(JSON.stringify({ type: "error", message }));
}

export function joinRoom(params: {
  ws: WebSocket;
  roomCode: string;
  playerName: string;
  role: ClientRole;
  requestedPlayerId?: string;
  config?: { turnSeconds?: number; gameMode?: "bossKill" };
}): { conn: ClientConn; room: Room } | { error: string } {
  const { room, created } = getOrCreateRoom(params.roomCode);

  if (created && params.role === "table" && params.config) {
    if (typeof params.config.turnSeconds === "number") {
      room.state.config.turnSeconds = Math.min(120, Math.max(30, params.config.turnSeconds));
    }
    if (params.config.gameMode) {
      room.state.config.gameMode = params.config.gameMode;
    }
    room.state.log.push({
      at: Date.now(),
      message: `Lobby configured: mode=${room.state.config.gameMode}, turn=${room.state.config.turnSeconds}s.`,
    });
  }

  const existingPlayerId =
    params.requestedPlayerId &&
    room.state.players.some((p) => p.id === params.requestedPlayerId)
      ? params.requestedPlayerId
      : null;
  const playerId = existingPlayerId ?? uuidv4();

  // Bord-vyn är spectator: den ska inte bli en spelare.
  if (params.role === "controller") {
    if (!existingPlayerId) {
      const isFirstPlayer = room.state.players.length === 0;
      const addRes = lobbyAddPlayer(room.state, {
        id: playerId,
        name: params.playerName,
        isHost: isFirstPlayer,
      });
      if (addRes.error) return { error: addRes.error };
      room.state = addRes.state;
    } else {
      // reconnect: keep existing player attributes
    }

    // Om vi reconnectar: stäng gamla controller-anslutningar för samma playerId.
    for (const c of room.conns) {
      if (c.role === "controller" && c.playerId === playerId && c.ws !== params.ws) {
        try {
          c.ws.close();
        } catch {
          // ignore
        }
        room.conns.delete(c);
      }
    }
  }

  const conn: ClientConn = {
    ws: params.ws,
    role: params.role,
    roomCode: room.code,
    playerId,
  };
  room.conns.add(conn);
  return { conn, room };
}

export function handleAction(room: Room, playerId: string, raw: unknown): string | null {
  const action = raw as ClientAction;

  if (room.state.phase === "lobby" && action?.type === "startGame") {
    const seed = Math.floor(Math.random() * 1_000_000_000);
    const res = startGame(room.state, playerId, seed);
    if (res.error) return res.error;
    room.state = res.state;
    return null;
  }

  const res = applyAction(room.state, action);
  if (res.error) return res.error;
  room.state = res.state;
  return null;
}

