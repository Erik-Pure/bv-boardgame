import { useEffect, useState } from "react";
import {
  BOSS_FINALE_EXIT_MS,
  BOSS_FINALE_STAR_AT_EXIT_FRACTION,
  BOSS_FINALE_STAR_MS,
} from "./bossFinaleTiming";

/** Triggar kort-exit när `exitTriggered` (t.ex. efter Fortsätt på mobil). */
export function useBossFinaleExit(opts: {
  active: boolean;
  ready: boolean;
  resetKey: string | null;
  exitTriggered: boolean;
}) {
  const [exiting, setExiting] = useState(false);
  const [starVisible, setStarVisible] = useState(false);

  useEffect(() => {
    if (!opts.active || !opts.ready || !opts.exitTriggered) {
      setExiting(false);
      setStarVisible(false);
      return;
    }
    setExiting(true);
    const starDelay = Math.round(BOSS_FINALE_EXIT_MS * BOSS_FINALE_STAR_AT_EXIT_FRACTION);
    const tStar = window.setTimeout(() => setStarVisible(true), starDelay);
    return () => window.clearTimeout(tStar);
  }, [opts.active, opts.ready, opts.resetKey, opts.exitTriggered]);

  return { exiting, starVisible };
}

/** Tid från exit-start tills andra confirmCard (avslut). */
export function bossFinaleExitTotalMs(reducedMotion = false): number {
  if (reducedMotion) return 700 + 600;
  return BOSS_FINALE_EXIT_MS + BOSS_FINALE_STAR_MS + 80;
}
