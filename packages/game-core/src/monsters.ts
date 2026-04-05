export type MonsterId =
  | "beerwolf"
  | "ipa_ssassin"
  | "beer_serker"
  | "yeast_beast"
  | "keg_lifter"
  | "imperial_dragon_stout"
  | "hopvern"
  | "sip_snatcher"
  | "brewizard"
  | "sourceress"
  | "giant_spider"
  | "fruit_fly_swarm"
  | "bottling_bot"
  | "barrel_colossus"
  | "fermentation_hydra"
  | "taproom_titan";

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
}

/** Klunk vid förlust enligt monster + ev. extra vid team battle (motorspelet lägger +1). */
export function monsterLossKlunkTotal(m: Pick<MonsterDef, "lossSipsOnLose" | "teamBattleRequired">): number {
  return (m.lossSipsOnLose ?? 0) + (m.teamBattleRequired ? 1 : 0);
}

export const MONSTERS: MonsterDef[] = [
  {
    id: "beerwolf",
    name: "Ölvarg",
    strength: 3,
    baseDamage: 2,
    rulesText: "Om klockan är efter 20:30: ta 3 skada i stället.",
    rewardGold: 4,
    rewardItems: 1,
    artKey: "monster/beerwolf",
  },
  {
    id: "ipa_ssassin",
    name: "IPA-lönnmördare",
    strength: 2,
    baseDamage: 1,
    rulesText: "Om du har fler än 5 klunkar: ta 3 skada i stället.",
    rewardGold: 3,
    rewardItems: 0,
    artKey: "monster/ipa-ssassin",
  },
  {
    id: "beer_serker",
    name: "Öl-bärsärk",
    strength: 4,
    baseDamage: 3,
    rulesText:
      "Om du slår 1: den svingar och missar dig men träffar en slumpmässig annan spelare i stället.",
    rewardGold: 5,
    rewardItems: 1,
    artKey: "monster/beer-serker",
  },
  {
    id: "yeast_beast",
    name: "Jästbest",
    strength: 3,
    baseDamage: 3,
    rulesText: "",
    lossSipsOnLose: 1,
    rewardGold: 4,
    rewardItems: 1,
    artKey: "monster/yeast-beast",
  },
  {
    id: "keg_lifter",
    name: "Fatlyftaren",
    strength: 2,
    baseDamage: 1,
    rulesText: "Vid skada: tappa slumpmässig utrusning",
    rewardGold: 3,
    rewardItems: 0,
    artKey: "monster/keg-lifter",
  },
  {
    id: "imperial_dragon_stout",
    name: "Imperial Drak-Stout",
    strength: 5,
    baseDamage: 6,
    rulesText: "Vid skada: alla intilliggande spelare tar 1 skada.",
    lossSipsOnLose: 1,
    rewardGold: 7,
    rewardItems: 2,
    artKey: "monster/imperial-dragon-stout",
  },
  {
    id: "hopvern",
    name: "Humledrake",
    strength: 3,
    baseDamage: 3,
    rulesText: "",
    lossSipsOnLose: 1,
    rewardGold: 4,
    rewardItems: 1,
    artKey: "monster/hopvern",
  },
  {
    id: "sip_snatcher",
    name: "Klunkkaparen",
    strength: 2,
    baseDamage: 1,
    rulesText: "Ta en klunk så försvinner den — eller slåss som med vilket monster som helst.",
    rewardGold: 3,
    rewardItems: 0,
    artKey: "monster/sip-snatcher",
  },
  {
    id: "brewizard",
    name: "Bryggtrollkarlen",
    strength: 4,
    baseDamage: 5,
    rulesText:
      "Vid skada: du får ta en klunk för att minska skadan med 3 — eller ta full skada utan att dricka.",
    rewardGold: 5,
    rewardItems: 1,
    artKey: "monster/brewizard",
  },
  {
    id: "sourceress",
    name: "Surhäxan",
    strength: 4,
    baseDamage: 4,
    rulesText:
      "Vid skada: Ta en klunk för att minska skadan med 2 — eller ta full skada utan att dricka.",
    rewardGold: 5,
    rewardItems: 1,
    artKey: "monster/sourceress",
  },
  {
    id: "giant_spider",
    name: "Fatspindeln",
    strength: 3,
    baseDamage: 3,
    rulesText: "",
    rewardGold: 4,
    rewardItems: 1,
    artKey: "monster/barrel-spider",
  },
  {
    id: "fruit_fly_swarm",
    name: "Fruktflugesvärm",
    strength: 2,
    baseDamage: 1,
    rulesText: "",
    lossSipsOnLose: 1,
    rewardGold: 3,
    rewardItems: 0,
    artKey: "monster/fruit-fly-swarm",
  },
  {
    id: "bottling_bot",
    name: "Buteljeringsbot",
    strength: 3,
    baseDamage: 2,
    rulesText: "",
    lossSipsOnLose: 1,
    rewardGold: 4,
    rewardItems: 1,
    artKey: "monster/bottling-bot",
  },
  {
    id: "barrel_colossus",
    name: "Fatkolossen",
    strength: 8,
    baseDamage: 5,
    rulesText: "Team battle: välj en medkämpe. Vid förlust dricker båda 1 klunk.",
    teamBattleRequired: true,
    teamBattleBonusGold: 2,
    rewardGold: 8,
    rewardItems: 2,
    artKey: "monster/barrel-colossus",
  },
  {
    id: "fermentation_hydra",
    name: "Fermenteringshydran",
    strength: 9,
    baseDamage: 6,
    rulesText: "Team battle: välj en medkämpe. Vid förlust dricker båda 1 klunk.",
    teamBattleRequired: true,
    teamBattleBonusGold: 3,
    rewardGold: 9,
    rewardItems: 2,
    artKey: "monster/fermentation-hydra",
  },
  {
    id: "taproom_titan",
    name: "Taproom-titanen",
    strength: 10,
    baseDamage: 7,
    rulesText: "Team battle: välj en medkämpe. Vid förlust dricker båda 1 klunk.",
    teamBattleRequired: true,
    teamBattleBonusGold: 4,
    rewardGold: 10,
    rewardItems: 2,
    artKey: "monster/taproom-titan",
  },
];

