/** Card modal lines; omit when value unchanged. */
export function formatSelfStatDeltas(
  beforeGold: number,
  gold: number,
  beforeHp: number,
  hp: number,
  beforeKlunk: number,
  klunk: number,
): string {
  const parts: string[] = [];
  if (beforeGold !== gold) parts.push(`Pant: ${beforeGold} → ${gold}.`);
  if (beforeHp !== hp) parts.push(`HP: ${beforeHp} → ${hp}.`);
  if (beforeKlunk !== klunk) parts.push(`Klunkar: ${beforeKlunk} → ${klunk}.`);
  return parts.length ? "\n" + parts.join("\n") : "";
}

export function formatTargetStatDeltas(
  targetName: string,
  beforeHp: number,
  hp: number,
  beforeSips: number,
  sips: number,
): string {
  const parts: string[] = [];
  if (beforeHp !== hp) parts.push(`${targetName} HP: ${beforeHp} → ${hp}.`);
  if (beforeSips !== sips) parts.push(`${targetName} klunkar: ${beforeSips} → ${sips}.`);
  return parts.length ? "\n" + parts.join("\n") : "";
}
