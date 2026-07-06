import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  brewerDisplayLevel,
  DEFAULT_PLAYER_SESSION_STATS,
  playerPant,
  type GameState,
  type Player,
  type PlayerSessionStats,
} from "@bv/game-core";
import { ArcadeButton } from "../components/ArcadeButton";
import { PlayerAvatarStack } from "../components/PlayerAvatarStack";
import { gameDurationMinutes } from "../lib/feedbackFormUrl";
import { isGameState } from "../lib/gameTypes";
import {
  applyFullGameState,
  applyGameStateDelta,
  createStateSeqTracker,
  resetStateSeqTracker,
} from "../lib/gameStateWsSync";
import { phaseLabel, wsStatusLabel } from "../lib/uiStrings";
import { useLocale, useUiStrings } from "../lib/locale/LocaleContext";
import { createClient, type ServerMessage, type WsStatus } from "../lib/ws";
import styles from "./FestDashboard.module.css";

const STORAGE_KEY = "bv:festDashboardRooms";

function normalizeRoomCode(raw: string): string {
  return raw.trim().toUpperCase();
}

function readStoredRoomCodes(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map((c) => normalizeRoomCode(String(c))).filter(Boolean))];
  } catch {
    return [];
  }
}

function writeStoredRoomCodes(codes: string[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
  } catch {
    // ignore
  }
}

function readSessionStats(p: Player): PlayerSessionStats {
  return { ...DEFAULT_PLAYER_SESSION_STATS, ...(p.stats ?? {}) };
}

function currentTurnPlayerId(state: GameState): string | null {
  const id = state.turnOrder[state.currentTurnIndex];
  return typeof id === "string" ? id : null;
}

type RoomSnapshot = {
  code: string;
  status: WsStatus;
  error: string | null;
  state: GameState | null;
};

type TrackedPlayer = {
  roomCode: string;
  player: Player;
};

type HighlightEntry = {
  entries: TrackedPlayer[];
  value: number;
};

function collectTrackedPlayers(snapshots: Record<string, RoomSnapshot>): TrackedPlayer[] {
  const out: TrackedPlayer[] = [];
  for (const row of Object.values(snapshots)) {
    if (row.status !== "connected" || !row.state) continue;
    for (const player of row.state.players) {
      out.push({ roomCode: row.code, player });
    }
  }
  return out;
}

function sessionKlunkTotal(p: Player): number {
  return readSessionStats(p).totalKlunksGained;
}

function trackedAtMax(
  tracked: TrackedPlayer[],
  getVal: (p: Player) => number,
  minValue = 1,
): HighlightEntry | null {
  if (tracked.length === 0) return null;
  const scored = tracked.map((t) => ({ t, v: getVal(t.player) }));
  const max = Math.max(...scored.map((x) => x.v));
  if (max < minValue) return null;
  return {
    entries: scored.filter((x) => x.v === max).map((x) => x.t),
    value: max,
  };
}

function trackedAtMin(tracked: TrackedPlayer[], getVal: (p: Player) => number): HighlightEntry | null {
  if (tracked.length === 0) return null;
  const scored = tracked.map((t) => ({ t, v: getVal(t.player) }));
  const min = Math.min(...scored.map((x) => x.v));
  return {
    entries: scored.filter((x) => x.v === min).map((x) => x.t),
    value: min,
  };
}

