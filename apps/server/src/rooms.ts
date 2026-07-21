import type WebSocket from "ws";
import {
  applyAction,
  clampConfigNumber,
  createEmptyLobby,
  lobbyAddPlayer,
  playingAddPlayer,
  LOG_MESSAGE_KEYS,
  normalizeLoadedGameState,
  pushLogEntry,
  returnToLobby,
  startGame,
  type ClientAction,
  type GameState,
  type GameStateDeltaPatch,
  type Player,
} from "@bv/game-core";
import { v4 as uuidv4 } from "uuid";

export type ClientRole = "table" | "controller";

export interface ClientConn {
  ws: WebSocket;
  role: ClientRole;
  roomCode: string;
  playerId: string;
  trusted: boolean;
}

export interface Room {
  code: string;
  state: GameState;
  conns: Set<ClientConn>;
  broadcastQueued: boolean;
  /** Ytterligare broadcast begärd medan en köad redan väntar (snabba lobby-joins). */
  broadcastQueuedAgain?: boolean;
  lastActivityAt: number;
  stateSeq: number;
  levelsSignature: string;
  /** Senast broadcastade spelare (JSON per id) — för partiella player-deltas. */
  lastBroadcastPlayerJsonById: Map<string, string>;
  /** Senast broadcastade logg-längd och sekvens — för partiella log-deltas. */
  lastBroadcastLogLength: number;
  lastBroadcastLogSeq: number;
  /** Senast broadcastade JSON per state-fält (utom players/log/bursts). */
  lastBroadcastFieldJson: Map<string, string>;
  lastBroadcastEmoteBurstLength: number;
  lastBroadcastKlunkBurstLength: number;
}

const BROADCAST_DELTA_FIELD_KEYS = [
  "phase",
  "config",
  "turnOrder",
  "currentTurnIndex",
  "pending",
  "deferredPending",
  "offTurnPersonalPending",
  "logSeq",
  "winnerId",
  "winnerName",
  "goldenBeerCarrierId",
  "finalBossMonsterId",
  "finalBossLivesRemaining",
  "bossFinaleExitStartedAt",
  "combatEquipReplaceQueue",
  "stolenEquipmentEscrow",
  "treasureTaken",
  "lastDiceRoll",
  "lastDiceRollerId",
  "sipNotices",
  "tableItemPlayReveals",
] as const satisfies readonly (keyof GameState)[];

export interface PersistedRoom {
  code: string;
  state: GameState;
  lastActivityAt: number;
  stateSeq: number;
}

export interface AdminRoomSummary {
  code: string;
  phase: GameState["phase"];
  players: number;
  connections: number;
  lastActivityAt: number;
  stateSeq: number;
}

function normalizePlayerName(name: string): string {
  return name.trim().toLocaleLowerCase("sv-SE");
}

const rooms = new Map<string, Room>();
const stats = {
  actionsHandled: 0,
  actionErrors: 0,
  broadcastsSent: 0,
  bytesSent: 0,
  backpressureDrops: 0,
  backpressureDisconnects: 0,
  actionLatencyMsRecent: [] as number[],
};
const WS_BUFFERED_DROP_THRESHOLD = 1_000_000; // 1MB
const WS_BUFFERED_DISCONNECT_THRESHOLD = 4_000_000; // 4MB
const IDLE_ROOM_TTL_MS = 10 * 60_000;
const ACTION_LATENCY_SAMPLE_MAX = 500;

function observeActionLatency(ms: number): void {
  const safeMs = Number.isFinite(ms) ? Math.max(0, ms) : 0;
  stats.actionLatencyMsRecent.push(safeMs);
  if (stats.actionLatencyMsRecent.length > ACTION_LATENCY_SAMPLE_MAX) {
    stats.actionLatencyMsRecent.splice(0, stats.actionLatencyMsRecent.length - ACTION_LATENCY_SAMPLE_MAX);
  }
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx] ?? 0;
}

