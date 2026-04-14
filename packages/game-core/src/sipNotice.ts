import type { GameState, SipNoticeKind } from "./types.js";

export function pushSipNotice(
  state: GameState,
  recipientId: string,
  fromPlayerName: string,
  klunkCount = 1,
): void {
  state.sipNotices ??= [];
  const n = Math.max(1, Math.floor(klunkCount));
  state.sipNotices.push({ recipientId, fromPlayerName, klunkCount: n });
}

export function pushPlayerNotice(
  state: GameState,
  recipientId: string,
  fromPlayerName: string,
  title: string,
  body: string,
  noticeKind: SipNoticeKind = "custom",
): void {
  state.sipNotices ??= [];
  state.sipNotices.push({ recipientId, fromPlayerName, title, body, noticeKind });
}
