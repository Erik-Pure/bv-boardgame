import type { GameState, PlayerKlunkBurst } from "./types.js";

export const KLUNK_BURST_DISPLAY_MS = 3600;
export const KLUNK_BURST_ICON_SRC = "/icons/klunk.svg";

export function prunePlayerKlunkBursts(
  bursts: readonly PlayerKlunkBurst[],
  now: number,
): PlayerKlunkBurst[] {
  const minAt = now - KLUNK_BURST_DISPLAY_MS;
  return bursts.filter((b) => b.at >= minAt);
}

export function latestKlunkBurstForPlayer(
  bursts: readonly PlayerKlunkBurst[] | undefined,
  playerId: string,
  now: number,
): PlayerKlunkBurst | null {
  const pruned = prunePlayerKlunkBursts(bursts ?? [], now);
  let latest: PlayerKlunkBurst | null = null;
  for (const b of pruned) {
    if (b.playerId !== playerId) continue;
    if (!latest || b.at > latest.at) latest = b;
  }
  return latest;
}

/** Stabil liten rotation per burst (samma idé som emotes på brädet). */
export function klunkBurstRotationDeg(burst: Pick<PlayerKlunkBurst, "playerId" | "at">): number {
  let h = burst.at ^ 0x9e3779b9;
  for (let i = 0; i < burst.playerId.length; i++) {
    h = Math.imul(h, 31) + burst.playerId.charCodeAt(i);
  }
  return (h % 15) - 7;
}

/** Straffklunk på bräd-tv: samma typ av ballong som emotes över spelarnamnet. */
export function recordPlayerKlunkBurst(state: GameState, playerId: string, klunkCount: number): void {
  const add = Math.max(1, Math.floor(klunkCount));
  const now = Date.now();
  const pruned = prunePlayerKlunkBursts(state.playerKlunkBursts ?? [], now);
  state.playerKlunkBursts = [...pruned, { playerId, at: now, klunkCount: add }];
}
