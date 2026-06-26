import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { GameLocale } from "@bv/game-core";
import { getUiStrings, type UiStrings } from "../uiStrings";
import { readStoredLocale, writeStoredLocale } from "./storage";

type LocaleContextValue = {
  locale: GameLocale;
  setLocale: (locale: GameLocale) => void;
  ui: UiStrings;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<GameLocale>(() => readStoredLocale());

  const setLocale = useCallback((next: GameLocale) => {
    setLocaleState(next);
    writeStoredLocale(next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      ui: getUiStrings(locale),
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): GameLocale {
  return useLocaleContext().locale;
}

export function useSetLocale(): (locale: GameLocale) => void {
  return useLocaleContext().setLocale;
}

export function useUiStrings(): UiStrings {
  return useLocaleContext().ui;
}

function useLocaleContext(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
