import {
  isFinalBossMonsterId,
  MONSTERS,
  MONSTER_LOSS_SIP_FLAT,
  monsterLossKlunkTotal,
  type CombatLoseSummary,
  type CombatWinSummary,
  type GameState,
  type MonsterId,
  type Pending,
} from "@bv/game-core";
import type { MonsterEncounterCardProps } from "../components/MonsterEncounterCard";
import { sv } from "./uiStrings";

/** Valfri undertitel i mobil vinst/förlust-kort (t.ex. stridshjälpare). */
export type CombatOutcomeUiSubtitle = { uiSubtitle?: string };

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
    rewardXp: 0,
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
export function combatLossKlunksForDisplay(
  p: Extract<Pending, { type: "combat" }>,
  opts?: { monsterLossSipReduction?: number },
): number {
  const extraTeam = p.teamBattleRequired ? 1 : 0;
  let base: number;
  if (p.monsterId && p.monsterId !== "boss") {
    const def = MONSTERS.find((m) => m.id === p.monsterId);
    if (def) {
      base = monsterLossKlunkTotal(def);
    } else {
      base = (p.lossSipsOnLose ?? 0) + extraTeam + MONSTER_LOSS_SIP_FLAT;
    }
  } else {
    base = (p.lossSipsOnLose ?? 0) + extraTeam + MONSTER_LOSS_SIP_FLAT;
  }
  const red = Math.max(0, Math.floor(opts?.monsterLossSipReduction ?? 0));
  return Math.max(0, base - red);
}

/** Props till `MonsterEncounterCard` från pågående strid (t.ex. team battle före medkämpeval). */
export function monsterEncounterCardPropsFromCombatPending(
  p: Extract<Pending, { type: "combat" }>,
  opts?: { finalBossLivesRemaining?: number | null; monsterLossSipReduction?: number },
): MonsterEncounterCardProps {
  const need = p.need + (p.needMod ?? 0);
  const id = p.monsterId as MonsterId;
  const isBoss = isFinalBossMonsterId(id);
  const bossLives =
    opts?.finalBossLivesRemaining != null && Number.isFinite(opts.finalBossLivesRemaining)
      ? opts.finalBossLivesRemaining
      : 3;
  return {
    title: p.enemyName,
    artKey: p.enemyArtKey,
    combatStrength: need,
    winGold: p.rewardGold ?? 0,
    winItems: p.rewardItems ?? 0,
    winXp: p.rewardXp ?? 0,
    lossDamage: p.baseDamage,
    lossKlunks: combatLossKlunksForDisplay(p, {
      monsterLossSipReduction: opts?.monsterLossSipReduction,
    }),
    specialRules: p.enemyIntroText?.trim() || undefined,
    bossLivesRemaining: isBoss ? bossLives : undefined,
    bossWinLootAsDash: isBoss,
    framed: true,
    fillAvailableHeight: false,
  };
}

export function isFinalBossSessionActive(
  state: Pick<GameState, "finalBossMonsterId"> | null | undefined,
): boolean {
  return !!state?.finalBossMonsterId && isFinalBossMonsterId(state.finalBossMonsterId);
}

function isBossCombatOutcomeCard(
  p: Extract<Pending, { type: "card" }>,
): boolean {
  if (p.cardId === "boss_round_win" || p.cardId === "boss_final_win") return true;
  if (p.cardId === "combat_lose" && p.title?.startsWith("Boss:")) return true;
  return false;
}

/** Flammor + puls under pågående slutboss-strid (hela encounter tills spelet avgörs). */
export function shouldShowFinalBossCombatBackdrop(
  state: Pick<GameState, "pending" | "finalBossMonsterId"> | null | undefined,
  holdoverCombatMonsterId?: string | null,
): boolean {
  if (!isFinalBossSessionActive(state)) return false;
  const p = state?.pending;
  if (p?.type === "combat" && isFinalBossMonsterId(p.monsterId as MonsterId)) return true;
  if (p?.type === "card" && p.kind === "combat") {
    if (isBossCombatOutcomeCard(p)) return true;
    if (
      (p.cardId === "combat_win" || p.cardId === "combat_lose") &&
      holdoverCombatMonsterId &&
      isFinalBossMonsterId(holdoverCombatMonsterId as MonsterId)
    ) {
      return true;
    }
  }
  if (holdoverCombatMonsterId && isFinalBossMonsterId(holdoverCombatMonsterId as MonsterId)) return true;
  return false;
}