function computeGlobalHighlights(tracked: TrackedPlayer[]) {
  const pantEntry = trackedAtMax(tracked, (p) => playerPant(p), 0);
  const klunkEntry = trackedAtMax(tracked, (p) => sessionKlunkTotal(p), 0);
  return {
    wins: trackedAtMax(tracked, (p) => readSessionStats(p).monsterCombatWins),
    pant: pantEntry && pantEntry.value > 0 ? pantEntry : null,
    klunks: klunkEntry && klunkEntry.value > 0 ? klunkEntry : null,
    losses: trackedAtMax(tracked, (p) => {
      const s = readSessionStats(p);
      return s.monsterCombatLosses + s.pvpMatchLosses;
    }),
    bvb: trackedAtMax(tracked, (p) => {
      const s = readSessionStats(p);
      return s.pvpMatchWins + s.pvpMatchLosses;
    }),
    sabotage: trackedAtMax(tracked, (p) => readSessionStats(p).sabotageItemsPlayed),
    xp: trackedAtMax(tracked, (p) => p.xp ?? 0, 1),
    leastHp: trackedAtMin(
      tracked.filter((t) => t.player.hp > 0),
      (p) => p.hp,
    ),
    bestRoll: trackedAtMax(tracked, (p) => readSessionStats(p).maxDiceRollTotal),
    mostOnes: trackedAtMax(tracked, (p) => {
      const s = readSessionStats(p);
      return s.combatOnesRolled + s.pvpOnesRolled;
    }),
  };
}

function GlobalHighlightCard(props: {
  title: string;
  iconSrc: string;
  iconColored?: boolean;
  entry: HighlightEntry | null;
}) {
  if (!props.entry) return null;
  return (
    <article className={styles.highlightCard} aria-label={`${props.title}: ${props.entry.value}`}>
      <div className={styles.highlightTitleRow}>
        <img
          src={props.iconSrc}
          alt=""
          aria-hidden
          width={22}
          height={22}
          draggable={false}
          className={props.iconColored ? styles.highlightTitleIconColored : styles.highlightTitleIcon}
        />
        <h3 className={styles.highlightTitle}>{props.title}</h3>
      </div>
      <div className={styles.highlightPlayers}>
        {props.entry.entries.map(({ roomCode, player }) => (
          <div key={`${roomCode}:${player.id}`} className={styles.highlightPlayer}>
            <div className={styles.highlightAvatarWrap} aria-hidden>
              <PlayerAvatarStack
                avatar={player.avatar}
                color={player.color}
                size="scoreboard"
                animate
                className={styles.highlightAvatarStack}
              />
            </div>
            <div className={styles.highlightName}>{player.name}</div>
          </div>
        ))}
      </div>
      <div className={styles.highlightValue} aria-hidden>
        {props.entry.value}
      </div>
    </article>
  );
}

function SummaryStatCard(props: {
  label: string;
  value: string | number;
  iconSrc: string;
  iconColored?: boolean;
  ariaLabel: string;
}) {
  return (
    <div className={styles.summaryCard} aria-label={props.ariaLabel}>
      <div className={styles.summaryLabel}>{props.label}</div>
      <div className={styles.summaryValueRow}>
        <img
          src={props.iconSrc}
          alt=""
          aria-hidden
          width={30}
          height={30}
          draggable={false}
          className={props.iconColored ? styles.summaryIconColored : styles.summaryIcon}
        />
        <span className={styles.summaryValue}>{props.value}</span>
      </div>
    </div>
  );
}

