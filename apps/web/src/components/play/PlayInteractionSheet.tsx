import type { Pending } from "@bv/game-core";
import { resolveIdleEmoteContext } from "../../lib/idleEmoteContext";
import { useUiStrings } from "../../lib/locale/LocaleContext";
import { PlayInteractionPanel, type PlayInteractionPanelProps } from "./PlayInteractionPanel";
import { withIdleEmotes } from "./withIdleEmotes";

export function PlayInteractionSheet(
  props: PlayInteractionPanelProps & {
    pending: Pending | null;
    footerTurnCaption: string | null;
  },
) {
  const ui = useUiStrings();
  const { pending, footerTurnCaption, ...panelProps } = props;
  const idleEmoteCtx = resolveIdleEmoteContext(
    panelProps.state,
    panelProps.me,
    pending,
    panelProps.isMyTurn,
    footerTurnCaption,
    ui,
  );
  return withIdleEmotes(<PlayInteractionPanel {...panelProps} />, idleEmoteCtx);
}
