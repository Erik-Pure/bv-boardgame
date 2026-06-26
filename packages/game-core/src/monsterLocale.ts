import type { GameLocale } from "./locale.js";
import {
  MONSTERS,
  finalBossCardTagline,
  type MonsterId,
} from "./monsters.js";

export interface MonsterDisplayText {
  name: string;
  rulesText: string;
}

const MONSTER_LOCALE_EN: Record<MonsterId, MonsterDisplayText> = {
  skum_banan: {
    name: "Shady Banana",
    rulesText:
      "If the clock is after 8:30 PM: it deals 1 extra damage (compared to its normal attack).",
  },
  folke_bengtsson: {
    name: "Folke Bengtsson",
    rulesText: "If you have more than 5 sips: take 3 damage instead.",
  },
  rabarbapappa: {
    name: "Uncle Rhubarb",
    rulesText:
      "If you roll a 1: it swings and misses you but hits a random other player instead.",
  },
  rabarbar: {
    name: "Rhubarbarian",
    rulesText: "",
  },
  brottningsmatch: {
    name: "Wrestlers",
    rulesText: "",
  },
  keg_lifter: {
    name: "O-beast",
    rulesText: "On damage: lose random equipment",
  },
  imperial_dragon_stout: {
    name: "Stoorn",
    rulesText: "On loss: all other players on the same floor take 1 damage.",
  },
  megasouruz: {
    name: "Megasouruz",
    rulesText: "",
  },
  belgisk_munk: {
    name: "Belgian Monk",
    rulesText: "Take a sip and pay 5 cans in its honor and it disappears.",
  },
  kapten_interrobang: {
    name: "Captain Interrobang",
    rulesText: "On loss: pay 5 cans to reduce damage by 3.",
  },
  sura_bar: {
    name: "Sour Berries",
    rulesText:
      "On damage: Take a sip to reduce damage by 2 — or take full damage.",
  },
  barsfisk: {
    name: "Octobeer",
    rulesText: "",
  },
  humlan: {
    name: "Bumblebeer",
    rulesText: "",
  },
  bottling_bot: {
    name: "Rally Robot",
    rulesText: "",
  },
  pimp: {
    name: "Pimp",
    rulesText: "",
  },
  fermentation_hydra: {
    name: "Sourpusses",
    rulesText: "",
  },
  taproom_titan: {
    name: "Bru-Team",
    rulesText: "",
  },
  store_narcissius: {
    name: "The Great Narcissus",
    rulesText: "",
  },
  oldomaren: {
    name: "The Beer Judge",
    rulesText: "",
  },
  onda_bryggverket: {
    name: "Evil Brewery",
    rulesText: "",
  },
  unicorn: {
    name: "Unicorn",
    rulesText: "On win: a random other player gets a penalty sip.",
  },
  enhorningsryttare: {
    name: "Unicorn Rider",
    rulesText: "On loss: lose 10 cans.",
  },
  fargglada_gubbar: {
    name: "Colorful Guys",
    rulesText: "",
  },
  transporter: {
    name: "Transporter",
    rulesText: "On loss: pay 10 cans to take 0 damage.",
  },
  cowboys: {
    name: "Cowboys",
    rulesText: "On win: both fighters get +5 HP.",
  },
  demonkrigare: {
    name: "Demon Warrior",
    rulesText:
      "Pay 10 cans to avoid the fight. On loss: another player gets +3 HP.",
  },
  busiga_buskar: {
    name: "Naughty Bushes",
    rulesText:
      "On loss: give up to 5 cans to the player with the fewest cans.",
  },
  solen: {
    name: "The Sun",
    rulesText: "On loss: you get sun in your eyes and skip your next turn.",
  },
};

const FINAL_BOSS_TAGLINE_EN: Partial<Record<MonsterId, string>> = {
  store_narcissius: "Final boss — On loss: All players lose 1 can",
  oldomaren: "Final boss — On loss: All players take a sip",
  onda_bryggverket:
    "Final boss — On loss: A random item or piece of equipment is destroyed",
};

function monsterDisplayFromDef(id: MonsterId): MonsterDisplayText {
  const m = MONSTERS.find((x) => x.id === id);
  if (!m) {
    return { name: id, rulesText: "" };
  }
  return { name: m.name, rulesText: m.rulesText };
}

export function getMonsterDisplay(id: MonsterId, locale: GameLocale): MonsterDisplayText {
  if (locale === "en") {
    return MONSTER_LOCALE_EN[id] ?? monsterDisplayFromDef(id);
  }
  return monsterDisplayFromDef(id);
}

/** Resolve localized monster name from Swedish display name stored in server state. */
export function getMonsterDisplayBySvName(
  svName: string,
  locale: GameLocale,
): MonsterDisplayText | null {
  const trimmed = svName.trim();
  if (!trimmed) return null;
  const found = MONSTERS.find((m) => m.name === trimmed);
  if (!found) return null;
  return getMonsterDisplay(found.id, locale);
}

export function getFinalBossTagline(id: MonsterId, locale: GameLocale): string | null {
  if (locale === "en") {
    return FINAL_BOSS_TAGLINE_EN[id] ?? null;
  }
  return finalBossCardTagline(id);
}

/** Swedish boss name from game state → localized display name. */
export function localizeFinalBossDisplayName(svName: string, locale: GameLocale): string {
  if (locale === "sv" || !svName.trim()) return svName;
  return getMonsterDisplayBySvName(svName, locale)?.name ?? svName;
}

/** e.g. `RUNDA 3 AV 3` → `ROUND 3 OF 3`. */
export function localizeFinalBossRoundLabel(label: string, locale: GameLocale): string {
  if (locale === "sv") return label;
  const m = /^RUNDA\s+(\d+)\s+AV\s+(\d+)$/i.exec(label.trim());
  if (m) return `ROUND ${m[1]} OF ${m[2]}`;
  return label;
}
