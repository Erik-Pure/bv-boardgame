import type { GameState } from "@bv/game-core";

function isFoundItemRevealCardId(cardId: string): boolean {
  return cardId.startsWith("event_find_item_") || cardId.startsWith("treasure_item_");
}

/** Händelse-/storykort: monsterlik ram på bord + mobil (ej skatt, strid, dörr, gömd pryl). */
export function isEventStoryCardPending(p: Extract<GameState["pending"], { type: "card" }>): boolean {
  if (p.cardId === "combat_win" || p.cardId === "combat_lose") return false;
  if (isFoundItemRevealCardId(p.cardId)) return false;
  if (p.kind === "treasure") return false;
  if (p.cardId === "door_locked") return false;
  return true;
}