/**
 * Mobil (/play): ingen helskärms-eld/röd overlay — den täckte föremål/utrustning och störde tärningsslag.
 * Slutboss-känsla på mobil: pulserande bakgrund på möteskortet (`bossPulsingBackdrop`), inte fixed video.
 */
export function combatAllyOutcomeRole(
  pending: Extract<Pending, { type: "card" }>,
  meId: string,
): "helpMate" | "beerBro" | null {
  if (pending.cardId === "combat_win" && pending.combatWin) {
    const cw = pending.combatWin;
    if (cw.helpMatePlayerId === meId) return "helpMate";
    if (cw.assistPlayerId === meId) return "beerBro";
    return null;
  }
  if (pending.cardId === "combat_lose" && pending.combatLoss) {
    const cl = pending.combatLoss;
    if (cl.helpMateImpact?.playerId === meId) return "helpMate";
    if (cl.assistPartnerImpact?.playerId === meId) return "beerBro";
    return null;
  }
  return null;
}

/** Stabil nyckel så hjälpare kan stänga modal utan dubbel-toast när angriparen bekräftar. */
export function combatAllyOutcomeKey(pending: Extract<Pending, { type: "card" }>): string {
  if (pending.cardId === "combat_win" && pending.combatWin) {
    const cw = pending.combatWin;
    return `win:${pending.playerId}:${cw.rollTotal}:${cw.need}:${cw.helpMatePlayerId ?? ""}:${cw.assistPlayerId ?? ""}`;
  }
  if (pending.cardId === "combat_lose" && pending.combatLoss) {
    const cl = pending.combatLoss;
    return `lose:${pending.playerId}:${cl.rollTotal}:${cl.need}:${cl.helpMateImpact?.playerId ?? ""}:${cl.assistPartnerImpact?.playerId ?? ""}`;
  }
  return `${pending.cardId}:${pending.playerId}`;
}

export function buildCombatAllyWinSummary(
  cw: CombatWinSummary,
  role: "helpMate" | "beerBro",
  viewerName: string,
): CombatWinSummary & CombatOutcomeUiSubtitle {
  const attacker = cw.winnerName.trim() || "Spelaren";
  const enemy = cw.enemyName;
  const base = {
    enemyName: enemy,
    rollTotal: cw.rollTotal,
    need: cw.need,
    rewardGold: 0,
    rewardXp: 0,
  };
  if (role === "helpMate") {
    return {
      ...base,
      winnerName: viewerName,
      rewardItems: cw.helpMateGrantedRewardTitles?.length ?? 0,
      uiSubtitle: sv.play.combatWinSubtitleHelpMate(attacker, enemy),
    };
  }
  return {
    ...base,
    winnerName: viewerName,
    teammateName: attacker,
    rewardItems: cw.beerBroGrantedRewardTitles?.length ?? 0,
  };
}

export function buildCombatAllyLossSummary(
  cl: CombatLoseSummary,
  role: "helpMate" | "beerBro",
  viewerName: string,
): CombatLoseSummary & CombatOutcomeUiSubtitle {
  const impact = role === "helpMate" ? cl.helpMateImpact : cl.assistPartnerImpact;
  const attacker = cl.playerName.trim() || "Spelaren";
  const enemy = cl.enemyName;
  const hpLost = Math.max(0, Math.floor(impact?.hpLost ?? 0));
  const klunksGained = Math.max(0, Math.floor(impact?.klunksGained ?? 0));
  const subtitleFn =
    role === "helpMate" ? sv.play.combatLoseSubtitleHelpMate : sv.play.combatLoseSubtitleBeerBro;
  return {
    playerName: viewerName,
    enemyName: enemy,
    rollTotal: cl.rollTotal,
    need: cl.need,
    damage: hpLost,
    klunkGained: klunksGained,
    uiSubtitle: subtitleFn(attacker, enemy),
  };
}

export function shouldShowFinalBossCombatBackdropOnPlay(
  _state: Pick<GameState, "pending" | "finalBossMonsterId"> | null | undefined,
  _playerId?: string | null | undefined,
): boolean {
  return false;
}

export function finalBossCombatBackdropSessionKey(
  state: Pick<GameState, "finalBossMonsterId" | "pending"> | null | undefined,
  _combatSessionKey?: string | null,
  holdoverCombatMonsterId?: string | null,
): string | null {
  if (!shouldShowFinalBossCombatBackdrop(state, holdoverCombatMonsterId)) return null;
  /** En nyckel per slutboss-encounter så videon inte mountas om mellan rundor/kort. */
  return `final-boss-fight-${state!.finalBossMonsterId}`;
}
