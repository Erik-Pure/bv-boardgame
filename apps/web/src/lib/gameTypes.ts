import type { GameState, Pending, Player, ShopItem } from "@bv/game-core";

export function isGameState(x: unknown): x is GameState {
  return typeof x === "object" && x !== null && "phase" in x && "players" in x;
}

export type { GameState, Pending, Player, ShopItem };

