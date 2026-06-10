import { useSyncExternalStore } from "react";
import {
  isLitePerformanceActive,
  subscribeBoardPerformancePrefs,
} from "../lib/boardPerformancePrefs";
import styles from "./beerBackdrop.module.css";

/** Samma brytpunkt som övrig mobil-`/play`-layout. */
const SLUTRESULTAT_MOBILE_MQ = "(max-width: 740px)";

function subscribeNarrowViewport(onStoreChange: () => void) {
  const mq = window.matchMedia(SLUTRESULTAT_MOBILE_MQ);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getNarrowViewportSnapshot() {
  return window.matchMedia(SLUTRESULTAT_MOBILE_MQ).matches;
}

function useNarrowViewport() {
  return useSyncExternalStore(subscribeNarrowViewport, getNarrowViewportSnapshot, () => false);
}

function useLitePerformance() {
  return useSyncExternalStore(
    subscribeBoardPerformancePrefs,
    isLitePerformanceActive,
    () => false,
  );
}

/** Loopande öl-bakgrund bakom slutresultat (bord + mobil). Ingen video på smala skärmar. */
export function BeerBackdropLayers() {
  const narrow = useNarrowViewport();
  const lite = useLitePerformance();
  const showVideo = !narrow && !lite;

  return (
    <>
      {showVideo ? (
        <video
          className={styles.video}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          aria-hidden
        >
          <source src="/video/beer_bg.webm" type="video/webm" />
          <source src="/video/beer_bg_1280.mp4" type="video/mp4" />
        </video>
      ) : null}
      <div className={[styles.scrim, narrow ? styles.scrimNarrow : ""].filter(Boolean).join(" ")} aria-hidden />
    </>
  );
}
