import type { Pending } from "@bv/game-core";
import { resolveIdleEmoteContext } from "../../lib/idleEmoteContext";
import { PlayInteractionPanel, type PlayInteractionPanelProps } from "./PlayInteractionPanel";
import { withIdleEmotes } from "./withIdleEmotes";

export function PlayInteractionSheet(
  props: PlayInteractionPanelProps & {
    pending: Pending | null;
    footerTurnCaption: string | null;
  },
) {
  const { pending, footerTurnCaption, ...panelProps } = props;
  const idleEmoteCtx = resolveIdleEmoteContext(
    panelProps.state,
    panelProps.me,
    pending,
    panelProps.isMyTurn,
    footerTurnCaption,
  );
  return withIdleEmotes(<PlayInteractionPanel {...panelProps} />, idleEmoteCtx);
}
