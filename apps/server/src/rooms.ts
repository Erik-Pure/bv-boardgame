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
  config?: {
    turnSeconds?: number;
    gameMode?: "bossKill";
    difficulty?: "lattol" | "folkol" | "starkol" | "imperial";
    hardcore?: boolean;
    boardSize?: "default" | "large" | "xlarge";
    levelCount?: number;
    maxHp?: number;
    startPant?: number;
    wakeLockBeforeStart?: boolean;
    disabledCardIds?: string[];
    cardCover?: string;
  };
}): { conn: ClientConn; room: Room } | { error: string } {
  const { room, created } = getOrCreateRoom(params.roomCode);

  if (created && params.role === "table" && params.config) {
    if (typeof params.config.turnSeconds === "number") {
      room.state.config.turnSeconds = Math.min(120, Math.max(30, params.config.turnSeconds));
    }
    if (params.config.gameMode) {
      room.state.config.gameMode = params.config.gameMode;
    }
    if (params.config.difficulty) {
      room.state.config.difficulty = params.config.difficulty;
    }
    if (typeof params.config.hardcore === "boolean") {
      room.state.config.hardcore = params.config.hardcore;
    }
    if (params.config.boardSize) {
      room.state.config.boardSize = params.config.boardSize;
    }
    if (typeof params.config.levelCount === "number") {
      room.state.config.levelCount = Math.max(1, Math.min(5, Math.floor(params.config.levelCount)));
    }
    if (typeof params.config.maxHp === "number") {
      room.state.config.maxHp = Math.max(6, Math.min(30, Math.floor(params.config.maxHp)));
    }
    if (typeof params.config.startPant === "number") {
      room.state.config.startPant = Math.max(0, Math.min(50, Math.floor(params.config.startPant)));
    }
    if (typeof params.config.wakeLockBeforeStart === "boolean") {
      room.state.config.wakeLockBeforeStart = params.config.wakeLockBeforeStart;
    }
    if (Array.isArray(params.config.disabledCardIds)) {
      room.state.config.disabledCardIds = Array.from(new Set(params.config.disabledCardIds.filter(Boolean)));
    }
    if (params.config.cardCover) {
      room.state.config.cardCover = params.config.cardCover;
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

function removePlayerFromRoomState(state: GameState, playerId: string): GameState["players"][number] | null {
  const leaving = state.players.find((p) => p.id === playerId);
  if (!leaving) return null;
  state.players = state.players.filter((p) => p.id !== playerId);
  state.turnOrder = state.turnOrder.filter((id) => id !== playerId);
  state.sipNotices = (state.sipNotices ?? []).filter((n) => n.recipientId !== playerId);
  state.tableItemPlayReveals = (state.tableItemPlayReveals ?? []).filter(
    (r) => r.actorId !== playerId && r.targetPlayerId !== playerId,
  );

  if (state.turnOrder.length === 0) {
    state.currentTurnIndex = 0;
  } else {
    state.currentTurnIndex = Math.max(0, Math.min(state.currentTurnIndex, state.turnOrder.length - 1));
  }

  if (state.phase === "lobby") {
    for (const p of state.players) p.isHost = false;
    if (state.players[0]) state.players[0].isHost = true;
  }

  if (state.pending) {
    const pendingJson = JSON.stringify(state.pending);
    if (pendingJson.includes(playerId)) state.pending = null;
  }

  if (state.phase === "playing" && state.players.length <= 1) {
    const winner = state.players[0] ?? null;
    state.phase = "ended";
    state.pending = null;
    state.winnerId = winner?.id ?? null;
    state.winnerName = winner?.name ?? null;
  }
  return leaving;
}

export function handleAction(room: Room, conn: ClientConn, raw: unknown): string | null {
  const action = raw as ClientAction | { type?: string };

  if (action?.type === "leaveGame") {
    const leaving = removePlayerFromRoomState(room.state, conn.playerId);
    if (!leaving) return null;
    room.state.log.push({ at: Date.now(), message: `${leaving.name} lämnade spelet.` });
    return null;
  }

  if (action?.type === "tableKickPlayer") {
    if (conn.role !== "table") return "Endast bordet kan ta bort en spelare";
    const targetId = (action as { targetPlayerId?: unknown }).targetPlayerId;
    if (typeof targetId !== "string" || targetId.length === 0) return "Ogiltig spelare";
    const leaving = removePlayerFromRoomState(room.state, targetId);
    if (!leaving) return "Spelaren finns inte";
    room.state.log.push({ at: Date.now(), message: `${leaving.name} togs bort från spelet (bordet).` });
    for (const c of [...room.conns]) {
      if (c.role === "controller" && c.playerId === targetId) {
        try {
          c.ws.close();
        } catch {
          // ignore
        }
        room.conns.delete(c);
      }
    }
    return null;
  }

  if (room.state.phase === "lobby" && action?.type === "startGame") {
    const seed = Math.floor(Math.random() * 1_000_000_000);
    const res = startGame(room.state, conn.playerId, seed);
    if (res.error) return res.error;
    room.state = res.state;
    return null;
  }

  const res = applyAction(room.state, action as ClientAction);
  if (res.error) return res.error;
  room.state = res.state;
  return null;
}

