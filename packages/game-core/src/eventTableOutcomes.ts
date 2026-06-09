import type { Pending, Player } from "./types.js";

export type TableToastCategory = "sip" | "pvp" | "vaska" | "reward";

export type TableToastIcon = "klunk" | "pant" | "hp" | "attack";

export type EventTableOutcome =
  | { kind: "pantDelta"; playerId: string; delta: number }
  | { kind: "hpDelta"; playerId: string; delta: number }
  | { kind: "sipGain"; playerId: string; amount: number }
  | { kind: "skipTurn"; playerId: string }
  | { kind: "equipmentGrant"; playerId: string }
  | { kind: "custom"; text: string; category: TableToastCategory; icons: TableToastIcon[] };

export type EventTableToastSpec = {
  text: string;
  category: TableToastCategory;
  icons: TableToastIcon[];
};

type PlayerStatSnapshot = {
  gold: number;
  hp: number;
  klunkar: number;
  skippedTurns: number;
};

export function snapshotPlayerStats(players: Player[]): Map<string, PlayerStatSnapshot> {
  return new Map(
    players.map((p) => [
      p.id,
      {
        gold: p.gold,
        hp: p.hp,
        klunkar: p.klunkar,
        skippedTurns: p.skippedTurns ?? 0,
      },
    ]),
  );
}

export function diffPlayerStatsToOutcomes(
  before: Map<string, PlayerStatSnapshot>,
  players: Player[],
  extras: EventTableOutcome[] = [],
): EventTableOutcome[] {
  const outcomes: EventTableOutcome[] = [...extras];
  for (const p of players) {
    const prev = before.get(p.id);
    if (!prev) continue;
    const pantDelta = p.gold - prev.gold;
    const hpDelta = p.hp - prev.hp;
    const klunkGain = p.klunkar - prev.klunkar;
    const skipGain = (p.skippedTurns ?? 0) - prev.skippedTurns;
    if (pantDelta !== 0) outcomes.push({ kind: "pantDelta", playerId: p.id, delta: pantDelta });
    if (hpDelta !== 0) outcomes.push({ kind: "hpDelta", playerId: p.id, delta: hpDelta });
    if (klunkGain > 0) outcomes.push({ kind: "sipGain", playerId: p.id, amount: klunkGain });
    if (skipGain > 0) outcomes.push({ kind: "skipTurn", playerId: p.id });
  }
  return outcomes;
}

function playerName(playersById: Map<string, Pick<Player, "name">>, playerId: string): string {
  return playersById.get(playerId)?.name?.trim() || "Spelare";
}

function iconsForOutcome(outcome: EventTableOutcome): TableToastIcon[] {
  switch (outcome.kind) {
    case "sipGain":
      return ["klunk"];
    case "pantDelta":
      return ["pant"];
    case "hpDelta":
      return ["hp"];
    case "skipTurn":
      return ["attack"];
    case "equipmentGrant":
      return ["attack"];
    case "custom":
      return outcome.icons;
    default:
      return ["pant"];
  }
}

function categoryForOutcome(outcome: EventTableOutcome): TableToastCategory {
  if (outcome.kind === "custom") return outcome.category;
  if (outcome.kind === "sipGain") return "sip";
  if (outcome.kind === "equipmentGrant") return "reward";
  return "pvp";
}

export function formatEventTableOutcomeToToast(
  outcome: EventTableOutcome,
  playersById: Map<string, Pick<Player, "name">>,
): EventTableToastSpec {
  const icons = iconsForOutcome(outcome);
  const category = categoryForOutcome(outcome);
  if (outcome.kind === "custom") {
    return { text: outcome.text, category, icons };
  }
  const name = playerName(playersById, outcome.playerId);
  if (outcome.kind === "sipGain") {
    const amount = Math.max(1, Math.floor(outcome.amount));
    return {
      text: `${name} får ${amount} straffklunk${amount === 1 ? "" : "ar"}.`,
      category,
      icons,
    };
  }
  if (outcome.kind === "pantDelta") {
    const delta = outcome.delta;
    if (delta > 0) return { text: `${name} får ${delta} pant.`, category, icons };
    return { text: `${name} förlorar ${Math.abs(delta)} pant.`, category, icons };
  }
  if (outcome.kind === "hpDelta") {
    const delta = outcome.delta;
    if (delta < 0) return { text: `${name} tar ${Math.abs(delta)} skada.`, category, icons };
    return { text: `${name} läker ${delta} HP.`, category, icons };
  }
  if (outcome.kind === "skipTurn") {
    return { text: `${name} står över nästa drag.`, category, icons };
  }
  return { text: `${name} får slumpad utrustning.`, category, icons };
}

