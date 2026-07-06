import { useEffect, useState, type RefObject } from "react";

/** Får krympa rejält på små tablets, men inte bli oläsligt. */
export const FIT_MIN_SCALE = 0.55;
/** Samma tak som presentationsskalan (stor TV / projektor). */
export const FIT_MAX_SCALE = 1.48;

export type FitToViewportOptions = {
  /** Reserverad yta ovanför innehållet (t.ex. header + toppmarginal), px. */
  reservedTop?: number;
  /** Reserverad yta under innehållet (t.ex. solfjäder + turbanner), px. */
  reservedBottom?: number;
  /** Total horisontell marginal (vänster + höger), px. */
  sidePadPx?: number;
  /** Önskad uppskalning (från presentationsskalan); fit kan bara sänka den. */
  desiredScale?: number;
  minScale?: number;
  maxScale?: number;
};

export type FitToViewportInput = FitToViewportOptions & {
  contentW: number;
  contentH: number;
  viewportW: number;
  viewportH: number;
};

/**
 * Ren fit-beräkning: `clamp(minScale, min(desiredScale, fitByWidth, fitByHeight), maxScale)`.
 * Om innehållet inte är mätt ännu (0-dimensioner) returneras önskad skala clampad mot max.
 */
export function computeFitToViewportScale(input: FitToViewportInput): number {
  const {
    contentW,
    contentH,
    viewportW,
    viewportH,
    reservedTop = 0,
    reservedBottom = 0,
    sidePadPx = 0,
    desiredScale = 1,
    minScale = FIT_MIN_SCALE,
    maxScale = FIT_MAX_SCALE,
  } = input;

  const desired = Math.min(Math.max(desiredScale, minScale), maxScale);
  if (contentW <= 0 || contentH <= 0) return round3(desired);

  const availableW = Math.max(1, viewportW - sidePadPx);
  const availableH = Math.max(1, viewportH - reservedTop - reservedBottom);
  const fitByWidth = availableW / contentW;
  const fitByHeight = availableH / contentH;

  const s = Math.min(desired, fitByWidth, fitByHeight);
  return round3(Math.min(Math.max(s, minScale), maxScale));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Mjuk bottenreserv: reserverad yta (t.ex. solfjädern) får aldrig äta upp mer än att
 * `minContentPx` innehållszon blir kvar — annars krymps reserven (lite överlapp tillåts)
 * så innehållet inte blir onödigt litet på breda/låga skärmar (ultrawide).
 */
export function softReservedBottom(input: {
  reservedBottom: number;
  viewportH: number;
  reservedTop?: number;
  /** Minsta innehållszon (px) som garanteras mellan reserverna. */
  minContentPx: number;
}): number {
  const { reservedBottom, viewportH, reservedTop = 0, minContentPx } = input;
  return Math.max(0, Math.min(reservedBottom, viewportH - reservedTop - minContentPx));
}

function readVisualViewportSize(): { w: number; h: number } {
  if (typeof window === "undefined") return { w: 1280, h: 720 };
  const vv = window.visualViewport;
  if (vv) return { w: vv.width, h: vv.height };
  return { w: window.innerWidth, h: window.innerHeight };
}

/**
 * Mätbaserad skal-till-passa för bords-överlägg: mäter `contentRef` (otransformerat element,
 * `offsetWidth/offsetHeight`) och viewporten, och returnerar en skala som garanterar att
 * innehållet ryms — kan gå under 1 (till skillnad från presentationsskalan).
 */
export function useFitToViewportScale(
  contentRef: RefObject<HTMLElement | null>,
  options: FitToViewportOptions,
): number {
  const {
    reservedTop = 0,
    reservedBottom = 0,
    sidePadPx = 0,
    desiredScale = 1,
    minScale = FIT_MIN_SCALE,
    maxScale = FIT_MAX_SCALE,
  } = options;

  const [scale, setScale] = useState(() =>
    computeFitToViewportScale({
      contentW: 0,
      contentH: 0,
      viewportW: 0,
      viewportH: 0,
      desiredScale,
      minScale,
      maxScale,
    }),
  );

  useEffect(() => {
    const observed = contentRef.current;
    if (!observed) return;

    const tick = () => {
      const el = contentRef.current ?? observed;
      const { w, h } = readVisualViewportSize();
      setScale(
        computeFitToViewportScale({
          contentW: el.offsetWidth,
          contentH: el.offsetHeight,
          viewportW: w,
          viewportH: h,
          reservedTop,
          reservedBottom,
          sidePadPx,
          desiredScale,
          minScale,
          maxScale,
        }),
      );
    };

    tick();
    const ro = new ResizeObserver(tick);
    ro.observe(observed);
    window.addEventListener("resize", tick);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", tick);
    vv?.addEventListener("scroll", tick);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", tick);
      vv?.removeEventListener("resize", tick);
      vv?.removeEventListener("scroll", tick);
    };
  }, [contentRef, reservedTop, reservedBottom, sidePadPx, desiredScale, minScale, maxScale]);

  return scale;
}
