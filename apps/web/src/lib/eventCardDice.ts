import type { GameState } from "@bv/game-core";

type PendingEventCard = Extract<NonNullable<GameState["pending"]>, { type: "card" }>;

/** Parsar slaget från uppdaterad korttext efter `chooseCardOption` / roll-val. */
export function parseRolledDieFromCardText(text: string): number | null {
  const m = /Tärning:\s*(\d+)/i.exec(text);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.min(6, Math.round(n)));
}

/** Nyckel för bräd-SFX när ett händelsekort med tärningsslag fått resultat. */
export function eventCardDiceSfxKey(pending: PendingEventCard | null): string | null {
  if (!pending || pending.kind !== "event") return null;
  const die = parseRolledDieFromCardText(pending.text);
  if (die == null) return null;
  return `${pending.cardId}:${pending.playerId}:${die}`;
}
