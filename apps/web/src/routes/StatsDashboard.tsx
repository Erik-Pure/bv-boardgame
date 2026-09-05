import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArcadeButton } from "../components/ArcadeButton";
import { useLocale, useUiStrings } from "../lib/locale/LocaleContext";
import styles from "./StatsDashboard.module.css";

const TOKEN_STORAGE_KEY = "bv:adminToken";

type AnalyticsRange = "7d" | "30d" | "week" | "month";

type AnalyticsAggregate = {
  range: AnalyticsRange;
  rangeStartAt: number;
  rangeEndAt: number;
  gamesStarted: number;
  gamesEnded: number;
  gamesAbandoned: number;
  playerParticipations: number;
  uniquePlayerNames: number;
  averageDurationMs: number | null;
};

type LiveAnalyticsSnapshot = {
  liveRooms: number;
  livePlaying: number;
  livePlayers: number;
};

type AnalyticsResponse = {
  ok: true;
  aggregate: AnalyticsAggregate;
  live: LiveAnalyticsSnapshot;
  recentEvents: unknown[];
};

function readStoredToken(): string {
  try {
    return window.sessionStorage.getItem(TOKEN_STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

function writeStoredToken(token: string): void {
  try {
    if (token) window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function formatDuration(ms: number | null, emptyLabel: string): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return emptyLabel;
  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatRangeBounds(startAt: number, endAt: number, locale: string): string {
  try {
    const fmt = new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    return `${fmt.format(new Date(startAt))} – ${fmt.format(new Date(endAt))}`;
  } catch {
    return `${new Date(startAt).toISOString()} – ${new Date(endAt).toISOString()}`;
  }
}

export function StatsDashboard() {
  const ui = useUiStrings();
  const locale = useLocale();
  const s = ui.statsDashboard;
  const [tokenInput, setTokenInput] = useState("");
  const [token, setToken] = useState("");
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = readStoredToken();
    if (stored) {
      setToken(stored);
      setTokenInput(stored);
    }
  }, []);

  const saveToken = () => {
    const next = tokenInput.trim();
    writeStoredToken(next);
    setToken(next);
    setError(null);
  };

  const clearToken = () => {
    writeStoredToken("");
    setToken("");
    setTokenInput("");
    setData(null);
    setError(null);
  };

  const loadAnalytics = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/admin/analytics?range=${encodeURIComponent(range)}`, {
        headers: { "x-admin-token": token },
      });
      if (res.status === 401) {
        setData(null);
        setError(s.errorUnauthorized);
        return;
      }
      if (!res.ok) {
        setData(null);
        setError(s.errorLoad);
        return;
      }
      const json = (await res.json()) as AnalyticsResponse;
      if (!json?.ok || !json.aggregate || !json.live) {
        setData(null);
        setError(s.errorLoad);
        return;
      }
      setData(json);
    } catch {
      setData(null);
      setError(s.errorReachServer);
    } finally {
      setLoading(false);
    }
  }, [token, range, s.errorUnauthorized, s.errorLoad, s.errorReachServer]);

  useEffect(() => {
    if (!token) return;
    void loadAnalytics();
  }, [token, range, loadAnalytics]);

  const rangeOptions = useMemo(
    () =>
      [
        { id: "7d" as const, label: s.range7d },
        { id: "30d" as const, label: s.range30d },
        { id: "week" as const, label: s.rangeWeek },
        { id: "month" as const, label: s.rangeMonth },
      ] as const,
    [s.range7d, s.range30d, s.rangeWeek, s.rangeMonth],
  );

  const dateLocale = locale === "en" ? "en-GB" : "sv-SE";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{s.title}</h1>
          <p className={styles.lead}>{s.lead}</p>
        </div>
        <Link className={styles.homeLink} to="/">
          {s.homeLink}
        </Link>
      </header>

      {!token ? (
        <section className={styles.tokenPanel} aria-label={s.tokenAria}>
          <label className={styles.label} htmlFor="admin-token">
            {s.tokenLabel}
          </label>
          <div className={styles.tokenRow}>
            <input
              id="admin-token"
              className={styles.tokenInput}
              type="password"
              autoComplete="off"
              value={tokenInput}
              placeholder={s.tokenPlaceholder}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveToken();
              }}
            />
            <ArcadeButton type="button" onClick={saveToken}>
              {s.tokenSave}
            </ArcadeButton>
          </div>
          <p className={styles.hint}>{s.tokenHint}</p>
        </section>
      ) : (
        <>
          <div className={styles.toolbar}>
            <div className={styles.rangeGroup} role="group" aria-label={s.rangeAria}>
              {rangeOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={opt.id === range ? styles.rangeActive : styles.rangeBtn}
                  onClick={() => setRange(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className={styles.toolbarActions}>
              <ArcadeButton type="button" onClick={() => void loadAnalytics()} disabled={loading}>
                {loading ? s.refreshing : s.refresh}
              </ArcadeButton>
              <button type="button" className={styles.clearToken} onClick={clearToken}>
                {s.clearToken}
              </button>
            </div>
          </div>

          {error ? <p className={styles.error}>{error}</p> : null}

          {data ? (
            <>
              <p className={styles.rangeMeta}>
                {s.rangeMeta}:{" "}
                {formatRangeBounds(data.aggregate.rangeStartAt, data.aggregate.rangeEndAt, dateLocale)}
              </p>

              <section className={styles.liveRow} aria-label={s.liveAria}>
                <h2 className={styles.sectionTitle}>{s.liveTitle}</h2>
                <div className={styles.grid}>
                  <article className={styles.card}>
                    <div className={styles.cardLabel}>{s.liveRooms}</div>
                    <div className={styles.cardValue}>{data.live.liveRooms}</div>
                  </article>
                  <article className={styles.card}>
                    <div className={styles.cardLabel}>{s.livePlaying}</div>
                    <div className={styles.cardValue}>{data.live.livePlaying}</div>
                  </article>
                  <article className={styles.card}>
                    <div className={styles.cardLabel}>{s.livePlayers}</div>
                    <div className={styles.cardValue}>{data.live.livePlayers}</div>
                  </article>
                </div>
              </section>

              <section className={styles.historySection} aria-label={s.historyAria}>
                <h2 className={styles.sectionTitle}>{s.historyTitle}</h2>
                <div className={styles.grid}>
                  <article className={styles.card}>
                    <div className={styles.cardLabel}>{s.gamesStarted}</div>
                    <div className={styles.cardValue}>{data.aggregate.gamesStarted}</div>
                  </article>
                  <article className={styles.card}>
                    <div className={styles.cardLabel}>{s.gamesEnded}</div>
                    <div className={styles.cardValue}>{data.aggregate.gamesEnded}</div>
                  </article>
                  <article className={styles.card}>
                    <div className={styles.cardLabel}>{s.gamesAbandoned}</div>
                    <div className={styles.cardValue}>{data.aggregate.gamesAbandoned}</div>
                  </article>
                  <article className={styles.card}>
                    <div className={styles.cardLabel}>{s.playerParticipations}</div>
                    <div className={styles.cardValue}>{data.aggregate.playerParticipations}</div>
                  </article>
                  <article className={styles.card}>
                    <div className={styles.cardLabel}>{s.uniquePlayerNames}</div>
                    <div className={styles.cardValue}>{data.aggregate.uniquePlayerNames}</div>
                    <p className={styles.cardNote}>{s.uniquePlayerNamesNote}</p>
                  </article>
                  <article className={styles.card}>
                    <div className={styles.cardLabel}>{s.averageDuration}</div>
                    <div className={styles.cardValue}>
                      {formatDuration(data.aggregate.averageDurationMs, s.averageDurationEmpty)}
                    </div>
                  </article>
                </div>
              </section>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
