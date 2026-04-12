export type MonsterId =
  | "skum_banan"
  | "folke_bengtsson"
  | "rabarbapappa"
  | "brottningsmatch"
  | "keg_lifter"
  | "imperial_dragon_stout"
  | "megasouruz"
  | "belgisk_munk"
  | "kapten_interrobang"
  | "sura_bar"
  | "barsfisk"
  | "humlan"
  | "bottling_bot"
  | "taproom_titan"
  | "store_narcissius"
  | "oldomaren"
  | "onda_bryggverket"
  | "unicorn";

export interface MonsterDef {
  id: MonsterId;
  name: string;
  /** Roll total must be >= strength to win */
  strength: number;
  /** Damage taken on a loss (may be modified by special rules) */
  baseDamage: number;
  /** Free-form rules text shown on the card */
  rulesText: string;
  /** Extra klunkar each fighter gets on loss. */
  lossSipsOnLose?: number;
  /** If true, attacker must pick one teammate and both fight together. */
  teamBattleRequired?: boolean;
  /** Extra gold each fighter gets on win in team battle. */
  teamBattleBonusGold?: number;
  /** Fixed gold reward on win. */
  rewardGold: number;
  /** Fixed item reward on win. */
  rewardItems: number;
  /** Placeholder key for future art */
  artKey: string;
  /** Vid vinst: slumpa mottagare (annan levande spelare, ej angripare/medhjälpare) och ge straffklunk per enhet. */
  winRandomOtherSips?: number;
}

/**
 * Global höjning av straffklunk vid monsterförlust (alla monster: tidigare 0→1, 1→2, …).
 * Utöver {@link MonsterDef.lossSipsOnLose} och team-regeln (+1 vid team battle).
 */
export const MONSTER_LOSS_SIP_FLAT = 1;

/** Klunk vid förlust enligt monster + ev. extra vid team battle (motorspelet lägger +1). */
export function monsterLossKlunkTotal(m: Pick<MonsterDef, "lossSipsOnLose" | "teamBattleRequired">): number {
  return (m.lossSipsOnLose ?? 0) + (m.teamBattleRequired ? 1 : 0) + MONSTER_LOSS_SIP_FLAT;
}

export const MONSTERS: MonsterDef[] = [
  {
    id: "skum_banan",
    name: "Skum banan",
    strength: 3,
    baseDamage: 2,
    rulesText: "Om klockan är efter 20:30: ta 3 skada i stället.",
    rewardGold: 4,
    rewardItems: 1,
    artKey: "monster/skum-banan",
  },
  {
    id: "folke_bengtsson",
    name: "Folke Bengtsson",
    strength: 2,
    baseDamage: 1,
    rulesText: "Om du har fler än 5 klunkar: ta 3 skada i stället.",
    rewardGold: 3,
    rewardItems: 0,
    artKey: "monster/folke-bengtsson",
  },
  {
    id: "rabarbapappa",
    name: "Rabarbapappa",
    strength: 4,
    baseDamage: 3,
    rulesText:
      "Om du slår 1: den svingar och missar dig men träffar en slumpmässig annan spelare i stället.",
    rewardGold: 5,
    rewardItems: 1,
    artKey: "monster/rabarbapappa",
  },
  {
    id: "brottningsmatch",
    name: "Brottningsmatch",
    strength: 3,
    baseDamage: 3,
    rulesText: "",
    lossSipsOnLose: 1,
    rewardGold: 4,
    rewardItems: 1,
    artKey: "monster/brottningsmatch",
  },
  {
    id: "keg_lifter",
    name: "O-beast",
    strength: 2,
    baseDamage: 1,
    rulesText: "Vid skada: tappa slumpmässig utrusning",
    rewardGold: 3,
    rewardItems: 0,
    artKey: "monster/keg-lifter",
  },
  {
    id: "imperial_dragon_stout",
    name: "Stoorn",
    strength: 5,
    baseDamage: 6,
    rulesText: "Vid skada: alla intilliggande spelare tar 1 skada.",
    lossSipsOnLose: 1,
    rewardGold: 7,
    rewardItems: 2,
    artKey: "monster/stoorn",
  },
  {
    id: "megasouruz",
    name: "Megasouruz",
    strength: 3,
    baseDamage: 3,
    rulesText: "",
    lossSipsOnLose: 1,
    rewardGold: 4,
    rewardItems: 1,
    artKey: "monster/megasouruz",
  },
  {
    id: "belgisk_munk",
    name: "Belgisk munk",
    strength: 2,
    baseDamage: 1,
    rulesText: "Ta en klunk så försvinner den — eller slåss som med vilket monster som helst.",
    rewardGold: 3,
    rewardItems: 0,
    artKey: "monster/belgisk-munk",
  },
  {
    id: "kapten_interrobang",
    name: "Kapten Interrobang",
    strength: 4,
    baseDamage: 5,
    rulesText:
      "Vid skada: du får ta en klunk för att minska skadan med 3 — eller ta full skada utan att dricka.",
    rewardGold: 5,
    rewardItems: 1,
    artKey: "monster/kapten-interrobang",
  },
  {
    id: "sura_bar",
    name: "Sura bär",
    strength: 4,
    baseDamage: 4,
    rulesText:
      "Vid skada: Ta en klunk för att minska skadan med 2 — eller ta full skada utan att dricka.",
    rewardGold: 5,
    rewardItems: 1,
    artKey: "monster/sura-bar",
  },
  {
    id: "barsfisk",
    name: "Bärsfisk",
    strength: 3,
    baseDamage: 3,
    rulesText: "",
    rewardGold: 4,
    rewardItems: 1,
    artKey: "monster/barsfisk",
  },
  {
    id: "humlan",
    name: "Humlan",
    strength: 2,
    baseDamage: 1,
    rulesText: "",
    lossSipsOnLose: 1,
    rewardGold: 3,
    rewardItems: 0,
    artKey: "monster/humlan",
  },
  {
    id: "bottling_bot",
    name: "Rally robot",
    strength: 3,
    baseDamage: 2,
    rulesText: "",
    lossSipsOnLose: 1,
    rewardGold: 4,
    rewardItems: 1,
    artKey: "monster/bottling-bot",
  },
  {
    id: "store_narcissius",
    name: "Den store narcissius",
    strength: 6,
    baseDamage: 3,
    rulesText: "",
    lossSipsOnLose: 1,
    rewardGold: 8,
    rewardItems: 2,
    artKey: "monster/store-narcissius",
  },
  {
    id: "oldomaren",
    name: "Öldomaren",
    strength: 5,
    baseDamage: 4,
    rulesText: "",
    lossSipsOnLose: 1,
    rewardGold: 8,
    rewardItems: 2,
    artKey: "monster/oldomaren",
  },
  {
    id: "onda_bryggverket",
    name: "Onda bryggverket",
    strength: 6,
    baseDamage: 3,
    rulesText: "",
    lossSipsOnLose: 1,
    rewardGold: 8,
    rewardItems: 2,
    artKey: "monster/onda-bryggverket",
  },
  {
    id: "unicorn",
    name: "Enhörning",
    strength: 3,
    baseDamage: 2,
    rulesText: "Vid vinst: en slumpmässig annan spelare får en straffklunk.",
    lossSipsOnLose: 1,
    rewardGold: 2,
    rewardItems: 1,
    artKey: "monster/unicorn",
    winRandomOtherSips: 1,
  },
];

