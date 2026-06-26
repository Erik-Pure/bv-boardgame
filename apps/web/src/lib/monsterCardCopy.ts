/** Rader som bara upprepar vad ikoner/siffror redan visar (inkl. äldre `enemyIntroText`). */
function isRedundantMonsterStatLine(line: string): boolean {
  const t = line.trim();
  if (/^Styrka:\s*\d+\.?$/i.test(t)) return true;
  if (/^Strength:\s*\d+\.?$/i.test(t)) return true;
  if (/^Vid förlust:\s*ta\s*\d+\s*skada\.?$/i.test(t)) return true;
  if (/^On loss:\s*take\s*\d+\s*damage\.?$/i.test(t)) return true;
  if (/^Vid förlust:\s*ta\s*\d+\s*klunk\.?$/i.test(t)) return true;
  if (/^On loss:\s*take\s*\d+\s*sips?\.?$/i.test(t)) return true;
  if (/^Vid vinst:\s*\+?\d+\s*pant\s*och\s*\d+\s*item\.?$/i.test(t)) return true;
  if (/^On win:\s*\+?\d+\s*cans?\s*and\s*\d+\s*items?\.?$/i.test(t)) return true;
  if (/^Vid vinst:\s*\+?\d+\s*pant\.?$/i.test(t)) return true;
  if (/^On win:\s*\+?\d+\s*cans?\.?$/i.test(t)) return true;
  if (/^Vid vinst:\s*\d+\s*item\.?$/i.test(t)) return true;
  if (/^On win:\s*\d+\s*items?\.?$/i.test(t)) return true;
  if (/^Lagstrid:\s*välj en medkämpe innan striden\.?$/i.test(t)) return true;
  if (/^Team battle:\s*välj en medkämpe innan striden\.?$/i.test(t)) return true;
  if (/^Team battle:\s*choose a teammate before the fight\.?$/i.test(t)) return true;
  return false;
}

/** Text under monsterkortet: specialregler utan standardrader om statistik. */
export function monsterSpecialRulesForDisplay(text: string | undefined | null): string | undefined {
  if (text == null || !String(text).trim()) return undefined;
  const lines = String(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !isRedundantMonsterStatLine(l));
  const out = lines.join("\n").trim();
  return out || undefined;
}
