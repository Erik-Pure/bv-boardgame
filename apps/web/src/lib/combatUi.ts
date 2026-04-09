import {
  MONSTERS,
  MONSTER_LOSS_SIP_FLAT,
  monsterLossKlunkTotal,
  type CombatLoseSummary,
  type CombatWinSummary,
  type Pending,
} from "@bv/game-core";

/** Ersätter kvarleva "Du" i payload (gamla sparningar) med kortägarens namn. */
export function resolveCombatWinViewer(
  data: CombatWinSummary | null | undefined,
  viewerName?: string,
): CombatWinSummary | null {
  if (!data) return null;
  const n = viewerName?.trim();
  if (n && data.winnerName === "Du") return { ...data, winnerName: n };
  return data;
}

export function resolveCombatLossViewer(
  data: CombatLoseSummary | null | undefined,
  viewerName?: string,
): CombatLoseSummary | null {
  if (!data) return null;
  const n = viewerName?.trim();
  if (n && data.playerName === "Du") return { ...data, playerName: n };
  return data;
}

/** Parsar äldre fritext-vinst (t.ex. sparad state / gammal server) till strukturerad sammanfattning. */
export function parseLegacyCombatWinText(text: string, viewerName?: string): CombatWinSummary | null {
  const t = text.trim();
  if (!t) return null;
  const roll = /Slag:\s*(\d+)\s*\(krävde[s]?\s*(\d+)\)/i.exec(t);
  if (!roll) return null;
  const pr = Number(roll[1]);
  const need = Number(roll[2]);
  const pantM = /\+(\d+)\s*pant/i.exec(t);
  const gold = pantM ? Number(pantM[1]) : 0;
  const itemM = /hittar\s*(\d+)\s*föremål/i.exec(t);
  const items = itemM ? Number(itemM[1]) : 0;
  const teamWin = /\bNi vinner\b/i.test(t);
  const singleName = viewerName?.trim() || "Du";
  return {
    winnerName: teamWin ? "Ni" : singleName,
    enemyName: "",
    rollTotal: pr,
    need,
    rewardGold: gold,
    rewardItems: items,
  };
}

/** Parsar äldre fritext-förlust till minimal struktur (saknar HP/klunk om de inte fanns i texten). */
export function parseLegacyCombatLoseText(text: string, viewerName?: string): CombatLoseSummary | null {
  const t = text.trim();
  if (!t) return null;
  const roll = /Slag:\s*(\d+)\s*\(krävde[s]?\s*(\d+)\)/i.exec(t);
  if (!roll) return null;
  const assist = /Ölkompis-slag[^\n]*/i.exec(t);
  const redirect = /(?:Öl-bärsärken|Rabarbapappan)[^\n]*/i.exec(t);
  return {
    playerName: viewerName?.trim() || "Du",
    enemyName: "",
    rollTotal: Number(roll[1]),
    need: Number(roll[2]),
    damage: 0,
    klunkGained: 0,
    assistRollNote: assist ? assist[0].trim() : undefined,
    redirectNote: redirect ? redirect[0].trim() : undefined,
  };
}

/** Klunk vid förlust för kort-UI; fyller i från monsterlista om pending saknar `lossSipsOnLose` (gamla sparade states). */
export function combatLossKlunksForDisplay(p: Extract<Pending, { type: "combat" }>): number {
  const extraTeam = p.teamBattleRequired ? 1 : 0;
  if (p.monsterId && p.monsterId !== "boss") {
    const def = MONSTERS.find((m) => m.id === p.monsterId);
    if (def) {
      return monsterLossKlunkTotal(def);
    }
  }
  return (p.lossSipsOnLose ?? 0) + extraTeam + MONSTER_LOSS_SIP_FLAT;
}
