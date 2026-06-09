import { useCallback, useEffect, useRef, useState } from "react";

export function usePlayXpGainPrompt() {
  const [xpGainPromptText, setXpGainPromptText] = useState<string | null>(null);
  const [xpGainPromptKey, setXpGainPromptKey] = useState(0);
  const timerRef = useRef<number | null>(null);

  const showXpGainPrompt = useCallback((xpAmount: number) => {
    const xp = Math.max(0, Math.floor(xpAmount));
    if (xp <= 0) return;
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setXpGainPromptText(`+${xp} XP`);
    setXpGainPromptKey((k) => k + 1);
    timerRef.current = window.setTimeout(() => {
      setXpGainPromptText(null);
      timerRef.current = null;
    }, 1700);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return { xpGainPromptText, xpGainPromptKey, showXpGainPrompt };
}
