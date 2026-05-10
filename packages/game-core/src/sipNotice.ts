import type { GameState, PenaltySipQueueEntry, SipNoticeKind } from "./types.js";

/** Kombinera köposter när flera val/geändringar ger straffklunk på samma kort. */
export function mergePenaltySipQueue(
  existing: PenaltySipQueueEntry[] | undefined,
  additions: PenaltySipQueueEntry[],
): PenaltySipQueueEntry[] | undefined {
  if (additions.length === 0) return existing;
  return [...(existing ?? []), ...additions];
}

/** Tom sip-kön till state (en modal per post i ordning). */
export function flushPenaltySipQueue(state: GameState, entries: PenaltySipQueueEntry[] | undefined): void {
  if (!entries?.length) return;
  for (const e of entries) {
    pushSipNotice(state, e.recipientId, e.fromPlayerName, e.klunkCount);
  }
}

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
