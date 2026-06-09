import type { Player } from "./types.js";

/** Spelarens pantsaldo i UI (DESIGN_SPEC: «pant»). State-fältet heter fortfarande `gold`. */
export function playerPant(player: Pick<Player, "gold"> | null | undefined): number {
  return Math.max(0, Math.floor(player?.gold ?? 0));
}

export function canAffordPant(player: Pick<Player, "gold"> | null | undefined, cost: number): boolean {
  return playerPant(player) >= Math.max(0, Math.floor(cost));
}
