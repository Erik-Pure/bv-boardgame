import { CONFIG_NUMERIC, type GameConfig } from "@bv/game-core";

const KEY_PREFIX = "bv:lobbyConfigDraft:";

export type LobbyConfigDraft = Omit<GameConfig, "turnSeconds" | "gameMode">;

export function defaultLobbyConfigDraft(): LobbyConfigDraft {
  return {
    difficulty: "folkol",
    reactionSeconds: CONFIG_NUMERIC.reactionSeconds.default,
    hardcore: false,
    boardSize: "default",
    levelCount: 3,
    maxHp: CONFIG_NUMERIC.maxHp.default,
    startPant: CONFIG_NUMERIC.startPant.default,
    wakeLockBeforeStart: false,
    disabledCardIds: [],
    cardCover: "card1",
  };
}

function key(roomCode: string): string {
  return `${KEY_PREFIX}${roomCode.toUpperCase()}`;
}

export function saveLobbyConfigDraft(roomCode: string, cfg: LobbyConfigDraft): void {
  try {
    window.sessionStorage.setItem(key(roomCode), JSON.stringify(cfg));
  } catch {
    // ignore
  }
}

export function readLobbyConfigDraft(roomCode: string): Partial<GameConfig> | undefined {
  try {
    const k = key(roomCode);
    const raw = window.sessionStorage.getItem(k);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as LobbyConfigDraft;
    return parsed;
  } catch {
    return undefined;
  }
}

export function clearLobbyConfigDraft(roomCode: string): void {
  try {
    window.sessionStorage.removeItem(key(roomCode));
  } catch {
    // ignore
  }
}
