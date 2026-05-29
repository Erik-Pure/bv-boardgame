import { recordBrewerLevelUpsAfterXp } from "./brewerPerk.js";
import type { GameState, Player } from "./types.js";
import { recordTotalKlunksGained } from "./sessionStats.js";

export const XP_PER_KLUNK = 10;

/** Lägger till klunkar + XP. Vid straffklunk kan tillbehör ge extra pant per klunk (`gainGoldPerPenaltyKlunk`). */
export function grantKlunkWithXp(
  state: GameState,
  player: Player,
  amount: number,
  options?: { penaltyStraff?: boolean },
): number {
  const add = Math.max(0, Math.floor(amount));
  if (add <= 0) return 0;
  const xpBefore = player.xp;
  player.klunkar += add;
  recordTotalKlunksGained(state, player.id, add);
  player.xp += add * XP_PER_KLUNK;
  recordBrewerLevelUpsAfterXp(state, player, xpBefore);
  if (options?.penaltyStraff === true) {
    const bonusPer = player.equipment.accessory?.gainGoldPerPenaltyKlunk ?? 0;
    if (bonusPer > 0) {
      player.gold += bonusPer * add;
    }
  }
  return add;
}
