import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from "react";
import {
  EMOTE_ICON_SRC,
  KLUNK_BURST_ICON_SRC,
  emoteBurstRotationDeg,
  klunkBurstRotationDeg,
  latestEmoteBurstForPlayer,
  latestKlunkBurstForPlayer,
  type GameState,
  type Player,
} from "@bv/game-core";
import tableStyles from "../../routes/TableView.module.css";

type Anchor = { x: number; y: number };

const KLUNK_BURST_ICON_SPACING_PX = 24;
const KLUNK_BURST_ICON_MAX_VISIBLE = 6;

function klunkBurstIconCount(burst: { klunkCount?: number }): number {
  return Math.min(
    KLUNK_BURST_ICON_MAX_VISIBLE,
    Math.max(1, Math.floor(burst.klunkCount ?? 1)),
  );
}

export function TurnBannerEmoteOverlay(props: {
  players: readonly Player[];
  emoteBursts: GameState["playerEmoteBursts"];
  klunkBursts: GameState["playerKlunkBursts"];
  fanWrapRef: RefObject<HTMLDivElement | null>;
  colorBarRef: RefObject<HTMLDivElement | null>;
  scrollerRef: RefObject<HTMLDivElement | null>;
  playerCardRefs: MutableRefObject<Map<string, HTMLDivElement>>;
  layoutTick: number;
}) {
  const { players, emoteBursts, klunkBursts, fanWrapRef, colorBarRef, scrollerRef, playerCardRefs, layoutTick } =
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
  const burstOffsetPx = 30;
  return (
    <div className={tableStyles.turnPlayerEmoteOverlay} aria-hidden>
      {players.flatMap((p) => {
        const anchor = anchors[p.id];
        if (!anchor) return [];
        const emote = latestEmoteBurstForPlayer(emoteBursts, p.id, now);
        const klunk = latestKlunkBurstForPlayer(klunkBursts, p.id, now);
        const klunkIcons = klunk ? klunkBurstIconCount(klunk) : 0;
        const klunkHalfSpan =
          klunkIcons > 1 ? ((klunkIcons - 1) * KLUNK_BURST_ICON_SPACING_PX) / 2 : 0;
        const nodes: ReactNode[] = [];
        if (klunk) {
          const groupCenterX = anchor.x - (emote ? burstOffsetPx : 0);
          for (let i = 0; i < klunkIcons; i++) {
            const x =
              groupCenterX +
              (klunkIcons === 1 ? 0 : -klunkHalfSpan + i * KLUNK_BURST_ICON_SPACING_PX);
            nodes.push(
              <img
                key={`klunk-${p.id}-${klunk.at}-${i}`}
                src={KLUNK_BURST_ICON_SRC}
                alt=""
                width={76}
                height={76}
                className={tableStyles.turnPlayerEmoteFloatOnBoard}
                style={{
                  left: x,
                  top: anchor.y,
                  ["--emote-rot" as string]: `${klunkBurstRotationDeg({ ...klunk, at: klunk.at + i })}deg`,
                }}
              />,
            );
          }
        }
        if (emote) {
          nodes.push(
            <img
              key={`emote-${p.id}-${emote.at}`}
              src={EMOTE_ICON_SRC[emote.emoteId]}
              alt=""
              width={76}
              height={76}
              className={tableStyles.turnPlayerEmoteFloatOnBoard}
              style={{
                left: anchor.x + (klunk ? burstOffsetPx + klunkHalfSpan : 0),
                top: anchor.y,
                ["--emote-rot" as string]: `${emoteBurstRotationDeg(emote)}deg`,
              }}
            />,
          );
        }
        return nodes;
      })}
    </div>
  );
}