function computeLevelsSignature(state: GameState): string {
  if (!state.levels?.length) return "none";
  return state.levels.map((lvl) => lvl.tiles.length).join(",");
}

function syncBroadcastPlayerCache(room: Room, players: Player[]): void {
  room.lastBroadcastPlayerJsonById.clear();
  for (const p of players) {
    room.lastBroadcastPlayerJsonById.set(p.id, JSON.stringify(p));
  }
}

function syncBroadcastLogCache(room: Room): void {
  room.lastBroadcastLogLength = room.state.log.length;
  room.lastBroadcastLogSeq = room.state.logSeq ?? room.state.log.length;
}

function stateFieldJson(state: GameState, key: (typeof BROADCAST_DELTA_FIELD_KEYS)[number]): string {
  const value = state[key];
  return JSON.stringify(value ?? null);
}

function syncBroadcastFieldCache(room: Room): void {
  for (const key of BROADCAST_DELTA_FIELD_KEYS) {
    room.lastBroadcastFieldJson.set(key, stateFieldJson(room.state, key));
  }
}

function appendChangedStateFields(room: Room, patch: GameStateDeltaPatch): void {
  for (const key of BROADCAST_DELTA_FIELD_KEYS) {
    const json = stateFieldJson(room.state, key);
    if (room.lastBroadcastFieldJson.get(key) === json) continue;
    (patch as Record<string, unknown>)[key] = room.state[key];
  }
}

function appendBurstArrayDelta(
  room: Room,
  field: "playerEmoteBursts" | "playerKlunkBursts",
  lengthKey: "lastBroadcastEmoteBurstLength" | "lastBroadcastKlunkBurstLength",
  partialKey: "emoteBurstsPartial" | "klunkBurstsPartial",
  patch: GameStateDeltaPatch,
): void {
  const arr = room.state[field] ?? [];
  const prevLen = room[lengthKey];
  const patchRec = patch as Record<string, unknown>;
  if (arr.length < prevLen) {
    patchRec[field] = arr;
    return;
  }
  if (arr.length > prevLen) {
    patchRec[field] = arr.slice(prevLen);
    patchRec[partialKey] = true;
    return;
  }
  if (prevLen > 0 && arr.length === prevLen) {
    const last = arr[arr.length - 1];
    const cachedLastAt = room.lastBroadcastFieldJson.get(`${field}:lastAt`);
    if (last && String(last.at) !== cachedLastAt) {
      patchRec[field] = arr;
    }
  }
}

function appendBurstDeltas(room: Room, patch: GameStateDeltaPatch): void {
  appendBurstArrayDelta(
    room,
    "playerEmoteBursts",
    "lastBroadcastEmoteBurstLength",
    "emoteBurstsPartial",
    patch,
  );
  appendBurstArrayDelta(
    room,
    "playerKlunkBursts",
    "lastBroadcastKlunkBurstLength",
    "klunkBurstsPartial",
    patch,
  );
}

function syncBroadcastBurstCache(room: Room): void {
  const emotes = room.state.playerEmoteBursts ?? [];
  const klunks = room.state.playerKlunkBursts ?? [];
  room.lastBroadcastEmoteBurstLength = emotes.length;
  room.lastBroadcastKlunkBurstLength = klunks.length;
  const emoteLast = emotes[emotes.length - 1];
  const klunkLast = klunks[klunks.length - 1];
  room.lastBroadcastFieldJson.set("playerEmoteBursts:lastAt", emoteLast ? String(emoteLast.at) : "");
  room.lastBroadcastFieldJson.set("playerKlunkBursts:lastAt", klunkLast ? String(klunkLast.at) : "");
}

