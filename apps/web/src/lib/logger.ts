export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

const RANK: Record<Exclude<LogLevel, "silent">, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function resolveLogLevel(): LogLevel {
  const fromEnv = (import.meta.env.VITE_LOG_LEVEL as string | undefined)?.trim();
  if (fromEnv) return fromEnv as LogLevel;
  return import.meta.env.DEV ? "debug" : "info";
}

export function createLogger(scope: string) {
  const level = resolveLogLevel();
  const enabled = (want: Exclude<LogLevel, "silent">) =>
    level !== "silent" && RANK[want] >= RANK[level as Exclude<LogLevel, "silent">];

  const pfx = `[${scope}]`;
  return {
    debug: (...a: unknown[]) => enabled("debug") && console.log(pfx, ...a),
    info: (...a: unknown[]) => enabled("info") && console.log(pfx, ...a),
    warn: (...a: unknown[]) => enabled("warn") && console.warn(pfx, ...a),
    error: (...a: unknown[]) => enabled("error") && console.error(pfx, ...a),
  };
}

