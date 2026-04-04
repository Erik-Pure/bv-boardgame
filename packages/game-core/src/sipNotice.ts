import type { GameState } from "./types.js";

export function pushSipNotice(state: GameState, recipientId: string, fromPlayerName: string): void {
  state.sipNotices ??= [];
  state.sipNotices.push({ recipientId, fromPlayerName });
}