function appendLogDelta(room: Room, patch: GameStateDeltaPatch): void {
  const logSeq = room.state.logSeq ?? room.state.log.length;
  const prevLen = room.lastBroadcastLogLength;
  const prevSeq = room.lastBroadcastLogSeq;
  if (logSeq <= prevSeq) return;

  const log = room.state.log;
  const atCap = log.length >= 200;

  if (log.length < prevLen) {
    patch.log = log;
    return;
  }

  if (log.length === prevLen && atCap) {
    const newest = log[log.length - 1];
    if (newest) {
      patch.log = [newest];
      patch.logPartial = true;
      patch.logTruncated = true;
    }
    return;
  }

  if (log.length > prevLen) {
    patch.log = log.slice(prevLen);
    patch.logPartial = true;
  }
}

function collectChangedPlayers(room: Room): { changed: Player[]; rosterChanged: boolean } {
  const currentIds = new Set(room.state.players.map((p) => p.id));
  const cachedIds = [...room.lastBroadcastPlayerJsonById.keys()];
  const rosterChanged =
    cachedIds.length !== currentIds.size || cachedIds.some((id) => !currentIds.has(id));
  if (rosterChanged) {
    return { changed: room.state.players, rosterChanged: true };
  }
  const changed: Player[] = [];
  for (const p of room.state.players) {
    const json = JSON.stringify(p);
    if (room.lastBroadcastPlayerJsonById.get(p.id) !== json) changed.push(p);
  }
  return { changed, rosterChanged: false };
}

export function getOrCreateRoom(code: string): { room: Room; created: boolean } {
  const roomCode = code.trim().toUpperCase();
  const existing = rooms.get(roomCode);
  if (existing) return { room: existing, created: false };
  const state = createEmptyLobby(roomCode);
  pushLogEntry(state, {
    message: `Ny lobby skapad (${roomCode}).`,
    key: LOG_MESSAGE_KEYS.lobbyCreated,
    params: { roomCode },
  });
  const room: Room = {
    code: roomCode,
    state,
    conns: new Set(),
    broadcastQueued: false,
    lastActivityAt: Date.now(),
    stateSeq: 0,
    levelsSignature: computeLevelsSignature(state),
    lastBroadcastPlayerJsonById: new Map(),
    lastBroadcastLogLength: 0,
    lastBroadcastLogSeq: 0,
    lastBroadcastFieldJson: new Map(),
    lastBroadcastEmoteBurstLength: 0,
    lastBroadcastKlunkBurstLength: 0,
  };
  rooms.set(roomCode, room);
  return { room, created: true };
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.trim().toUpperCase());
}

type TableHelloConfig = {
  turnSeconds?: number;
  reactionSeconds?: number;
  gameMode?: "bossKill";
  difficulty?: "lattol" | "folkol" | "starkol" | "imperial";
  hardcore?: boolean;
  allowLateJoin?: boolean;
  clearPlayersOnRematch?: boolean;
  boardSize?: "default" | "large" | "xlarge";
  levelCount?: number;
  maxHp?: number;
  startPant?: number;
  wakeLockBeforeStart?: boolean;
  disabledCardIds?: string[];
  cardCover?: string;
};

