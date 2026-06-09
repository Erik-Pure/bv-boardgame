import type { GameState, Pending, Player } from "@bv/game-core";
import type { BottomSheetPrimaryKind } from "./usePlayBottomSheetAnimation";

export function computeBottomSheetPrimaryKind(flags: {
  hasItemDetail: boolean;
  hasEquipDetail: boolean;
  hasCardOrSip: boolean;
  brewerPerkPrioritized: boolean;
  personalPromptPrioritized: boolean;
  hasSipAck: boolean;
  hasInteraction: boolean;
}): BottomSheetPrimaryKind {
  if (flags.hasItemDetail) return "item";
  if (flags.hasEquipDetail) return "equip";
  if (flags.hasCardOrSip) return "card";
  if (flags.brewerPerkPrioritized) return "interaction";
  if (flags.personalPromptPrioritized) return "interaction";
  if (flags.hasSipAck) return "sip";
  if (flags.hasInteraction) return "interaction";
  return "none";
}

export function computeBottomSheetZIndexFlags(options: {
  me: Player | null;
  state: GameState | null;
  pending: Pending | null;
  needsBrewerPerkChoice: boolean;
  personalTurnPrompt: Extract<Pending, { type: "brewerPerkChoice" | "levelUpOffer" }> | null;
}) {
  const { me, state, pending, needsBrewerPerkChoice, personalTurnPrompt } = options;
  return {
    overTeamBattleIntro:
      !!me &&
      state?.phase === "playing" &&
      pending?.type === "combat" &&
      pending.phase === "chooseTeammate" &&
      !!pending.teamBattleRequired,
    overEncounterChoice:
      !!me && state?.phase === "playing" && pending?.type === "encounterChoice" && pending.moverId === me.id,
    overTurnPrompt:
      !!me &&
      state?.phase === "playing" &&
      (!!needsBrewerPerkChoice || (!!personalTurnPrompt && personalTurnPrompt.type === "levelUpOffer")),
  };
}
