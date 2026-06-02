import { brewerLevelFromXp } from "./brewerXp.js";
import type { GameState, Pending } from "./types.js";

/** Sant om spelaren fortfarande kan (och ska) få detta vånings-nivå-upp-erbjudande. */
export function isLevelUpOfferStillValid(
  state: GameState,
  playerId: string,
  offer: Extract<Pending, { type: "levelUpOffer" }>,
): boolean {
  if (offer.playerId !== playerId) return false;
  const p = state.players.find((x) => x.id === playerId);
  if (!p) return false;
  const targetLevelIndex = p.levelIndex + 1;
  if (targetLevelIndex >= state.levels.length) return false;
  const requiredBrewerLevel = targetLevelIndex;
  if (brewerLevelFromXp(p.xp ?? 0) < requiredBrewerLevel) return false;
  return offer.targetLevelIndex === targetLevelIndex;
}

export function dismissInvalidLevelUpOffersForPlayer(state: GameState, playerId: string): void {
  const stale = (offer: Pending | null | undefined): boolean => {
    if (offer?.type !== "levelUpOffer" || offer.playerId !== playerId) return false;
    return !isLevelUpOfferStillValid(state, playerId, offer);
  };
  if (stale(state.pending)) state.pending = null;
  if (stale(state.offTurnPersonalPending)) state.offTurnPersonalPending = null;
  if (stale(state.deferredPending)) state.deferredPending = null;
}
