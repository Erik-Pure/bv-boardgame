import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  BOARD_RING_GRID_SIZE,
  ringGridSizeFromTileCount,
  ringTileCount,
  type GameState,
  type Player,
  type TileType,
} from "@bv/game-core";
import { TableCombatReactionFan } from "../components/table/TableCombatReactionFan";
import { expandReactionPlaysToFanCards, expandTableRevealsToFanCards } from "../lib/tableItemPlayFanCards";
import { isGameState } from "../lib/gameTypes";
import { type ServerMessage } from "../lib/ws";
import { useWsGameClient } from "../lib/useWsGameClient";
import { EndedScoreboardPlayerLine } from "../components/EndedScoreboardPlayerLine";
import { ArcadeButton } from "../components/ArcadeButton";
import { CombatLoseCardContent } from "../components/CombatLoseCard";
import { CombatWinCardContent } from "../components/CombatWinCard";
import { CombatSheetFrame } from "../components/CombatResultSheet";
import { TreasureCardContent } from "../components/TreasureCardContent";
import { CardArtAttribution } from "../components/CardArtAttribution";
import { artAttributionLabel, artImageSrcForPending, resolveCardRevealArtKey } from "../lib/cardArt";
import { isEventStoryCardPending } from "../lib/eventStoryCardPending";
import { activePlayer, clamp, ringPos } from "../lib/tableBoard";
import { TableBoardCameraViewport } from "../components/table/TableBoardCameraViewport";
import monsterCardFrameStyles from "../components/MonsterEncounterCard.module.css";
import turnBannerStyles from "./turnBanner.module.css";
import { parseLegacyCombatLoseText, parseLegacyCombatWinText, resolveCombatLossViewer, resolveCombatWinViewer } from "../lib/combatUi";
import { sv, wsStatusLabel, tileTypeSv } from "../lib/uiStrings";
import { WsReconnectFooterHint } from "../components/WsReconnectOverlay";
import { CardFlipModalShell } from "../components/CardFlipModalShell";
import cardFlipShellStyles from "../components/CardFlipModalShell.module.css";
import { TableCombatBoardPanel } from "../components/table/TableCombatBoardPanel";
import { TablePvpBoardPanel } from "../components/table/TablePvpBoardPanel";
import { StatIcon } from "../components/StatIcon";
import {
  TABLE_CARD_MODAL_DELAY_MS,
  TABLE_BOARD_MODAL_KEYFRAMES_CSS,
  TABLE_BOARD_MODAL_OVERLAY_ANIMATION,
  TABLE_BOARD_OVERLAY_BG,
  TABLE_BOSS_OVERLAY_BG,
  TABLE_BOSS_OVERLAY_PULSE,
} from "../components/table/tableConstants";
import { PLAYER_MARKER_TOKEN_H, PLAYER_MARKER_TOKEN_W, PLAYER_MARKER_VIEWBOX, playerMarkerStyleVars, playerMarkerSvgMarkupFor } from "../lib/playerMarkerSvg";
import u from "../styles/uiPrimitives.module.css";
import tableStyles from "./TableView.module.css";

/** Publika tillgångar under apps/web/public/backgrounds/ — nyckel = våningsindex (0 = nivå 1). */
const TABLE_LEVEL_BACKGROUNDS: Record<number, string> = {
  0: "/backgrounds/level1bg.webp",
  1: "/backgrounds/level2bg.webp",
  2: "/backgrounds/level3bg.webp",
};

/** Publika tillgångar under apps/web/public/tiles/ */
const TILE_SVG: Record<TileType, string> = {
  empty: "/tiles/empty.svg",
  event: "/tiles/event.svg",
  combat: "/tiles/combat.svg",
  merchant: "/tiles/merchant.svg",
  door: "/tiles/levelup.svg",
  rest: "/tiles/rest.svg",
  treasure: "/tiles/treasure.svg",
  boss: "/tiles/boss.svg",
};

function tileSvgHref(type: TileType): string {
  return TILE_SVG[type];
}

function tileTypeLabel(type: TileType): string {
  return tileTypeSv[type];
}

/** Flera pjäser på samma ruta — liten kluster-layout (inte på rad). */
function playerClusterOffsets(n: number, baseR: number): { dx: number; dy: number }[] {
  if (n <= 0) return [];
  if (n === 1) return [{ dx: 0, dy: -8 }];
  if (n === 2) {
    return [
      { dx: -baseR * 0.72, dy: -baseR * 0.28 },
      { dx: baseR * 0.72, dy: baseR * 0.28 },
    ];
  }
  if (n === 3) {
    const r = baseR;
    return [
      { dx: 0, dy: -r * 0.88 },
      { dx: -r * 0.78, dy: r * 0.58 },
      { dx: r * 0.78, dy: r * 0.58 },
    ];
  }
  const r = baseR * (n <= 5 ? 1.05 : 1.15);
  const start = -Math.PI / 2;
  const out: { dx: number; dy: number }[] = [];
  for (let i = 0; i < n; i++) {
    const ang = start + (i * (2 * Math.PI)) / n;
    out.push({ dx: Math.cos(ang) * r, dy: Math.sin(ang) * r });
  }
  return out;
}

/** Min höjd på tur-banner — används för padding så brädet inte döljs under bannern. */
const TABLE_TURN_BANNER_RESERVE_PX = 92;
/** Extra utrymme när statusrad (t.ex. sömn) visas under namnet */
const TABLE_TURN_BANNER_RESERVE_WITH_STATUS_PX = 116;
/** Vertikalt lyft (enkel + solfjäder); något lägre så den inte tar för mycket fokus. */
const TABLE_ITEM_PLAY_LIFT_PX = 34;
/** Synliga tillstånd för spelare på brädet (sömn = hoppar turer). */
function tablePlayerAfflictionLines(p: Player): string[] {
  const lines: string[] = [];
  if ((p.skippedTurns ?? 0) > 0) {
    lines.push(sv.table.playerStatusSleepSkip(p.skippedTurns ?? 0));
  }
  if (p.skipTurnReasons?.includes("oil")) {
    lines.push(`(${sv.table.playerStatusOilInEye})`);
  }
  return lines;
}

