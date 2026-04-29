import { useEffect, useRef, useState } from "react";

type WakeLockSentinelLike = {
  release: () => Promise<void>;
  released: boolean;
  addEventListener?: (type: "release", listener: () => void) => void;
};

export function useScreenWakeLock(shouldHoldWakeLock: boolean): boolean {
  const [wakeLockAvailable, setWakeLockAvailable] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<unknown> } };
    setWakeLockAvailable(typeof nav.wakeLock?.request === "function");
  }, []);

  useEffect(() => {
    if (!shouldHoldWakeLock) {
      const sentinel = wakeLockRef.current;
      wakeLockRef.current = null;
      if (sentinel && !sentinel.released) {
        void sentinel.release().catch(() => undefined);
      }
      return;
    }
    if (typeof document === "undefined") return;
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<unknown> } };
    if (!nav.wakeLock?.request) return;

    let cancelled = false;
    const requestWakeLock = async () => {
      if (cancelled || document.visibilityState !== "visible") return;
      try {
        const lock = (await nav.wakeLock!.request("screen")) as WakeLockSentinelLike;
        if (cancelled) {
          if (!lock.released) await lock.release();
          return;
        }
        wakeLockRef.current = lock;
        lock.addEventListener?.("release", () => {
          if (wakeLockRef.current === lock) {
            wakeLockRef.current = null;
          }
        });
      } catch {
        // Temporary browser denial is non-fatal.
      }
    };

    const onVisibilityChange = () => {
      if (!shouldHoldWakeLock) return;
      if (document.visibilityState === "visible" && !wakeLockRef.current) {
        void requestWakeLock();
      }
    };

    void requestWakeLock();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      const sentinel = wakeLockRef.current;
      wakeLockRef.current = null;
      if (sentinel && !sentinel.released) {
        void sentinel.release().catch(() => undefined);
      }
    };
  }, [shouldHoldWakeLock]);

  return wakeLockAvailable;
}
