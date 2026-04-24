import type { GameState, Player } from "./types.js";

const INTERVENE_ITEM_IDS = new Set<string>([
  "weak_beer",
  "light_beer",
  "folk_beer",
  "tripwire",
  "double_hops",
  "beer_bomb",
  "manopositiv",
  "hangover",
  "beer_bro",
  "monster_hype",
  "yeast_sabotage",
  "get_lucky",
]);

/** Levande bryggare får ingripa i andras strider (inte stupad / 0 HP). */
export function playerCanCombatIntervene(p: Player): boolean {
  if (p.eliminated) return false;
  if (p.hp <= 0) return false;
  return true;
}

export function combatReactorsFor(state: GameState, attackerId: string, assistId?: string): string[] {
  return state.players
    .filter((x) => x.id !== attackerId && x.id !== assistId)
    .filter(playerCanCombatIntervene)
    .filter((x) => (x.inventory ?? []).some((it) => INTERVENE_ITEM_IDS.has(String(it.itemId))))
    .map((x) => x.id);
}
