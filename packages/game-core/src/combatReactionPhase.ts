/**
 * Tidig upplåsning av slag/hjälp sker bara när alla reaktorer uttryckligen har passat.
 * Har någon ingripit med kort måste reaktionsfönstret löpa ut innan striden går vidare.
 */
export function combatReactionsAllAnswered(
  reactors: string[],
  reacted: Partial<Record<string, "pass" | "intervened">> | undefined,
): boolean {
  if (reactors.length === 0) return true;
  const map = reacted ?? {};
  return reactors.every((id) => {
    const v = map[id];
    return v === "pass";
  });
}
