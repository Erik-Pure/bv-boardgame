export const CONFIG_NUMERIC = {
  turnSeconds: { min: 30, max: 120, default: 60 },
  reactionSeconds: { min: 0, max: 30, default: 5 },
  maxHp: { min: 6, max: 30, default: 10 },
  startPant: { min: 0, max: 50, default: 5 },
  pvpBestOf: { min: 1, max: 5, default: 1 },
  /** 0 = av; kick efter så många missade turer i rad p.g.a. tur-timeout. */
  missedTurnsKickAfter: { min: 0, max: 5, default: 0 },
} as const;

export type ConfigNumericKey = keyof typeof CONFIG_NUMERIC;

export function clampConfigNumber(key: ConfigNumericKey, value: number): number {
  const r = CONFIG_NUMERIC[key];
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return r.default;
  return Math.max(r.min, Math.min(r.max, n));
}
