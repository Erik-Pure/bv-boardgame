import { useEffect, useState } from "react";

/** Aktuell visualViewport-höjd (fallback innerHeight); uppdateras på resize/scroll. */
export function useVisualViewportHeight(): number {
  const [h, setH] = useState(() =>
    typeof window !== "undefined" ? window.visualViewport?.height ?? window.innerHeight : 900,
  );
  useEffect(() => {
    const tick = () => setH(window.visualViewport?.height ?? window.innerHeight);
    tick();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", tick);
    vv?.addEventListener("scroll", tick);
    window.addEventListener("resize", tick);
    return () => {
      vv?.removeEventListener("resize", tick);
      vv?.removeEventListener("scroll", tick);
      window.removeEventListener("resize", tick);
    };
  }, []);
  return h;
}
