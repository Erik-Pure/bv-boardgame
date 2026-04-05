/**
 * Alla som får reagera har antingen passat eller spelat minst en ingripande-effekt.
 * (Klick på "ingrip" utan kort sätter inget — de måste fortfarande välja pass eller kort.)
 */
export function combatReactionsAllAnswered(
  reactors: string[],
  reacted: Partial<Record<string, "pass" | "intervened">> | undefined,
): boolean {
  if (reactors.length === 0) return true;
  const map = reacted ?? {};
  return reactors.every((id) => {
    const v = map[id];
    return v === "pass" || v === "intervened";
  });
}
