import { recordPlayerKlunkBurst } from "./klunkBursts.js";
import type { GameState, PenaltySipQueueEntry, SipNoticeEntry, SipNoticeKind } from "./types.js";

export function playerHasPendingSipNotice(state: GameState, playerId: string): boolean {
  return (state.sipNotices ?? []).some((n) => n.recipientId === playerId);
}

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
  return `${klunkPhrase} från ${namnIFras}. +${xp} XP.`;
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
        e.noticeEquipmentName,
      );
    } else {
      /* Klunken toastades redan via kortets tableOutcomes — ingen dubbel toast på brädet. */
      pushSipNotice(state, e.recipientId, e.fromPlayerName, e.klunkCount, {
        suppressTableToast: true,
      });
    }
  }
}

/**
 * Antal klunk-ikoner på brädet när mottagaren stänger straffklunk-modalen (sipNoticeAck).
 * Toast och duell-förlust utan klunk ger null.
 */
export function klunkBurstCountForSipNotice(notice: SipNoticeEntry): number | null {
  if (notice.noticeKind === "toast" || notice.noticeKind === "duel_loss") return null;
  const hasCustomCopy = !!(notice.title?.trim() || notice.body?.trim());
  if (!hasCustomCopy) {
    return Math.max(1, Math.floor(notice.klunkCount ?? 1));
  }
  if (notice.klunkCount != null && notice.klunkCount > 0) {
    return Math.max(1, Math.floor(notice.klunkCount));
  }
  return null;
}

/** Bräd-tv: klunk-ballong + ljud när modalen stängs (mobil sipNoticeAck). */
export function recordKlunkBurstForSipNoticeAck(state: GameState, notice: SipNoticeEntry): void {
  const n = klunkBurstCountForSipNotice(notice);
  if (n == null) return;
  recordPlayerKlunkBurst(state, notice.recipientId, n);
}

export function pushSipNotice(
  state: GameState,
  recipientId: string,
  fromPlayerName: string,
  klunkCount = 1,
  opts?: { suppressTableToast?: boolean },
): void {
  state.sipNotices ??= [];
  const n = Math.max(1, Math.floor(klunkCount));
  state.sipNotices.push({
    recipientId,
    fromPlayerName,
    klunkCount: n,
    ...(opts?.suppressTableToast ? { suppressTableToast: true } : {}),
  });
}

export function pushPlayerNotice(
  state: GameState,
  recipientId: string,
  fromPlayerName: string,
  title: string,
  body: string,
  noticeKind: SipNoticeKind = "custom",
  klunkCount?: number,
  equipmentName?: string,
): void {
  state.sipNotices ??= [];
  const n =
    klunkCount != null ? Math.max(1, Math.floor(klunkCount)) : undefined;
  const artName = equipmentName?.trim();
  state.sipNotices.push({
    recipientId,
    fromPlayerName,
    title,
    body,
    noticeKind,
    ...(n != null ? { klunkCount: n } : {}),
    ...(artName ? { equipmentName: artName } : {}),
  });
}
