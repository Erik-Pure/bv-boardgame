import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  brewerDisplayLevel,
  brewerKlunkProgressRatio,
  getCardDefById,
  isPlayerOnBoard,
  playerPant,
  prunePlayerEmoteBursts,
  prunePlayerKlunkBursts,
  type GameState,
  type Player,
  type TileType,
} from "@bv/game-core";
import { BeerBackdropLayers } from "../components/BeerBackdropLayers";
import { FinalBossCombatBackdrop } from "../components/FinalBossCombatBackdrop";
import { TableCombatReactionFan } from "../components/table/TableCombatReactionFan";
import { TurnBannerEmoteOverlay } from "../components/table/TurnBannerEmoteOverlay";
import { expandReactionPlaysToFanCards, expandTableRevealsToFanCards } from "../lib/tableItemPlayFanCards";
import { isGameState, mergeGameStateDelta } from "../lib/gameTypes";
import { type ServerMessage } from "../lib/ws";
import { useWsGameClient } from "../lib/useWsGameClient";
import {
  readBoardPerformancePrefs,
  subscribeBoardPerformancePrefs,
  writeBoardAnimationsEnabled,
  writeBoardPanEnabled,
  writeBoardPreventSleepEnabled,
  writeTokenMoveAnimationsEnabled,
} from "../lib/boardPerformancePrefs";

import { EndedScoreboardTable } from "../components/EndedScoreboardTable";
import { EndedSpotlightCarousel } from "../components/EndedSpotlightCarousel";
import { ArcadeButton } from "../components/ArcadeButton";
import { CombatLoseCardContent } from "../components/CombatLoseCard";
import { CombatWinCardContent } from "../components/CombatWinCard";
import { CombatSheetFrame } from "../components/CombatResultSheet";
import { TreasureCardContent } from "../components/TreasureCardContent";
import { CardRichText } from "../components/CardRichText";
import { CardArtAttribution } from "../components/CardArtAttribution";
import { artAttributionLabel, artImageSrcForPending, resolveCardRevealArtKey } from "../lib/cardArt";
import { parseRolledDieFromCardText } from "../lib/eventCardDice";
import { eventCardOutcomeToasts, type TableToastCategory } from "../lib/eventCardOutcomeToasts";
import { isEventStoryCardPending } from "../lib/eventStoryCardPending";
import { activePlayer, clamp, ringPosRect } from "../lib/tableBoard";
import {
  type MoveChoiceCardinalArrow,
  isRingTopEdgeTile,
  moveChoiceDirectionHints,
} from "../lib/moveChoiceDirectionHints";
import { TableBoardCameraViewport } from "../components/table/TableBoardCameraViewport";
import monsterCardFrameStyles from "../components/MonsterEncounterCard.module.css";
import turnBannerStyles from "./turnBanner.module.css";
import {
  finalBossCombatBackdropSessionKey,
  isFinalBossSessionActive,
  parseLegacyCombatLoseText,
  parseLegacyCombatWinText,
  resolveCombatLossViewer,
  resolveCombatWinViewer,
  shouldShowFinalBossCombatBackdrop,
} from "../lib/combatUi";
import { sv, wsStatusLabel, tileTypeSv } from "../lib/uiStrings";
import { WsReconnectFooterHint } from "../components/WsReconnectOverlay";
import { TablePresentationScaleProvider, useTableOverlayContentScale } from "../lib/tablePresentationScale";
import { useScreenWakeLock } from "../hooks/useScreenWakeLock";
import { useTableBoardViewModel } from "../hooks/useTableBoardViewModel";
import { CARD_FLIP_FRONT_ANIM_READY_MS, CardFlipModalShell, CardFlipScene } from "../components/CardFlipModalShell";
import cardFlipShellStyles from "../components/CardFlipModalShell.module.css";
import { TableCombatBoardPanel } from "../components/table/TableCombatBoardPanel";
import { TablePvpBoardPanel } from "../components/table/TablePvpBoardPanel";
import { LevelRingCell } from "../components/LevelRingCell";
import { StatIcon, type StatIconKind } from "../components/StatIcon";
import { DiceCube3D } from "../components/DiceCube3D";
import { UserMenuIcon } from "../components/UserMenuIcon";
import {
  TABLE_CARD_MODAL_DELAY_MS,
  TABLE_BOARD_MODAL_KEYFRAMES_CSS,
  TABLE_BOARD_MODAL_OVERLAY_ANIMATION,
  TABLE_BOARD_OVERLAY_BG,
  TABLE_BOSS_FINALE_OVERLAY_BG,
} from "../components/table/tableConstants";
import bossFinaleExitStyles from "../components/play/bossFinaleExit.module.css";
import { bossFinaleExitCssVars } from "../lib/bossFinaleTiming";
import { useBossFinaleExit } from "../lib/useBossFinaleExit";
import { PLAYER_MARKER_TOKEN_W } from "../lib/playerMarkerSvg";
import { PlayerAvatarStack } from "../components/PlayerAvatarStack";
import u from "../styles/uiPrimitives.module.css";
import tableStyles from "./TableView.module.css";
import { readLobbyConfigDraft } from "../lib/lobbyConfigDraft";

/** Publika tillgångar under apps/web/public/backgrounds/ — nyckel = våningsindex (0 = nivå 1). */
const TABLE_LEVEL_BACKGROUNDS: Record<number, string> = {
  0: "/backgrounds/level1bg.webp",
  1: "/backgrounds/level2bg.webp",
  2: "/backgrounds/level3bg.webp",
  3: "/backgrounds/level4bg.webp",
  4: "/backgrounds/level5bg.webp",
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

/** Pilens övre-vänstra hörn i pjäsens lokala koordinater (0,0)–(tw,th); pilen placeras utanför pjäsen i pilens pekriktning. */
function boardMoveArrowTopLeft(
  dir: MoveChoiceCardinalArrow,
  tw: number,
  th: number,
  s: number,
  gap: number,
): { x: number; y: number } {
  const cx = tw / 2;
  const cy = th / 2;
  switch (dir) {
    case "up":
      return { x: cx - s / 2, y: -gap - s };
    case "down":
      return { x: cx - s / 2, y: th + gap };
    case "left":
      return { x: -gap - s, y: cy - s / 2 };
    case "right":
      return { x: tw + gap, y: cy - s / 2 };
  }
}

/** Liten fram-och-tillbaka-rörelse längs vektorn från pjäsens centrum till pilens centrum. */
function boardMoveArrowWobblePos(
  base: { x: number; y: number },
  tw: number,
  th: number,
  s: number,
  nowMs: number,
): { x: number; y: number } {
  const cx = tw / 2;
  const cy = th / 2;
  const ax = base.x + s / 2;
  const ay = base.y + s / 2;
  let vx = ax - cx;
  let vy = ay - cy;
  const len = Math.hypot(vx, vy) || 1;
  vx /= len;
  vy /= len;
  const phase = ((nowMs % 1200) / 1200) * 2 * Math.PI;
  const amt = Math.sin(phase) * Math.min(6, s * 0.25);
  return { x: base.x + vx * amt, y: base.y + vy * amt };
}

/** Min höjd på tur-banner — används för padding så brädet inte döljs under bannern. */
const TABLE_TURN_BANNER_RESERVE_PX = 92;
/** Extra utrymme när statusrad (t.ex. sömn) visas under namnet */
const TABLE_TURN_BANNER_RESERVE_WITH_STATUS_PX = 116;
/** Vertikalt lyft (enkel + solfjäder); något lägre så den inte tar för mycket fokus. */
const TABLE_ITEM_PLAY_LIFT_PX = 34;
const TABLE_TOAST_TTL_MS = 8000;
const TABLE_TOAST_EXIT_MS = 320;
const TABLE_TOAST_MAX_VISIBLE = 5;
const TABLE_ROLL_EVENT_CARD_IDS = new Set([
  "event_pantad",
  "event_dubbelinget",
  "event_happyhour",
  "event_rotasoptunna",
  "event_fastnatipant",
  "event_snurraflaskan",
  "event_fastnatikylen",
]);

type TableToast = {
  id: string;
  text: string;
  category: TableToastCategory;
  iconKinds: StatIconKind[];
  createdAt: number;
  expiresAt: number;
  leaving?: boolean;
};
type PendingCard = Extract<NonNullable<GameState["pending"]>, { type: "card" }>;
type MoveAnim = {
  fromLevelIndex: number;
  fromTileIndex: number;
  toLevelIndex: number;
  toTileIndex: number;
  dir?: "cw" | "ccw";
  durationMs: number;
  startedAt: number;
  key: string;
};

function ringPathIndices(fromTileIndex: number, toTileIndex: number, ringTileCount: number, dir?: "cw" | "ccw"): number[] {
  const n = Math.max(1, ringTileCount);
  const from = ((fromTileIndex % n) + n) % n;
  const to = ((toTileIndex % n) + n) % n;
  if (from === to) return [from];
  const cwSteps = (to - from + n) % n;
  const ccwSteps = (from - to + n) % n;
  const useCw = dir ? dir === "cw" : cwSteps <= ccwSteps;
  const steps = useCw ? cwSteps : ccwSteps;
  const delta = useCw ? 1 : -1;
  const out: number[] = [from];
  for (let i = 1; i <= steps; i++) out.push(((from + i * delta) % n + n) % n);
  return out;
}

/** Ikoner i ordning: klunk → pant → hp (en rad per toast). */
function tableToastIconKinds(message: string, category: TableToastCategory): StatIconKind[] {
  const m = message.toLowerCase();
  if (category === "vaska") {
    return ["attack"];
  }
  if (category === "reward") {
    if (m.includes("skatt")) return ["attack"];
    return ["pant"];
  }
  let klunk = false;
  let pant = false;
  let hp = false;
  if (category === "sip") {
    klunk = true;
  } else {
    if (
      m.includes("straffklunk") ||
      m.includes("+1 klunk") ||
      (m.includes("klunk") && (m.includes("ger ") || m.includes("får ")))
    ) {
      klunk = true;
    }
    if (
      m.includes(" pant") ||
      m.includes("pant från") ||
      m.includes("pant i") ||
      m.includes("pant.") ||
      /\d+\s+pant\b/.test(m)
    ) {
      pant = true;
    }
    if (m.includes("skada")) {
      hp = true;
    }
    if (!klunk && !pant && !hp) {
      pant = true;
    }
  }
  const out: StatIconKind[] = [];
  if (klunk) out.push("klunk");
  if (pant) out.push("pant");
  if (hp) out.push("hp");
  return out;
}

function isMonsterEncounterSkipToast(message: string): boolean {
  const m = message.toLowerCase();
  if (m.includes("undviker batchmötet")) return true;
  if (m.includes("mutar sig ur batchmötet") || m.includes("mutar sig ur")) return true;
  if (m.includes("skippar den dåliga batchen")) return true;
  if (m.includes("skippar monstr") || m.includes("skippar monstret")) return true;
  return m.includes("vaska") && m.includes("skippar");
}

function classifyTableToastMessage(message: string): TableToastCategory | null {
  const m = message.toLowerCase();
  /** Vaska, Mutor, Mantel — undvik batchmöte (loggrad på brädet). */
  if (isMonsterEncounterSkipToast(m)) {
    return "vaska";
  }
  const isSip =
    m.includes("straffklunk") ||
    (m.includes(" klunk") && (m.includes("ger ") || m.includes("dricker") || m.includes("får ")));
  if (isSip) return "sip";
  const isPvpLoot =
    m.includes("efter duellen") ||
    m.includes(" i pvp") ||
    m.includes(" tar ") ||
    m.includes(" takes ") ||
    m.includes(" tog ") ||
    m.includes("pant från");
  if (isPvpLoot) return "pvp";
  return null;
}
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
function TablePreGameLobbyPlayerRow(props: {
  p: TableLobbyPlayer;
  kickEnabled: boolean;
  onKickPlayer: (playerId: string, displayName: string) => void;
}) {
  const { p, kickEnabled, onKickPlayer } = props;
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
      <button
        type="button"
        className={tableStyles.tableKickButton}
        disabled={!kickEnabled}
        title={sv.table.tableKickPlayer}
        aria-label={sv.table.tableKickPlayerAria(p.name)}
        onClick={() => onKickPlayer(p.id, p.name)}
      >
        {sv.table.tableKickPlayerButton}
      </button>
    </div>
  );
}

