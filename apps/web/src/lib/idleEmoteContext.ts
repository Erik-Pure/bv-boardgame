import { resolveIdleEmoteKind, type GameState, type Pending, type Player } from "@bv/game-core";
import type { UiStrings } from "../lib/uiStrings";

/** När mobilspelaren passivt väntar och ska kunna skicka emotes. */
export function resolveIdleEmoteContext(
  state: GameState,
  me: Player,
  pending: Pending | null,
  isMyTurn: boolean,
  footerTurnCaption: string | null,
  ui: UiStrings,
): { caption: string } | null {
  const kind = resolveIdleEmoteKind(state, me, pending, isMyTurn);
  if (!kind) return null;

  switch (kind.type) {
    case "otherTurn":
      return footerTurnCaption ? { caption: footerTurnCaption } : null;
    case "spectatingPvp":
      return { caption: ui.play.emoteCaptionSpectatingPvp(kind.attackerName, kind.defenderName) };
    case "pvpWaitingOpponentItemsOrReady":
      return { caption: ui.play.pvpWaitingOpponentItemsOrReady(kind.opponentName) };
    case "pvpWaitingOpponentRoll":
      return { caption: ui.play.pvpWaitingOpponentReady(kind.opponentName) };
    case "pvpWaitingOpponentRevealAck":
      return { caption: ui.play.pvpRoundRevealWaitOther(kind.opponentName) };
    case "waitingCombatContinue":
      return { caption: ui.play.emoteCaptionWaitingCombatContinue };
    case "waitTeammateCombatRoll":
      return { caption: ui.play.waitTeammateCombatRoll(kind.teammateName) };
    case "waitCombatIntervene":
      return { caption: ui.play.waitIntervene };
    case "waitAttackerChooseTeammate":
      return { caption: ui.play.waitAttackerChooseTeammate(kind.attackerName) };
    case "attackerViewingEncounter":
      return { caption: ui.play.attackerViewingEncounter(kind.attackerName) };
    case "combatHelpWaitAttackerChoose":
      return { caption: ui.play.combatHelpWaitAttackerChoose(kind.attackerName) };
    case "combatHelpWaitDecision":
      return { caption: ui.play.combatHelpWaitDecision(kind.name) };
    case "combatHelpWaitHelperCard":
      return { caption: ui.play.combatHelpWaitHelperCard(kind.name) };
    case "waitingState":
      return { caption: ui.play.waitingState };
    default:
      return null;
  }
}
