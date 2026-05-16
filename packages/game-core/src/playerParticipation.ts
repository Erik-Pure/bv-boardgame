import type { Player } from "./types.js";

/** Spelare som fortfarande deltar (målval, team battle, stridsingripande). */
export function isPlayerActiveInMatch(p: Player): boolean {
  if (p.eliminated) return false;
  if (p.leftVoluntarily) return false;
  if (p.hp <= 0) return false;
  return true;
}

/** Spelare vars pjäs ska visas på brädet / i turbanner som ute. */
export function isPlayerOnBoard(p: Player): boolean {
  if (p.eliminated) return false;
  if (p.leftVoluntarily) return false;
  return true;
}

/** Fel om mål är en annan spelare som inte är aktiv i matchen. */
export function errorIfInactiveOtherPlayerTarget(
  target: Player | null | undefined,
  actorId: string,
): string | null {
  if (!target || target.id === actorId) return null;
  if (!isPlayerActiveInMatch(target)) return "Målet är inte tillgängligt.";
  return null;
}
