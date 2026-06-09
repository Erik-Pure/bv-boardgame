import { useLayoutEffect, useEffect, useRef, useState } from "react";

export type BottomSheetPrimaryKind =
  | "item"
  | "equip"
  | "card"
  | "interaction"
  | "sip"
  | "none";

export function usePlayBottomSheetAnimation(options: {
  visible: boolean;
  primaryKind: BottomSheetPrimaryKind;
  collapsed: boolean;
  setCollapsed: (value: boolean | ((prev: boolean) => boolean)) => void;
  isMyTurn: boolean;
  playing: boolean;
}) {
  const { visible, primaryKind, collapsed, setCollapsed, isMyTurn, playing } = options;

  const measureRef = useRef<HTMLDivElement | null>(null);
  const turnSwapTimerRef = useRef<number | null>(null);
  const prevIsMyTurnRef = useRef(false);

  const [animatedHeight, setAnimatedHeight] = useState<number | null>(null);
  const [heightInstant, setHeightInstant] = useState(false);
  const [enterDone, setEnterDone] = useState(false);
  const [turnAnim, setTurnAnim] = useState<"in" | "out" | null>(null);

  useEffect(() => {
    if (!visible) {
      setCollapsed(false);
      setEnterDone(false);
      return;
    }
    const t = window.setTimeout(() => setEnterDone(true), 380);
    return () => window.clearTimeout(t);
  }, [visible, setCollapsed]);

  useLayoutEffect(() => {
    const curr = !!isMyTurn;
    if (!playing || !visible) {
      prevIsMyTurnRef.current = curr;
      setTurnAnim(null);
    } else {
      const prev = prevIsMyTurnRef.current;
      if (prev !== curr) {
        setTurnAnim(curr ? "in" : "out");
        if (turnSwapTimerRef.current) clearTimeout(turnSwapTimerRef.current);
        turnSwapTimerRef.current = window.setTimeout(() => {
          setTurnAnim(null);
          turnSwapTimerRef.current = null;
        }, 620);
      }
      prevIsMyTurnRef.current = curr;
    }
    return () => {
      if (turnSwapTimerRef.current) {
        clearTimeout(turnSwapTimerRef.current);
        turnSwapTimerRef.current = null;
      }
    };
  }, [isMyTurn, playing, visible]);

  useLayoutEffect(() => {
    if (!visible) {
      setAnimatedHeight(null);
      setHeightInstant(false);
      return;
    }
    setHeightInstant(true);
    const el = measureRef.current;
    if (!el) return;

    let raf = 0;
    let rafUnlock1 = 0;
    let rafUnlock2 = 0;
    const syncHeight = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        const h = Math.ceil(el.getBoundingClientRect().height);
        setAnimatedHeight((prev) => {
          if (prev == null) return h;
          return Math.abs(prev - h) < 1 ? prev : h;
        });
      });
    };

    syncHeight();
    rafUnlock1 = window.requestAnimationFrame(() => {
      rafUnlock2 = window.requestAnimationFrame(() => {
        setHeightInstant(false);
      });
    });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncHeight) : null;
    ro?.observe(el);
    window.addEventListener("resize", syncHeight);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (rafUnlock1) cancelAnimationFrame(rafUnlock1);
      if (rafUnlock2) cancelAnimationFrame(rafUnlock2);
      ro?.disconnect();
      window.removeEventListener("resize", syncHeight);
    };
  }, [visible, primaryKind, collapsed]);

  const controlsAbovePx = visible ? Math.max(10, (animatedHeight ?? 110) + 10) : null;

  return {
    measureRef,
    animatedHeight,
    heightInstant,
    enterDone,
    turnAnim,
    controlsAbovePx,
  };
}
