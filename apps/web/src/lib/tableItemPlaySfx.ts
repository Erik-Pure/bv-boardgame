import type { ItemId } from "@bv/game-core";
import { isNegativeItemPlayOnOther } from "./itemPlayPolarity";

/**
 * Föremål mot annan spelare som ska ge dieroll-SFX på brädet.
 * Positiva (t.ex. Manopositiv, Ljusöl) → item1–3 även mot medspelare.
 * Synkad via `NEGATIVE_ITEM_PLAY_ON_OTHER_IDS` i itemPlayPolarity.
 */
export function tableItemPlayUsesDieRollSfx(
  itemId: ItemId,
  actorId: string,
  targetPlayerId?: string,
): boolean {
  if (!targetPlayerId || targetPlayerId === actorId) return false;
  return isNegativeItemPlayOnOther(itemId);
}
