import type { Player } from "@bv/game-core";

export function playerIgnoresCombatCritFailOnOne(player: Player | undefined | null): boolean {
  return player?.equipment.accessory?.ignoreCombatCritFailOnOne === true;
}

/** Etta som döskalle + «Kritisk miss» bara när servern markerat auto-förlust på etta. */
export function combatPreviewShowsSkullOnOne(previewCritFailOnOne: boolean | undefined): boolean {
  return previewCritFailOnOne === true;
}

/** Lagstrid före preview: Fyrklöver visar etta som siffra 1. */
export function combatTeamRollShowsSkullOnOne(roller: Player | undefined | null): boolean {
  return !playerIgnoresCombatCritFailOnOne(roller);
}