/** Högsta brädsnivå (våning) någon spelare befinner sig på — t.ex. statistik eller lobby. */
export function maxPlayerBoardLevel(players: readonly { levelIndex: number }[]): number {
  if (players.length === 0) return 0;
  return Math.max(...players.map((p) => p.levelIndex));
}

/**
 * Extra som läggs på **styrkekrav** för strider **på en given våning** (0-baserat `levelIndex`).
 * Våning 0 → +0, våning 1 → +1, osv. Påverkar inte pant, klunkar eller skada — bara `need` i strid.
 */
export function monsterNeedBonusForBoardLevel(levelIndex: number): number {
  return Math.max(0, Math.floor(levelIndex));
}

/**
 * @deprecated Använd {@link monsterNeedBonusForBoardLevel} per våning i strid. Kvar som partiets max våning.
 */
export function globalMonsterNeedBonus(players: readonly { levelIndex: number }[]): number {
  return maxPlayerBoardLevel(players);
}

/** Simulera max våning om `playerId` flyttas till `newLevelIndex` (för UI / logg före byte). */
export function maxPlayerBoardLevelIfPlayerReaches(
  players: readonly { id: string; levelIndex: number }[],
  playerId: string,
  newLevelIndex: number,
): number {
  return Math.max(...players.map((p) => (p.id === playerId ? newLevelIndex : p.levelIndex)));
}

/** Slutboss — exakt en per spel, slumpas vid start (måste finnas i {@link MONSTERS}). */
export const FINAL_BOSS_IDS: readonly MonsterId[] = ["store_narcissius", "oldomaren", "onda_bryggverket"];

export function isFinalBossMonsterId(id: MonsterId): boolean {
  return (FINAL_BOSS_IDS as readonly string[]).includes(id);
}

/** Kortfooter under slutboss: bara partistraf, ikoner visar HP/klunk/pant. */
export function finalBossCardTagline(id: MonsterId): string | null {
  switch (id) {
    case "store_narcissius":
      return "Slutboss — Vid förlust: Alla spelare tappar 1 pant";
    case "oldomaren":
      return "Slutboss — Vid förlust: Alla spelare tar en klunk";
    case "onda_bryggverket":
      return "Slutboss — Vid förlust: Ett slumpmässigt föremål eller en utrustning förstörs";
    default:
      return null;
  }
}

/** Antal liv-rutor (hjärtan) för slutboss-UI. */
export const FINAL_BOSS_LIFE_TOTAL = 3;

