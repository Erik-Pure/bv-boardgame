import { resolveIdleEmoteKind, type GameState, type Pending, type Player } from "@bv/game-core";
import { sv } from "./uiStrings";

/** När mobilspelaren passivt väntar och ska kunna skicka emotes. */
export function resolveIdleEmoteContext(
  state: GameState,
  me: Player,
  pending: Pending | null,
  isMyTurn: boolean,
  footerTurnCaption: string | null,
): { caption: string } | null {
  const kind = resolveIdleEmoteKind(state, me, pending, isMyTurn);
  if (!kind) return null;

  switch (kind.type) {
    case "otherTurn":
      return footerTurnCaption ? { caption: footerTurnCaption } : null;
    case "spectatingPvp":
      return { caption: sv.play.emoteCaptionSpectatingPvp(kind.attackerName, kind.defenderName) };
    case "pvpWaitingOpponentItemsOrReady":
      return { caption: sv.play.pvpWaitingOpponentItemsOrReady(kind.opponentName) };
    case "pvpWaitingOpponentRoll":
      return { caption: sv.play.pvpWaitingOpponentReady(kind.opponentName) };
    case "pvpWaitingOpponentRevealAck":
      return { caption: sv.play.pvpRoundRevealWaitOther(kind.opponentName) };
    case "waitingCombatContinue":
      return { caption: sv.play.emoteCaptionWaitingCombatContinue };
    case "waitTeammateCombatRoll":
      return { caption: sv.play.waitTeammateCombatRoll(kind.teammateName) };
    case "waitCombatIntervene":
      return { caption: sv.play.waitIntervene };
    case "waitAttackerChooseTeammate":
      return { caption: sv.play.waitAttackerChooseTeammate(kind.attackerName) };
    case "attackerViewingEncounter":
      return { caption: sv.play.attackerViewingEncounter(kind.attackerName) };
    case "combatHelpWaitAttackerChoose":
      return { caption: sv.play.combatHelpWaitAttackerChoose(kind.attackerName) };
    case "combatHelpWaitDecision":
      return { caption: sv.play.combatHelpWaitDecision(kind.name) };
    case "combatHelpWaitHelperCard":
      return { caption: sv.play.combatHelpWaitHelperCard(kind.name) };
    case "waitingState":
      return { caption: sv.play.waitingState };
    default:
      return null;
  }
}
