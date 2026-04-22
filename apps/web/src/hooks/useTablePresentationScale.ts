import { useEffect, useState } from "react";

/** Max skala på stora skärmar / projektor (kort + panel). */
const S_MAX = 1.48;
/** Kort kant: ingen uppskalning. */
const SHORT_START = 720;
/** Kort kant: full S_MAX (om inte höjd-tak sänker). */
const SHORT_END = 1120;
/** Ungefärlig korthöjd för höjd-tak (5∶7 från designbredd ~400). */
const CARD_ROUGH_H = 560;
/** Lämna marginal under kortet vid skalning. */
const HEIGHT_FRAC = 0.92;

function readVisualViewportSize(): { w: number; h: number } {
  if (typeof window === "undefined") return { w: 1280, h: 720 };
  const vv = window.visualViewport;
  if (vv) return { w: vv.width, h: vv.height };
  return { w: window.innerWidth, h: window.innerHeight };
}

/** Ren funktion för test / initial state. */
export function computeTablePresentationScale(): number {
  const { w, h } = readVisualViewportSize();
  const short = Math.max(1, Math.min(w, h));
  let s: number;
  if (short <= SHORT_START) s = 1;
  else if (short >= SHORT_END) s = S_MAX;
  else s = 1 + (S_MAX - 1) * ((short - SHORT_START) / (SHORT_END - SHORT_START));
  const maxByHeight = (HEIGHT_FRAC * Math.max(1, h)) / CARD_ROUGH_H;
  s = Math.min(s, maxByHeight, S_MAX);
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
