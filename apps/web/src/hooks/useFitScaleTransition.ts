import { useEffect, useState } from "react";
import {
  readBoardPerformancePrefs,
  subscribeBoardPerformancePrefs,
} from "../lib/boardPerformancePrefs";

/** Mjuk omskalning av bords-överlägg (t.ex. när solfjädern öppnas och innehållet krymper). */
export const FIT_SCALE_TRANSITION = "transform 280ms cubic-bezier(0.33, 1, 0.68, 1)";

/** Hur länge efter mount transitionen hålls avstängd, så den initiala mät-korrektionen inte animeras. */
const ARM_DELAY_MS = 300;

export function useScaleAnimationsEnabled(): boolean {
  const [enabled, setEnabled] = useState(() => readBoardPerformancePrefs().scaleAnimationsEnabled);
  useEffect(
    () =>
      subscribeBoardPerformancePrefs(() =>
        setEnabled(readBoardPerformancePrefs().scaleAnimationsEnabled),
      ),
    [],
  );
  return enabled;
}

/**
 * CSS-transition för fit-skalade överlägg, eller `undefined` när skal-animationer är
 * avstängda i inställningarna (långsam dator) — eller precis vid mount, så att den
 * första mätningsbaserade skal-korrektionen sätts direkt utan synlig animation.
 */
export function useFitScaleTransition(): string | undefined {
  const enabled = useScaleAnimationsEnabled();
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setArmed(true), ARM_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);
  return enabled && armed ? FIT_SCALE_TRANSITION : undefined;
}
