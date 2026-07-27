import { useEffect, useRef } from "react";
import { BrandLogoImg } from "../BrandLogoImg";
import { useUiStrings } from "../../lib/locale/LocaleContext";
import styles from "../../routes/TableView.module.css";

export type MatchStartDigit = 5 | 4 | 3 | 2 | 1;

/** Svart matchstart-overlay: stor stacked-logotyp + nedräkning 5→1. */
export function TableMatchStartOverlay(props: {
  digit: MatchStartDigit | null;
  fadingOut: boolean;
}) {
  const ui = useUiStrings();
  const { digit, fadingOut } = props;
  const logoWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = logoWrapRef.current;
    if (!el || digit == null) return;
    el.classList.remove(styles.matchStartLogoPulse);
    // Force reflow så samma animation kan starta om vid varje siffra.
    void el.offsetWidth;
    el.classList.add(styles.matchStartLogoPulse);
  }, [digit]);

  return (
    <div
      className={[styles.matchStartOverlay, fadingOut ? styles.matchStartOverlayFadeOut : ""]
        .filter(Boolean)
        .join(" ")}
      aria-live="polite"
      aria-label={digit != null ? String(digit) : ui.home.title}
    >
      <div className={styles.matchStartInner}>
        <div ref={logoWrapRef} className={styles.matchStartLogoWrap}>
          <BrandLogoImg
            variant="stacked"
            alt={ui.home.title}
            draggable={false}
            className={styles.matchStartLogo}
          />
        </div>
        {/* Fast höjd så logotypen inte hoppar när siffran tas bort vid fade-out. */}
        <div className={styles.matchStartDigitSlot} aria-hidden>
          {digit != null ? (
            <div key={digit} className={styles.matchStartDigit}>
              {digit}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