function TableLobbyPlayerRow(props: {
  p: TableLobbyPlayer;
  kickEnabled: boolean;
  onKickPlayer: (playerId: string, displayName: string) => void;
}) {
  const { p, kickEnabled, onKickPlayer } = props;
  const afflictions = tablePlayerAfflictionLines(p);
  const weaponName = p.equipment.weapon?.name ?? "—";
  const armorName = p.equipment.armor?.name ?? "—";
  const helmetName = p.equipment.helmet?.name ?? "—";
  const accessoryName = p.equipment.accessory?.name ?? "—";
  const dotStyle = { "--player-color": p.color } as CSSProperties;
  return (
    <div className={tableStyles.lobbyCard}>
      <div className={`${u.flexSpaceBetweenGap10} ${tableStyles.lobbyRowTop}`}>
        <div className={`${tableStyles.lobbyNameCluster} ${tableStyles.lobbyNameClusterGrow}`}>
          <span aria-hidden className={tableStyles.playerColorDot12} style={dotStyle} />
          <span>
            {p.name}
            {p.isHost ? " (värd)" : ""}
          </span>
          <span aria-label={p.ready ? sv.play.ready : sv.play.unready}>
            {p.ready ? "✅" : "⛔"}
          </span>
        </div>
        <button
          type="button"
          className={tableStyles.tableKickButton}
          disabled={!kickEnabled}
          title={sv.table.tableKickPlayer}
          aria-label={sv.table.tableKickPlayerAria(p.name)}
          onClick={() => onKickPlayer(p.id, p.name)}
        >
          {sv.table.tableKickPlayerButton}
        </button>
      </div>
      <div
        className={`${u.inlineFlexGap12WrapEnd} ${tableStyles.lobbyStatsRow}`}
        aria-label={sv.play.statsLine(p.hp, p.maxHp, playerPant(p), p.klunkar)}
      >
        <PlayerVitals hp={p.hp} maxHp={p.maxHp} pant={playerPant(p)} klunkar={p.klunkar} iconSize={18} />
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

function PlayerVitals(props: {
  hp: number;
  maxHp: number;
  pant: number;
  klunkar: number;
  iconSize: number;
  /** Samma level-ring som mobil (`LevelRingCell`). */
  brewerRing?: { level: number; ratio: number };
}) {
  return (
    <div className={tableStyles.playerVitalsRow}>
      <span className={tableStyles.playerVitalsItem}>
        <StatIcon kind="hp" size={props.iconSize} />
        {props.hp}/{props.maxHp}
      </span>
      <span className={tableStyles.playerVitalsItem}>
        <StatIcon kind="pant" size={props.iconSize} />
        {props.pant}
      </span>
      <span className={tableStyles.playerVitalsItem}>
        <StatIcon kind="klunk" size={props.iconSize} />
        {props.klunkar}
      </span>
      {props.brewerRing ? (
        <span className={`${tableStyles.playerVitalsItem} ${tableStyles.playerVitalsLevelRingWrap}`}>
          <LevelRingCell
            ariaLabel={sv.play.levelUpProgressAria(props.brewerRing.level)}
            level={props.brewerRing.level}
            ratio={props.brewerRing.ratio}
            size="compact"
          />
        </span>
      ) : null}
    </div>
  );
}

export function TableView() {
  return (
    <TablePresentationScaleProvider>
      <TableViewBody />
    </TablePresentationScaleProvider>
  );
}

function useTableToasts(state: GameState | null, playersById: Map<string, Player>) {
  const [tableToasts, setTableToasts] = useState<TableToast[]>([]);
  const toastLogSeqRef = useRef<number | null>(null);
  const toastInitRef = useRef(false);
  const rewardToastKeyRef = useRef<string | null>(null);
  const prevSipNoticeKeysRef = useRef<Set<string>>(new Set());
  const eventSipToastKeyRef = useRef<string | null>(null);
  const prevBrewerLevelsRef = useRef<Map<string, number> | null>(null);

  useEffect(() => {
    if (!state) {
      toastInitRef.current = false;
      toastLogSeqRef.current = null;
      rewardToastKeyRef.current = null;
      prevSipNoticeKeysRef.current = new Set();
      eventSipToastKeyRef.current = null;
      prevBrewerLevelsRef.current = null;
      setTableToasts([]);
      return;
    }
    const logs = state.log ?? [];
    const seq = state.logSeq ?? logs.length;
    const prevSeq = toastLogSeqRef.current;
    if (!toastInitRef.current || prevSeq == null) {
      toastInitRef.current = true;
      toastLogSeqRef.current = seq;
      return;
    }
    if (seq < prevSeq) {
      toastLogSeqRef.current = seq;
      return;
    }
    const delta = seq - prevSeq;
    if (delta <= 0) return;
    const start = Math.max(0, logs.length - delta);
    const now = Date.now();
    const incoming: TableToast[] = [];
    for (let i = start; i < logs.length; i++) {
      const entry = logs[i];
      if (!entry?.message) continue;
      const category = classifyTableToastMessage(entry.message);
      if (!category) continue;
      incoming.push({
        id: `${seq}-${i}-${entry.at}`,
        text: entry.message,
        category,
        iconKinds: tableToastIconKinds(entry.message, category),
        createdAt: now,
        expiresAt: now + TABLE_TOAST_TTL_MS,
      });
    }
    if (incoming.length > 0) {
      setTableToasts((prev) => [...prev, ...incoming].slice(-TABLE_TOAST_MAX_VISIBLE));
    }
    toastLogSeqRef.current = seq;
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const sipNotices = state.sipNotices ?? [];
    const currentKeys = new Set<string>();
    const occurrence = new Map<string, number>();
    const incoming: TableToast[] = [];
    const now = Date.now();
    for (const n of sipNotices) {
      const base = `${n.recipientId}|${n.fromPlayerName}|${n.klunkCount ?? 1}|${n.title ?? ""}|${n.body ?? ""}|${n.noticeKind ?? "custom"}`;
      const idx = occurrence.get(base) ?? 0;
      occurrence.set(base, idx + 1);
      const key = `${base}#${idx}`;
      currentKeys.add(key);
      if (prevSipNoticeKeysRef.current.has(key)) continue;
      /** Mobil-modalbesked (t.ex. duell-förlust): ingen klunkCount — ska inte bli "straffklunk" på brädet (loggen har redan / är korrekt). */
      if (n.title || n.body || n.noticeKind != null) continue;
      const recipientName = playersById.get(n.recipientId)?.name ?? "Spelare";
      const count = Math.max(1, Math.floor(n.klunkCount ?? 1));
      incoming.push({
        id: `sipnotice:${key}`,
        text: `${recipientName} får ${count} straffklunk${count === 1 ? "" : "ar"}.`,
        category: "sip",
        iconKinds: ["klunk"],
        createdAt: now,
        expiresAt: now + TABLE_TOAST_TTL_MS,
      });
    }
    prevSipNoticeKeysRef.current = currentKeys;
    if (incoming.length > 0) {
      setTableToasts((prev) => [...prev, ...incoming].slice(-TABLE_TOAST_MAX_VISIBLE));
    }
  }, [state, playersById]);

  useEffect(() => {
    if (!state || state.phase !== "playing") {
      prevBrewerLevelsRef.current = null;
      return;
    }
    const currLevels = new Map<string, number>();
    for (const p of state.players) {
      currLevels.set(p.id, brewerDisplayLevel(p));
    }
    const prev = prevBrewerLevelsRef.current;
    prevBrewerLevelsRef.current = currLevels;
    if (!prev) return;
    const now = Date.now();
    const leveled = state.players
      .map((p) => ({
        player: p,
        prev: prev.get(p.id) ?? brewerDisplayLevel(p),
        curr: currLevels.get(p.id) ?? brewerDisplayLevel(p),
      }))
      .filter((x) => x.curr > x.prev);
    if (leveled.length === 0) return;
    const incoming: TableToast[] = leveled.map((x, idx) => ({
      id: `levelup:${x.player.id}:${x.curr}:${now}:${idx}`,
      text: `${x.player.name} når bryggnivå ${x.curr}!`,
      category: "reward",
      iconKinds: ["xp"],
      createdAt: now,
      expiresAt: now + TABLE_TOAST_TTL_MS,
    }));
    setTableToasts((prevToasts) => [...prevToasts, ...incoming].slice(-TABLE_TOAST_MAX_VISIBLE));
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const p = state.pending;
    if (p?.type !== "card" || p.kind !== "event") return;
    const outcomes = eventCardOutcomeToasts(p, playersById);
    if (outcomes.length === 0) return;
    const key = `${p.playerId}|${p.cardId}|${p.text}`;
    if (eventSipToastKeyRef.current === key) return;
    eventSipToastKeyRef.current = key;
    const now = Date.now();
    const incoming: TableToast[] = outcomes.map((outcome, idx) => ({
      id: `eventsip:${key}:${idx}`,
      text: outcome.text,
      category: outcome.category,
      iconKinds: outcome.iconKinds,
      createdAt: now,
      expiresAt: now + TABLE_TOAST_TTL_MS,
    }));
    setTableToasts((prev) => [...prev, ...incoming].slice(-TABLE_TOAST_MAX_VISIBLE));
  }, [state, playersById]);

  useEffect(() => {
    if (!state) return;
    const p = state.pending;
    if (p?.type !== "card" || p.cardId !== "combat_win" || !p.combatWin) return;
    const key = `${p.playerId}:${p.cardId}:${p.combatWin.enemyName}:${p.combatWin.rollTotal}:${p.combatWin.rewardGold}:${p.combatWin.rewardItems}`;
    if (rewardToastKeyRef.current === key) return;
    rewardToastKeyRef.current = key;
    const now = Date.now();
    const rewardRecipients = p.combatWin.teammateName
      ? `${p.combatWin.winnerName} och ${p.combatWin.teammateName}`
      : p.combatWin.winnerName;
    const incoming: TableToast[] = [];
    if ((p.combatWin.rewardGold ?? 0) > 0) {
      incoming.push({
        id: `${key}:reward-gold`,
        text: `Belöning till ${rewardRecipients}: +${p.combatWin.rewardGold} pant`,
        category: "reward",
        iconKinds: ["pant"],
        createdAt: now,
        expiresAt: now + TABLE_TOAST_TTL_MS,
      });
    }
    if ((p.combatWin.rewardItems ?? 0) > 0) {
      incoming.push({
        id: `${key}:reward-items`,
        text: `Belöning till ${rewardRecipients}: ${p.combatWin.rewardItems} ${p.combatWin.rewardItems === 1 ? "skatt" : "skatter"}`,
        category: "reward",
        iconKinds: ["attack"],
        createdAt: now,
        expiresAt: now + TABLE_TOAST_TTL_MS,
      });
    }
    const helpMateId = p.combatWin.helpMatePlayerId;
    const helpMateTitles = p.combatWin.helpMateGrantedRewardTitles ?? [];
    if (helpMateId && helpMateTitles.length > 0) {
      const helpMateName = playersById.get(helpMateId)?.name ?? "Hjälparen";
      incoming.push({
        id: `${key}:help-mate-loot`,
        text: `Belöning till ${helpMateName}: ${helpMateTitles.join(", ")}`,
        category: "reward",
        iconKinds: ["attack"],
        createdAt: now,
        expiresAt: now + TABLE_TOAST_TTL_MS,
      });
    }
    if (incoming.length > 0) {
      setTableToasts((prev) => [...prev, ...incoming].slice(-TABLE_TOAST_MAX_VISIBLE));
    }
  }, [state]);

  useEffect(() => {
    if (tableToasts.length === 0) return;
    const t = window.setInterval(() => {
      const now = Date.now();
      setTableToasts((prev) => {
        let changed = false;
        const flagged = prev.map((toast) => {
          if (!toast.leaving && now >= toast.expiresAt) {
            changed = true;
            return { ...toast, leaving: true };
          }
          return toast;
        });
        const kept = flagged.filter((toast) => !(toast.leaving && now >= toast.expiresAt + TABLE_TOAST_EXIT_MS));
        if (kept.length !== flagged.length) changed = true;
        return changed ? kept : prev;
      });
    }, 120);
    return () => window.clearInterval(t);
  }, [tableToasts]);

  return tableToasts;
}

function TableViewBody() {
  const MOVE_TOKEN_ANIM_MS = 1_500;
  const navigate = useNavigate();
  const overlayContentScale = useTableOverlayContentScale();
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
  const [tableSettingsOpen, setTableSettingsOpen] = useState(false);
  const [boardPerf, setBoardPerf] = useState(() => readBoardPerformancePrefs());
  const [showTileTypeLabels, setShowTileTypeLabels] = useState(false);
  /** Sidopanel: spelhändelselogg dold tills användaren slår på den. */
  const [showSidebarLog, setShowSidebarLog] = useState(false);

  const {
    stackLevels,
    playersById,
    playersByTileKey,
    tileSize,
    targetRingOutset,
    gridSize,
    ringCols,
    ringRows,
    boardPad,
    boardWidth,
    boardHeight,
    ringStackGap: RING_STACK_GAP,
    totalSvgWidth,
    totalSvgHeight,
    floorLitOnTable,
    ringOffsetX,
  } = useTableBoardViewModel(state);

  /** Senaste monster-rollPreview (klon) — används när `pending` blivit combat_win/lose så samma kort/DOM kan fortsätta. */
  const lastMonsterRollPreviewSnapshotRef = useRef<GameState | null>(null);

  useLayoutEffect(() => {
    if (!state) return;
    const p = state.pending;
    if (p?.type === "combat" && p.phase === "rollPreview" && p.monsterId !== "boss") {
      lastMonsterRollPreviewSnapshotRef.current = JSON.parse(JSON.stringify(state)) as GameState;
    }
  }, [state]);

  const tableCombatOutcomeCardPending = (() => {
    const p = state?.pending;
    if (p?.type !== "card") return null;
    if (p.cardId !== "combat_win" && p.cardId !== "combat_lose") return null;
    return p;
  })();

  useEffect(() => {
    if (!tableCombatOutcomeCardPending) {
      lastMonsterRollPreviewSnapshotRef.current = null;
    }
  }, [tableCombatOutcomeCardPending]);

  const logRef = useRef<HTMLDivElement | null>(null);
  const tableCameraParams = useMemo(
    () => ({
      state,
      boardWidth,
      boardHeight,
      totalSvgWidth,
      ringStackGap: RING_STACK_GAP,
      gridSize,
      ringCols,
      ringRows,
      tileSize,
      boardPad,
      targetRingOutset,
      boardPanEnabled: boardPerf.boardPanEnabled,
    }),
    [
      state,
      boardWidth,
      boardHeight,
      totalSvgWidth,
      gridSize,
      ringCols,
      ringRows,
      tileSize,
      boardPad,
      targetRingOutset,
      boardPerf.boardPanEnabled,
    ],
  );

  const draftConfigForRoom = useMemo(() => readLobbyConfigDraft(room), [room]);
  const tableConfig = useMemo(
    () => ({ gameMode: "bossKill" as const, ...(draftConfigForRoom ?? {}) }),
    [draftConfigForRoom],
  );

  const { status, reconnectAttemptN, overlayPhase, requestReconnect, showReconnectOverlay, clientRef } =
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
        if (m.type === "stateDelta") {
          setState((prev) => mergeGameStateDelta(prev, m.patch));
          setErr(null);
        }
      },
    });

  const kickPlayerFromTable = useCallback((playerId: string, displayName: string) => {
    if (!window.confirm(sv.table.tableKickConfirm(displayName))) return;
    clientRef.current?.send({ type: "action", action: { type: "tableKickPlayer", targetPlayerId: playerId } });
  }, [clientRef]);

  const tableKickEnabled = status === "connected";
  useEffect(() => {
    if (status === "connected" || status === "connecting") setErr(null);
  }, [status]);

  /** Saknade våningar mitt i match → hämta full snapshot (partial delta räcker inte). */
  useEffect(() => {
    if (status !== "connected") return;
    if (state?.phase !== "playing") return;
    if (state.levels?.length) return;
    requestReconnect();
  }, [status, state?.phase, state?.levels?.length, requestReconnect]);

  useEffect(() => subscribeBoardPerformancePrefs(() => setBoardPerf(readBoardPerformancePrefs())), []);

  useEffect(() => {
    if (!tableSettingsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTableSettingsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tableSettingsOpen]);

  const shouldHoldWakeLock =
    boardPerf.preventSleepEnabled || (state?.phase === "lobby" && state.config.wakeLockBeforeStart === true);
  const wakeLockAvailable = useScreenWakeLock(shouldHoldWakeLock);

  // Håll loggen i botten när nya rader kommer eller när loggen visas i sidopanelen.
  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [state?.log?.length, showSidebarLog]);

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
  const pendingCard: PendingCard | null = state?.pending?.type === "card" ? state.pending : null;
  const isBossFinalWinCard = pendingCard?.cardId === "boss_final_win";
  const bossFinaleExit = useBossFinaleExit({
    active: isBossFinalWinCard,
    ready: tableCardModalReady,
    resetKey: tableCardPendingKey,
    exitTriggered: (state?.bossFinaleExitStartedAt ?? null) != null,
  });
  const showTableRollEventCard =
    !!pendingCard &&
    pendingCard.kind === "event" &&
    isEventStoryCardPending(pendingCard) &&
    TABLE_ROLL_EVENT_CARD_IDS.has(pendingCard.cardId);

  const tableCombatSessionKey =
    state?.pending?.type === "combat"
      ? `${state.pending.attackerId}-${state.pending.levelIndex}-${state.pending.tileIndex}-${state.pending.monsterId}`
      : null;

  const monsterResultHoldover =
    tableCombatOutcomeCardPending && lastMonsterRollPreviewSnapshotRef.current
      ? {
          preAck: lastMonsterRollPreviewSnapshotRef.current,
          outcomeCard: tableCombatOutcomeCardPending,
        }
      : null;

  const showMonsterCombatOutcomeOnCard = monsterResultHoldover != null;

  const holdoverCombatMonsterId =
    monsterResultHoldover?.preAck.pending?.type === "combat"
      ? monsterResultHoldover.preAck.pending.monsterId
      : null;

  /** Håll flammor kvar mellan kortsteg även om `pending` byter typ ett ögonblick. */
  const bossTableBackdropLatchRef = useRef(false);
  useEffect(() => {
    if (!state || state.phase === "ended" || !isFinalBossSessionActive(state)) {
      bossTableBackdropLatchRef.current = false;
      return;
    }
    if (shouldShowFinalBossCombatBackdrop(state, holdoverCombatMonsterId)) {
      bossTableBackdropLatchRef.current = true;
    }
  }, [state, holdoverCombatMonsterId]);

  const finalBossTableBackdropActive = useMemo(() => {
    if (!isFinalBossSessionActive(state)) return false;
    if (shouldShowFinalBossCombatBackdrop(state, holdoverCombatMonsterId)) return true;
    return bossTableBackdropLatchRef.current;
  }, [state, holdoverCombatMonsterId]);

  /** Behåll samma videoinstans under hela striden (inkl. boss_round_win mellan rundor). */
  const tableBossBackdropSessionKey = useMemo(
    () => finalBossCombatBackdropSessionKey(state, tableCombatSessionKey, holdoverCombatMonsterId),
    [state, tableCombatSessionKey, holdoverCombatMonsterId],
  );

  const baseShowTableCombatBoardPanel = state?.pending?.type === "combat" || showMonsterCombatOutcomeOnCard;

  const moveTargets = useMemo(() => {
    if (state?.pending?.type !== "moveChoice") return null;
    return new Set(state.pending.options.map((o) => `${o.target.levelIndex}-${o.target.tileIndex}`));
  }, [state?.pending]);

  /** Samma läge som när `rollMove` får köras: ingen annan pending, aktiv spelare kan röra sig. */
  const highlightRollMoveOrigin = useMemo(() => {
    if (state?.phase !== "playing") return false;
    if (state.pending != null) return false;
    const off = state.offTurnPersonalPending;
    if (
      cur &&
      off &&
      off.playerId === cur.id &&
      (off.type === "brewerPerkChoice" || off.type === "levelUpOffer")
    ) {
      return false;
    }
    if (cur && (cur.pendingBrewerPerkLevels ?? 0) > 0) return false;
    if (!cur || cur.eliminated) return false;
    if (cur.hp <= 0) return false;
    return true;
  }, [state?.phase, state?.pending, state?.offTurnPersonalPending, cur]);

  const playingTurn = state?.phase === "playing" && cur;
  const pendingMoveChoice = state?.pending?.type === "moveChoice" ? state.pending : null;
  /** Samma pilhintar som mobil PlayView — visas vid pjäsen efter rörelseslag. */
  const boardMoveChoiceArrows = useMemo(() => {
    if (!state || !pendingMoveChoice) return null;
    const moveRingN = state.levels[pendingMoveChoice.from.levelIndex]?.tiles.length ?? 0;
    const cwOpt = pendingMoveChoice.options.find((o) => o.dir === "cw");
    const ccwOpt = pendingMoveChoice.options.find((o) => o.dir === "ccw");
    const swapMoveChoiceColumns =
      Boolean(cwOpt && ccwOpt) && isRingTopEdgeTile(pendingMoveChoice.from.tileIndex, moveRingN);
    const hints =
      moveRingN > 0 && cwOpt && ccwOpt
        ? moveChoiceDirectionHints({
            fromTileIndex: pendingMoveChoice.from.tileIndex,
            cwLandingTileIndex: cwOpt.target.tileIndex,
            ccwLandingTileIndex: ccwOpt.target.tileIndex,
            ringTileCount: moveRingN,
          })
        : null;
    if (!hints) return null;
    const arrowLeft = swapMoveChoiceColumns ? hints.ccw.besideDice : hints.cw.besideDice;
    const arrowRight = swapMoveChoiceColumns ? hints.cw.besideDice : hints.ccw.besideDice;
    return {
      playerId: pendingMoveChoice.playerId,
      levelIndex: pendingMoveChoice.from.levelIndex,
      tileIndex: pendingMoveChoice.from.tileIndex,
      arrowLeft,
      arrowRight,
    };
  }, [state, pendingMoveChoice]);
  const showMoveTurnCornerHud = !!cur && (highlightRollMoveOrigin || pendingMoveChoice?.playerId === cur.id);
  const moveTurnCornerLabel =
    cur && showMoveTurnCornerHud ? `${cur.name}${cur.name.endsWith("s") ? "" : "s"} tur` : "";
  const centerTurnReminderText = cur ? `${cur.name}${cur.name.endsWith("s") ? "" : "s"} tur` : "";
  const currentTurnAfflictions = cur ? tablePlayerAfflictionLines(cur) : [];
  const boardPlayers = state?.players ?? [];
  const [emoteDisplayTick, setEmoteDisplayTick] = useState(0);
  const hasActiveTurnBannerBursts = useMemo(() => {
    const now = Date.now();
    return (
      prunePlayerEmoteBursts(state?.playerEmoteBursts ?? [], now).length > 0 ||
      prunePlayerKlunkBursts(state?.playerKlunkBursts ?? [], now).length > 0
    );
  }, [state?.playerEmoteBursts, state?.playerKlunkBursts, emoteDisplayTick]);
  useEffect(() => {
    if (!hasActiveTurnBannerBursts) return;
    const id = window.setInterval(() => setEmoteDisplayTick((n) => n + 1), 200);
    return () => window.clearInterval(id);
  }, [hasActiveTurnBannerBursts]);
  const turnBannerFanWrapRef = useRef<HTMLDivElement | null>(null);
  const turnBannerColorBarRef = useRef<HTMLDivElement | null>(null);
  const turnPlayersScrollerRef = useRef<HTMLDivElement | null>(null);
  const turnPlayerCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const activeTurnPlayerCardRef = useRef<HTMLDivElement | null>(null);
  const prevTurnPlayerIdRef = useRef<string | null>(null);
  const prevPlayerTilesRef = useRef<Map<string, { levelIndex: number; tileIndex: number }>>(new Map());
  const [moveAnimByPlayer, setMoveAnimByPlayer] = useState<Map<string, MoveAnim>>(new Map());
  const pendingMoveChoiceByPlayerRef = useRef<Map<string, Map<string, "cw" | "ccw">>>(new Map());
  const [turnBannerHandoff, setTurnBannerHandoff] = useState(false);
  const [showCenterTurnReminder, setShowCenterTurnReminder] = useState(false);
  const [moveTurnHudExit, setMoveTurnHudExit] = useState<{ id: string; label: string } | null>(null);
  const prevShowMoveTurnHudRef = useRef(false);
  const lastShownMoveHudRef = useRef<{ id: string; label: string } | null>(null);
  useEffect(() => {
    if (cur && showMoveTurnCornerHud) {
      lastShownMoveHudRef.current = {
        id: cur.id,
        label: `${cur.name}${cur.name.endsWith("s") ? "" : "s"} tur`,
      };
    }
    const prevVisible = prevShowMoveTurnHudRef.current;
    if (prevVisible && !showMoveTurnCornerHud) {
      const last = lastShownMoveHudRef.current;
      if (last) {
        setMoveTurnHudExit(last);
        window.setTimeout(() => {
          setMoveTurnHudExit((v) => (v?.id === last.id ? null : v));
        }, 380);
      }
    }
    prevShowMoveTurnHudRef.current = showMoveTurnCornerHud;
  }, [cur, showMoveTurnCornerHud]);
  const [animNowMs, setAnimNowMs] = useState(0);
  useEffect(() => {
    if (state?.pending?.type !== "moveChoice") return;
    const byTarget = new Map<string, "cw" | "ccw">();
    for (const o of state.pending.options) {
      byTarget.set(`${o.target.levelIndex}-${o.target.tileIndex}`, o.dir);
    }
    pendingMoveChoiceByPlayerRef.current.set(state.pending.playerId, byTarget);
  }, [state?.pending]);
  useEffect(() => {
    const prev = prevPlayerTilesRef.current;
    const next = new Map<string, { levelIndex: number; tileIndex: number }>();
    const now = Date.now();
    const detectedMoves: Array<{
      playerId: string;
      fromLevelIndex: number;
      fromTileIndex: number;
      toLevelIndex: number;
      toTileIndex: number;
    }> = [];
    for (const p of state?.players ?? []) {
      next.set(p.id, { levelIndex: p.levelIndex, tileIndex: p.tileIndex });
      const before = prev.get(p.id);
      if (!before) continue;
      if (before.levelIndex === p.levelIndex && before.tileIndex === p.tileIndex) continue;
      detectedMoves.push({
        playerId: p.id,
        fromLevelIndex: before.levelIndex,
        fromTileIndex: before.tileIndex,
        toLevelIndex: p.levelIndex,
        toTileIndex: p.tileIndex,
      });
    }
    prevPlayerTilesRef.current = next;
    setMoveAnimByPlayer((prevMap) => {
      const nextMap = new Map(prevMap);
      for (const move of detectedMoves) {
        const pendingTargets = pendingMoveChoiceByPlayerRef.current.get(move.playerId);
        const chosenDir = pendingTargets?.get(`${move.toLevelIndex}-${move.toTileIndex}`);
        const sameLevel = move.fromLevelIndex === move.toLevelIndex;
        let durationMs = MOVE_TOKEN_ANIM_MS;
        if (sameLevel) {
          const ringTileCount = state?.levels?.[move.toLevelIndex]?.tiles?.length ?? 0;
          const steps = Math.max(1, ringPathIndices(move.fromTileIndex, move.toTileIndex, ringTileCount, chosenDir).length - 1);
          // Dynamisk fart: längre förflyttning (högre tärning) tar längre tid.
          durationMs = Math.round(clamp(280 + steps * 170, 480, 1_900));
        }
        nextMap.set(move.playerId, {
          fromLevelIndex: move.fromLevelIndex,
          fromTileIndex: move.fromTileIndex,
          toLevelIndex: move.toLevelIndex,
          toTileIndex: move.toTileIndex,
          dir: chosenDir,
          durationMs,
          startedAt: now,
          key: `${move.playerId}-${now}`,
        });
        pendingMoveChoiceByPlayerRef.current.delete(move.playerId);
      }
      // Rensa ut gamla animationer så mappen inte växer.
      for (const [playerId, anim] of nextMap.entries()) {
        if (now - anim.startedAt > anim.durationMs + 800) nextMap.delete(playerId);
      }
      return nextMap;
    });
  }, [state?.players, MOVE_TOKEN_ANIM_MS]);
  useEffect(() => {
    if (moveAnimByPlayer.size === 0) return;
    const t = window.setInterval(() => setAnimNowMs(Date.now()), 16);
    return () => window.clearInterval(t);
  }, [moveAnimByPlayer.size]);
  useEffect(() => {
    // MoveChoice-pilarna behöver egen ticker (det finns ingen token-move animation då).
    if (state?.pending?.type !== "moveChoice") return;
    let raf = 0;
    const tick = () => {
      setAnimNowMs(Date.now());
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [state?.pending?.type]);
  useEffect(() => {
    if (!cur?.id) {
      prevTurnPlayerIdRef.current = null;
      setTurnBannerHandoff(false);
      setMoveTurnHudExit(null);
      return;
    }
    const prev = prevTurnPlayerIdRef.current;
    if (prev !== null && prev !== cur.id) {
      setTurnBannerHandoff(true);
      const t = window.setTimeout(() => setTurnBannerHandoff(false), 720);
      // Vid turbyte: visa endast ny HUD-in-animation (ingen överlappande gammal etikett).
      setMoveTurnHudExit(null);
      prevTurnPlayerIdRef.current = cur.id;
      return () => window.clearTimeout(t);
    }
    prevTurnPlayerIdRef.current = cur.id;
  }, [cur?.id, playersById]);
  useEffect(() => {
    if (!playingTurn || !cur?.id) {
      setShowCenterTurnReminder(false);
      return;
    }
    setShowCenterTurnReminder(false);
    const t = window.setTimeout(() => setShowCenterTurnReminder(true), 20_000);
    return () => window.clearTimeout(t);
  }, [playingTurn, cur?.id]);
  useEffect(() => {
    if (!playingTurn || !cur?.id) return;
    const raf = window.requestAnimationFrame(() => {
      activeTurnPlayerCardRef.current?.scrollIntoView({
        block: "nearest",
        inline: "center",
        behavior: "smooth",
      });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [playingTurn, cur?.id, boardPlayers.length]);
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
  const showTableCombatBoardPanel = baseShowTableCombatBoardPanel || showMonsterCombatOutcomeOnCard;

  const bannerReserveStyle = {
    "--table-banner-reserve": playingTurn ? `${turnBannerBottomReservePx}px` : "0px",
  } as CSSProperties;
  const tableToasts = useTableToasts(state, playersById);

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
            <span className={tableStyles.headerStatusText}>
              {sv.table.status}: {wsStatusLabel(status)}
            </span>
            <div className={tableStyles.headerToolbar}>
              <button
                type="button"
                className={tableStyles.tableHeaderIconBtn}
                aria-label={sv.table.openSettings}
                aria-expanded={tableSettingsOpen}
                onClick={() => setTableSettingsOpen(true)}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                className={tableStyles.tableHeaderIconBtn}
                data-active={sidebarOpen ? "true" : "false"}
                aria-label={sv.play.players}
                title={sv.play.players}
                aria-expanded={sidebarOpen}
                onClick={() => setSidebarOpen((o) => !o)}
              >
                <UserMenuIcon size={26} />
              </button>
            </div>
          </div>
        </header>
      </div>

      <div className={tableStyles.mainRow} style={bannerReserveStyle}>
        <TableBoardCameraViewport
          camera={tableCameraParams}
          boardPanEnabled={boardPerf.boardPanEnabled}
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
}
.bv-move-choice-board-arrow {
  opacity: 0.98;
}
@media (prefers-reduced-motion: reduce) {
  .bv-move-choice-board-arrow { opacity: 1; }
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
                        const { col, row } = ringPosRect(ringCols, ringRows, i);
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
                      <g className={lit ? tableStyles.boardTilesLit : tableStyles.boardTilesDimmed}>
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
                      className={tableStyles.svgLabelStroke}
                    >
                      {sv.table.floorN(li + 1)}
                    </text>
                    <g className={lit ? tableStyles.boardTilesLit : tableStyles.boardTilesDimmed}>
                      {level.tiles.map((t, i) => {
                        const { col, row } = ringPosRect(ringCols, ringRows, i);
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
                                className={tableStyles.svgTileLabelStroke}
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
                        const { col, row } = ringPosRect(ringCols, ringRows, i);
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
                              const tw = PLAYER_MARKER_TOKEN_W;
                              const th = PLAYER_MARKER_TOKEN_W;
                              const anim = moveAnimByPlayer.get(p.id);
                              const animAgeMs = anim ? animNowMs - anim.startedAt : Number.POSITIVE_INFINITY;
                              const animationDurationMs = anim?.durationMs ?? MOVE_TOKEN_ANIM_MS;
                              const shouldAnimateMove =
                                boardPerf.tokenMoveAnimationsEnabled &&
                                state?.pending?.type !== "moveChoice" &&
                                !!anim &&
                                animAgeMs <= animationDurationMs + 500 &&
                                anim.toLevelIndex === li &&
                                anim.toTileIndex === i;

                              // Nuvarande (mål)position i SVG-koordinater
                              const toTx = cx - tw / 2;
                              const toTy = cy - th / 2;

                              // Starta vid föregående ruta om den finns, annars direkt på mål.
                              const rawT = shouldAnimateMove ? Math.max(0, Math.min(1, animAgeMs / animationDurationMs)) : 1;
                              const easedT = rawT * rawT * (3 - 2 * rawT); // smoothstep (ease-in-out)
                              let fromTx = toTx;
                              let fromTy = toTy;
                              if (shouldAnimateMove && anim) {
                                const sameLevel = anim.fromLevelIndex === anim.toLevelIndex && anim.toLevelIndex === li;
                                if (sameLevel) {
                                  const nTiles = stackLevels[li]?.tiles?.length ?? 0;
                                  const pathTiles = ringPathIndices(anim.fromTileIndex, anim.toTileIndex, nTiles, anim.dir);
                                  const pathPoints = pathTiles.map((tileIdx) => {
                                    const rp = ringPosRect(ringCols, ringRows, tileIdx);
                                    const px = boardPad + rp.col * tileSize;
                                    const py = boardPad + rp.row * tileSize;
                                    const pw = tileSize - 12;
                                    const ph = tileSize - 12;
                                    const centerX = px + 6 + pw / 2 + off.dx - tw / 2;
                                    const centerY = py + 6 + ph / 2 + off.dy - th / 2;
                                    return { x: centerX, y: centerY };
                                  });
                                  const segCount = Math.max(1, pathPoints.length - 1);
                                  const segFloat = Math.min(segCount, easedT * segCount);
                                  const segIndex = Math.min(segCount - 1, Math.floor(segFloat));
                                  const segT = Math.max(0, Math.min(1, segFloat - segIndex));
                                  const a = pathPoints[segIndex] ?? pathPoints[0];
                                  const b = pathPoints[segIndex + 1] ?? a;
                                  fromTx = a.x + (b.x - a.x) * segT;
                                  fromTy = a.y + (b.y - a.y) * segT;
                                } else {
                                  const prevRing = ringPosRect(ringCols, ringRows, anim.fromTileIndex);
                                  const prevX = boardPad + prevRing.col * tileSize;
                                  const prevY = boardPad + prevRing.row * tileSize;
                                  const prevW = tileSize - 12;
                                  const prevH = tileSize - 12;
                                  const prevInnerCx = prevX + 6 + prevW / 2;
                                  const prevInnerCy = prevY + 6 + prevH / 2;
                                  const startTx = prevInnerCx + off.dx - tw / 2;
                                  const startTy = prevInnerCy + off.dy - th / 2;
                                  fromTx = startTx + (toTx - startTx) * easedT;
                                  fromTy = startTy + (toTy - startTy) * easedT;
                                }
                              }
                              const curTx = fromTx;
                              const curTy = fromTy;
                              const isActiveBoardPlayer =
                                state?.phase === "playing" && cur?.id === p.id;
                              const showBoardMoveArrows =
                                boardMoveChoiceArrows &&
                                p.id === boardMoveChoiceArrows.playerId &&
                                li === boardMoveChoiceArrows.levelIndex &&
                                i === boardMoveChoiceArrows.tileIndex;
                              const moveArrowS = clamp(Math.round(tileSize * 0.2), 18, 40);
                              const moveArrowSpacing = 40;
                              let moveArrowLeftPos = boardMoveChoiceArrows
                                ? boardMoveArrowTopLeft(
                                    boardMoveChoiceArrows.arrowLeft,
                                    tw,
                                    th,
                                    moveArrowS,
                                    moveArrowSpacing,
                                  )
                                : { x: 0, y: 0 };
                              if (boardMoveChoiceArrows) {
                                moveArrowLeftPos = boardMoveArrowWobblePos(
                                  moveArrowLeftPos,
                                  tw,
                                  th,
                                  moveArrowS,
                                  animNowMs,
                                );
                              }
                              let moveArrowRightPos = boardMoveChoiceArrows
                                ? boardMoveArrowTopLeft(
                                    boardMoveChoiceArrows.arrowRight,
                                    tw,
                                    th,
                                    moveArrowS,
                                    moveArrowSpacing,
                                  )
                                : { x: 0, y: 0 };
                              if (boardMoveChoiceArrows) {
                                moveArrowRightPos = boardMoveArrowWobblePos(
                                  moveArrowRightPos,
                                  tw,
                                  th,
                                  moveArrowS,
                                  animNowMs,
                                );
                              }
                              if (
                                boardMoveChoiceArrows &&
                                Math.abs(moveArrowLeftPos.x - moveArrowRightPos.x) < 2 &&
                                Math.abs(moveArrowLeftPos.y - moveArrowRightPos.y) < 2
                              ) {
                                const d = boardMoveChoiceArrows.arrowRight;
                                const bump = Math.round(moveArrowS * 0.42);
                                if (d === "up" || d === "down") {
                                  moveArrowRightPos = { ...moveArrowRightPos, x: moveArrowRightPos.x + bump };
                                } else {
                                  moveArrowRightPos = { ...moveArrowRightPos, y: moveArrowRightPos.y + bump };
                                }
                              }
                              return (
                                <g
                                  key={p.id}
                                  filter="url(#playerTokenShadow)"
                                >
                                  <foreignObject
                                    x={curTx}
                                    y={curTy}
                                    width={tw}
                                    height={th}
                                    overflow="visible"
                                  >
                                    <div
                                      {...({
                                        xmlns: "http://www.w3.org/1999/xhtml",
                                      } as Record<string, string>)}
                                      style={{
                                        width: tw,
                                        height: th,
                                        pointerEvents: "none",
                                        transform: isActiveBoardPlayer ? "scale(1.5)" : undefined,
                                        transformOrigin: "50% 50%",
                                      }}
                                    >
                                      <PlayerAvatarStack
                                        avatar={p.avatar}
                                        color={p.color}
                                        size="board"
                                        animate={
                                          boardPerf.boardAnimationsEnabled && isActiveBoardPlayer
                                        }
                                      />
                                    </div>
                                  </foreignObject>
                                  {showBoardMoveArrows && boardMoveChoiceArrows ? (
                                    <g transform={`translate(${curTx}, ${curTy})`} pointerEvents="none">
                                      <image
                                        className="bv-move-choice-board-arrow"
                                        href={`/icons/arrow-${boardMoveChoiceArrows.arrowLeft}.svg`}
                                        x={moveArrowLeftPos.x}
                                        y={moveArrowLeftPos.y}
                                        width={moveArrowS}
                                        height={moveArrowS}
                                        aria-hidden={true}
                                      />
                                      <image
                                        className="bv-move-choice-board-arrow"
                                        href={`/icons/arrow-${boardMoveChoiceArrows.arrowRight}.svg`}
                                        x={moveArrowRightPos.x}
                                        y={moveArrowRightPos.y}
                                        width={moveArrowS}
                                        height={moveArrowS}
                                        aria-hidden={true}
                                      />
                                    </g>
                                  ) : null}
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
              <video
                className={tableStyles.lobbyBgVideo}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                aria-hidden
              >
                <source src="/video/beer_bg.webm" type="video/webm" />
                <source src="/video/beer_bg_1280.mp4" type="video/mp4" />
              </video>
              <div className={tableStyles.lobbyBgScrim} aria-hidden />
              <div className={tableStyles.modalCardLobby}>
                <picture>
                  <source srcSet="/icons/bmm-logo-horisontal.avif" type="image/avif" />
                  <source srcSet="/icons/bmm-logo-horisontal.webp" type="image/webp" />
                  <img
                    src="/icons/bmm-logo-horisontal.png"
                    alt="Bryggmästarnas Mästare"
                    draggable={false}
                    className={tableStyles.lobbyLogo}
                  />
                </picture>
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
                      className={tableStyles.lobbyQrCode}
                    />
                  </div>
                  <div className={u.caption12o86Center}>Skanna för att gå med i lobbyn</div>
                </div>
                <div className={u.stack8}>
                  {state.players.map((p) => (
                    <TablePreGameLobbyPlayerRow
                      key={p.id}
                      p={p}
                      kickEnabled={tableKickEnabled}
                      onKickPlayer={kickPlayerFromTable}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : state?.phase === "ended" ? (
            <div role="dialog" aria-label={sv.play.gameOver} className={tableStyles.modalBackdropEnded}>
              <BeerBackdropLayers />
              <div className={tableStyles.modalCardEnded}>
                <h2 className={u.gameOverTitle}>{sv.play.gameOver}</h2>
                <p className={u.gameOverWinnerLine}>
                  {sv.play.winner}: <b>{state.winnerName ?? "—"}</b>
                </p>
                <EndedScoreboardTable variant="table" players={state.players} winnerId={state.winnerId} />
                <EndedSpotlightCarousel players={state.players} />
                <div className={u.mt20w100}>
                  <ArcadeButton variant="pink" fullWidth onClick={() => navigate("/", { replace: true })}>
                    {sv.play.gameOverLeaveToHome}
                  </ArcadeButton>
                </div>
              </div>
            </div>
          ) : null}
          {state?.phase === "playing" && state.pending?.type === "merchant" ? (() => {
            const shopPlayer = playersById.get(state.pending.playerId);
            if (!shopPlayer) return null;
            const animDots = boardPerf.boardAnimationsEnabled;
            return (
              <div
                className={tableStyles.merchantShoppingOverlay}
                aria-live="polite"
                aria-label={sv.table.merchantShoppingAria(shopPlayer.name)}
              >
                <div
                  className={tableStyles.merchantShoppingInner}
                  data-anim-off={animDots ? undefined : "true"}
                >
                  <span>{sv.table.merchantShopping(shopPlayer.name)}</span>
                  {animDots ? (
                    <>
                      <span className={tableStyles.merchantDot} aria-hidden>
                        .
                      </span>
                      <span className={[tableStyles.merchantDot, tableStyles.merchantDot2].join(" ")} aria-hidden>
                        .
                      </span>
                      <span className={[tableStyles.merchantDot, tableStyles.merchantDot3].join(" ")} aria-hidden>
                        .
                      </span>
                    </>
                  ) : (
                    <span aria-hidden>…</span>
                  )}
                </div>
              </div>
            );
          })() : null}
          {moveTurnHudExit ? (
            <div
              key={`turn-hud-exit-${moveTurnHudExit.id}`}
              className={[tableStyles.moveTurnCornerHud, tableStyles.moveTurnCornerHudExit].join(" ")}
              aria-hidden
            >
              <div className={tableStyles.moveTurnCornerDie}>
                <DiceCube3D idleSpin spinning={boardPerf.boardAnimationsEnabled} size={88} />
              </div>
              <div className={tableStyles.moveTurnCornerLabel}>{moveTurnHudExit.label}</div>
            </div>
          ) : null}
          {cur && showMoveTurnCornerHud ? (
            <div
              key={`turn-hud-${cur.id}`}
              className={[
                tableStyles.moveTurnCornerHud,
                tableStyles.moveTurnCornerHudTurnIn,
              ]
                .filter(Boolean)
                .join(" ")}
              aria-live="polite"
            >
              <div className={tableStyles.moveTurnCornerDie}>
                {pendingMoveChoice?.playerId === cur.id ? (
                  <DiceCube3D value={pendingMoveChoice.baseDie} size={88} />
                ) : (
                  <DiceCube3D idleSpin spinning={boardPerf.boardAnimationsEnabled} size={88} />
                )}
              </div>
              <div className={tableStyles.moveTurnCornerLabel}>{moveTurnCornerLabel}</div>
            </div>
          ) : null}
            </>
          }
        />

        {playingTurn && showCenterTurnReminder ? (
          <div className={tableStyles.centerTurnReminder} aria-live="polite">
            <div className={tableStyles.centerTurnReminderText}>{centerTurnReminderText}</div>
          </div>
        ) : null}

        <aside
          className={tableStyles.tableSidebarAside}
          data-open={sidebarOpen ? "true" : "false"}
        >
          <h2 className={tableStyles.sidebarGameTitle}>{sv.table.game}</h2>
          {!state && <div className={tableStyles.waitingLine}>{sv.table.waitingState}</div>}
          {err && <div className={tableStyles.sidebarError}>{err}</div>}

          {state && (
            <>
              <h3>{sv.table.lobbyList}</h3>
              <div className={u.stack8}>
                {state.players.map((p) => (
                  <TableLobbyPlayerRow
                    key={p.id}
                    p={p}
                    kickEnabled={tableKickEnabled}
                    onKickPlayer={kickPlayerFromTable}
                  />
                ))}
              </div>

              <label className={tableStyles.sidebarPanelToggleRow}>
                <input
                  type="checkbox"
                  checked={showSidebarLog}
                  onChange={(e) => setShowSidebarLog(e.target.checked)}
                  aria-label={sv.table.sidebarShowLog}
                />
                <span>{sv.table.sidebarShowLog}</span>
              </label>

              {showSidebarLog ? (
                <>
                  <h3>{sv.table.log}</h3>
                  <div ref={logRef} className={tableStyles.sidebarLog}>
                    {state.log.slice(-30).map((l, i) => (
                      <div key={i} className={tableStyles.sidebarLogLine}>
                        {l.message}
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </>
          )}
        </aside>
      </div>

      {state?.pending?.type === "pvp" && (
        <TablePvpBoardPanel state={state} boardAnimationsEnabled={boardPerf.boardAnimationsEnabled} />
      )}

      <style>{TABLE_BOARD_MODAL_KEYFRAMES_CSS}</style>

      {finalBossTableBackdropActive && tableBossBackdropSessionKey ? (
        <FinalBossCombatBackdrop sessionKey={tableBossBackdropSessionKey} variant="table" />
      ) : null}

      {showTableCombatBoardPanel && state ? (
        <TableCombatBoardPanel
          state={state}
          playersById={playersById}
          boardAnimationsEnabled={boardPerf.boardAnimationsEnabled}
          monsterResultHoldover={monsterResultHoldover}
        />
      ) : null}

      {state?.pending?.type === "brewerDown" && (
        <CardFlipModalShell
          zIndex={48}
          maxWidth={520}
          instantFront
          cardCoverId={state.config.cardCover}
          blockPointerUntilFlipped={false}
          contentScale={overlayContentScale}
          flamesBackdrop
          backdropStyle={{ animation: TABLE_BOARD_MODAL_OVERLAY_ANIMATION }}
          faceInnerClassName={cardFlipShellStyles.faceInnerNoVerticalOverflow}
          style={{
            paddingTop:
              overlayContentScale > 1
                ? "max(84px, calc(env(safe-area-inset-top, 0px) + 56px))"
                : 70,
            background: "transparent",
            animation: TABLE_BOARD_MODAL_OVERLAY_ANIMATION,
          }}
          className={tableStyles.overlayTopCenter}
        >
          {(() => {
            const pr = state.pending;
            if (pr?.type !== "brewerDown") return null;
            const victim = state.players.find((pl) => pl.id === pr.playerId);
            const name = victim?.name ?? "";
            return (
              <div className={tableStyles.brewerDownPanel}>
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
                    src="/icons/gameover.svg"
                    alt=""
                    draggable={false}
                    className={tableStyles.brewerDownSkull}
                  />
                  <div className={tableStyles.brewerDownName}>{name}</div>
                  <div className={tableStyles.brewerDownBody}>
                    {sv.table.brewerDownWaitPhone(name)}
                  </div>
                </CombatSheetFrame>
              </div>
            );
          })()}
        </CardFlipModalShell>
      )}

      {pendingCard && tableCardModalReady && !showMonsterCombatOutcomeOnCard && showTableRollEventCard ? (
        <TableEventRollHeroOverlay
          card={pendingCard}
          contentScale={overlayContentScale}
          boardAnimationsEnabled={boardPerf.boardAnimationsEnabled}
          cardCoverId={state?.config.cardCover}
        />
      ) : null}

      {state?.pending?.type === "card" &&
        tableCardModalReady &&
        !showMonsterCombatOutcomeOnCard &&
        !showTableRollEventCard && (
        <CardFlipModalShell
          zIndex={44}
          maxWidth={720}
          blockPointerUntilFlipped={false}
          simpleEntrance={isBossFinalWinCard}
          cardCoverId={state.config.cardCover}
          contentScale={overlayContentScale}
          bossFlamesBackdrop={
            state.pending.cardId === "boss_round_win" && !finalBossTableBackdropActive
          }
          backdropStyle={
            state.pending.cardId === "boss_round_win" && !finalBossTableBackdropActive
              ? { animation: TABLE_BOARD_MODAL_OVERLAY_ANIMATION }
              : undefined
          }
          faceInnerClassName={cardFlipShellStyles.faceInnerNoVerticalOverflow}
          style={{
            paddingTop:
              overlayContentScale > 1
                ? "max(84px, calc(env(safe-area-inset-top, 0px) + 56px))"
                : 70,
            background:
              state.pending.cardId === "boss_final_win"
                ? TABLE_BOSS_FINALE_OVERLAY_BG
                : state.pending.cardId === "boss_round_win"
                  ? "transparent"
                  : TABLE_BOARD_OVERLAY_BG,
            backgroundRepeat: state.pending.cardId === "boss_final_win" ? "no-repeat" : undefined,
            backgroundSize: state.pending.cardId === "boss_final_win" ? "100% 100%, 100% 100%" : undefined,
            backgroundPosition: state.pending.cardId === "boss_final_win" ? "50% 16%, 50% 50%" : undefined,
            animation:
              state.pending.cardId === "boss_final_win"
                ? TABLE_BOARD_MODAL_OVERLAY_ANIMATION
                : state.pending.cardId === "boss_round_win"
                  ? undefined
                  : TABLE_BOARD_MODAL_OVERLAY_ANIMATION,
          }}
          className={tableStyles.overlayTopCenter}
        >
          {(() => {
            const pCard = state.pending;
            const eventStoryFrame = isEventStoryCardPending(pCard);
            const isTreasureTableModal =
              pCard.kind === "treasure" && !pCard.cardId.startsWith("treasure_item_");
            return (
          <div
            className={[
              bossFinaleExitStyles.wrap,
              bossFinaleExit.exiting && isBossFinalWinCard ? bossFinaleExitStyles.wrapExiting : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={bossFinaleExitCssVars()}
          >
            <div
              className={[
                tableStyles.tableModalFrameBase,
                eventStoryFrame ? tableStyles.tableModalFrameStory : tableStyles.tableModalFrameDefault,
                isTreasureTableModal ? tableStyles.tableModalFrameTreasure : "",
                bossFinaleExit.exiting && isBossFinalWinCard ? bossFinaleExitStyles.cardExit : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <TablePendingCardContent pending={state.pending} viewerName={cardOwner?.name} />
              {!eventStoryFrame && !(bossFinaleExit.exiting && isBossFinalWinCard) ? (
                <div className={tableStyles.pendingWaitingHint}>{sv.table.waitingConfirmPhone}</div>
              ) : null}
            </div>
            {bossFinaleExit.starVisible && isBossFinalWinCard ? (
              <div className={bossFinaleExitStyles.star} aria-hidden />
            ) : null}
          </div>
            );
          })()}
        </CardFlipModalShell>
      )}

      {playingTurn ? (
        <div className={tableStyles.turnBannerDock} aria-live="polite">
          <div className={tableStyles.turnBannerFanWrap} ref={turnBannerFanWrapRef}>
            {showItemPlayFan && state ? (
              <TableCombatReactionFan cards={itemPlayFanCards} liftPx={TABLE_ITEM_PLAY_LIFT_PX} />
            ) : null}
            <div
              ref={turnBannerColorBarRef}
              className={[
                turnBannerStyles.colorBar,
                turnBannerHandoff ? turnBannerStyles.colorBarHandoff : "",
                tableStyles.turnBannerColorBar,
              ]
                .filter(Boolean)
                .join(" ")}
              style={
                {
                  "--turn-banner-min-h": currentTurnAfflictions.length > 0 ? "98px" : "78px",
                } as CSSProperties
              }
            >
            {turnBannerHandoff ? (
              <div className={turnBannerStyles.shineSweep} key={cur?.id ?? "turn"} aria-hidden />
            ) : null}
            {currentTurnAfflictions.length > 0 ? (
              <div className={tableStyles.turnBannerAfflictions}>{currentTurnAfflictions.join(" · ")}</div>
            ) : null}
            <div className={tableStyles.turnPlayersScroller} ref={turnPlayersScrollerRef}>
              {boardPlayers.map((p) => {
                const active = cur?.id === p.id;
                const outOfGame = !isPlayerOnBoard(p);
                const sleepTag = (p.skippedTurns ?? 0) > 0 && p.skipTurnReasons?.includes("normal") ? " (Zzz)" : "";
                const brewerLv = brewerDisplayLevel(p);
                const brewerRatio = brewerKlunkProgressRatio(p.xp ?? 0);
                return (
                  <div
                    key={p.id}
                    className={[
                      tableStyles.turnPlayerCard,
                      active && !outOfGame ? tableStyles.turnBannerActivePlayerCardPulse : "",
                      outOfGame ? tableStyles.turnPlayerCardEliminated : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    ref={(el) => {
                      if (el) turnPlayerCardRefs.current.set(p.id, el);
                      else turnPlayerCardRefs.current.delete(p.id);
                      if (active) activeTurnPlayerCardRef.current = el;
                    }}
                    style={{
                      ["--turn-player-bg" as string]: active && !outOfGame ? p.color : "rgba(255,255,255,0.04)",
                      ["--turn-active-player-color" as string]: p.color,
                    }}
                    title={[p.name, sv.play.levelUpProgressTitle(brewerLv), ...tablePlayerAfflictionLines(p)]
                      .filter(Boolean)
                      .join(" · ")}
                  >
                    <div className={tableStyles.turnPlayerName}>
                      <span className={tableStyles.turnPlayerNameRow}>
                        <span className={tableStyles.turnPlayerAvatarWrap} aria-hidden>
                          <PlayerAvatarStack
                            avatar={p.avatar}
                            color={p.color}
                            size="board"
                            animate={false}
                          />
                        </span>
                        {outOfGame ? (
                          <img
                            src="/icons/skull-icon.svg"
                            alt=""
                            aria-hidden
                            width={18}
                            height={18}
                            className={tableStyles.turnPlayerSkull}
                          />
                        ) : null}
                        <span>
                          {p.name}
                          {sleepTag}
                        </span>
                      </span>
                    </div>
                    <div className={tableStyles.turnPlayerVitals}>
                      <PlayerVitals
                        hp={p.hp}
                        maxHp={p.maxHp}
                        pant={playerPant(p)}
                        klunkar={p.klunkar}
                        iconSize={22}
                        brewerRing={{ level: brewerLv, ratio: brewerRatio }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <TurnBannerEmoteOverlay
            players={boardPlayers}
            emoteBursts={state?.playerEmoteBursts}
            klunkBursts={state?.playerKlunkBursts}
            fanWrapRef={turnBannerFanWrapRef}
            colorBarRef={turnBannerColorBarRef}
            scrollerRef={turnPlayersScrollerRef}
            playerCardRefs={turnPlayerCardRefs}
            layoutTick={emoteDisplayTick}
          />
          </div>
        </div>
      ) : null}

      {tableSettingsOpen ? (
        <div
          className={tableStyles.tableSettingsBackdrop}
          role="presentation"
          onClick={() => setTableSettingsOpen(false)}
        >
          <div
            className={tableStyles.tableSettingsCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="table-settings-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="table-settings-title" className={tableStyles.tableSettingsTitle}>
              {sv.table.settingsTitle}
            </h2>
            <label className={tableStyles.tableSettingsRow}>
              <input
                type="checkbox"
                checked={boardPerf.boardPanEnabled}
                onChange={(e) => {
                  writeBoardPanEnabled(e.target.checked);
                  setBoardPerf(readBoardPerformancePrefs());
                }}
              />
              <span>{sv.table.settingsBoardPan}</span>
            </label>
            <label className={tableStyles.tableSettingsRow}>
              <input
                type="checkbox"
                checked={boardPerf.boardAnimationsEnabled}
                onChange={(e) => {
                  writeBoardAnimationsEnabled(e.target.checked);
                  setBoardPerf(readBoardPerformancePrefs());
                }}
              />
              <span>{sv.table.settingsBoardAnimations}</span>
            </label>
            <label className={tableStyles.tableSettingsRow}>
              <input
                type="checkbox"
                checked={boardPerf.tokenMoveAnimationsEnabled}
                onChange={(e) => {
                  writeTokenMoveAnimationsEnabled(e.target.checked);
                  setBoardPerf(readBoardPerformancePrefs());
                }}
              />
              <span>{sv.table.settingsTokenMoveAnimations}</span>
            </label>
            <label className={tableStyles.tableSettingsRow}>
              <input
                type="checkbox"
                checked={boardPerf.preventSleepEnabled}
                onChange={(e) => {
                  writeBoardPreventSleepEnabled(e.target.checked);
                  setBoardPerf(readBoardPerformancePrefs());
                }}
                disabled={!wakeLockAvailable}
                aria-label={sv.table.wakeLockToggle}
              />
              <span title={!wakeLockAvailable ? sv.table.wakeLockUnsupported : undefined}>{sv.table.wakeLockToggle}</span>
            </label>
            <label className={tableStyles.tableSettingsRow}>
              <input
                type="checkbox"
                checked={showTileTypeLabels}
                onChange={(e) => setShowTileTypeLabels(e.target.checked)}
                aria-label={sv.table.tileTypeLabels}
              />
              <span>{sv.table.tileTypeLabels}</span>
            </label>
            <ArcadeButton variant="gray" fullWidth onClick={() => setTableSettingsOpen(false)}>
              {sv.table.settingsClose}
            </ArcadeButton>
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
      {tableToasts.length > 0 ? (
        <div
          className={tableStyles.tableToastDock}
          style={
            {
              "--table-toast-bottom": `calc(${playingTurn ? turnBannerBottomReservePx : 0}px + env(safe-area-inset-bottom, 0px) + 12px)`,
            } as CSSProperties
          }
        >
          {tableToasts.map((toast) => (
            <div
              key={toast.id}
              className={[
                tableStyles.tableToastItem,
                toast.category === "sip"
                  ? tableStyles.tableToastSip
                  : toast.category === "vaska"
                    ? tableStyles.tableToastVaska
                    : toast.category === "reward"
                      ? tableStyles.tableToastReward
                      : tableStyles.tableToastPvp,
                toast.leaving ? tableStyles.tableToastLeaving : tableStyles.tableToastEntering,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className={tableStyles.tableToastRow}>
                {toast.iconKinds.length > 0 ? (
                  <div className={tableStyles.tableToastIcons} aria-hidden>
                    {toast.iconKinds.map((kind) => (
                      <StatIcon
                        key={kind}
                        kind={kind}
                        size={28}
                        popScale={1.08}
                        className={kind === "xp" ? tableStyles.tableToastIconXp : undefined}
                      />
                    ))}
                  </div>
                ) : null}
                <div className={tableStyles.tableToastText}>{toast.text}</div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TableLevelUpLockedCardContent(props: { text: string }) {
  return (
    <div className={tableStyles.infoRevealCard}>
      <div aria-hidden className={`${tableStyles.infoRevealIconCircle} ${tableStyles.levelUpLockCircle}`}>
        <img
          src="/icons/lvlup.svg"
          alt=""
          className={`lvlup-lock-icon lvlup-lock-icon-down ${tableStyles.levelUpLockIcon}`}
        />
      </div>
      <p className={tableStyles.infoRevealText}>{props.text}</p>
    </div>
  );
}

function TableEventStoryCardFrame(props: {
  card: PendingCard;
  showWaitingHint?: boolean;
  cardStyle?: CSSProperties;
}) {
  const revealArtKey = resolveCardRevealArtKey(props.card.artKey, props.card.grantedItemId);
  const showBeerRef = !!artAttributionLabel(revealArtKey);
  return (
    <>
      <div className={monsterCardFrameStyles.spin} aria-hidden />
      <div className={`${monsterCardFrameStyles.inner} ${tableStyles.eventCardInner}`} style={props.cardStyle}>
        <div className={tableStyles.eventCardHeader}>
          <img
            src="/icons/event-icon.svg"
            alt=""
            draggable={false}
            className={tableStyles.eventCardIcon}
          />
          <div className={tableStyles.eventCardTitle}>{props.card.title}</div>
        </div>
        <div className={tableStyles.eventCardArtWrap}>
          <img
            src={artImageSrcForPending(props.card.artKey, props.card.grantedItemId, {
              cardText: props.card.text,
              cardId: props.card.cardId,
            })}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/card-placeholder.png";
            }}
            alt={sv.table.cardArtAlt}
            className={tableStyles.eventCardArt}
          />
        </div>
        <CardRichText
          className={tableStyles.eventCardBody}
          text={props.card.text}
          rollOutcomes={getCardDefById(props.card.cardId)?.rollOutcomes}
        />
        {props.showWaitingHint ? (
          <div className={tableStyles.eventCardHint}>{sv.table.waitingConfirmPhone}</div>
        ) : null}
        {showBeerRef ? <div className={tableStyles.eventCardSpacer} aria-hidden /> : null}
        {showBeerRef ? (
          <div className={tableStyles.eventCardAttribution}>
            <CardArtAttribution artKey={revealArtKey} dense />
          </div>
        ) : null}
      </div>
    </>
  );
}

function TableEventRollHeroOverlay(props: {
  card: PendingCard;
  contentScale: number;
  boardAnimationsEnabled: boolean;
  cardCoverId?: string | null;
}) {
  const effectiveScale = props.contentScale > 1 ? props.contentScale : 1;
  const rolledDie = parseRolledDieFromCardText(props.card.text);
  const hasRolledResult = rolledDie != null && (props.card.choices?.length ?? 0) === 0;
  const [animState, setAnimState] = useState<"intro" | "shiftRight" | "diceIn">("intro");
  useEffect(() => {
    const reducedMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion || !props.boardAnimationsEnabled) {
      setAnimState("diceIn");
      return;
    }
    setAnimState("intro");
    const startDelay = CARD_FLIP_FRONT_ANIM_READY_MS + 40;
    const tShift = window.setTimeout(() => setAnimState("shiftRight"), startDelay);
    const tDice = window.setTimeout(() => setAnimState("diceIn"), startDelay + 520);
    return () => {
      window.clearTimeout(tShift);
      window.clearTimeout(tDice);
    };
  }, [props.card.cardId, props.card.playerId, props.boardAnimationsEnabled]);

  return (
    <div
      className={`${tableStyles.eventRollOverlay} ${tableStyles.overlayTopCenter}`}
      style={{
        paddingTop: props.contentScale > 1 ? "max(84px, calc(env(safe-area-inset-top, 0px) + 56px))" : 70,
        background: TABLE_BOARD_OVERLAY_BG,
        animation: TABLE_BOARD_MODAL_OVERLAY_ANIMATION,
      }}
    >
      <div className={tableStyles.overlayScaleWrap} style={{ transform: `scale(${effectiveScale})` }}>
        <div className={tableStyles.eventRollRow} style={{ gap: animState === "diceIn" ? 20 : 0 }}>
          <div
            className={tableStyles.eventRollDicePanel}
            style={{
              opacity: animState === "diceIn" ? 1 : 0,
              transform: animState === "diceIn" ? "translateX(0)" : "translateX(-10px)",
            }}
          >
            <div className={tableStyles.eventRollDie}>
              {hasRolledResult ? (
                <DiceCube3D value={rolledDie} size={88} />
              ) : (
                <DiceCube3D idleSpin spinning={props.boardAnimationsEnabled} size={88} />
              )}
            </div>
          </div>
          <div
            className={tableStyles.eventRollCardPanel}
            style={{
              transform:
                animState === "intro"
                  ? "translateX(0) rotate(0deg)"
                  : animState === "shiftRight"
                    ? "translateX(36px) rotate(0deg)"
                    : "translateX(8px) rotate(5deg)",
            }}
          >
            <CardFlipScene
              maxWidth={400}
              blockPointerUntilFlipped={false}
              faceInnerClassName={cardFlipShellStyles.faceInnerNoVerticalOverflow}
              cardCoverId={props.cardCoverId}
            >
              <div
                className={[
                  monsterCardFrameStyles.wrap,
                  monsterCardFrameStyles.wrapFill,
                  monsterCardFrameStyles.wrapEventStory,
                ].join(" ")}
              >
                <TableEventStoryCardFrame card={props.card} showWaitingHint />
              </div>
            </CardFlipScene>
          </div>
        </div>
      </div>
    </div>
  );
}

function isFoundItemRevealCard(cardId: string): boolean {
  return cardId.startsWith("event_find_item_") || cardId.startsWith("treasure_item_");
}

function TablePendingCardContent(props: { pending: PendingCard; viewerName?: string }) {
  const p = props.pending;
  const winData =
    p.cardId === "combat_win"
      ? resolveCombatWinViewer(
          p.combatWin ?? parseLegacyCombatWinText(p.text, props.viewerName),
          props.viewerName,
        )
      : null;
  if (winData) {
    return (
      <div className={tableStyles.centeredCardContent}>
        <CombatSheetFrame showSheetTitle={false}>
          <CombatWinCardContent data={winData} />
        </CombatSheetFrame>
      </div>
    );
  }
  const loseData =
    p.cardId === "combat_lose"
      ? resolveCombatLossViewer(
          p.combatLoss ?? parseLegacyCombatLoseText(p.text, props.viewerName),
          props.viewerName,
        )
      : null;
  if (loseData) {
    return (
      <div className={tableStyles.centeredCardContent}>
        <CombatSheetFrame showSheetTitle={false}>
          <CombatLoseCardContent data={loseData} />
        </CombatSheetFrame>
      </div>
    );
  }
  if (p.cardId === "boss_final_win") {
    const artSrc = artImageSrcForPending(p.artKey, p.grantedItemId, { cardText: p.text, cardId: p.cardId });
    const winnerName = p.bossFinalWin?.winnerName ?? p.text;
    return (
      <div className={tableStyles.centeredCardContent}>
        <CombatSheetFrame showSheetTitle={false}>
          <h2 className={tableStyles.bossFinalWinTitle}>{p.title}</h2>
          <img
            src={artSrc}
            alt={sv.table.cardArtAlt}
            className={tableStyles.bossFinalWinArt}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/card-placeholder.png";
            }}
          />
          <p className={tableStyles.bossFinalWinVictory}>{sv.play.bossFinaleVictory}</p>
          <p className={tableStyles.bossFinalWinWinner}>{sv.play.bossFinaleWinner(winnerName)}</p>
          {p.bossFinalWin?.bossName ? (
            <p className={tableStyles.bossFinalWinBossName}>{p.bossFinalWin.bossName}</p>
          ) : null}
        </CombatSheetFrame>
      </div>
    );
  }
  if (isFoundItemRevealCard(p.cardId)) {
    return (
      <div className={tableStyles.centeredCardContent}>
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
      <div className={tableStyles.centeredCardContent}>
        <CombatSheetFrame sheetTitle={sv.play.treasureCardSheetTitle}>
          <TreasureCardContent title={p.title} text={p.text} cardId={p.cardId} />
        </CombatSheetFrame>
      </div>
    );
  }
  if (p.cardId === "door_locked") {
    return (
      <div className={tableStyles.centeredCardContent}>
        <CombatSheetFrame
          sheetTitle={p.title}
          titleStyle={{ textAlign: "center", fontSize: 22, letterSpacing: "0.02em", marginBottom: 14 }}
        >
          <TableLevelUpLockedCardContent text={p.text} />
        </CombatSheetFrame>
      </div>
    );
  }
  return (
    <div
      className={[
        monsterCardFrameStyles.wrap,
        monsterCardFrameStyles.wrapFill,
        monsterCardFrameStyles.wrapEventStory,
      ].join(" ")}
    >
      <TableEventStoryCardFrame card={p} showWaitingHint />
    </div>
  );
}

function TableHiddenItemRevealCardContent() {
  return (
    <div className={tableStyles.infoRevealCard}>
      <div aria-hidden className={`${tableStyles.infoRevealIconCircle} ${tableStyles.hiddenItemCircle}`}>
        <span aria-hidden className={tableStyles.hiddenItemGlyph} />
      </div>
      <p className={tableStyles.infoRevealText}>{sv.table.hiddenItemFoundBody}</p>
    </div>
  );
}

