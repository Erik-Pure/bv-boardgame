import { parseRolledDieFromCardText, type GameState } from "@bv/game-core";

type PendingEventCard = Extract<NonNullable<GameState["pending"]>, { type: "card" }>;

export { parseRolledDieFromCardText };

/** Nyckel för bräd-SFX när ett händelsekort med tärningsslag fått resultat. */
export function eventCardDiceSfxKey(pending: PendingEventCard | null): string | null {
  if (!pending || pending.kind !== "event") return null;
  const die = parseRolledDieFromCardText(pending.text);
  if (die == null) return null;
  return `${pending.cardId}:${pending.playerId}:${die}`;
}
