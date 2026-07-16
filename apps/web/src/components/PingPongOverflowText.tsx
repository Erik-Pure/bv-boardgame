import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./PingPongOverflowText.module.css";

type Props = {
  text: string;
  className?: string;
};

/**
 * Visar text som vanligt; om den inte ryms åker den sakta fram och tillbaka
 * så hela strängen går att läsa. Respekterar prefers-reduced-motion.
 */
export function PingPongOverflowText(props: Props) {
  const { text, className } = props;
  const wrapRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [distancePx, setDistancePx] = useState(0);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const el = textRef.current;
    if (!wrap || !el) return;

    const measure = () => {
      const d = Math.max(0, Math.ceil(el.scrollWidth - wrap.clientWidth));
      setDistancePx((prev) => (prev === d ? prev : d));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [text]);

  const active = distancePx > 1;
  /** ~28px/s + pauser; längre namn → längre cykel. */
  const durationSec = active ? Math.max(6, 3.2 + distancePx / 28) : 0;

  return (
    <span ref={wrapRef} className={styles.wrap} data-overflow={active ? "true" : undefined}>
      <span
        ref={textRef}
        className={[styles.text, active ? styles.marquee : "", className].filter(Boolean).join(" ")}
        style={
          active
            ? ({
                ["--marquee-distance" as string]: `${distancePx}px`,
                ["--marquee-duration" as string]: `${durationSec}s`,
              } as CSSProperties)
            : undefined
        }
      >
        {text}
      </span>
    </span>
  );
}
