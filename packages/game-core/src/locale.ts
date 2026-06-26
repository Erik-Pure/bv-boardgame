export type GameLocale = "sv" | "en";

export const DEFAULT_LOCALE: GameLocale = "sv";

export const GAME_LOCALES: readonly GameLocale[] = ["sv", "en"] as const;

export function isGameLocale(value: string): value is GameLocale {
  return value === "sv" || value === "en";
}
