import { useEffect, useRef } from "react";
import type { GameState, Player } from "@bv/game-core";
import { lastCombatReactionPlaySeq, lastTableItemRevealSeq } from "../../lib/gameSfxSyncHelpers";
import { itemPlayToastTone } from "../../lib/itemPlayPolarity";
import { useLocale, useUiStrings } from "../../lib/locale/LocaleContext";
import { itemMetaForView } from "./playItemMeta";
import type { ShowPlayToast } from "./playToast";

/**
 * Toast med föremålsbild + namn när någon annan spelar ett föremål på dig.
 * Lyssnar på samma reveal-sekvenser som brädet/SFX.
 */
export function usePlayItemTargetedToast(options: {
  state: GameState | null;
  me: Player | null;
  showToast: ShowPlayToast;
  hasBlockingSipNotice: boolean;
}) {
  const ui = useUiStrings();
  const locale = useLocale();
  const { state, me, showToast, hasBlockingSipNotice } = options;

  const prevRevealSeqRef = useRef<number | null>(null);
  const prevReactionSeqRef = useRef<number | null>(null);
  const primedRef = useRef(false);

  useEffect(() => {
    if (!state || state.phase !== "playing" || !me) {
      prevRevealSeqRef.current = null;
      prevReactionSeqRef.current = null;
      primedRef.current = false;
      return;
    }

    const revealSeq = lastTableItemRevealSeq(state);
    const reactionSeq = lastCombatReactionPlaySeq(state);
    const lastReveal = state.tableItemPlayReveals?.length
      ? state.tableItemPlayReveals[state.tableItemPlayReveals.length - 1]
      : null;
    const lastReaction =
      state.pending?.type === "combat" && state.pending.reactionItemPlays?.length
        ? state.pending.reactionItemPlays[state.pending.reactionItemPlays.length - 1]
        : null;

    if (!primedRef.current) {
      primedRef.current = true;
      prevRevealSeqRef.current = revealSeq;
      prevReactionSeqRef.current = reactionSeq;
      return;
    }

    const tryToast = (
      play: { itemId: string; actorId: string; targetPlayerId?: string } | null,
      currSeq: number | null,
      prevRef: { current: number | null },
    ) => {
      if (currSeq == null) {
        prevRef.current = null;
        return;
      }
      const prev = prevRef.current;
      prevRef.current = currSeq;
      if (prev != null && currSeq <= prev) return;
      if (!play) return;
      if (!play.targetPlayerId || play.targetPlayerId !== me.id) return;
      if (play.actorId === me.id) return;
      if (hasBlockingSipNotice) return;

      const actor = state.players.find((p) => p.id === play.actorId);
      const actorName = actor?.name?.trim() || "—";
      const meta = itemMetaForView(play.itemId, me, state, locale);
      showToast(
        {
          itemId: play.itemId,
          itemTitle: meta.title,
          message: ui.play.itemPlayedOnYou(actorName),
          tone: itemPlayToastTone(play.itemId),
        },
        4000,
      );
    };

    tryToast(lastReveal, revealSeq, prevRevealSeqRef);
    tryToast(lastReaction, reactionSeq, prevReactionSeqRef);
  }, [state, me, showToast, hasBlockingSipNotice, ui, locale]);
}
