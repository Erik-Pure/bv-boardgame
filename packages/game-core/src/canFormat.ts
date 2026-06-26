/** English currency label: 1 can, 2+ cans (replaces "pant" / legacy "deposit"). */
export function canWord(amount: number): "can" | "cans" {
  return Math.abs(Math.floor(amount)) === 1 ? "can" : "cans";
}

export function formatCanAmount(n: number): string {
  return `${n} ${canWord(n)}`;
}
