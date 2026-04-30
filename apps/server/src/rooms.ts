import type WebSocket from "ws";
import {
  applyAction,
  clampConfigNumber,
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
  broadcastQueued: boolean;
  lastActivityAt: number;
  stateSeq: number;
  levelsSignature: string;
}

const rooms = new Map<string, Room>();
const stats = {
  actionsHandled: 0,
  actionErrors: 0,
  broadcastsSent: 0,
  bytesSent: 0,
  backpressureDrops: 0,
  backpressureDisconnects: 0,
};
const WS_BUFFERED_DROP_THRESHOLD = 1_000_000; // 1MB
const WS_BUFFERED_DISCONNECT_THRESHOLD = 4_000_000; // 4MB
const IDLE_ROOM_TTL_MS = 10 * 60_000;

function computeLevelsSignature(state: GameState): string {
  if (!state.levels?.length) return "none";
  return state.levels.map((lvl) => lvl.tiles.length).join(",");
}

export function getOrCreateRoom(code: string): { room: Room; created: boolean } {
  const roomCode = code.trim().toUpperCase();
  const existing = rooms.get(roomCode);
  if (existing) return { room: existing, created: false };
  const state = createEmptyLobby(roomCode);
  state.log.push({ at: Date.now(), message: `Ny lobby skapad (${roomCode}).` });
  const room: Room = {
    code: roomCode,
    state,
    conns: new Set(),
    broadcastQueued: false,
    lastActivityAt: Date.now(),
    stateSeq: 0,
    levelsSignature: computeLevelsSignature(state),
  };
  rooms.set(roomCode, room);
  return { room, created: true };
}

export function removeConn(conn: ClientConn): void {
  const room = rooms.get(conn.roomCode);
  if (!room) return;
  room.conns.delete(conn);
  room.lastActivityAt = Date.now();
}

function sendPayload(conn: ClientConn, payload: string): void {
  if (conn.ws.readyState !== conn.ws.OPEN) return;
  if (conn.ws.bufferedAmount >= WS_BUFFERED_DISCONNECT_THRESHOLD) {
    stats.backpressureDisconnects += 1;
    try {
      conn.ws.close();
    } catch {
      // ignore
    }
    return;
  }
  if (conn.ws.bufferedAmount >= WS_BUFFERED_DROP_THRESHOLD) {
    stats.backpressureDrops += 1;
    return;
  }
  conn.ws.send(payload);
}

export function sendStateSnapshot(conn: ClientConn, room: Room): void {
  const payload = JSON.stringify({ type: "state", state: room.state, seq: room.stateSeq });
  stats.broadcastsSent += 1;
  stats.bytesSent += payload.length;
  sendPayload(conn, payload);
}

function buildStateDelta(room: Room): { seq: number; patch: Partial<GameState> } {
  const levelsSig = computeLevelsSignature(room.state);
  const includeLevels = levelsSig !== room.levelsSignature;
  room.levelsSignature = levelsSig;
  return {
    seq: room.stateSeq,
    patch: {
      phase: room.state.phase,
      config: room.state.config,
      players: room.state.players,
      turnOrder: room.state.turnOrder,
      currentTurnIndex: room.state.currentTurnIndex,
      pending: room.state.pending,
      log: room.state.log,
      winnerId: room.state.winnerId,
      winnerName: room.state.winnerName,
      goldenBeerCarrierId: room.state.goldenBeerCarrierId,
      finalBossMonsterId: room.state.finalBossMonsterId,
      finalBossLivesRemaining: room.state.finalBossLivesRemaining,
      treasureTaken: room.state.treasureTaken,
      lastDiceRoll: room.state.lastDiceRoll,
      lastDiceRollerId: room.state.lastDiceRollerId,
      sipNotices: room.state.sipNotices,
      tableItemPlayReveals: room.state.tableItemPlayReveals,
      ...(includeLevels ? { levels: room.state.levels } : {}),
    },
  };
}

export function broadcastState(room: Room): void {
  const delta = buildStateDelta(room);
  const payload = JSON.stringify({ type: "stateDelta", ...delta });
  stats.broadcastsSent += 1;
  stats.bytesSent += payload.length;
  for (const c of room.conns) sendPayload(c, payload);
  room.lastActivityAt = Date.now();
}

export function scheduleBroadcastState(room: Room): void {
  if (room.broadcastQueued) return;
  room.broadcastQueued = true;
  setTimeout(() => {
    room.broadcastQueued = false;
    broadcastState(room);
  }, 16).unref?.();
}

export function sendError(ws: WebSocket, message: string): void {
  ws.send(JSON.stringify({ type: "error", message }));
}

export function getRuntimeStats(): {
  roomCount: number;
  connectionCount: number;
  actionsHandled: number;
  actionErrors: number;
  broadcastsSent: number;
  bytesSent: number;
  backpressureDrops: number;
  backpressureDisconnects: number;
  idleRoomTtlMs: number;
} {
  let connectionCount = 0;
  for (const room of rooms.values()) connectionCount += room.conns.size;
  return {
    roomCount: rooms.size,
    connectionCount,
    actionsHandled: stats.actionsHandled,
    actionErrors: stats.actionErrors,
    broadcastsSent: stats.broadcastsSent,
    bytesSent: stats.bytesSent,
    backpressureDrops: stats.backpressureDrops,
    backpressureDisconnects: stats.backpressureDisconnects,
    idleRoomTtlMs: IDLE_ROOM_TTL_MS,
  };
}

export function touchRoom(room: Room): void {
  room.lastActivityAt = Date.now();
}

export function pruneIdleRooms(now = Date.now()): number {
  let removed = 0;
  for (const [code, room] of rooms) {
    if (room.conns.size > 0) continue;
    if (now - room.lastActivityAt < IDLE_ROOM_TTL_MS) continue;
    rooms.delete(code);
    removed += 1;
  }
  return removed;
}

export function joinRoom(params: {
  ws: WebSocket;
  roomCode: string;
  playerName: string;
  role: ClientRole;
  requestedPlayerId?: string;
  config?: {
    turnSeconds?: number;
    reactionSeconds?: number;
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
      room.state.config.turnSeconds = clampConfigNumber("turnSeconds", params.config.turnSeconds);
    }
    if (typeof params.config.reactionSeconds === "number") {
      room.state.config.reactionSeconds = clampConfigNumber("reactionSeconds", params.config.reactionSeconds);
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
      room.state.config.maxHp = clampConfigNumber("maxHp", params.config.maxHp);
    }
    if (typeof params.config.startPant === "number") {
      room.state.config.startPant = clampConfigNumber("startPant", params.config.startPant);
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
  room.lastActivityAt = Date.now();
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
  stats.actionsHandled += 1;
  room.stateSeq += 1;
  room.lastActivityAt = Date.now();
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
  if (res.error) {
    stats.actionErrors += 1;
    return res.error;
  }
  room.state = res.state;
  return null;
}

