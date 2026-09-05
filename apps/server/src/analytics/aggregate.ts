import type {
  AnalyticsAggregate,
  AnalyticsEvent,
  AnalyticsRange,
  GameEndedEvent,
  GameStartedEvent,
} from "./types.js";

function startOfUtcDay(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Monday 00:00 UTC of the ISO week containing `ms`. */
export function startOfIsoWeekUtc(ms: number): number {
  const d = new Date(startOfUtcDay(ms));
  const day = d.getUTCDay(); // 0 Sun .. 6 Sat
  const daysFromMonday = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - daysFromMonday);
  return d.getTime();
}

export function startOfMonthUtc(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

export function rangeBounds(range: AnalyticsRange, now = Date.now()): { start: number; end: number } {
  const end = now;
  switch (range) {
    case "7d":
      return { start: now - 7 * 24 * 60 * 60 * 1000, end };
    case "30d":
      return { start: now - 30 * 24 * 60 * 60 * 1000, end };
    case "week":
      return { start: startOfIsoWeekUtc(now), end };
    case "month":
      return { start: startOfMonthUtc(now), end };
    default:
      return { start: now - 7 * 24 * 60 * 60 * 1000, end };
  }
}

export function parseAnalyticsRange(raw: unknown): AnalyticsRange {
  const v = String(raw ?? "7d").trim();
  if (v === "7d" || v === "30d" || v === "week" || v === "month") return v;
  return "7d";
}

function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase("sv-SE");
}

export function aggregateAnalytics(
  events: AnalyticsEvent[],
  range: AnalyticsRange,
  now = Date.now(),
): AnalyticsAggregate {
  const { start, end } = rangeBounds(range, now);
  const inRange = events.filter((e) => e.at >= start && e.at <= end);

  const started = inRange.filter((e): e is GameStartedEvent => e.type === "game_started");
  const ended = inRange.filter((e): e is GameEndedEvent => e.type === "game_ended");

  const gamesAbandoned = ended.filter((e) => e.outcome === "abandoned").length;
  const gamesEndedCompleted = ended.filter((e) => e.outcome !== "abandoned").length;

  let playerParticipations = 0;
  const uniqueNames = new Set<string>();
  for (const e of started) {
    playerParticipations += e.playerCount;
    for (const name of e.playerNames) {
      const n = normalizeName(name);
      if (n) uniqueNames.add(n);
    }
  }

  const durations = ended
    .filter((e) => e.outcome !== "abandoned" && typeof e.durationMs === "number" && e.durationMs >= 0)
    .map((e) => e.durationMs as number);
  const averageDurationMs =
    durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;

  return {
    range,
    rangeStartAt: start,
    rangeEndAt: end,
    gamesStarted: started.length,
    gamesEnded: gamesEndedCompleted,
    gamesAbandoned,
    playerParticipations,
    uniquePlayerNames: uniqueNames.size,
    averageDurationMs,
  };
}

export function recentEvents(events: AnalyticsEvent[], limit = 20): AnalyticsEvent[] {
  return [...events].sort((a, b) => b.at - a.at).slice(0, Math.max(0, limit));
}