/** Applicera bordets hello-config (skapande, reconnect i lobby/ended). */
function applyTableHelloConfig(room: Room, config: TableHelloConfig): void {
  if (typeof config.turnSeconds === "number") {
    room.state.config.turnSeconds = clampConfigNumber("turnSeconds", config.turnSeconds);
  }
  if (typeof config.reactionSeconds === "number") {
    room.state.config.reactionSeconds = clampConfigNumber("reactionSeconds", config.reactionSeconds);
  }
  if (config.gameMode) {
    room.state.config.gameMode = config.gameMode;
  }
  if (config.difficulty) {
    room.state.config.difficulty = config.difficulty;
  }
  if (typeof config.hardcore === "boolean") {
    room.state.config.hardcore = config.hardcore;
  }
  if (typeof config.allowLateJoin === "boolean") {
    room.state.config.allowLateJoin = config.allowLateJoin;
  }
  if (typeof config.clearPlayersOnRematch === "boolean") {
    room.state.config.clearPlayersOnRematch = config.clearPlayersOnRematch;
  }
  if (config.boardSize) {
    room.state.config.boardSize = config.boardSize;
  }
  if (typeof config.levelCount === "number") {
    room.state.config.levelCount = Math.max(1, Math.min(5, Math.floor(config.levelCount)));
  }
  if (typeof config.maxHp === "number") {
    room.state.config.maxHp = clampConfigNumber("maxHp", config.maxHp);
  }
  if (typeof config.startPant === "number") {
    room.state.config.startPant = clampConfigNumber("startPant", config.startPant);
  }
  if (typeof config.wakeLockBeforeStart === "boolean") {
    room.state.config.wakeLockBeforeStart = config.wakeLockBeforeStart;
  }
  if (Array.isArray(config.disabledCardIds)) {
    room.state.config.disabledCardIds = Array.from(new Set(config.disabledCardIds.filter(Boolean)));
  }
  if (config.cardCover) {
    room.state.config.cardCover = config.cardCover;
  }
}

export function listPersistedRooms(): PersistedRoom[] {
  return [...rooms.values()].map((room) => ({
    code: room.code,
    state: room.state,
    lastActivityAt: room.lastActivityAt,
    stateSeq: room.stateSeq,
  }));
}

export function listRoomSummaries(): AdminRoomSummary[] {
  return [...rooms.values()].map((room) => ({
    code: room.code,
    phase: room.state.phase,
    players: room.state.players.length,
    connections: room.conns.size,
    lastActivityAt: room.lastActivityAt,
    stateSeq: room.stateSeq,
  }));
}

export function closeRoomByCode(code: string, reason = "stängd av admin"): boolean {
  const room = rooms.get(code.trim().toUpperCase());
  if (!room) return false;
  pushLogEntry(room.state, {
    message: `Lobby stängdes (${reason}).`,
    key: LOG_MESSAGE_KEYS.lobbyClosed,
    params: { reason },
  });
  for (const conn of room.conns) {
    try {
      conn.ws.close();
    } catch {
      // ignore
    }
  }
  rooms.delete(room.code);
  return true;
}

export function restorePersistedRooms(entries: PersistedRoom[]): number {
  let restored = 0;
  for (const entry of entries) {
    if (!entry?.code || !entry.state) continue;
    const code = entry.code.trim().toUpperCase();
    if (!code) continue;
    const state = entry.state;
    normalizeLoadedGameState(state);
    const room: Room = {
      code,
      state,
      conns: new Set(),
      broadcastQueued: false,
      lastActivityAt: Number.isFinite(entry.lastActivityAt) ? entry.lastActivityAt : Date.now(),
      stateSeq: Number.isFinite(entry.stateSeq) ? Math.max(0, Math.floor(entry.stateSeq)) : 0,
      levelsSignature: computeLevelsSignature(state),
      lastBroadcastPlayerJsonById: new Map(),
      lastBroadcastLogLength: 0,
      lastBroadcastLogSeq: 0,
      lastBroadcastFieldJson: new Map(),
      lastBroadcastEmoteBurstLength: 0,
      lastBroadcastKlunkBurstLength: 0,
    };
    rooms.set(code, room);
    restored += 1;
  }
  return restored;
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
  syncBroadcastPlayerCache(room, room.state.players);
  syncBroadcastLogCache(room);
  syncBroadcastFieldCache(room);
  syncBroadcastBurstCache(room);
  const payload = JSON.stringify({ type: "state", state: room.state, seq: room.stateSeq });
  stats.broadcastsSent += 1;
  stats.bytesSent += payload.length;
  sendPayload(conn, payload);
}

