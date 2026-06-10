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
  | "pimp"
  | "fermentation_hydra"
  | "taproom_titan"
  | "store_narcissius"
  | "oldomaren"
  | "onda_bryggverket"
  | "unicorn"
  | "enhorningsryttare"
  | "fargglada_gubbar"
  | "transporter"
  | "cowboys"
  | "demonkrigare"
  | "busiga_buskar"
  | "solen";

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
  /** XP reward on win. */
  rewardXp: number;
  /** Placeholder key for future art */
  artKey: string;
  /** Vid vinst: slumpa mottagare (annan levande spelare, ej angripare/medhjälpare) och ge straffklunk per enhet. */
  winRandomOtherSips?: number;
  /**
   * Tidigaste brädnivå (0-baserat `levelIndex`) där monstret kan slumpas på dålig batch.
   * Default 0 = från första våningen. T.ex. 1 = inte förrän spelaren är på våning 2.
   */
  minBoardLevelIndex?: number;
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

type MonsterDefInput = Omit<MonsterDef, "rewardXp"> & { rewardXp?: number };

const MONSTER_DEFS: MonsterDefInput[] = [
  {
    id: "skum_banan",
    name: "Skum banan",
    strength: 3,
    baseDamage: 2,
    rulesText: "Om klockan är efter 20:30: gör den 1 extra skada (jämfört med sin ordinarie attack).",
    rewardGold: 6,
    rewardItems: 1,
    rewardXp: 30,
    artKey: "monster/skum-banan",
  },
  {
    id: "folke_bengtsson",
    name: "Folke Bengtsson",
    strength: 2,
    baseDamage: 1,
    rulesText: "Om du har fler än 5 klunkar: ta 3 skada i stället.",
    rewardGold: 5,
    rewardItems: 1,
    rewardXp: 20,
    artKey: "monster/folke-bengtsson",
  },
  {
    id: "rabarbapappa",
    name: "Rabarbapappa",
    strength: 4,
    baseDamage: 3,
    rulesText:
      "Om du slår 1: den svingar och missar dig men träffar en slumpmässig annan spelare i stället.",
    rewardGold: 8,
    rewardItems: 2,
    rewardXp: 50,
    artKey: "monster/rabarbapappa",
  },
  {
    id: "brottningsmatch",
    name: "Brottningsmatch",
    strength: 3,
    baseDamage: 3,
    rulesText: "",
    lossSipsOnLose: 1,
    rewardGold: 6,
    rewardItems: 1,
    rewardXp: 40,
    artKey: "monster/brottningsmatch",
  },
  {
    id: "keg_lifter",
    name: "O-beast",
    strength: 2,
    baseDamage: 1,
    rulesText: "Vid skada: tappa slumpmässig utrusning",
    rewardGold: 5,
    rewardItems: 1,
    rewardXp: 20,
    artKey: "monster/keg-lifter",
  },
  {
    id: "imperial_dragon_stout",
    name: "Stoorn",
    strength: 5,
    baseDamage: 6,
    rulesText: "Vid förlust: alla andra spelare på samma våning tar 1 skada.",
    lossSipsOnLose: 1,
    rewardGold: 10,
    rewardItems: 2,
    rewardXp: 60,
    artKey: "monster/stoorn",
    minBoardLevelIndex: 1,
  },
  {
    id: "megasouruz",
    name: "Megasouruz",
    strength: 3,
    baseDamage: 3,
    rulesText: "",
    lossSipsOnLose: 1,
    rewardGold: 6,
    rewardItems: 2,
    rewardXp: 30,
    artKey: "monster/megasouruz",
  },
  {
    id: "belgisk_munk",
    name: "Belgisk munk",
    strength: 4,
    baseDamage: 2,
    rulesText: "Ta en klunk och betala 5 pant i dess ära så försvinner den.",
    rewardGold: 5,
    rewardItems: 2,
    rewardXp: 45,
    artKey: "monster/belgisk-munk",
  },
  {
    id: "kapten_interrobang",
    name: "Kapten Interrobang",
    strength: 4,
    baseDamage: 5,
    rulesText:
      "Vid förlust: betala 5 pant för att minska skada med 3.",
    rewardGold: 8,
    rewardItems: 2,
    rewardXp: 50,
    artKey: "monster/kapten-interrobang",
  },
  {
    id: "sura_bar",
    name: "Sura bär",
    strength: 4,
    baseDamage: 4,
    rulesText:
      "Vid skada: Ta en klunk för att minska skadan med 2 — eller ta full skada utan att dricka.",
    rewardGold: 8,
    rewardItems: 2,
    rewardXp: 50,
    artKey: "monster/sura-bar",
  },
  {
    id: "barsfisk",
    name: "Bärsfisk",
    strength: 3,
    baseDamage: 3,
    rulesText: "",
    rewardGold: 6,
    rewardItems: 1,
    rewardXp: 40,
    artKey: "monster/barsfisk",
  },
  {
    id: "humlan",
    name: "Humlan",
    strength: 2,
    baseDamage: 1,
    rulesText: "",
    lossSipsOnLose: 1,
    rewardGold: 5,
    rewardItems: 1,
    rewardXp: 20,
    artKey: "monster/humlan",
  },
  {
    id: "bottling_bot",
    name: "Rally robot",
    strength: 4,
    baseDamage: 3,
    rulesText: "",
    lossSipsOnLose: 1,
    rewardGold: 6,
    rewardItems: 1,
    rewardXp: 40,
    artKey: "monster/bottling-bot",
  },
  {
    id: "store_narcissius",
    name: "Den store narcissus",
    strength: 6,
    baseDamage: 5,
    rulesText: "",
    lossSipsOnLose: 1,
    rewardGold: 12,
    rewardItems: 2,
    rewardXp: 60,
    artKey: "monster/store-narcissius",
  },
  {
    id: "oldomaren",
    name: "Öldomaren",
    strength: 5,
    baseDamage: 4,
    rulesText: "",
    lossSipsOnLose: 1,
    rewardGold: 12,
    rewardItems: 2,
    rewardXp: 50,
    artKey: "monster/oldomaren",
  },
  {
    id: "onda_bryggverket",
    name: "Onda bryggverket",
    strength: 6,
    baseDamage: 5,
    rulesText: "",
    lossSipsOnLose: 1,
    rewardGold: 12,
    rewardItems: 2,
    rewardXp: 60,
    artKey: "monster/onda-bryggverket",
  },
  /** Team battle — inte slutboss; gamla boss-karaktärer återinförda som svåra möten på vanliga stridsrutor. */
  {
    id: "pimp",
    name: "Pimp",
    strength: 8,
    baseDamage: 3,
    rulesText: "",
    lossSipsOnLose: 1,
    teamBattleRequired: true,
    teamBattleBonusGold: 2,
    rewardGold: 12,
    rewardItems: 3,
    rewardXp: 80,
    artKey: "monster/pimp",
  },
  {
    id: "fermentation_hydra",
    name: "Surkartar",
    strength: 9,
    baseDamage: 4,
    rulesText: "",
    lossSipsOnLose: 1,
    teamBattleRequired: true,
    teamBattleBonusGold: 3,
    rewardGold: 13,
    rewardItems: 2,
    rewardXp: 90,
    artKey: "monster/fermentation-hydra",
  },
  {
    id: "taproom_titan",
    name: "Bru-Team",
    strength: 10,
    baseDamage: 5,
    rulesText: "",
    lossSipsOnLose: 1,
    teamBattleRequired: true,
    teamBattleBonusGold: 4,
    rewardGold: 15,
    rewardItems: 4,
    rewardXp: 100,
    artKey: "monster/taproom-titan",
  },
  {
    id: "unicorn",
    name: "Enhörning",
    strength: 3,
    baseDamage: 2,
    rulesText: "Vid vinst: en slumpmässig annan spelare får en straffklunk.",
    lossSipsOnLose: 1,
    rewardGold: 3,
    rewardItems: 1,
    rewardXp: 30,
    artKey: "monster/unicorn",
    winRandomOtherSips: 1,
  },
  {
    id: "enhorningsryttare",
    name: "Enhörningsryttare",
    strength: 6,
    baseDamage: 4,
    rulesText: "Vid förlust: tappa 10 pant.",
    lossSipsOnLose: 1,
    rewardGold: 8,
    rewardItems: 2,
    rewardXp: 75,
    artKey: "monster/enhorningsryttare",
    minBoardLevelIndex: 1,
  },
  {
    id: "fargglada_gubbar",
    name: "Färgglada gubbar",
    strength: 4,
    baseDamage: 2,
    rulesText: "",
    rewardGold: 9,
    rewardItems: 2,
    rewardXp: 40,
    artKey: "monster/fargglada_gubbar",
  },
  {
    id: "transporter",
    name: "Transporter",
    strength: 4,
    baseDamage: 3,
    rulesText: "Vid förlust: betala 10 pant för att ta 0 skada.",
    rewardGold: 8,
    rewardItems: 2,
    rewardXp: 40,
    artKey: "monster/transporter",
  },
  {
    id: "cowboys",
    name: "Cowboys",
    strength: 7,
    baseDamage: 3,
    rulesText: "Vid vinst: båda stridande får +5 HP.",
    teamBattleRequired: true,
    rewardGold: 8,
    rewardItems: 2,
    rewardXp: 70,
    artKey: "monster/cowboys",
  },
  {
    id: "demonkrigare",
    name: "Demonkrigare",
    strength: 5,
    baseDamage: 3,
    rulesText: "Betala 10 pant för att undvika striden. Vid förlust: en annan spelare får +3 HP.",
    lossSipsOnLose: 1,
    rewardGold: 9,
    rewardItems: 2,
    rewardXp: 66,
    artKey: "monster/demonkrigare",
    minBoardLevelIndex: 1,
  },
  {
    id: "busiga_buskar",
    name: "Busiga buskar",
    strength: 3,
    baseDamage: 2,
    rulesText: "Vid förlust: ge upp till 5 pant till spelaren som har minst pant.",
    lossSipsOnLose: 1,
    rewardGold: 6,
    rewardItems: 1,
    rewardXp: 30,
    artKey: "monster/busigabuskar",
  },
  {
    id: "solen",
    name: "Solen",
    strength: 3,
    baseDamage: 1,
    rulesText: "Vid förlust: du får sol i ögonen och står över nästa tur.",
    lossSipsOnLose: 1,
    rewardGold: 3,
    rewardItems: 2,
    rewardXp: 25,
    artKey: "monster/solen",
  },
];

