import type { GameConfig, GameState } from "@bv/game-core";

const DIFFICULTY_SV: Record<GameConfig["difficulty"], string> = {
  lattol: "Lättöl",
  folkol: "Folköl",
  starkol: "Starköl",
  imperial: "Imperial",
};

export type FeedbackFormEntryIds = {
  players?: string;
  minutes?: string;
  levels?: string;
  difficulty?: string;
};

function readEnvString(key: string): string | undefined {
  const env = import.meta.env;
  if (!env) return undefined;
  const raw = env[key as keyof ImportMetaEnv];
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function readFeedbackFormEntryIds(): FeedbackFormEntryIds {
  return {
    players: readEnvString("VITE_FEEDBACK_ENTRY_PLAYERS"),
    minutes: readEnvString("VITE_FEEDBACK_ENTRY_MINUTES"),
    levels: readEnvString("VITE_FEEDBACK_ENTRY_LEVELS"),
    difficulty: readEnvString("VITE_FEEDBACK_ENTRY_DIFFICULTY"),
  };
}

export function isFeedbackFormConfigured(): boolean {
  return Boolean(readEnvString("VITE_FEEDBACK_FORM_BASE"));
}

/** Speltid i hela minuter (minst 1 om starttid finns). */
export function gameDurationMinutes(state: GameState, nowMs = Date.now()): number | null {
  const startedAt =
    state.gameStartedAt ??
    state.log.find((e) => e.message.includes("börjar!"))?.at ??
    null;
  if (startedAt == null || !Number.isFinite(startedAt)) return null;
  const endAt =
    state.phase === "ended"
      ? (state.log[state.log.length - 1]?.at ?? nowMs)
      : nowMs;
  if (!Number.isFinite(endAt) || endAt <= startedAt) return null;
  return Math.max(1, Math.round((endAt - startedAt) / 60_000));
}

export function buildFeedbackFormUrl(
  state: GameState,
  nowMs = Date.now(),
  baseUrl = readEnvString("VITE_FEEDBACK_FORM_BASE"),
  entryIds: FeedbackFormEntryIds = readFeedbackFormEntryIds(),
): string | null {
  if (!baseUrl) return null;

  const params = new URLSearchParams();
  const append = (entryId: string | undefined, value: string | number | null | undefined) => {
    if (!entryId || value == null || value === "") return;
    params.set(`entry.${entryId}`, String(value));
  };

  append(entryIds.players, state.players.length);
  append(entryIds.minutes, gameDurationMinutes(state, nowMs));
  append(entryIds.levels, state.config.levelCount);
  append(entryIds.difficulty, DIFFICULTY_SV[state.config.difficulty] ?? state.config.difficulty);

  const qs = params.toString();
  return qs.length > 0 ? `${baseUrl}?${qs}` : baseUrl;
}