/** Parsar standard rader från korttext (`Pant:`, `HP:`, `klunkar:`) när strukturerade utfall saknas. */
export function parseStatDeltaLinesToOutcomes(
  text: string,
  cardPlayerId: string,
  playersById: Map<string, Pick<Player, "name">>,
): EventTableOutcome[] {
  const selfName = playerName(playersById, cardPlayerId);
  const outcomes: EventTableOutcome[] = [];
  const pushSip = (name: string, amount: number) => {
    if (amount <= 0) return;
    const playerId =
      name === selfName
        ? cardPlayerId
        : [...playersById.entries()].find(([, p]) => p.name?.trim() === name)?.[0];
    if (!playerId) return;
    outcomes.push({ kind: "sipGain", playerId, amount });
  };
  const pushHp = (name: string, delta: number) => {
    if (delta === 0) return;
    const playerId =
      name === selfName
        ? cardPlayerId
        : [...playersById.entries()].find(([, p]) => p.name?.trim() === name)?.[0];
    if (!playerId) return;
    outcomes.push({ kind: "hpDelta", playerId, delta });
  };
  const pushPant = (name: string, delta: number) => {
    if (delta === 0) return;
    const playerId =
      name === selfName
        ? cardPlayerId
        : [...playersById.entries()].find(([, p]) => p.name?.trim() === name)?.[0];
    if (!playerId) return;
    outcomes.push({ kind: "pantDelta", playerId, delta });
  };

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const selfKlunk = /^Klunkar:\s*(\d+)\s*→\s*(\d+)\.?$/i.exec(line);
    if (selfKlunk) {
      pushSip(selfName, Number(selfKlunk[2]) - Number(selfKlunk[1]));
      continue;
    }
    const selfPossessiveKlunk = /^Dina\s+klunkar:\s*(\d+)\s*→\s*(\d+)\.?$/i.exec(line);
    if (selfPossessiveKlunk) {
      pushSip(selfName, Number(selfPossessiveKlunk[2]) - Number(selfPossessiveKlunk[1]));
      continue;
    }
    const targetKlunk = /^(.+?)\s+klunkar:\s*(\d+)\s*→\s*(\d+)\.?$/i.exec(line);
    if (targetKlunk) {
      pushKlunk(targetKlunk[1], Number(targetKlunk[2]), Number(targetKlunk[3]), pushSip);
      continue;
    }
    const selfHp = /^HP:\s*(\d+)\s*→\s*(\d+)\.?$/i.exec(line);
    if (selfHp) {
      pushHp(selfName, Number(selfHp[2]) - Number(selfHp[1]));
      continue;
    }
    const altSelfHp = /^(.+?):\s*HP\s+(\d+)\s*→\s*(\d+)\.?$/i.exec(line);
    if (altSelfHp && altSelfHp[1].trim() === selfName) {
      pushHp(selfName, Number(altSelfHp[3]) - Number(altSelfHp[2]));
      continue;
    }
    const targetHp = /^(.+?)\s+HP:\s*(\d+)\s*→\s*(\d+)\.?$/i.exec(line);
    if (targetHp) {
      pushHp(targetHp[1].trim(), Number(targetHp[3]) - Number(targetHp[2]));
      continue;
    }
    const selfPant = /^Pant:\s*(-?\d+)\s*→\s*(-?\d+)\.?$/i.exec(line);
    if (selfPant) {
      pushPant(selfName, Number(selfPant[2]) - Number(selfPant[1]));
      continue;
    }
    const targetPant = /^(.+?)\s+pant:\s*(-?\d+)\s*→\s*(-?\d+)\.?$/i.exec(line);
    if (targetPant) {
      pushPant(targetPant[1].trim(), Number(targetPant[3]) - Number(targetPant[2]));
    }
  }
  return outcomes;
}

function pushKlunk(
  name: string,
  before: number,
  after: number,
  pushSip: (name: string, amount: number) => void,
): void {
  pushSip(name.trim(), after - before);
}

export function resolveEventCardTableToasts(
  pending: Extract<Pending, { type: "card" }>,
  players: Player[],
): EventTableToastSpec[] {
  if (pending.kind !== "event") return [];
  const playersById = new Map(players.map((p) => [p.id, p]));
  const structured = pending.tableOutcomes ?? [];
  const outcomes =
    structured.length > 0
      ? structured
      : parseStatDeltaLinesToOutcomes(pending.text, pending.playerId, playersById);

  if (outcomes.length === 0) {
    const transferLine = pending.text
      .split("\n")
      .map((l) => l.trim())
      .find((l) => /fick\s+\d+\s+pant\./i.test(l));
    if (transferLine) {
      const m = /^(.+?)\s+var fattigast och fick\s+(\d+)\s+pant\./i.exec(transferLine);
      const selfName = playerName(playersById, pending.playerId);
      if (m) {
        return [
          {
            text: `${selfName} gav ${m[2]} pant till ${m[1]}.`,
            category: "pvp",
            icons: ["pant"],
          },
        ];
      }
    }
    if (/Ingen pant överfördes\./i.test(pending.text)) {
      const die = /Tärning:\s*(\d+)/i.exec(pending.text);
      const selfName = playerName(playersById, pending.playerId);
      return [
        {
          text: die
            ? `${selfName} slog ${die[1]}: ingen pant överfördes.`
            : `${selfName}: ingen pant överfördes.`,
          category: "pvp",
          icons: ["pant"],
        },
      ];
    }
    if (/inget händer/i.test(pending.text)) {
      const selfName = playerName(playersById, pending.playerId);
      return [{ text: `${selfName}: inget händer.`, category: "pvp", icons: ["pant"] }];
    }
  }

  return outcomes.map((o) => formatEventTableOutcomeToToast(o, playersById));
}
