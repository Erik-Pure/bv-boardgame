import type { GameState, PenaltySipQueueEntry, SipNoticeKind } from "./types.js";

/** Textrad för sip-modal när klunk för vapen-extraattack köats till efter stridskortet. */
export function weaponBoostPenaltySipNoticeBody(
  weaponName: string | undefined,
  klunkCount: number,
  enemyName: string,
): string {
  const w = weaponName?.trim() || "vapnet";
  const n = Math.max(1, Math.floor(klunkCount));
  const klunkPhrase = n === 1 ? "En straffklunk" : `${n} straffklunkar`;
  const namnIFras = w.toLowerCase() === "ölsejdel" ? "ölsejdeln" : w;
  const fiende = enemyName.trim() || "monstret";
  const xp = n * 10;
  return `${klunkPhrase} från ${namnIFras} — du valde extraattack (klunk) före tärningsslaget mot ${fiende}. +${xp} XP.`;
}

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
    const body = e.noticeBody?.trim();
    if (body) {
      const title = e.noticeTitle?.trim() || "Straffklunk";
      pushPlayerNotice(
        state,
        e.recipientId,
        e.fromPlayerName,
        title,
        body,
        e.noticeKind ?? "custom",
        e.klunkCount,
      );
    } else {
      pushSipNotice(state, e.recipientId, e.fromPlayerName, e.klunkCount);
    }
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
  klunkCount?: number,
): void {
  state.sipNotices ??= [];
  const n =
    klunkCount != null ? Math.max(1, Math.floor(klunkCount)) : undefined;
  state.sipNotices.push({
    recipientId,
    fromPlayerName,
    title,
    body,
    noticeKind,
    ...(n != null ? { klunkCount: n } : {}),
  });
}
