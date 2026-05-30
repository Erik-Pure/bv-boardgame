import type { MutableRefObject } from "react";
import { brewerLevel, type GameState, type Player } from "@bv/game-core";
import { playTableSfx } from "./tableSfx";

export type PendingCard = Extract<NonNullable<GameState["pending"]>, { type: "card" }>;
type PendingCombat = Extract<NonNullable<GameState["pending"]>, { type: "combat" }>;

/** Kortmodal med flip — vila, händelse, skatt (ej tom gömma). */
export function tableCardUsesCardFlipSfx(card: PendingCard): boolean {
  if (card.kind === "rest" || card.kind === "event") return true;
  return card.kind === "treasure" && card.cardId !== "treasure_empty";
}

export function brewerDisplayLevel(player: Player): number {
  return Math.max(1, Math.floor(brewerLevel(player) || 0) + 1);
}

export function cardPendingKey(card: PendingCard): string {
  return `${card.cardId}:${card.playerId}`;
}

/** Strids-/boss-resultat — spela vinst/förlust-SFX direkt (ingen kortmodal-delay). */
export function isImmediateCombatOutcomeCard(card: PendingCard): boolean {
  return (
    card.cardId === "combat_win" ||
    card.cardId === "combat_lose" ||
    card.cardId === "boss_round_win" ||
    card.cardId === "boss_final_win"
  );
}

export function combatSessionKey(pending: PendingCombat): string {
  return `${pending.attackerId}-${pending.levelIndex}-${pending.tileIndex}-${pending.monsterId}`;
}

export function isCombatParticipant(pending: PendingCombat, playerId: string): boolean {
  if (pending.attackerId === playerId) return true;
  if (pending.assistId === playerId) return true;
  if (pending.teamRolls?.[playerId]) return true;
  if (pending.reactors?.includes(playerId)) return true;
  return false;
}

/** Spelare som aktivt kämpar i striden (inte bara reaktions-åskådare). */
export function isCombatFighter(pending: PendingCombat, playerId: string): boolean {
  if (pending.attackerId === playerId) return true;
  if (pending.assistId === playerId) return true;
  return false;
}

/** Mobil: spela föremålsljud för aktören, målet, eller stridens kämpande lag. */
export function shouldHearItemPlaySfx(
  state: GameState,
  localPlayerId: string | null,
  actorId: string | undefined,
  targetPlayerId?: string,
): boolean {
  if (!localPlayerId) return true;
  if (actorId === localPlayerId) return true;
  if (targetPlayerId && targetPlayerId !== actorId && targetPlayerId === localPlayerId) return true;
  const pend = state.pending;
  if (pend?.type === "combat" && isCombatFighter(pend, localPlayerId)) return true;
  return false;
}

export function lastTableItemRevealSeq(state: GameState): number | null {
  const reveals = state.tableItemPlayReveals;
  if (!reveals?.length) return null;
  return reveals[reveals.length - 1]!.seq;
}

/** Nyckel för PvE-stridstärning — ändras vid varje slag / rollPreview. */
export function combatMonsterDiceSfxKey(state: GameState): string | null {
  const pend = state.pending;
  if (pend?.type !== "combat" || !pend.monsterId) return null;
  if (pend.phase === "rollPreview") {
    return `pv:${pend.previewDie}:${pend.previewBroDie ?? ""}:${pend.previewTotal}`;
  }
  const teamRolls = pend.teamRolls;
  if (!teamRolls || Object.keys(teamRolls).length === 0) return null;
  if (pend.phase !== "reactions" && pend.phase !== "enemyIntro") return null;
  return `tr:${Object.entries(teamRolls)
    .filter((entry): entry is [string, NonNullable<(typeof teamRolls)[string]>] => entry[1] != null)
    .map(([id, r]) => `${id}:${r.die}`)
    .sort()
    .join(",")}`;
}

export function lastCombatReactionPlaySeq(state: GameState): number | null {
  const pend = state.pending;
  if (pend?.type !== "combat") return null;
  const plays = pend.reactionItemPlays;
  if (!plays?.length) return null;
  return plays[plays.length - 1]!.playSeq;
}

/** Nytt föremål i state — spela ljud när seq ökar (prev null/-1 = inga spelade än). */
export function syncItemPlaySeq(
  curr: number | null,
  prevRef: MutableRefObject<number | null>,
  sfxEnabled: boolean,
  useDieRoll: boolean,
): void {
  if (curr == null) {
    prevRef.current = null;
    return;
  }
  const prev = prevRef.current ?? -1;
  if (curr > prev) {
    prevRef.current = curr;
    playTableSfx(useDieRoll ? "dieRoll" : "item", { enabled: sfxEnabled });
    return;
  }
  if (curr < prev) {
    prevRef.current = curr;
  } else {
    prevRef.current = curr;
  }
}

/** Spelar ljud om localPlayerId saknas (bräde) eller matchar angiven spelare. */
export function affectsLocalPlayer(localPlayerId: string | null, playerId: string | undefined): boolean {
  if (!localPlayerId) return true;
  return playerId === localPlayerId;
}