/** Normalisera spelstate före snapshot (reconnect/omstart). Returnerar true om state ändrades. */
export function prepareRoomStateForClients(room: Room): boolean {
  const before = JSON.stringify({
    pending: room.state.pending,
    deferredPending: room.state.deferredPending ?? null,
    offTurnPersonalPending: room.state.offTurnPersonalPending ?? null,
    players: room.state.players.map((p) => ({
      id: p.id,
      pendingBrewerPerkLevels: p.pendingBrewerPerkLevels ?? 0,
      brewerPerkLevelsClaimed: p.brewerPerkLevelsClaimed ?? 0,
    })),
  });
  normalizeLoadedGameState(room.state);
  const after = JSON.stringify({
    pending: room.state.pending,
    deferredPending: room.state.deferredPending ?? null,
    offTurnPersonalPending: room.state.offTurnPersonalPending ?? null,
    players: room.state.players.map((p) => ({
      id: p.id,
      pendingBrewerPerkLevels: p.pendingBrewerPerkLevels ?? 0,
      brewerPerkLevelsClaimed: p.brewerPerkLevelsClaimed ?? 0,
    })),
  });
  if (before === after) return false;
  room.stateSeq += 1;
  room.lastActivityAt = Date.now();
  return true;
}

function buildStateDelta(room: Room): { seq: number; patch: GameStateDeltaPatch } {
  const levelsSig = computeLevelsSignature(room.state);
  const includeLevels = levelsSig !== room.levelsSignature;
  room.levelsSignature = levelsSig;

  const { changed: changedPlayers, rosterChanged } = collectChangedPlayers(room);
  const patch: GameStateDeltaPatch = {
    ...(includeLevels ? { levels: room.state.levels } : {}),
  };
  appendChangedStateFields(room, patch);

  // rosterChanged måste skickas även när players=[] (annars behåller klienterna gamla spelare).
  if (rosterChanged) {
    patch.players = room.state.players;
    syncBroadcastPlayerCache(room, room.state.players);
  } else if (changedPlayers.length > 0) {
    if (changedPlayers.length < room.state.players.length) {
      patch.players = changedPlayers;
      patch.playersPartial = true;
      for (const p of changedPlayers) {
        room.lastBroadcastPlayerJsonById.set(p.id, JSON.stringify(p));
      }
    } else {
      patch.players = room.state.players;
      syncBroadcastPlayerCache(room, room.state.players);
    }
  }

  appendLogDelta(room, patch);
  appendBurstDeltas(room, patch);

  return { seq: room.stateSeq, patch };
}

export function broadcastState(room: Room): void {
  const delta = buildStateDelta(room);
  const payload = JSON.stringify({ type: "stateDelta", ...delta });
  stats.broadcastsSent += 1;
  stats.bytesSent += payload.length;
  for (const c of room.conns) sendPayload(c, payload);
  syncBroadcastLogCache(room);
  syncBroadcastFieldCache(room);
  syncBroadcastBurstCache(room);
  room.lastActivityAt = Date.now();
}

export function scheduleBroadcastState(room: Room): void {
  if (room.broadcastQueued) {
    room.broadcastQueuedAgain = true;
    return;
  }
  room.broadcastQueued = true;
  setTimeout(() => {
    room.broadcastQueued = false;
    broadcastState(room);
    if (room.broadcastQueuedAgain) {
      room.broadcastQueuedAgain = false;
      scheduleBroadcastState(room);
    }
  }, 16).unref?.();
}

export function sendError(ws: WebSocket, message: string): void {
  ws.send(JSON.stringify({ type: "error", message }));
}