function pendingCardOwner(state: GameState | null) {
  if (!state) return null;
  const pending = state.pending;
  if (!pending || pending.type !== "card") return null;
  return state.players.find((p) => p.id === pending.playerId) ?? null;
}

type TableLobbyPlayer = GameState["players"][number];

/** Enkel rad för pre-game lobby (som tidigare). */
function TablePreGameLobbyPlayerRow({ p }: { p: TableLobbyPlayer }) {
  const afflictions = tablePlayerAfflictionLines(p);
  const tintStyle = { "--player-color": p.color } as CSSProperties;
  return (
    <div className={u.flexRowGap10}>
      <div className={tableStyles.preGameTintBox} style={tintStyle}>
        <div className={tableStyles.preGameName}>
          <span>
            {p.name}
            {p.isHost ? " (värd)" : ""}
          </span>
          {afflictions.length > 0 ? (
            <div className={tableStyles.preGameAfflictLine}>{afflictions.join(" · ")}</div>
          ) : null}
        </div>
      </div>
      <span
        title={p.ready ? sv.play.ready : sv.play.unready}
        className={`${tableStyles.readyIndicator} ${p.ready ? tableStyles.readyIndicatorOn : tableStyles.readyIndicatorOff}`}
        aria-label={p.ready ? sv.play.ready : sv.play.unready}
      />
    </div>
  );
}

function TableLobbyPlayerRow({ p }: { p: TableLobbyPlayer }) {
  const afflictions = tablePlayerAfflictionLines(p);
  const weaponName = p.equipment.weapon?.name ?? "—";
  const armorName = p.equipment.armor?.name ?? "—";
  const helmetName = p.equipment.helmet?.name ?? "—";
  const accessoryName = p.equipment.accessory?.name ?? "—";
  const dotStyle = { "--player-color": p.color } as CSSProperties;
  return (
    <div className={tableStyles.lobbyCard}>
      <div className={u.flexSpaceBetweenGap10}>
        <div className={tableStyles.lobbyNameCluster}>
          <span aria-hidden className={tableStyles.playerColorDot12} style={dotStyle} />
          <span>
            {p.name}
            {p.isHost ? " (värd)" : ""}
          </span>
          <span aria-label={p.ready ? sv.play.ready : sv.play.unready}>
            {p.ready ? "✅" : "⛔"}
          </span>
        </div>
        <div className={u.inlineFlexGap12WrapEnd} aria-label={sv.play.statsLine(p.hp, p.maxHp, p.gold, p.klunkar)}>
          <span className={u.inlineFlexGap4}>
            <StatIcon kind="hp" size={18} />
            {p.hp}/{p.maxHp}
          </span>
          <span className={u.inlineFlexGap4}>
            <StatIcon kind="pant" size={18} />
            {p.gold}
          </span>
          <span className={u.inlineFlexGap4}>
            <StatIcon kind="klunk" size={18} />
            {p.klunkar}
          </span>
        </div>
      </div>
      {afflictions.length > 0 ? <div className={tableStyles.lobbyAfflictBanner}>{afflictions.join(" · ")}</div> : null}
      <div className={tableStyles.lobbyEquipGrid}>
        <div className={u.ellipsis}>
          {sv.play.equipWeapon}: {weaponName}
        </div>
        <div className={u.ellipsis}>
          {sv.play.equipArmor}: {armorName}
        </div>
        <div className={u.ellipsis}>
          {sv.play.equipHelmet}: {helmetName}
        </div>
        <div className={u.ellipsis}>
          {sv.play.equipAccessory}: {accessoryName}
        </div>
      </div>
    </div>
  );
}

