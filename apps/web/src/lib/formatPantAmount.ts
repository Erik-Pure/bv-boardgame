import { formatCanAmount, type GameLocale } from "@bv/game-core";

/** Visningsbelopp för pant i UI (sv: «8 pant», en: «8 cans»). */
export function formatPantAmount(amount: number, locale: GameLocale): string {
  const n = Math.floor(amount);
  if (locale === "sv") return `${n} pant`;
  return formatCanAmount(n);
}
