import { useCallback, useEffect, useLayoutEffect, useState, type MutableRefObject, type RefObject } from "react";
import {
  EMOTE_ICON_SRC,
  emoteBurstRotationDeg,
  latestEmoteBurstForPlayer,
  type GameState,
  type Player,
} from "@bv/game-core";
import tableStyles from "../../routes/TableView.module.css";

type Anchor = { x: number; y: number };

export function TurnBannerEmoteOverlay(props: {
  players: readonly Player[];
  emoteBursts: GameState["playerEmoteBursts"];
  fanWrapRef: RefObject<HTMLDivElement | null>;
  colorBarRef: RefObject<HTMLDivElement | null>;
  scrollerRef: RefObject<HTMLDivElement | null>;
  playerCardRefs: MutableRefObject<Map<string, HTMLDivElement>>;
  layoutTick: number;
}) {
  const { players, emoteBursts, fanWrapRef, colorBarRef, scrollerRef, playerCardRefs, layoutTick } =
    props;
  const [anchors, setAnchors] = useState<Record<string, Anchor>>({});

  const measureAnchors = useCallback(() => {
    const wrap = fanWrapRef.current;
    const bar = colorBarRef.current;
    if (!wrap || !bar) return;
    const wrapRect = wrap.getBoundingClientRect();
    const barTop = bar.getBoundingClientRect().top - wrapRect.top;
    const next: Record<string, Anchor> = {};
    for (const [id, el] of playerCardRefs.current) {
      const r = el.getBoundingClientRect();
      next[id] = {
        x: r.left + r.width / 2 - wrapRect.left,
        y: barTop,
      };
    }
    setAnchors(next);
  }, [fanWrapRef, colorBarRef, playerCardRefs]);

  useLayoutEffect(() => {
    measureAnchors();
  }, [measureAnchors, layoutTick, players]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const onScroll = () => measureAnchors();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [measureAnchors, scrollerRef]);

  const now = Date.now();
  return (
    <div className={tableStyles.turnPlayerEmoteOverlay} aria-hidden>
      {players.map((p) => {
        const burst = latestEmoteBurstForPlayer(emoteBursts, p.id, now);
        const anchor = anchors[p.id];
        if (!burst || !anchor) return null;
        return (
          <img
            key={`${p.id}-${burst.at}`}
            src={EMOTE_ICON_SRC[burst.emoteId]}
            alt=""
            width={76}
            height={76}
            className={tableStyles.turnPlayerEmoteFloatOnBoard}
            style={{
              left: anchor.x,
              top: anchor.y,
              ["--emote-rot" as string]: `${emoteBurstRotationDeg(burst)}deg`,
            }}
          />
        );
      })}
    </div>
  );
}
