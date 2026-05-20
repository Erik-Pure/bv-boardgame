import styles from "./beerBackdrop.module.css";

/** Loopande öl-bakgrund (lobby, slutresultat m.m.). */
export function BeerBackdropLayers() {
  return (
    <>
      <video
        className={styles.video}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden
      >
        <source src="/video/beer_bg.webm" type="video/webm" />
        <source src="/video/beer_bg_1280.mp4" type="video/mp4" />
      </video>
      <div className={styles.scrim} aria-hidden />
    </>
  );
}
