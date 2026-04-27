import type { GameConfig } from "@bv/game-core";

const KEY_PREFIX = "bv:lobbyConfigDraft:";

export type LobbyConfigDraft = Omit<GameConfig, "turnSeconds" | "gameMode">;

export function defaultLobbyConfigDraft(): LobbyConfigDraft {
  return {
    difficulty: "folkol",
    hardcore: false,
    boardSize: "default",
    levelCount: 3,
    maxHp: 10,
    startPant: 5,
    wakeLockBeforeStart: false,
    disabledCardIds: [],
    cardCover: "default",
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

export function consumeLobbyConfigDraft(roomCode: string): Partial<GameConfig> | undefined {
  try {
    const k = key(roomCode);
    const raw = window.sessionStorage.getItem(k);
    if (!raw) return undefined;
    window.sessionStorage.removeItem(k);
    const parsed = JSON.parse(raw) as LobbyConfigDraft;
    return parsed;
  } catch {
    return undefined;
  }
}
