import type { CSSProperties } from "react";
import { useSyncExternalStore } from "react";
import {
  isLitePerformanceActive,
  subscribeBoardPerformancePrefs,
} from "../lib/boardPerformancePrefs";
import styles from "./bossCombatBackdrop.module.css";

function useLitePerformance() {
  return useSyncExternalStore(
    subscribeBoardPerformancePrefs,
    isLitePerformanceActive,
    () => false,
  );
}

/** Flammor; valfri röd pulserande gradient ovanpå (slutboss). */
export function BossCombatBackdropLayers(props: {
  pulseStyle?: CSSProperties;
  pulseClassName?: string;
  /** false = bara video + scrim (t.ex. stupad bryggare). */
  showPulse?: boolean;
}) {
  const lite = useLitePerformance();
  const showPulse = props.showPulse !== false && !lite;
  return (
    <>
      {!lite ? (
        <video
          className={styles.flamesVideo}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          aria-hidden
        >
          <source src="/video/flames_bg.webm" type="video/webm" />
          <source src="/video/flames_bg_1280.mp4" type="video/mp4" />
        </video>
      ) : null}
      <div className={styles.flamesScrim} aria-hidden />
      {showPulse ? (
        <div
          className={[styles.pulseOverlay, props.pulseClassName].filter(Boolean).join(" ")}
          style={props.pulseStyle}
          aria-hidden
        />
      ) : null}
    </>
  );
}
