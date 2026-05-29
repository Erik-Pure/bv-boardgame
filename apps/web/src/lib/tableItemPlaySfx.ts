import type { ItemId } from "@bv/game-core";

/**
 * Föremål mot annan spelare som ska ge dieroll-SFX på brädet.
 * Positiva (t.ex. Manopositiv, Ljusöl) → item1–3 även mot medspelare.
 * Synkad med `COMBAT_INTERVENE_EVIL_ITEM_IDS` / `PLAYABLE_DEBUFF_ITEM_IDS` i PlayView.
 */
const TABLE_ITEM_PLAY_DIE_ROLL_OTHER_IDS = new Set<ItemId>([
  "weak_beer",
  "tripwire",
  "hangover",
  "paidassasin",
  "monster_hype",
  "lengraddad",
  "not_my_round",
  "spill_intentional",
  "yeast_sabotage",
  "sleep_potion",
  "sip_card",
  "rigged_game",
  "split_the_g",
  "shuffle",
]);

export function tableItemPlayUsesDieRollSfx(
  itemId: ItemId,
  actorId: string,
  targetPlayerId?: string,
): boolean {
  if (!targetPlayerId || targetPlayerId === actorId) return false;
  return TABLE_ITEM_PLAY_DIE_ROLL_OTHER_IDS.has(itemId);
}