export function TableView() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const room = (sp.get("room") ?? "").toUpperCase() || "TEST1";
  const joinQrUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join?room=${encodeURIComponent(room)}`
      : `/join?room=${encodeURIComponent(room)}`;
  const name = sp.get("name") ?? "Bord";

  const [state, setState] = useState<GameState | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTileTypeLabels, setShowTileTypeLabels] = useState(false);
  const [preventSleep, setPreventSleep] = useState(false);
  const [wakeLockAvailable, setWakeLockAvailable] = useState(false);
  const wakeLockRef = useRef<{ release: () => Promise<void>; released: boolean } | null>(null);

  const stackLevels = state?.levels?.length ? state.levels : [];

  const playersById = useMemo(() => {
    const ps = state?.players ?? [];
    return new Map(ps.map((p) => [p.id, p]));
  }, [state?.players]);

  const playersByTileKey = useMemo(() => {
    const ps = state?.players ?? [];
    const levels = state?.levels ?? [];
    const map = new Map<string, Player[]>();
    for (const p of ps) {
      const nTiles = levels[p.levelIndex]?.tiles?.length ?? 0;
      const ti = nTiles <= 0 ? 0 : Math.min(Math.max(0, p.tileIndex), nTiles - 1);
      const key = `${p.levelIndex}-${ti}`;
      const arr = map.get(key);
      if (arr) arr.push(p);
      else map.set(key, [p]);
    }
    return map;
  }, [state?.players, state?.levels]);

  const tileSize = 120;
  /** Luft mellan tile-ytan och den gula målramen (px). */
  const targetRingOutset = 8;
  /** Måste matcha `level.tiles.length` så visuell stegräkning = serverns modulo-ring (se ringMovement). */
  const ringNTiles =
    stackLevels[0]?.tiles.length ?? ringTileCount(BOARD_RING_GRID_SIZE);
  const gridSize = ringGridSizeFromTileCount(ringNTiles);
  /** Marginal inuti SVG så målram + tjock stroke inte klipps vid brädets kanter. */
  const boardPad = targetRingOutset + 4;
  const gridPixelW = gridSize * tileSize;
  const gridPixelH = gridSize * tileSize;
  const boardWidth = gridPixelW + 2 * boardPad;
  const boardHeight = gridPixelH + 2 * boardPad;
  /** Horisontellt avstånd mellan våningsplan (sida vid sida). */
  const RING_STACK_GAP = 44;
  const stackCount = stackLevels.length;
  const totalSvgWidth =
    stackCount === 0 ? boardWidth : stackCount * boardWidth + (stackCount - 1) * RING_STACK_GAP;
  const totalSvgHeight = boardHeight;

  const maxFloorReached = useMemo(() => {
    if (!state?.players?.length) return 0;
    return Math.max(0, ...state.players.map((p) => p.levelIndex));
  }, [state?.players]);

  const floorLitOnTable = (levelIndex: number) =>
    stackCount === 0 || levelIndex === 0 || maxFloorReached >= levelIndex;

  const ringOffsetX = (levelIndex: number) =>
    stackCount === 0 ? 0 : levelIndex * (boardWidth + RING_STACK_GAP);

  const logRef = useRef<HTMLDivElement | null>(null);
  const tableCameraParams = useMemo(
    () => ({
      state,
      boardWidth,
      boardHeight,
      totalSvgWidth,
      ringStackGap: RING_STACK_GAP,
      gridSize,
      tileSize,
      boardPad,
      targetRingOutset,
    }),
    [
      state,
      boardWidth,
      boardHeight,
      totalSvgWidth,
      gridSize,
      tileSize,
      boardPad,
      targetRingOutset,
    ],
  );

  const tableConfig = useMemo(() => ({ gameMode: "bossKill" as const }), []);

  const { status, reconnectAttemptN, overlayPhase, requestReconnect, showReconnectOverlay } =
    useWsGameClient({
      roomCode: room,
      playerName: name,
      as: "table",
      config: tableConfig,
      connectTimeoutMs: 10_000,
      onMessage: (m: ServerMessage) => {
        if (m.type === "error") setErr(m.message);
        if (m.type === "state" && isGameState(m.state)) {
          setState(m.state);
          setErr(null);
        }
      },
    });
  useEffect(() => {
    if (status === "connected" || status === "connecting") setErr(null);
  }, [status]);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setWakeLockAvailable(typeof (navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<unknown> } }).wakeLock?.request === "function");
  }, []);

  useEffect(() => {
    if (!preventSleep) {
      const sentinel = wakeLockRef.current;
      wakeLockRef.current = null;
      if (sentinel && !sentinel.released) {
        void sentinel.release().catch(() => undefined);
      }
      return;
    }
    if (typeof document === "undefined") return;
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<unknown> } };
    if (!nav.wakeLock?.request) return;

    let cancelled = false;
    const requestWakeLock = async () => {
      if (cancelled || document.visibilityState !== "visible") return;
      try {
        const lock = (await nav.wakeLock!.request("screen")) as {
          released: boolean;
          release: () => Promise<void>;
          addEventListener?: (type: "release", listener: () => void) => void;
        };
        if (cancelled) {
          if (!lock.released) await lock.release();
          return;
        }
        wakeLockRef.current = lock;
        lock.addEventListener?.("release", () => {
          if (wakeLockRef.current === lock) {
            wakeLockRef.current = null;
          }
        });
      } catch {
        // Ignore; togglen kan vara på även om browsern tillfälligt nekar låset.
      }
    };

    const onVisibilityChange = () => {
      if (!preventSleep) return;
      if (document.visibilityState === "visible" && !wakeLockRef.current) {
        void requestWakeLock();
      }
    };

    void requestWakeLock();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      const sentinel = wakeLockRef.current;
      wakeLockRef.current = null;
      if (sentinel && !sentinel.released) {
        void sentinel.release().catch(() => undefined);
      }
    };
  }, [preventSleep]);

  // Håll loggen i botten när nya rader kommer.
  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [state?.log?.length]);

  const cur = activePlayer(state);
  const readyCount = state?.players?.filter((p) => p.ready).length ?? 0;
  const cardOwner = pendingCardOwner(state);

  const tableCardPendingKey =
    state?.pending?.type === "card"
      ? `${state.pending.cardId}:${state.pending.playerId}`
      : null;
  const [tableCardModalReady, setTableCardModalReady] = useState(false);
  useEffect(() => {
    if (!tableCardPendingKey) {
      setTableCardModalReady(false);
      return;
    }
    setTableCardModalReady(false);
    const t = window.setTimeout(() => setTableCardModalReady(true), TABLE_CARD_MODAL_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [tableCardPendingKey]);

  const tableCombatSessionKey =
    state?.pending?.type === "combat"
      ? `${state.pending.attackerId}-${state.pending.levelIndex}-${state.pending.tileIndex}-${state.pending.monsterId}`
      : null;
  const [tableCombatModalReady, setTableCombatModalReady] = useState(false);
  const prevCombatSessionKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!tableCombatSessionKey) {
      setTableCombatModalReady(false);
      prevCombatSessionKeyRef.current = null;
      return;
    }
    if (prevCombatSessionKeyRef.current === tableCombatSessionKey) {
      return;
    }
    prevCombatSessionKeyRef.current = tableCombatSessionKey;
    const pend = state?.pending;
    if (!pend || pend.type !== "combat") return;
    if (pend.phase === "chooseTeammate") {
      setTableCombatModalReady(true);
      return;
    }
    setTableCombatModalReady(false);
    const t = window.setTimeout(() => setTableCombatModalReady(true), TABLE_CARD_MODAL_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [tableCombatSessionKey, state?.pending]);
  const moveTargets = useMemo(() => {
    if (state?.pending?.type !== "moveChoice") return null;
    return new Set(state.pending.options.map((o) => `${o.target.levelIndex}-${o.target.tileIndex}`));
  }, [state?.pending]);

  /** Samma läge som när `rollMove` får köras: ingen annan pending, aktiv spelare kan röra sig. */
  const highlightRollMoveOrigin = useMemo(() => {
    if (state?.phase !== "playing") return false;
    if (state.pending != null) return false;
    if (!cur || cur.eliminated) return false;
    if (cur.hp <= 0) return false;
    return true;
  }, [state?.phase, state?.pending, cur]);

  const playingTurn = state?.phase === "playing" && cur;
  const currentTurnAfflictions = cur ? tablePlayerAfflictionLines(cur) : [];
  const prevTurnPlayerIdRef = useRef<string | null>(null);
  const [turnBannerHandoff, setTurnBannerHandoff] = useState(false);
  useEffect(() => {
    if (!cur?.id) {
      prevTurnPlayerIdRef.current = null;
      setTurnBannerHandoff(false);
      return;
    }
    const prev = prevTurnPlayerIdRef.current;
    if (prev !== null && prev !== cur.id) {
      setTurnBannerHandoff(true);
      const t = window.setTimeout(() => setTurnBannerHandoff(false), 720);
      prevTurnPlayerIdRef.current = cur.id;
      return () => window.clearTimeout(t);
    }
    prevTurnPlayerIdRef.current = cur.id;
  }, [cur?.id]);
  const itemPlayFanCards = useMemo(() => {
    if (!state) return [];
    if (state.pending?.type === "combat" && (state.pending.reactionItemPlays?.length ?? 0) > 0) {
      return expandReactionPlaysToFanCards(state, state.pending.reactionItemPlays!);
    }
    const reveals = state.tableItemPlayReveals;
    if (reveals && reveals.length > 0) {
      return expandTableRevealsToFanCards(state, reveals);
    }
    return [];
  }, [state]);
  const showItemPlayFan = itemPlayFanCards.length > 0;
  const turnBannerBottomReservePx =
    playingTurn && currentTurnAfflictions.length > 0
      ? TABLE_TURN_BANNER_RESERVE_WITH_STATUS_PX
      : TABLE_TURN_BANNER_RESERVE_PX;

  const bannerReserveStyle = {
    "--table-banner-reserve": playingTurn ? `${turnBannerBottomReservePx}px` : "0px",
  } as CSSProperties;

  return (
    <div className={tableStyles.tableRoot}>
      <div className={tableStyles.headerBarWrap}>
        <header className={tableStyles.tableHeader}>
          <div className={tableStyles.headerLobbyRow}>
            <span className={tableStyles.headerLobbyCode} title={`${sv.table.lobby}: ${room}`}>
              {sv.table.lobby}: {room}
            </span>
          </div>
          <div className={tableStyles.headerRightControls}>
            <label className={tableStyles.wakeToggleLabel}>
              <input
                type="checkbox"
                checked={preventSleep}
                onChange={(e) => setPreventSleep(e.target.checked)}
                disabled={!wakeLockAvailable}
                aria-label={sv.table.wakeLockToggle}
              />
              <span title={!wakeLockAvailable ? sv.table.wakeLockUnsupported : undefined}>{sv.table.wakeLockToggle}</span>
            </label>
            <span className={tableStyles.headerStatusText}>
              {sv.table.status}: {wsStatusLabel(status)}
            </span>
          </div>
        </header>
      </div>

      <div className={tableStyles.mainRow} style={bannerReserveStyle}>
        <TableBoardCameraViewport
          camera={tableCameraParams}
          panChildren={
            <svg width={totalSvgWidth} height={totalSvgHeight} className={tableStyles.tableSvg}>
              <style>
                {`@keyframes bvTargetRingPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.032); }
}
.bv-target-ring-pulse {
  animation: bvTargetRingPulse 1.35s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .bv-target-ring-pulse { animation: none; }
}`}
              </style>
              <defs>
                <filter id="playerTokenShadow" x="-60%" y="-60%" width="220%" height="220%">
                  <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.55" />
                  <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.35" />
                </filter>
              </defs>
              {stackLevels.map((level, li) => {
                const lit = floorLitOnTable(li);
                const floorBg = TABLE_LEVEL_BACKGROUNDS[li];
                return (
                  <g key={`floor-${li}`} transform={`translate(${ringOffsetX(li)}, 0)`}>
                    <defs>
                      {level.tiles.map((t, i) => {
                        const { col, row } = ringPos(gridSize, i);
                        const x = boardPad + col * tileSize;
                        const y = boardPad + row * tileSize;
                        const w = tileSize - 12;
                        const h = tileSize - 12;
                        const clipId = `tile-clip-${li}-${t.id}`;
                        return (
                          <clipPath id={clipId} key={clipId}>
                            <rect x={x + 6} y={y + 6} width={w} height={h} rx={14} ry={14} />
                          </clipPath>
                        );
                      })}
                    </defs>
                    {floorBg ? (
                      <g style={{ filter: lit ? undefined : "brightness(0.38) saturate(0.5)" }}>
                        <image
                          href={floorBg}
                          x={0}
                          y={0}
                          width={boardWidth}
                          height={boardHeight}
                          preserveAspectRatio="xMidYMid slice"
                        />
                      </g>
                    ) : null}
                    <text
                      x={boardWidth / 2}
                      y={16}
                      textAnchor="middle"
                      fill={lit ? "#cbd5e1" : "#64748b"}
                      fontSize={12}
                      fontWeight={700}
                      opacity={0.92}
                      style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.65)", strokeWidth: 2 }}
                    >
                      {sv.table.floorN(li + 1)}
                    </text>
                    <g style={{ filter: lit ? undefined : "brightness(0.38) saturate(0.5)" }}>
                      {level.tiles.map((t, i) => {
                        const { col, row } = ringPos(gridSize, i);
                        const x = boardPad + col * tileSize;
                        const y = boardPad + row * tileSize;
                        const w = tileSize - 12;
                        const h = tileSize - 12;
                        const clipId = `tile-clip-${li}-${t.id}`;
                        const tileKey = `${li}-${i}`;
                        const isTarget = moveTargets?.has(tileKey) ?? false;
                        const isRollMoveOrigin =
                          highlightRollMoveOrigin &&
                          cur != null &&
                          li === cur.levelIndex &&
                          i === cur.tileIndex;
                        const showTargetRing = isTarget || isRollMoveOrigin;
                        const ringW = w + 2 * targetRingOutset;
                        const ringH = h + 2 * targetRingOutset;
                        const ringR = 14 + targetRingOutset;
                        const ringCx = x + 6 + w / 2;
                        const ringCy = y + 6 + h / 2;
                        return (
                          <g key={t.id}>
                            <g style={{ clipPath: `url(#${clipId})` }}>
                              <image
                                href={tileSvgHref(t.type)}
                                x={x + 6}
                                y={y + 6}
                                width={w}
                                height={h}
                                preserveAspectRatio="xMidYMid slice"
                              />
                            </g>
                            {showTargetRing ? (
                              <g pointerEvents="none" transform={`translate(${ringCx}, ${ringCy})`}>
                                <g className="bv-target-ring-pulse">
                                  <rect
                                    x={-ringW / 2}
                                    y={-ringH / 2}
                                    width={ringW}
                                    height={ringH}
                                    rx={ringR}
                                    ry={ringR}
                                    fill="none"
                                    stroke="#fef9c3"
                                    strokeWidth={5}
                                    opacity={0.95}
                                  />
                                  <rect
                                    x={-ringW / 2}
                                    y={-ringH / 2}
                                    width={ringW}
                                    height={ringH}
                                    rx={ringR}
                                    ry={ringR}
                                    fill="none"
                                    stroke="#a16207"
                                    strokeWidth={2}
                                    opacity={0.9}
                                  />
                                </g>
                              </g>
                            ) : null}
                            {showTileTypeLabels ? (
                              <text
                                x={x + 6 + w / 2}
                                y={y + 6 + 18}
                                textAnchor="middle"
                                fill="#f8fafc"
                                fontSize={13}
                                fontWeight={700}
                                opacity={0.95}
                                style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.75)", strokeWidth: 3 }}
                              >
                                {tileTypeLabel(t.type)}
                              </text>
                            ) : null}
                          </g>
                        );
                      })}
                    </g>
                    <g
                      style={{
                        filter: lit ? undefined : "brightness(0.38) saturate(0.5)",
                      }}
                    >
                      {level.tiles.map((t, i) => {
                        const { col, row } = ringPos(gridSize, i);
                        const x = boardPad + col * tileSize;
                        const y = boardPad + row * tileSize;
                        const w = tileSize - 12;
                        const h = tileSize - 12;
                        const here = playersByTileKey.get(`${li}-${i}`) ?? [];
                        if (!here.length) return null;
                        const innerCx = x + 6 + w / 2;
                        const innerCy = y + 6 + h / 2;
                        const n = here.length;
                        const clusterR = clamp((Math.min(w, h) / n) * 0.42, 14, 28);
                        const offsets = playerClusterOffsets(n, clusterR);
                        return (
                          <g key={`tok-${t.id}`}>
                            {here.map((p, idx) => {
                              const off = offsets[idx] ?? { dx: 0, dy: -8 };
                              const cx = innerCx + off.dx;
                              const cy = innerCy + off.dy;
                              const initial = (p.name?.trim()?.[0] ?? "?").toUpperCase();
                              const tw = PLAYER_MARKER_TOKEN_W;
                              const th = PLAYER_MARKER_TOKEN_H;
                              return (
                                <g key={p.id} filter="url(#playerTokenShadow)">
                                  <g
                                    transform={`translate(${cx - tw / 2}, ${cy - th / 2})`}
                                    style={playerMarkerStyleVars(p.color)}
                                  >
                                    <svg
                                      width={tw}
                                      height={th}
                                      viewBox={PLAYER_MARKER_VIEWBOX}
                                      overflow="visible"
                                      dangerouslySetInnerHTML={{
                                        __html: playerMarkerSvgMarkupFor(p.id),
                                      }}
                                    />
                                    <g transform={`translate(${tw / 2}, ${th * 0.44})`}>
                                      <g transform="scale(1, 0.66)">
                                        <text
                                          x={0}
                                          y={0}
                                          textAnchor="middle"
                                          dominantBaseline="central"
                                          fill="rgba(255,255,255,0.94)"
                                          stroke="rgba(0,0,0,0.55)"
                                          strokeWidth={3.4}
                                          fontSize={34}
                                          fontWeight={900}
                                          style={{
                                            userSelect: "none",
                                            paintOrder: "stroke fill",
                                          }}
                                        >
                                          {initial}
                                        </text>
                                      </g>
                                    </g>
                                  </g>
                                </g>
                              );
                            })}
                          </g>
                        );
                      })}
                    </g>
                    {!lit ? (
                      <rect
                        x={0}
                        y={0}
                        width={boardWidth}
                        height={boardHeight}
                        fill="rgba(2, 6, 23, 0.5)"
                        pointerEvents="none"
                      />
                    ) : null}
                  </g>
                );
              })}
            </svg>
          }
          viewportOverlayChildren={
            <>
          {state?.phase === "lobby" ? (
            <div role="dialog" aria-label={sv.table.lobby} className={tableStyles.modalBackdropLobby}>
              <div className={tableStyles.modalCardLobby}>
                <div className={tableStyles.lobbyCodeRow}>
                  <div className={tableStyles.lobbyCodeDisplay}>{room}</div>
                </div>
                <h2 className={tableStyles.lobbySheetTitle}>{sv.table.lobby}</h2>
                <div className={tableStyles.lobbyReadyLine}>{sv.table.readyAll(readyCount, state.players.length)}</div>
                <div className={u.gridCenter8Mb16}>
                  <div className={tableStyles.qrFrame} title={joinQrUrl}>
                    <QRCodeSVG
                      value={joinQrUrl}
                      size={176}
                      includeMargin
                      style={{ width: "clamp(160px, 32vw, 220px)", height: "auto", display: "block" }}
                    />
                  </div>
                  <div className={u.caption12o86Center}>Skanna för att gå med i lobbyn</div>
                </div>
                <div className={u.stack8}>
                  {state.players.map((p) => (
                    <TablePreGameLobbyPlayerRow key={p.id} p={p} />
                  ))}
                </div>
              </div>
            </div>
          ) : state?.phase === "ended" ? (
            <div role="dialog" aria-label={sv.play.gameOver} className={tableStyles.modalBackdropEnded}>
              <div className={tableStyles.modalCardEnded}>
                <h2 className={u.gameOverTitle}>{sv.play.gameOver}</h2>
                <p className={u.gameOverWinnerLine}>
                  {sv.play.winner}: <b>{state.winnerName ?? "—"}</b>
                </p>
                <ol className={u.listGrid12}>
                  {[...state.players]
                    .sort((a, b) => {
                      const w = state.winnerId;
                      if (w) {
                        if (a.id === w) return -1;
                        if (b.id === w) return 1;
                      }
                      if (b.klunkar !== a.klunkar) return b.klunkar - a.klunkar;
                      if (b.gold !== a.gold) return b.gold - a.gold;
                      return a.name.localeCompare(b.name, "sv");
                    })
                    .map((p) => (
                      <li key={p.id} className={u.flexRowBetweenWrap12}>
                        <EndedScoreboardPlayerLine player={p} isWinner={p.id === state.winnerId} />
                      </li>
                    ))}
                </ol>
                <div className={u.mt20w100}>
                  <ArcadeButton variant="pink" fullWidth onClick={() => navigate("/", { replace: true })}>
                    {sv.play.gameOverLeaveToHome}
                  </ArcadeButton>
                </div>
              </div>
            </div>
          ) : null}
            </>
          }
        />

        <button
          type="button"
          aria-label={sidebarOpen ? sv.table.hidePanel : sv.table.showPanel}
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen((o) => !o)}
          className={tableStyles.sidebarToggle}
        >
          {sidebarOpen ? "⟩" : "⟨"}
        </button>

        <aside
          className={tableStyles.tableSidebarAside}
          data-open={sidebarOpen ? "true" : "false"}
        >
          <h2 className={tableStyles.sidebarGameTitle}>{sv.table.game}</h2>
          {!state && <div className={tableStyles.waitingLine}>{sv.table.waitingState}</div>}
          {err && <div className={tableStyles.sidebarError}>{err}</div>}

          {state && (
            <>
              <label className={tableStyles.tileTypeLabelRow}>
                <input
                  type="checkbox"
                  checked={showTileTypeLabels}
                  onChange={(e) => setShowTileTypeLabels(e.target.checked)}
                  aria-label={sv.table.tileTypeLabels}
                />
                <span>{sv.table.tileTypeLabels}</span>
              </label>

              {state.phase !== "lobby" ? (
                <>
                  <h3>{sv.table.lobbyList}</h3>
                  <div className={u.stack8}>
                    {state.players.map((p) => (
                      <TableLobbyPlayerRow key={p.id} p={p} />
                    ))}
                  </div>
                </>
              ) : null}

              <h3>{sv.table.log}</h3>
              <div ref={logRef} className={tableStyles.sidebarLog}>
                {state.log.slice(-30).map((l, i) => (
                  <div key={i} className={tableStyles.sidebarLogLine}>
                    {l.message}
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>

      {state?.pending?.type === "pvp" && <TablePvpBoardPanel state={state} />}

      <style>{TABLE_BOARD_MODAL_KEYFRAMES_CSS}</style>

      {state?.pending?.type === "combat" && tableCombatModalReady && (
        <TableCombatBoardPanel state={state} playersById={playersById} />
      )}

      {state?.pending?.type === "brewerDown" && (
        <CardFlipModalShell
          zIndex={48}
          maxWidth={520}
          instantFront
          blockPointerUntilFlipped={false}
          faceInnerClassName={cardFlipShellStyles.faceInnerNoVerticalOverflow}
          style={{
            pointerEvents: "none",
            placeItems: "start center",
            paddingTop: 70,
            background: TABLE_BOARD_OVERLAY_BG,
            animation: TABLE_BOARD_MODAL_OVERLAY_ANIMATION,
          }}
        >
          {(() => {
            const pr = state.pending;
            if (pr?.type !== "brewerDown") return null;
            const victim = state.players.find((pl) => pl.id === pr.playerId);
            const name = victim?.name ?? "";
            return (
              <div
                style={{
                  width: "100%",
                  maxWidth: 480,
                  margin: "0 auto",
                  boxSizing: "border-box",
                  borderRadius: 16,
                  border: "1px solid #ffffff22",
                  background: "rgba(11, 18, 38, 0.94)",
                  boxShadow: "0 24px 56px rgba(0,0,0,0.45)",
                  padding: "22px 20px 24px",
                  textAlign: "center",
                  color: "#e5e7eb",
                }}
              >
                <CombatSheetFrame
                  sheetTitle={sv.play.brewerDownTitle}
                  titleStyle={{
                    textAlign: "center",
                    fontFamily: '"Permanent Marker", var(--heading), sans-serif',
                    fontWeight: 900,
                    fontSize: "clamp(1.35rem, 3.2vw, 1.75rem)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  <img
                    src="/icons/skull-icon.svg"
                    alt=""
                    draggable={false}
                    style={{
                      width: 96,
                      height: "auto",
                      margin: "10px auto 14px",
                      display: "block",
                      filter: "brightness(0) invert(1)",
                    }}
                  />
                  <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>{name}</div>
                  <div style={{ fontSize: 14, opacity: 0.88, lineHeight: 1.45 }}>
                    {sv.table.brewerDownWaitPhone(name)}
                  </div>
                </CombatSheetFrame>
              </div>
            );
          })()}
        </CardFlipModalShell>
      )}

      {state?.pending?.type === "card" && tableCardModalReady && (
        <CardFlipModalShell
          zIndex={44}
          maxWidth={720}
          blockPointerUntilFlipped={false}
          faceInnerClassName={
            isEventStoryCardPending(state.pending)
              ? cardFlipShellStyles.faceInnerNoVerticalOverflow
              : undefined
          }
          style={{
            pointerEvents: "none",
            placeItems: "start center",
            paddingTop: 70,
            background: state.pending.cardId === "boss_round_win" ? TABLE_BOSS_OVERLAY_BG : TABLE_BOARD_OVERLAY_BG,
            backgroundRepeat: state.pending.cardId === "boss_round_win" ? "no-repeat" : undefined,
            backgroundSize: state.pending.cardId === "boss_round_win" ? "100% 100%, 100% 100%" : undefined,
            backgroundPosition: state.pending.cardId === "boss_round_win" ? "50% 16%, 50% 50%" : undefined,
            animation:
              state.pending.cardId === "boss_round_win"
                ? `${TABLE_BOARD_MODAL_OVERLAY_ANIMATION}, ${TABLE_BOSS_OVERLAY_PULSE}`
                : TABLE_BOARD_MODAL_OVERLAY_ANIMATION,
          }}
        >
          {(() => {
            const pCard = state.pending;
            const eventStoryFrame = isEventStoryCardPending(pCard);
            return (
          <div
            style={{
              width: "100%",
              textAlign: "left",
              ...(eventStoryFrame
                ? {
                    maxWidth: 520,
                    margin: "0 auto",
                    padding: "0 10px 12px",
                    boxSizing: "border-box",
                  }
                : {
                    borderRadius: 16,
                    border: "1px solid #ffffff22",
                    background: "rgba(11, 18, 38, 0.92)",
                    padding: 16,
                  }),
            }}
          >
            {(() => {
              const p = state.pending;
              const viewer = cardOwner?.name;
              const winData =
                p.cardId === "combat_win"
                  ? resolveCombatWinViewer(
                      p.combatWin ?? parseLegacyCombatWinText(p.text, viewer),
                      viewer,
                    )
                  : null;
              const loseData =
                p.cardId === "combat_lose"
                  ? resolveCombatLossViewer(
                      p.combatLoss ?? parseLegacyCombatLoseText(p.text, viewer),
                      viewer,
                    )
                  : null;
              if (winData) {
                return (
                  <div style={{ textAlign: "center", color: "#e5e7eb" }}>
                    <CombatSheetFrame>
                      <CombatWinCardContent data={winData} />
                    </CombatSheetFrame>
                  </div>
                );
              }
              if (loseData) {
                return (
                  <div style={{ textAlign: "center", color: "#e5e7eb" }}>
                    <CombatSheetFrame>
                      <CombatLoseCardContent data={loseData} />
                    </CombatSheetFrame>
                  </div>
                );
              }
              if (isFoundItemRevealCard(p.cardId)) {
                return (
                  <div style={{ textAlign: "center", color: "#e5e7eb" }}>
                    <CombatSheetFrame
                      sheetTitle={sv.table.hiddenItemFoundTitle}
                      titleStyle={{ textAlign: "center", fontSize: 30, letterSpacing: "0.03em", marginBottom: 14 }}
                    >
                      <TableHiddenItemRevealCardContent />
                    </CombatSheetFrame>
                  </div>
                );
              }
              if (p.kind === "treasure" && !p.cardId.startsWith("treasure_item_")) {
                return (
                  <div style={{ textAlign: "center", color: "#e5e7eb" }}>
                    <CombatSheetFrame sheetTitle={sv.play.treasureCardSheetTitle}>
                      <TreasureCardContent title={p.title} text={p.text} cardId={p.cardId} />
                    </CombatSheetFrame>
                  </div>
                );
              }
              if (p.cardId === "door_locked") {
                return (
                  <div style={{ textAlign: "center", color: "#e5e7eb" }}>
                    <CombatSheetFrame
                      sheetTitle={p.title}
                      titleStyle={{ textAlign: "center", fontSize: 22, letterSpacing: "0.02em", marginBottom: 14 }}
                    >
                      <TableLevelUpLockedCardContent text={p.text} />
                    </CombatSheetFrame>
                  </div>
                );
              }
              const revealArtKey = resolveCardRevealArtKey(p.artKey, p.grantedItemId);
              const showBeerRef = !!artAttributionLabel(revealArtKey);
              return (
                <div
                  className={[
                    monsterCardFrameStyles.wrap,
                    monsterCardFrameStyles.wrapFill,
                    monsterCardFrameStyles.wrapEventStory,
                  ].join(" ")}
                >
                  <div className={monsterCardFrameStyles.spin} aria-hidden />
                  <div
                    className={monsterCardFrameStyles.inner}
                    style={{
                      background: "#0b1226",
                      padding: 12,
                      color: "#fff",
                      display: "flex",
                      flexDirection: "column",
                      minHeight: "100%",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 10,
                        minWidth: 0,
                      }}
                    >
                      <img
                        src="/icons/event-icon.svg"
                        alt=""
                        draggable={false}
                        style={{
                          flexShrink: 0,
                          height: 24,
                          width: "auto",
                          objectFit: "contain",
                          filter:
                            "brightness(0) invert(1) drop-shadow(0 0 6px rgba(255, 255, 255, 0.22))",
                          opacity: 0.96,
                        }}
                      />
                      <div
                        style={{
                          fontFamily: '"Permanent Marker", var(--heading), sans-serif',
                          fontWeight: 900,
                          fontSize: 22,
                          lineHeight: 1.1,
                          letterSpacing: "0.02em",
                          wordBreak: "break-word",
                          minWidth: 0,
                        }}
                      >
                        {p.title}
                      </div>
                    </div>
                    <div
                      style={{
                        width: "100%",
                        margin: "0 0 14px",
                        aspectRatio: "4/3",
                        borderRadius: 14,
                        overflow: "hidden",
                        border: "1px solid #ffffff22",
                        background: "rgba(255,255,255,0.92)",
                        boxSizing: "border-box",
                      }}
                    >
                      <img
                        src={artImageSrcForPending(p.artKey, p.grantedItemId, {
                          cardText: p.text,
                          cardId: p.cardId,
                        })}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/card-placeholder.png";
                        }}
                        alt={sv.table.cardArtAlt}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          objectPosition: "center",
                          display: "block",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        opacity: 0.98,
                        color: "#e5e7eb",
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.45,
                        fontSize: 15,
                      }}
                    >
                      {p.text}
                    </div>
                    <div
                      style={{
                        opacity: 0.62,
                        fontSize: 12,
                        lineHeight: 1.35,
                        marginTop: 12,
                        color: "rgba(226, 232, 240, 0.9)",
                      }}
                    >
                      {sv.table.waitingConfirmPhone}
                    </div>
                    {showBeerRef ? <div style={{ flex: "1 1 0", minHeight: 0 }} aria-hidden /> : null}
                    {showBeerRef ? (
                      <div
                        style={{
                          marginTop: 0,
                          paddingTop: 10,
                          borderTop: "1px solid rgba(255,255,255,0.1)",
                          flexShrink: 0,
                        }}
                      >
                        <CardArtAttribution artKey={revealArtKey} dense />
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })()}
            {!eventStoryFrame ? (
              <div
                style={{
                  opacity: 0.65,
                  fontSize: 12,
                  marginTop: 10,
                  textAlign: "center",
                }}
              >
                {sv.table.waitingConfirmPhone}
              </div>
            ) : null}
          </div>
            );
          })()}
        </CardFlipModalShell>
      )}

      {playingTurn ? (
        <div className={tableStyles.turnBannerDock} aria-live="polite">
          <div className={tableStyles.turnBannerFanWrap}>
            {showItemPlayFan && state ? (
              <TableCombatReactionFan cards={itemPlayFanCards} liftPx={TABLE_ITEM_PLAY_LIFT_PX} />
            ) : null}
            <div
              className={[
                turnBannerStyles.colorBar,
                turnBannerHandoff ? turnBannerStyles.colorBarHandoff : "",
                tableStyles.turnBannerColorBar,
              ]
                .filter(Boolean)
                .join(" ")}
              style={
                {
                  background: "#000000",
                  "--turn-banner-min-h": currentTurnAfflictions.length > 0 ? "98px" : "78px",
                } as CSSProperties
              }
            >
            {turnBannerHandoff ? (
              <div className={turnBannerStyles.shineSweep} key={cur!.id} aria-hidden />
            ) : null}
            {currentTurnAfflictions.length > 0 ? (
              <div className={tableStyles.turnBannerAfflictions}>{currentTurnAfflictions.join(" · ")}</div>
            ) : null}
            <div
              style={{
                display: "flex",
                gap: 8,
                padding: "0",
                justifyContent: "center",
                overflowX: "auto",
              }}
            >
              {state!.players.map((p) => {
                const active = cur?.id === p.id;
                return (
                  <div
                    key={p.id}
                    style={{
                      minWidth: 150,
                      borderRadius: active ? 0 : 12,
                      padding: "6px 8px",
                      border: "none",
                      background: active ? p.color : "rgba(255,255,255,0.04)",
                      boxShadow: "none",
                      flexShrink: 0,
                    }}
                    title={[p.name, ...tablePlayerAfflictionLines(p)].filter(Boolean).join(" · ")}
                  >
                    <div
                      style={{
                        fontFamily: '"Permanent Marker", var(--heading), sans-serif',
                        fontSize: 20,
                        fontWeight: 900,
                        lineHeight: 1.1,
                        textAlign: "center",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        marginBottom: 6,
                      }}
                    >
                      {p.name}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 12,
                        fontSize: 17,
                        fontWeight: 800,
                        textAlign: "center",
                      }}
                    >
                      <span className={u.inlineFlexGap4}>
                        <StatIcon kind="hp" size={22} />
                        <span>
                          {p.hp}/{p.maxHp}
                        </span>
                      </span>
                      <span className={u.inlineFlexGap4}>
                        <StatIcon kind="pant" size={22} />
                        <span>{p.gold}</span>
                      </span>
                      <span className={u.inlineFlexGap4}>
                        <StatIcon kind="klunk" size={22} />
                        <span>{p.klunkar}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </div>
        </div>
      ) : null}

      {showReconnectOverlay ? (
        <div className={tableStyles.reconnectBar}>
          <div className={tableStyles.reconnectBarText}>
            {sv.table.lobby}: {room} · {wsStatusLabel(status)}
          </div>
          <WsReconnectFooterHint
            phase={overlayPhase}
            attempt={reconnectAttemptN}
            connectingShort={sv.table.wsReconnectFooterConnecting}
            waitingShort={sv.table.wsReconnectFooterWaiting}
            retryLabel={sv.table.wsRetry}
            onRetry={requestReconnect}
          />
        </div>
      ) : null}
    </div>
  );
}

function TableLevelUpLockedCardContent(props: { text: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        color: "#fff",
        padding: "8px 4px 0",
        gap: 14,
      }}
    >
      <div
        aria-hidden
        style={{
          width: 112,
          height: 112,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          background: "rgba(255,255,255,0.1)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.2)",
        }}
      >
        <img
          src="/icons/lvlup.svg"
          alt=""
          className="lvlup-lock-icon lvlup-lock-icon-down"
          style={{
            width: 36,
            height: 36,
            filter: "brightness(0) invert(1)",
            opacity: 0.96,
          }}
        />
      </div>
      <p style={{ fontFamily: "var(--sans)", fontSize: 17, fontWeight: 600, margin: 0, lineHeight: 1.4 }}>
        {props.text}
      </p>
    </div>
  );
}

function isFoundItemRevealCard(cardId: string): boolean {
  return cardId.startsWith("event_find_item_") || cardId.startsWith("treasure_item_");
}

function TableHiddenItemRevealCardContent() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        color: "#fff",
        padding: "8px 4px 0",
        gap: 14,
      }}
    >
      <div
        aria-hidden
        style={{
          width: 112,
          height: 112,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          background: "radial-gradient(circle at 32% 28%, #d9a21f 0%, #b97908 58%, #8b5e07 100%)",
          boxShadow: "inset 0 0 0 4px #facc15, 0 4px 16px rgba(0,0,0,0.35)",
        }}
      >
        <span
          aria-hidden
          style={{
            width: 58,
            height: 58,
            display: "inline-block",
            backgroundColor: "#ffffff",
            maskImage: "url(/icons/reward-icon.svg)",
            WebkitMaskImage: "url(/icons/reward-icon.svg)",
            maskSize: "contain",
            WebkitMaskSize: "contain",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskPosition: "center",
          }}
        />
      </div>
      <p style={{ fontFamily: "var(--sans)", fontSize: 17, fontWeight: 600, margin: 0, lineHeight: 1.4 }}>
        {sv.table.hiddenItemFoundBody}
      </p>
    </div>
  );
}

