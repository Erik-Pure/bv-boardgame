import type { ItemId } from "@bv/game-core";

/** Mobil toast — text, eller rik toast med föremålsbild. */
export type PlayToastPayload = {
  message: string;
  itemId?: ItemId | string;
  /** Visas ovanför message när satt (t.ex. föremålsnamn). */
  itemTitle?: string;
};

export type ShowPlayToast = (payload: string | PlayToastPayload, durationMs?: number) => void;

export function normalizePlayToast(payload: string | PlayToastPayload): PlayToastPayload {
  if (typeof payload === "string") return { message: payload };
  return payload;
}
