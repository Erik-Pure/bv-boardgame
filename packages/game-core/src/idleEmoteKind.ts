import { playerHasPvpPreRoundItem } from "./itemRules.js";
import { isPlayerActiveInMatch } from "./playerParticipation.js";
import type { GameState, Pending, Player } from "./types.js";

export type IdleEmoteKind =
  | { type: "otherTurn" }
  | { type: "spectatingPvp"; attackerName: string; defenderName: string }
  | { type: "pvpWaitingOpponentItemsOrReady"; opponentName: string }
  | { type: "pvpWaitingOpponentRoll"; opponentName: string }
  | { type: "pvpWaitingOpponentRevealAck"; opponentName: string }
  | { type: "waitingCombatContinue" }
  | { type: "waitTeammateCombatRoll"; teammateName: string }
  | { type: "waitCombatIntervene" }
  | { type: "waitAttackerChooseTeammate"; attackerName: string }
  | { type: "attackerViewingEncounter"; attackerName: string }
  | { type: "combatHelpWaitAttackerChoose"; attackerName: string }
  | { type: "combatHelpWaitDecision"; name: string }
  | { type: "combatHelpWaitHelperCard"; name: string }
  | { type: "waitingState" };

/** När spelaren passivt väntar och får skicka emotes (utan UI-strängar). */
export function resolveIdleEmoteKind(
  state: GameState,
  me: Player,
  pending: Pending | null,
  isMyTurn: boolean,
): IdleEmoteKind | null {
  if (state.phase !== "playing") return null;
  if (!isPlayerActiveInMatch(me)) return null;

  if (pending?.type === "pvp") {
    const attacker = state.players.find((p) => p.id === pending.attackerId);
    const defender = state.players.find((p) => p.id === pending.defenderId);
    const isParticipant = pending.attackerId === me.id || pending.defenderId === me.id;

    if (!isParticipant) {
      return {
        type: "spectatingPvp",
        attackerName: attacker?.name?.trim() || "—",
        defenderName: defender?.name?.trim() || "—",
      };
    }

    const opponentId = pending.attackerId === me.id ? pending.defenderId : pending.attackerId;
    const opponent = state.players.find((p) => p.id === opponentId);
    const oppName = opponent?.name?.trim() || "motståndaren";

    if (pending.phase === "preRoundItems") {
      const meHasPvpItems = playerHasPvpPreRoundItem(me);
      const myReadyExplicit = pending.roundItemReady?.[me.id] === true;
      const myEffectiveReady = myReadyExplicit || !meHasPvpItems;
      const opponentHasPvpItems = opponent ? playerHasPvpPreRoundItem(opponent) : false;
      const opponentReadyExplicit = opponentId ? pending.roundItemReady?.[opponentId] === true : false;
      const opponentEffectiveReady = opponentReadyExplicit || !opponentHasPvpItems;
      if (myEffectiveReady && !opponentEffectiveReady) {
        return { type: "pvpWaitingOpponentItemsOrReady", opponentName: oppName };
      }
    }

    if (pending.phase === "awaitingRolls") {
      const myRoll = pending.rolls?.[me.id];
      const oppRoll = opponentId ? pending.rolls?.[opponentId] : undefined;
      if (myRoll && !oppRoll) {
        return { type: "pvpWaitingOpponentRoll", opponentName: oppName };
      }
    }

    if (pending.phase === "roundReveal") {
      const myAck = pending.roundRevealAcked?.[me.id] === true;
      const oppAck = opponentId ? pending.roundRevealAcked?.[opponentId] === true : false;
      if (myAck && !oppAck) {
        return { type: "pvpWaitingOpponentRevealAck", opponentName: oppName };
      }
    }
  }

  if (pending?.type === "combat") {
    if (pending.phase === "reactions") {
      if (pending.reacted?.[me.id] === "pass") {
        return { type: "waitingCombatContinue" };
      }

      const isAttacker = pending.attackerId === me.id;
      const isAssistPartner = pending.assistId === me.id;
      const isTeamFighter = isAttacker || isAssistPartner;
      if (isTeamFighter && pending.assistId) {
        const myTeamRoll = pending.teamRolls?.[me.id];
        const attackerRoll = pending.teamRolls?.[pending.attackerId];
        const teammateRoll = pending.teamRolls?.[pending.assistId];
        const bothTeamRolled = !!attackerRoll && !!teammateRoll;
        if (myTeamRoll && !bothTeamRolled) {
          const otherId = me.id === pending.attackerId ? pending.assistId : pending.attackerId;
          const other = state.players.find((p) => p.id === otherId);
          return { type: "waitTeammateCombatRoll", teammateName: other?.name ?? "—" };
        }
      }

      const isEligibleReactor = pending.reactors?.includes(me.id) ?? false;
      if (!isTeamFighter && !isEligibleReactor) {
        return { type: "waitCombatIntervene" };
      }
    }

    if (pending.phase === "chooseTeammate" && pending.attackerId !== me.id) {
      const att = state.players.find((p) => p.id === pending.attackerId);
      return { type: "waitAttackerChooseTeammate", attackerName: att?.name ?? "—" };
    }

    if (pending.phase === "enemyIntro" && pending.attackerId !== me.id) {
      const att = state.players.find((p) => p.id === pending.attackerId);
      return { type: "attackerViewingEncounter", attackerName: att?.name ?? "—" };
    }

    if (pending.phase === "helpChooseHelper") {
      if (pending.attackerId === me.id) return null;
      const att = state.players.find((p) => p.id === pending.attackerId);
      return { type: "combatHelpWaitAttackerChoose", attackerName: att?.name ?? "—" };
    }

    if (pending.phase === "helpAwaitDecision") {
      const helperId = pending.helpSelectedHelperId;
      if (helperId === me.id) return null;
      if (helperId && helperId !== me.id) {
        const helper = state.players.find((p) => p.id === helperId);
        return { type: "combatHelpWaitDecision", name: helper?.name ?? "—" };
      }
      if (!helperId) return { type: "waitingState" };
    }

    if (pending.phase === "helpAwaitRequesterDecision") {
      const helperId = pending.helpSelectedHelperId;
      if (me.id === pending.attackerId || me.id === helperId) return null;
      if (helperId) {
        const requester = state.players.find((p) => p.id === pending.attackerId);
        return { type: "combatHelpWaitDecision", name: requester?.name ?? "—" };
      }
    }

    if (pending.phase === "helpAwaitCard") {
      const helperId = pending.helpSelectedHelperId;
      if (helperId === me.id) return null;
      if (helperId && helperId !== me.id) {
        const helper = state.players.find((p) => p.id === helperId);
        return { type: "combatHelpWaitHelperCard", name: helper?.name ?? "—" };
      }
    }
  }

  if (!isMyTurn) return { type: "otherTurn" };
  return null;
}
