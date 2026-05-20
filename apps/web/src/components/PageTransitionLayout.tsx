import { useEffect, useRef, useState, type ReactNode } from "react";
import { Routes, useLocation, type Location } from "react-router-dom";
import { pageTransitionKind } from "./pageTransitionKind";
import styles from "./PageTransitionLayout.module.css";

const EXIT_MS = 260;
const ENTER_MS = 520;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type Phase = "visible" | "exiting" | "entering";

type PageTransitionLayoutProps = {
  children: ReactNode;
};

export function PageTransitionLayout({ children }: PageTransitionLayoutProps) {
  const location = useLocation();
  const [displayed, setDisplayed] = useState<Location>(location);
  const [phase, setPhase] = useState<Phase>("visible");
  const pendingRef = useRef<Location | null>(null);
  const reduceMotionRef = useRef(prefersReducedMotion());

  useEffect(() => {
    if (location.key === displayed.key) return;

    if (reduceMotionRef.current) {
      setDisplayed(location);
      setPhase("visible");
      return;
    }

    pendingRef.current = location;
    setPhase("exiting");

    let enterTimer = 0;

    const exitTimer = window.setTimeout(() => {
      const next = pendingRef.current ?? location;
      pendingRef.current = null;
      setDisplayed(next);
      setPhase("entering");
      enterTimer = window.setTimeout(() => setPhase("visible"), ENTER_MS);
    }, EXIT_MS);

    return () => {
      clearTimeout(exitTimer);
      if (enterTimer) clearTimeout(enterTimer);
    };
  }, [location, displayed.key]);

  const targetPath = pendingRef.current?.pathname ?? location.pathname;
  const kind = pageTransitionKind(displayed.pathname, targetPath);

  const className = [
    styles.viewport,
    phase === "exiting" ? styles.exiting : "",
    phase === "entering" ? styles.entering : "",
    styles[kind],
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      <Routes location={displayed}>{children}</Routes>
    </div>
  );
}
