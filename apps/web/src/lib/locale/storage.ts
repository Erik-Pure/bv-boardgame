import type { GameLocale } from "@bv/game-core";

const LOCALE_KEY = "bv:locale";

function detectBrowserLocale(): GameLocale {
  if (typeof navigator === "undefined") return "sv";
  const lang = navigator.language?.toLowerCase() ?? "";
  return lang.startsWith("en") ? "en" : "sv";
}

export function readStoredLocale(): GameLocale {
  if (typeof window === "undefined") return "sv";
  try {
    const raw = window.localStorage.getItem(LOCALE_KEY);
    if (raw === "sv" || raw === "en") return raw;
  } catch {
    // ignore
  }
  return detectBrowserLocale();
}

export function writeStoredLocale(locale: GameLocale): void {
  try {
    window.localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // ignore
  }
}