function TrackedRoomPanel(props: {
  code: string;
  onRemove: (code: string) => void;
  onSnapshot: (snapshot: RoomSnapshot) => void;
}) {
  const ui = useUiStrings();
  const locale = useLocale();
  const [state, setState] = useState<GameState | null>(null);
  const [status, setStatus] = useState<WsStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const stateSeqTrackerRef = useRef(createStateSeqTracker());
  const requestSnapshotRef = useRef<() => void>(() => {});

  useEffect(() => {
    const stateSeqTracker = stateSeqTrackerRef.current;
    resetStateSeqTracker(stateSeqTracker);
    setState(null);
    setError(null);
    setStatus("connecting");

    const client = createClient({
      roomCode: props.code,
      playerName: "Festöversikt",
      as: "table",
      connectTimeoutMs: 10_000,
      onStatus: setStatus,
      onMessage: (m: ServerMessage) => {
        if (m.type === "error") setError(m.message);
        if (m.type === "state" && isGameState(m.state)) {
          const next = applyFullGameState(stateSeqTracker, m.state, m.seq) ?? m.state;
          setState(next);
          setError(null);
        }
        if (m.type === "stateDelta") {
          setState((prev) =>
            applyGameStateDelta(stateSeqTracker, prev, m.seq, m.patch, () =>
              requestSnapshotRef.current(),
            ) ?? prev,
          );
          setError(null);
        }
      },
    });

    requestSnapshotRef.current = () => {
      client.send({ type: "requestStateSnapshot" });
    };

    return () => {
      client.close();
    };
  }, [props.code]);

  useEffect(() => {
    props.onSnapshot({ code: props.code, status, error, state });
  }, [props.code, status, error, state, props.onSnapshot]);

  const activeId = state ? currentTurnPlayerId(state) : null;
  const durationMin = state ? gameDurationMinutes(state) : null;

  return (
    <section className={styles.roomCard} aria-label={ui.festDashboard.roomAria(props.code)}>
      <div className={styles.roomHeader}>
        <span className={styles.roomCode}>{props.code}</span>
        <span className={styles.statusPill}>
          <span
            className={`${styles.statusDot} ${
              status === "connected"
                ? styles.statusDotConnected
                : status === "connecting"
                  ? styles.statusDotConnecting
                  : styles.statusDotDisconnected
            }`}
            aria-hidden
          />
          {wsStatusLabel(status, locale)}
        </span>
        {state ? (
          <span className={styles.roomMeta}>
            {phaseLabel(state.phase, locale)}
            {state.phase === "playing" && durationMin != null ? ` · ${durationMin} min` : ""}
            {state.phase === "ended" && state.winnerName ? ` · ${state.winnerName}` : ""}
            {state.finalBossLivesRemaining != null && state.phase === "playing"
              ? ` · ${ui.festDashboard.bossLives(state.finalBossLivesRemaining)}`
              : ""}
          </span>
        ) : null}
        <div className={styles.roomActions}>
          <button type="button" className={styles.removeBtn} onClick={() => props.onRemove(props.code)}>
            {ui.festDashboard.removeRoom}
          </button>
        </div>
      </div>

      {error ? <div className={styles.errorText}>{error}</div> : null}

      {!state || state.players.length === 0 ? (
        <div className={styles.emptyState}>{ui.festDashboard.noPlayersYet}</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{ui.festDashboard.colPlayer}</th>
                <th>{ui.festDashboard.colHp}</th>
                <th>{ui.festDashboard.colPant}</th>
                <th>{ui.festDashboard.colKlunk}</th>
                <th>{ui.festDashboard.colBrewer}</th>
                <th>{ui.festDashboard.colFloor}</th>
                <th>{ui.festDashboard.colMonster}</th>
                <th>{ui.festDashboard.colBvb}</th>
                <th>{ui.festDashboard.colSabotage}</th>
                <th>{ui.festDashboard.colBestRoll}</th>
              </tr>
            </thead>
            <tbody>
              {state.players.map((p) => {
                const stats = readSessionStats(p);
                const inactive = Boolean(p.eliminated || p.leftVoluntarily);
                const isTurn = activeId === p.id && state.phase === "playing";
                const sleeping = (p.skippedTurns ?? 0) > 0;
                return (
                  <tr
                    key={p.id}
                    className={`${isTurn ? styles.activeTurn : ""} ${inactive ? styles.dimmed : ""}`}
                  >
                    <td>
                      <span className={styles.playerNameCell}>
                        <span className={styles.playerAvatarWrap} aria-hidden>
                          <PlayerAvatarStack
                            avatar={p.avatar}
                            color={p.color}
                            size="scoreboard"
                            animate={false}
                            className={styles.playerAvatarStack}
                          />
                        </span>
                        <span className={styles.playerNameText}>
                          {p.name}
                          {sleeping ? " (Zzz)" : ""}
                          {p.eliminated ? ` · ${ui.festDashboard.eliminated}` : ""}
                          {p.leftVoluntarily ? ` · ${ui.festDashboard.left}` : ""}
                          {isTurn ? ` · ${ui.festDashboard.activeTurn}` : ""}
                        </span>
                      </span>
                    </td>
                    <td>
                      {p.hp}/{p.maxHp}
                    </td>
                    <td>{playerPant(p)}</td>
                    <td>{p.klunkar}</td>
                    <td>{brewerDisplayLevel(p)}</td>
                    <td>{p.levelIndex + 1}</td>
                    <td>
                      {stats.monsterCombatWins}/{stats.monsterCombatLosses}
                    </td>
                    <td>
                      {stats.pvpMatchWins}/{stats.pvpMatchLosses}
                    </td>
                    <td>{stats.sabotageItemsPlayed}</td>
                    <td>{stats.maxDiceRollTotal > 0 ? stats.maxDiceRollTotal : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function FestDashboard() {
  const ui = useUiStrings();
  const [roomCodes, setRoomCodes] = useState<string[]>(() => readStoredRoomCodes());
  const [draftCode, setDraftCode] = useState("");
  const [snapshots, setSnapshots] = useState<Record<string, RoomSnapshot>>({});

  useEffect(() => {
    writeStoredRoomCodes(roomCodes);
  }, [roomCodes]);

  const handleSnapshot = useCallback((snapshot: RoomSnapshot) => {
    setSnapshots((prev) => {
      const existing = prev[snapshot.code];
      if (
        existing &&
        existing.status === snapshot.status &&
        existing.error === snapshot.error &&
        existing.state === snapshot.state
      ) {
        return prev;
      }
      return { ...prev, [snapshot.code]: snapshot };
    });
  }, []);

  const addRoom = () => {
    const code = normalizeRoomCode(draftCode);
    if (!code) return;
    setRoomCodes((prev) => (prev.includes(code) ? prev : [...prev, code]));
    setDraftCode("");
  };

  const removeRoom = (code: string) => {
    setRoomCodes((prev) => prev.filter((c) => c !== code));
    setSnapshots((prev) => {
      const next = { ...prev };
      delete next[code];
      return next;
    });
  };

  const totals = useMemo(() => {
    const rows = Object.values(snapshots);
    const activeRooms = rows.filter((r) => r.status === "connected" && r.state);
    const players = activeRooms.flatMap((r) => r.state?.players ?? []);
    const playing = players.filter((p) => !p.eliminated && !p.leftVoluntarily);
    let monsterWins = 0;
    let pvpWins = 0;
    let klunks = 0;
    for (const p of playing) {
      const s = readSessionStats(p);
      monsterWins += s.monsterCombatWins;
      pvpWins += s.pvpMatchWins;
      klunks += p.klunkar;
    }
    return {
      roomsTracked: roomCodes.length,
      roomsLive: activeRooms.length,
      players: playing.length,
      monsterWins,
      pvpWins,
      klunks,
    };
  }, [snapshots, roomCodes.length]);

  const globalHighlights = useMemo(() => {
    const tracked = collectTrackedPlayers(snapshots);
    if (tracked.length === 0) return null;
    return computeGlobalHighlights(tracked);
  }, [snapshots]);

  return (
    <div className={styles.pageRoot}>
      <div className={styles.pageSetup}>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>{ui.festDashboard.title}</h1>
          <div className={styles.addRow}>
            <input
              className={styles.codeInput}
              value={draftCode}
              onChange={(e) => setDraftCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") addRoom();
              }}
              placeholder={ui.festDashboard.codePlaceholder}
              aria-label={ui.festDashboard.codePlaceholder}
              maxLength={24}
            />
            <ArcadeButton variant="pink" onClick={addRoom} disabled={!draftCode.trim()}>
              {ui.festDashboard.addRoom}
            </ArcadeButton>
          </div>
        </div>
      </div>

      {globalHighlights ? (
        <section className={styles.globalHighlights} aria-label={ui.festDashboard.highlightsAria}>
          <div className={styles.highlightsGrid}>
            <GlobalHighlightCard
              title={ui.festDashboard.highlightMostWins}
              iconSrc="/icons/monster-icon.svg"
              entry={globalHighlights.wins}
            />
            <GlobalHighlightCard
              title={ui.festDashboard.highlightMostPant}
              iconSrc="/icons/pant.svg"
              iconColored
              entry={globalHighlights.pant}
            />
            <GlobalHighlightCard
              title={ui.festDashboard.highlightMostKlunks}
              iconSrc="/icons/klunk.svg"
              iconColored
              entry={globalHighlights.klunks}
            />
            <GlobalHighlightCard
              title={ui.festDashboard.highlightMostLosses}
              iconSrc="/icons/thumbdown-icon.svg"
              entry={globalHighlights.losses}
            />
            <GlobalHighlightCard
              title={ui.festDashboard.highlightMostBvb}
              iconSrc="/icons/bvb-icon.svg"
              entry={globalHighlights.bvb}
            />
            <GlobalHighlightCard
              title={ui.festDashboard.highlightMostSabotage}
              iconSrc="/icons/cards-icon.svg"
              entry={globalHighlights.sabotage}
            />
            <GlobalHighlightCard
              title={ui.festDashboard.highlightMostXp}
              iconSrc="/icons/lvlup.svg"
              entry={globalHighlights.xp}
            />
            <GlobalHighlightCard
              title={ui.festDashboard.highlightLeastHp}
              iconSrc="/icons/hp.svg"
              iconColored
              entry={globalHighlights.leastHp}
            />
            <GlobalHighlightCard
              title={ui.festDashboard.highlightBestRoll}
              iconSrc="/icons/dice-icon.svg"
              entry={globalHighlights.bestRoll}
            />
            <GlobalHighlightCard
              title={ui.festDashboard.highlightMostOnes}
              iconSrc="/icons/skull-icon.svg"
              entry={globalHighlights.mostOnes}
            />
          </div>
        </section>
      ) : null}

      <div className={styles.pageDetails}>
        {roomCodes.length > 0 ? (
          <div className={styles.summaryGrid} aria-label={ui.festDashboard.summaryAria}>
            <SummaryStatCard
              label={ui.festDashboard.summaryRooms}
              value={`${totals.roomsLive}/${totals.roomsTracked}`}
              iconSrc="/icons/cards-icon.svg"
              ariaLabel={ui.festDashboard.summaryRooms}
            />
            <SummaryStatCard
              label={ui.festDashboard.summaryPlayers}
              value={totals.players}
              iconSrc="/icons/player-marker.svg"
              ariaLabel={ui.festDashboard.summaryPlayers}
            />
            <SummaryStatCard
              label={ui.festDashboard.summaryMonsterWins}
              value={totals.monsterWins}
              iconSrc="/icons/monster-icon.svg"
              ariaLabel={ui.festDashboard.summaryMonsterWins}
            />
            <SummaryStatCard
              label={ui.festDashboard.summaryBvbWins}
              value={totals.pvpWins}
              iconSrc="/icons/bvb-icon.svg"
              ariaLabel={ui.festDashboard.summaryBvbWins}
            />
            <SummaryStatCard
              label={ui.festDashboard.summaryKlunks}
              value={totals.klunks}
              iconSrc="/icons/klunk.svg"
              iconColored
              ariaLabel={ui.festDashboard.summaryKlunks}
            />
          </div>
        ) : null}

        {roomCodes.length === 0 ? (
          <div className={styles.emptyState}>{ui.festDashboard.emptyRooms}</div>
        ) : (
          <div className={styles.roomList}>
            {roomCodes.map((code) => (
              <TrackedRoomPanel key={code} code={code} onRemove={removeRoom} onSnapshot={handleSnapshot} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
