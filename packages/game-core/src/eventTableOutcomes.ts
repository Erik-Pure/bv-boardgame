import type { GameLocale } from "./locale.js";
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

function playerName(
  playersById: Map<string, Pick<Player, "name">>,
  playerId: string,
  locale: GameLocale,
): string {
  const fallback = locale === "en" ? "Player" : "Spelare";
  return playersById.get(playerId)?.name?.trim() || fallback;
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

function localizeCustomOutcomeText(text: string, locale: GameLocale): string {
  if (locale === "sv") return text;
  const known: Record<string, string> = {
    "Alla spelare får 1 straffklunk.": "All players get 1 penalty sip.",
    "Happy hour: alla andra får +2 pant.": "Happy hour: all other players gain +2 cans.",
    "Happy hour: alla får +5 pant.": "Happy hour: everyone gains +5 cans.",
  };
  if (known[text]) return known[text]!;
  const inget = /^(.+?):\s*inget händer\.?$/i.exec(text.trim());
  if (inget) return `${inget[1]}: nothing happens.`;
  const ingenPant = /^(.+?):\s*ingen pant överfördes\.?$/i.exec(text.trim());
  if (ingenPant) return `${ingenPant[1]}: no cans transferred.`;
  const slogIngen = /^(.+?)\s+slog\s+(\d+):\s*ingen pant överfördes\.?$/i.exec(text.trim());
  if (slogIngen) return `${slogIngen[1]} rolled ${slogIngen[2]}: no cans transferred.`;
  const gavPant = /^(.+?)\s+gav\s+(\d+)\s+pant\s+till\s+(.+?)\.?$/i.exec(text.trim());
  if (gavPant) return `${gavPant[1]} gave ${gavPant[2]} cans to ${gavPant[3]}.`;
  return text;
}

export function formatEventTableOutcomeToToast(
  outcome: EventTableOutcome,
  playersById: Map<string, Pick<Player, "name">>,
  locale: GameLocale = "sv",
): EventTableToastSpec {
  const icons = iconsForOutcome(outcome);
  const category = categoryForOutcome(outcome);
  if (outcome.kind === "custom") {
    return { text: localizeCustomOutcomeText(outcome.text, locale), category, icons };
  }
  const name = playerName(playersById, outcome.playerId, locale);
  if (outcome.kind === "sipGain") {
    const amount = Math.max(1, Math.floor(outcome.amount));
    if (locale === "en") {
      return {
        text: `${name} gets ${amount} penalty sip${amount === 1 ? "" : "s"}.`,
        category,
        icons,
      };
    }
    return {
      text: `${name} får ${amount} straffklunk${amount === 1 ? "" : "ar"}.`,
      category,
      icons,
    };
  }
  if (outcome.kind === "pantDelta") {
    const delta = outcome.delta;
    if (locale === "en") {
      if (delta > 0) return { text: `${name} gains ${delta} cans.`, category, icons };
      return { text: `${name} loses ${Math.abs(delta)} cans.`, category, icons };
    }
    if (delta > 0) return { text: `${name} får ${delta} pant.`, category, icons };
    return { text: `${name} förlorar ${Math.abs(delta)} pant.`, category, icons };
  }
  if (outcome.kind === "hpDelta") {
    const delta = outcome.delta;
    if (locale === "en") {
      if (delta < 0) return { text: `${name} takes ${Math.abs(delta)} damage.`, category, icons };
      return { text: `${name} heals ${delta} HP.`, category, icons };
    }
    if (delta < 0) return { text: `${name} tar ${Math.abs(delta)} skada.`, category, icons };
    return { text: `${name} läker ${delta} HP.`, category, icons };
  }
  if (outcome.kind === "skipTurn") {
    return {
      text:
        locale === "en" ? `${name} skips their next turn.` : `${name} står över nästa drag.`,
      category,
      icons,
    };
  }
  return {
    text: locale === "en" ? `${name} gets random equipment.` : `${name} får slumpad utrustning.`,
    category,
    icons,
  };
}

/** Parsar standard rader från korttext (`Pant:`, `HP:`, `klunkar:`) när strukturerade utfall saknas. */
export function parseStatDeltaLinesToOutcomes(
  text: string,
  cardPlayerId: string,
  playersById: Map<string, Pick<Player, "name">>,
  locale: GameLocale = "sv",
): EventTableOutcome[] {
  const selfName = playerName(playersById, cardPlayerId, locale);
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
    const selfKlunk = /^(?:Klunkar|Sips):\s*(\d+)\s*→\s*(\d+)\.?$/i.exec(line);
    if (selfKlunk) {
      pushSip(selfName, Number(selfKlunk[2]) - Number(selfKlunk[1]));
      continue;
    }
    const selfPossessiveKlunk = /^(?:Dina\s+klunkar|Your\s+sips):\s*(\d+)\s*→\s*(\d+)\.?$/i.exec(line);
    if (selfPossessiveKlunk) {
      pushSip(selfName, Number(selfPossessiveKlunk[2]) - Number(selfPossessiveKlunk[1]));
      continue;
    }
    const targetKlunk = /^(.+?)\s+(?:klunkar|sips):\s*(\d+)\s*→\s*(\d+)\.?$/i.exec(line);
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
    const selfPant = /^(?:Pant|Cans):\s*(-?\d+)\s*→\s*(-?\d+)\.?$/i.exec(line);
    if (selfPant) {
      pushPant(selfName, Number(selfPant[2]) - Number(selfPant[1]));
      continue;
    }
    const targetPant = /^(.+?)\s+(?:pant|cans):\s*(-?\d+)\s*→\s*(-?\d+)\.?$/i.exec(line);
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
  locale: GameLocale = "sv",
): EventTableToastSpec[] {
  if (pending.kind !== "event") return [];
  const playersById = new Map(players.map((p) => [p.id, p]));
  const structured = pending.tableOutcomes ?? [];
  const outcomes =
    structured.length > 0
      ? structured
      : parseStatDeltaLinesToOutcomes(pending.text, pending.playerId, playersById, locale);

  if (outcomes.length === 0) {
    const transferLine = pending.text
      .split("\n")
      .map((l) => l.trim())
      .find((l) => /fick\s+\d+\s+pant\./i.test(l));
    if (transferLine) {
      const m = /^(.+?)\s+var fattigast och fick\s+(\d+)\s+pant\./i.exec(transferLine);
      const selfName = playerName(playersById, pending.playerId, locale);
      if (m) {
        return [
          {
            text:
              locale === "en"
                ? `${selfName} gave ${m[2]} cans to ${m[1]}.`
                : `${selfName} gav ${m[2]} pant till ${m[1]}.`,
            category: "pvp",
            icons: ["pant"],
          },
        ];
      }
    }
    if (/Ingen pant överfördes\.|No cans were transferred\./i.test(pending.text)) {
      const die = /(?:Tärning|Die):\s*(\d+)/i.exec(pending.text);
      const selfName = playerName(playersById, pending.playerId, locale);
      return [
        {
          text:
            locale === "en"
              ? die
                ? `${selfName} rolled ${die[1]}: no cans transferred.`
                : `${selfName}: no cans transferred.`
              : die
                ? `${selfName} slog ${die[1]}: ingen pant överfördes.`
                : `${selfName}: ingen pant överfördes.`,
          category: "pvp",
          icons: ["pant"],
        },
      ];
    }
    if (/inget händer|nothing happens/i.test(pending.text)) {
      const selfName = playerName(playersById, pending.playerId, locale);
      return [
        {
          text: locale === "en" ? `${selfName}: nothing happens.` : `${selfName}: inget händer.`,
          category: "pvp",
          icons: ["pant"],
        },
      ];
    }
  }

  return outcomes.map((o) => formatEventTableOutcomeToToast(o, playersById, locale));
}
