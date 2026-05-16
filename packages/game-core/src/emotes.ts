import type { EmoteId, PlayerEmoteBurst } from "./types.js";

export const EMOTE_COOLDOWN_MS = 5000;
export const EMOTE_DISPLAY_MS = 3600;

export const EMOTE_IDS: readonly EmoteId[] = ["surprised", "happy", "sad", "angry", "love"] as const;

export const EMOTE_ICON_SRC: Record<EmoteId, string> = {
  surprised: "/icons/emote-suprised.svg",
  happy: "/icons/emote-happy.svg",
  sad: "/icons/emote-sad.svg",
  angry: "/icons/emote-angry.svg",
  love: "/icons/emote-love.svg",
};

export function isEmoteId(value: string): value is EmoteId {
  return (EMOTE_IDS as readonly string[]).includes(value);
}

/** Stabil liten rotation per burst (ca −7° … +7°) för bräd-animationen. */
export function emoteBurstRotationDeg(burst: Pick<PlayerEmoteBurst, "playerId" | "at">): number {
  let h = burst.at;
  for (let i = 0; i < burst.playerId.length; i++) {
    h = Math.imul(h, 31) + burst.playerId.charCodeAt(i);
  }
  return (h % 15) - 7;
}

export function prunePlayerEmoteBursts(
  bursts: readonly PlayerEmoteBurst[],
  now: number,
): PlayerEmoteBurst[] {
  const minAt = now - EMOTE_DISPLAY_MS;
  return bursts.filter((b) => b.at >= minAt);
}

export function latestEmoteBurstForPlayer(
  bursts: readonly PlayerEmoteBurst[] | undefined,
  playerId: string,
  now: number,
): PlayerEmoteBurst | null {
  const pruned = prunePlayerEmoteBursts(bursts ?? [], now);
  let latest: PlayerEmoteBurst | null = null;
  for (const b of pruned) {
    if (b.playerId !== playerId) continue;
    if (!latest || b.at > latest.at) latest = b;
  }
  return latest;
}
