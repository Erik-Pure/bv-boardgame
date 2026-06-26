import type { GameLocale } from "./locale.js";

const LABELS: Record<
  GameLocale,
  { pant: string; hp: string; klunkar: string; klunkarLower: string }
> = {
  sv: { pant: "Pant", hp: "HP", klunkar: "Klunkar", klunkarLower: "klunkar" },
  en: { pant: "Cans", hp: "HP", klunkar: "Sips", klunkarLower: "sips" },
};

/** Card modal lines; omit when value unchanged. */
export function formatSelfStatDeltas(
  beforeGold: number,
  gold: number,
  beforeHp: number,
  hp: number,
  beforeKlunk: number,
  klunk: number,
  locale: GameLocale = "sv",
): string {
  const labels = LABELS[locale];
  const parts: string[] = [];
  if (beforeGold !== gold) parts.push(`${labels.pant}: ${beforeGold} → ${gold}.`);
  if (beforeHp !== hp) parts.push(`${labels.hp}: ${beforeHp} → ${hp}.`);
  if (beforeKlunk !== klunk) parts.push(`${labels.klunkar}: ${beforeKlunk} → ${klunk}.`);
  return parts.length ? "\n" + parts.join("\n") : "";
}

export function formatTargetStatDeltas(
  targetName: string,
  beforeHp: number,
  hp: number,
  beforeSips: number,
  sips: number,
  locale: GameLocale = "sv",
): string {
  const labels = LABELS[locale];
  const parts: string[] = [];
  if (beforeHp !== hp) parts.push(`${targetName} ${labels.hp}: ${beforeHp} → ${hp}.`);
  if (beforeSips !== sips) {
    parts.push(`${targetName} ${labels.klunkarLower}: ${beforeSips} → ${sips}.`);
  }
  return parts.length ? "\n" + parts.join("\n") : "";
}