export const MONSTERS: MonsterDef[] = MONSTER_DEFS.map((m) => ({
  ...m,
  rewardXp: m.rewardXp ?? m.strength * 10,
}));

/** Dåliga batchar som inte får slumpas förrän `levelIndex >= 1` (spelarens våning 2). */
export const LATE_RANDOM_MONSTER_IDS: readonly MonsterId[] = [
  "imperial_dragon_stout",
  "enhorningsryttare",
  "demonkrigare",
];

export function monsterAvailableAtBoardLevel(
  m: Pick<MonsterDef, "minBoardLevelIndex">,
  levelIndex: number,
): boolean {
  return levelIndex >= (m.minBoardLevelIndex ?? 0);
}

export function monstersEligibleForRandomEncounter(levelIndex: number): {
  team: MonsterDef[];
  normal: MonsterDef[];
} {
  const eligible = (list: readonly MonsterDef[]) =>
    list.filter((m) => monsterAvailableAtBoardLevel(m, levelIndex));
  return {
    team: eligible(MONSTERS.filter((m) => m.teamBattleRequired && !isFinalBossMonsterId(m.id))),
    normal: eligible(MONSTERS.filter((m) => !m.teamBattleRequired && !isFinalBossMonsterId(m.id))),
  };
}

/** Högsta brädsnivå (våning) någon spelare befinner sig på — t.ex. statistik eller lobby. */
export function maxPlayerBoardLevel(players: readonly { levelIndex: number }[]): number {
  if (players.length === 0) return 0;
  return Math.max(...players.map((p) => p.levelIndex));
}

/** Extra styrkekrav / HP-skada per brädnivå över våning 1 (våning 2 → +2, våning 3 → +4, …). */
export const MONSTER_NEED_BONUS_PER_LEVEL = 2;

/**
 * Extra per våning (0-baserat `levelIndex`) som läggs på **styrkekrav** i strid och på **HP-skada** vid
 * monsterförlust (samma skala). Påverkar inte pant eller klunkar i sig.
 */
export function monsterNeedBonusForBoardLevel(levelIndex: number): number {
  return Math.max(0, Math.floor(levelIndex)) * MONSTER_NEED_BONUS_PER_LEVEL;
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

/** Standardmonster = varken slutboss eller team battle. */
export function isStandardMonsterId(id: MonsterId): boolean {
  const m = MONSTERS.find((x) => x.id === id);
  if (!m) return false;
  return !isFinalBossMonsterId(id) && !m.teamBattleRequired;
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