/** Skicka sessionEnded och stäng controller — så mobilen inte auto-reconnectar in i lobbyn igen. */
export function disconnectControllerSession(
  room: Room,
  conn: ClientConn,
  reason: "kicked" | "lobbyCleared",
): void {
  try {
    if (conn.ws.readyState === conn.ws.OPEN) {
      conn.ws.send(JSON.stringify({ type: "sessionEnded", reason }));
    }
  } catch {
    // ignore
  }
  try {
    // 4001 = kicked, 4002 = lobby cleared (privat app-intervall).
    conn.ws.close(reason === "lobbyCleared" ? 4002 : 4001);
  } catch {
    // ignore
  }
  room.conns.delete(conn);
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
  actionLatencyMs: { sampleSize: number; p50: number; p95: number; p99: number };
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
    actionLatencyMs: {
      sampleSize: stats.actionLatencyMsRecent.length,
      p50: percentile(stats.actionLatencyMsRecent, 50),
      p95: percentile(stats.actionLatencyMsRecent, 95),
      p99: percentile(stats.actionLatencyMsRecent, 99),
    },
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
  trusted?: boolean;
  requestedPlayerId?: string;
  config?: {
    turnSeconds?: number;
    reactionSeconds?: number;
    gameMode?: "bossKill";
    difficulty?: "lattol" | "folkol" | "starkol" | "imperial";
    hardcore?: boolean;
    allowLateJoin?: boolean;
    clearPlayersOnRematch?: boolean;
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

  /**
   * Bordets hello bär lobbyinställningar. Applicera inte bara vid `created` —
   * reconnect / Strict Mode / återställd snapshot hoppar annars över t.ex. clearPlayersOnRematch.
   */
  if (
    params.role === "table" &&
    params.config &&
    (created || room.state.phase === "lobby" || room.state.phase === "ended")
  ) {
    applyTableHelloConfig(room, params.config);
    if (created) {
      pushLogEntry(room.state, {
        message: `Värden sparade lobbyinställningar.`,
        key: LOG_MESSAGE_KEYS.lobbySettingsSaved,
      });
    }
  }

  const existingPlayerId =
    params.requestedPlayerId &&
    room.state.players.some((p) => p.id === params.requestedPlayerId)
      ? params.requestedPlayerId
      : null;

  const controllerHasOpenConn = (pid: string) =>
    [...room.conns].some(
      (c) => c.role === "controller" && c.playerId === pid && c.ws.readyState === c.ws.OPEN,
    );

  /** Namn-baserad återanslutning om klient saknar `playerId` i hello (sessionStorage). */
  let reconnectPlayerIdByName: string | null = null;
  if (!existingPlayerId && params.role === "controller") {
    const wanted = normalizePlayerName(params.playerName);
    const candidates = room.state.players.filter((p) => normalizePlayerName(p.name) === wanted);
    if (candidates.length === 1) {
      const candidateId = candidates[0]!.id;
      if (!controllerHasOpenConn(candidateId)) reconnectPlayerIdByName = candidateId;
    } else if (candidates.length > 1 && room.state.phase !== "lobby") {
      /** Under parti: om exakt en namnkopia saknar öppen mobilanslutning — koppla dit (två “Erik” m.m.). */
      const lackingLiveController = candidates.filter((p) => !controllerHasOpenConn(p.id));
      if (lackingLiveController.length === 1) {
        reconnectPlayerIdByName = lackingLiveController[0]!.id;
      }
    }
  }

  const playerId = existingPlayerId ?? reconnectPlayerIdByName ?? uuidv4();

  const addFreshLobbySlot = params.role === "controller" && !existingPlayerId && !reconnectPlayerIdByName;
  const allowLateJoin =
    room.state.phase === "playing" && room.state.config.allowLateJoin === true;
  if (addFreshLobbySlot && room.state.phase !== "lobby" && !allowLateJoin) {
    return {
      error:
        "Spelet pågår redan och vi kunde inte återkänna din spelare (ingen sparad anslutning). Öppna från samma flik/enhet som tidigare. Om flera spelare har samma namn: välj olika namn nästa gång eller behåll denna webbläsarflik.",
    };
  }

  // Bord-vyn är spectator: den ska inte bli en spelare.
  if (params.role === "controller") {
    if (addFreshLobbySlot) {
      const isFirstPlayer = room.state.players.length === 0;
      if (room.state.phase === "playing") {
        const addRes = playingAddPlayer(room.state, {
          id: playerId,
          name: params.playerName,
        });
        if (addRes.error) return { error: addRes.error };
        room.state = addRes.state;
      } else {
        const addRes = lobbyAddPlayer(room.state, {
          id: playerId,
          name: params.playerName,
          isHost: isFirstPlayer,
        });
        if (addRes.error) return { error: addRes.error };
        room.state = addRes.state;
      }
    } else {
      // reconnect / befintlig slot
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
    trusted: !!params.trusted,
  };
  room.conns.add(conn);
  room.lastActivityAt = Date.now();
  if (addFreshLobbySlot && (room.state.phase === "lobby" || room.state.phase === "playing")) {
    room.stateSeq += 1;
    broadcastState(room);
  }
  return { conn, room };
}

function removePlayerFromRoomState(
  state: GameState,
  playerId: string,
  opts?: { purgeSlot?: boolean },
): GameState["players"][number] | null {
  const leaving = state.players.find((p) => p.id === playerId);
  if (!leaving) return null;
  const purgeSlot = opts?.purgeSlot === true;
  /** «Ge upp» / frånkoppling efter stupad bryggare: behåll slot + stats för sluttabellen; bordets kick tar bort helt. */
  const keepEliminatedGhost =
    !purgeSlot &&
    leaving.eliminated === true &&
    (state.phase === "playing" || state.phase === "ended");
  /** Frivillig «Lämna spel» under parti: behåll namn + stats på sluttabellen med ikon. */
  const keepVoluntaryGhost =
    !purgeSlot &&
    leaving.eliminated !== true &&
    (state.phase === "playing" || state.phase === "ended");

  const removedTurnIndex = state.turnOrder.indexOf(playerId);
  const hadActiveTurn = removedTurnIndex >= 0 && removedTurnIndex === state.currentTurnIndex;
  if (!keepEliminatedGhost && !keepVoluntaryGhost) {
    state.players = state.players.filter((p) => p.id !== playerId);
  } else if (keepVoluntaryGhost) {
    leaving.leftVoluntarily = true;
  }
  state.turnOrder = state.turnOrder.filter((id) => id !== playerId);
  state.sipNotices = (state.sipNotices ?? []).filter((n) => n.recipientId !== playerId);
  state.tableItemPlayReveals = (state.tableItemPlayReveals ?? []).filter(
    (r) => r.actorId !== playerId && r.targetPlayerId !== playerId,
  );

  if (state.turnOrder.length === 0) {
    state.currentTurnIndex = 0;
  } else {
    // If someone before current turn is removed, shift index left so same active player keeps turn.
    if (removedTurnIndex >= 0 && removedTurnIndex < state.currentTurnIndex) {
      state.currentTurnIndex -= 1;
    }
    // If active player disconnects/leaves, keep index so next player in order takes turn.
    if (hadActiveTurn && state.currentTurnIndex >= state.turnOrder.length) {
      state.currentTurnIndex = 0;
    }
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

  if (state.phase === "playing") {
    const activeRemaining = state.players.filter((p) => !p.eliminated && !p.leftVoluntarily);
    if (activeRemaining.length <= 1) {
      const winner = activeRemaining[0] ?? null;
      state.phase = "ended";
      state.pending = null;
      state.winnerId = winner?.id ?? null;
      state.winnerName = winner?.name ?? null;
    }
  }
  return leaving;
}

export function forceRemovePlayer(room: Room, playerId: string, reason: string): boolean {
  const leaving = removePlayerFromRoomState(room.state, playerId);
  if (!leaving) return false;
  room.stateSeq += 1;
  room.lastActivityAt = Date.now();
  pushLogEntry(room.state, {
    message: `${leaving.name} lämnade spelet (${reason}).`,
    key: LOG_MESSAGE_KEYS.lobbyPlayerLeftReason,
    params: { name: leaving.name, reason },
  });
  for (const c of [...room.conns]) {
    if (c.role === "controller" && c.playerId === playerId) {
      try {
        c.ws.close();
      } catch {
        // ignore
      }
      room.conns.delete(c);
    }
  }
  return true;
}

export function hasControllerConnection(room: Room, playerId: string): boolean {
  for (const c of room.conns) {
    if (c.role === "controller" && c.playerId === playerId) return true;
  }
  return false;
}

/** Minst en öppen storskärmsanslutning (`as: table`) — krävs för att starta parti. */
export function hasOpenTableConnection(room: Room): boolean {
  for (const c of room.conns) {
    if (c.role === "table" && c.ws.readyState === c.ws.OPEN) return true;
  }
  return false;
}

export function handleAction(room: Room, conn: ClientConn, raw: unknown): string | null {
  const startedAt = Date.now();
  stats.actionsHandled += 1;
  room.stateSeq += 1;
  room.lastActivityAt = Date.now();
  const action = raw as ClientAction | { type?: string };
  const privilegedActionTypes = new Set(["startGame", "setConfig", "tableKickPlayer", "returnToLobby"]);
  try {
    if (action?.type && privilegedActionTypes.has(action.type) && !conn.trusted) {
      stats.actionErrors += 1;
      return "Saknar behörighet för denna åtgärd.";
    }

    if (action?.type === "leaveGame") {
      const leaving = removePlayerFromRoomState(room.state, conn.playerId);
      if (!leaving) return null;
      pushLogEntry(room.state, {
        message: `${leaving.name} lämnade spelet.`,
        key: LOG_MESSAGE_KEYS.lobbyPlayerLeft,
        params: { name: leaving.name },
      });
      scheduleBroadcastState(room);
      return null;
    }

    if (action?.type === "tableKickPlayer") {
      if (conn.role !== "table") return "Endast bordet kan ta bort en spelare";
      const targetId = (action as { targetPlayerId?: unknown }).targetPlayerId;
      if (typeof targetId !== "string" || targetId.length === 0) return "Ogiltig spelare";
      const leaving = removePlayerFromRoomState(room.state, targetId, { purgeSlot: true });
      if (!leaving) return "Spelaren finns inte";
      pushLogEntry(room.state, {
        message: `${leaving.name} togs bort från spelet (bordet).`,
        key: LOG_MESSAGE_KEYS.lobbyPlayerKicked,
        params: { name: leaving.name },
      });
      for (const c of [...room.conns]) {
        if (c.role === "controller" && c.playerId === targetId) {
          disconnectControllerSession(room, c, "kicked");
        }
      }
      scheduleBroadcastState(room);
      return null;
    }

    if (action?.type === "returnToLobby") {
      if (conn.role !== "table") return "Endast bordet kan starta nytt spel";
      if (room.state.phase !== "ended") return "Spelet är inte slut";
      const res = returnToLobby(room.state);
      if (res.error) return res.error;
      room.state = res.state;
      if (room.state.config.clearPlayersOnRematch === true) {
        for (const c of [...room.conns]) {
          if (c.role === "controller") {
            disconnectControllerSession(room, c, "lobbyCleared");
          }
        }
      }
      scheduleBroadcastState(room);
      return null;
    }

    if (room.state.phase === "lobby" && action?.type === "startGame") {
      if (!hasOpenTableConnection(room)) {
        stats.actionErrors += 1;
        return "Storskärmen måste vara ansluten innan spelet kan starta.";
      }
      const seed = Math.floor(Math.random() * 1_000_000_000);
      const res = startGame(room.state, conn.playerId, seed);
      if (res.error) return res.error;
      room.state = res.state;
      scheduleBroadcastState(room);
      return null;
    }

    const res = applyAction(room.state, action as ClientAction);
    room.state = res.state;
    scheduleBroadcastState(room);
    if (res.error) {
      stats.actionErrors += 1;
      return res.error;
    }
    return null;
  } finally {
    observeActionLatency(Date.now() - startedAt);
  }
}

