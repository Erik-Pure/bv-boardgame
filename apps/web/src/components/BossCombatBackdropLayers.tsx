import type { CSSProperties } from "react";
import styles from "./bossCombatBackdrop.module.css";

/** Flammor; valfri röd pulserande gradient ovanpå (slutboss). */
export function BossCombatBackdropLayers(props: {
  pulseStyle?: CSSProperties;
  pulseClassName?: string;
  /** false = bara video + scrim (t.ex. stupad bryggare). */
  showPulse?: boolean;
}) {
  const showPulse = props.showPulse !== false;
  return (
    <>
      <video
        className={styles.flamesVideo}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden
      >
        <source src="/video/flames_bg.webm" type="video/webm" />
        <source src="/video/flames_bg_1280.mp4" type="video/mp4" />
      </video>
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
