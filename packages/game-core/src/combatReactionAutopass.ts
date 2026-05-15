import { clampConfigNumber, CONFIG_NUMERIC } from "./configConstraints.js";
import type { GameState, ItemId, Pending, Player } from "./types.js";

const DEFAULT_COMBAT_REACTION_TIMEOUT_MS = CONFIG_NUMERIC.reactionSeconds.default * 1000;

const COMBAT_REACTION_PLAYABLE_ITEM_IDS: ReadonlySet<ItemId> = new Set([
  "weak_beer",
  "light_beer",
  "folk_beer",
  "tripwire",
  "double_hops",
  "beer_bomb",
  "manopositiv",
  "hangover",
  "monster_hype",
  "yeast_sabotage",
  "beer_bro",
  "lengraddad",
  "not_my_round",
  "spill_intentional",
  "get_lucky",
  "paidassasin",
]);

const ITEM_PLAY_GOLD_COST: Partial<Record<ItemId, number>> = {
  six_sense: 5,
  get_lucky: 5,
  manopositiv: 10,
  beard_back: 5,
  rigged_game: 5,
  spill_intentional: 2,
  bribes: 10,
  paidassasin: 15,
  shuffle: 10,
};

export function itemPlayGoldCost(itemId: ItemId): number {
  return Math.max(0, Math.floor(ITEM_PLAY_GOLD_COST[itemId] ?? 0));
}

export function playerHasCombatReactionPlayableItem(
  player: Player,
  pending: Extract<Pending, { type: "combat" }>,
): boolean {
  return (player.inventory ?? []).some((it) => {
    if (!COMBAT_REACTION_PLAYABLE_ITEM_IDS.has(it.itemId)) return false;
    const cost = itemPlayGoldCost(it.itemId);
    if (cost > 0 && player.gold < cost) return false;
    if (it.itemId === "beer_bro" && pending.assistId) return false;
    return true;
  });
}

/** Reaktorer utan spelbara ingripandekort markeras automatiskt som "gör inget". */
export function autoPassReactorsWithoutPlayableItems(
  state: GameState,
  pending: Extract<Pending, { type: "combat" }>,
): void {
  pending.reacted ??= {};
  for (const rid of pending.reactors ?? []) {
    if (pending.reacted[rid] === "intervened") continue;
    const reactor = state.players.find((p) => p.id === rid);
    if (!reactor) {
      pending.reacted[rid] = "pass";
      continue;
    }
    if (!playerHasCombatReactionPlayableItem(reactor, pending)) {
      pending.reacted[rid] = "pass";
    }
  }
}

function combatReactionTimeoutMs(config: GameState["config"]): number {
  const sec = Number(config.reactionSeconds);
  if (!Number.isFinite(sec)) return DEFAULT_COMBAT_REACTION_TIMEOUT_MS;
  return clampConfigNumber("reactionSeconds", sec) * 1000;
}

/** Samma som `combatIntroAck`: gå från fiendeintro till reaktionsfas med deadline och auto-pass. */
export function beginCombatReactionsPhase(
  state: GameState,
  pending: Extract<Pending, { type: "combat" }>,
): void {
  pending.phase = "reactions";
  pending.reactionsDeadlineAt = Date.now() + combatReactionTimeoutMs(state.config);
  pending.teamRolls = {};
  autoPassReactorsWithoutPlayableItems(state, pending);
}
