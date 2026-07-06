import { useEffect, useState } from "react";

/** Max skala på stora skärmar / projektor (kort + panel). */
const S_MAX = 1.48;
/** Kort kant: ingen uppskalning. */
const SHORT_START = 720;
/** Kort kant: full S_MAX (om inte höjd-tak sänker). */
const SHORT_END = 1120;

function readVisualViewportSize(): { w: number; h: number } {
  if (typeof window === "undefined") return { w: 1280, h: 720 };
  const vv = window.visualViewport;
  if (vv) return { w: vv.width, h: vv.height };
  return { w: window.innerWidth, h: window.innerHeight };
}

/**
 * Ren funktion för test / initial state.
 * Obs: detta är bara "önskad uppskalning" (>= 1); den faktiska passningen mot viewporten
 * mäts nedströms av `useFitToViewportScale`, som även kan skala ner under 1.
 */
export function computeTablePresentationScale(): number {
  const { w, h } = readVisualViewportSize();
  const short = Math.max(1, Math.min(w, h));
  let s: number;
  if (short <= SHORT_START) s = 1;
  else if (short >= SHORT_END) s = S_MAX;
  else s = 1 + (S_MAX - 1) * ((short - SHORT_START) / (SHORT_END - SHORT_START));
  return Math.max(1, Math.round(s * 1000) / 1000);
}

/** Skalfaktor för bords-UI (stor TV / projektor). */
export function useTablePresentationScale(): number {
  const [scale, setScale] = useState(computeTablePresentationScale);
  useEffect(() => {
    const tick = () => setScale(computeTablePresentationScale());
    tick();
    window.addEventListener("resize", tick);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", tick);
    vv?.addEventListener("scroll", tick);
    return () => {
      window.removeEventListener("resize", tick);
      vv?.removeEventListener("resize", tick);
      vv?.removeEventListener("scroll", tick);
    };
  }, []);
  return scale;
}
