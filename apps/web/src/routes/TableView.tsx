import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { GameState, TileType } from "@bv/game-core";
import { isGameState } from "../lib/gameTypes";
import { createClient, type ServerMessage } from "../lib/ws";
import { ArcadeButton } from "../components/ArcadeButton";
import { DiceCube3D } from "../components/DiceCube3D";
import { CombatLoseCardContent } from "../components/CombatLoseCard";
import { CombatWinCardContent } from "../components/CombatWinCard";
import { CombatSheetFrame } from "../components/CombatResultSheet";
import { MonsterEncounterCard } from "../components/MonsterEncounterCard";
import { artImageSrc } from "../lib/cardArt";
import {
  combatLossKlunksForDisplay,
  parseLegacyCombatLoseText,
  parseLegacyCombatWinText,
  resolveCombatLossViewer,
  resolveCombatWinViewer,
} from "../lib/combatUi";
import { sv, wsStatusLabel, phaseLabelSv, pendingTypeLabelSv, tileTypeSv } from "../lib/uiStrings";

type Cam = { x: number; y: number; scale: number };

/** Vänta så kameran hinner panorera innan kortmodal på bordet visas. */
const TABLE_CARD_MODAL_DELAY_MS = 950;

/** Publika tillgångar under apps/web/public/tiles/ */
const TILE_SVG: Record<TileType, string> = {
  empty: "/tiles/empty.svg",
  event: "/tiles/event.svg",
  combat: "/tiles/combat.svg",
  merchant: "/tiles/merchant.svg",
  door: "/tiles/empty.svg",
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

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function ringPos(size: number, idx: number): { col: number; row: number } {
  const n = 4 * size - 4;
  const i = ((idx % n) + n) % n;
  const topLen = size;
  const rightLen = size - 1;
  const bottomLen = size - 1;

  if (i < topLen) return { col: i, row: 0 };
  if (i < topLen + rightLen) return { col: size - 1, row: i - topLen + 1 };
  if (i < topLen + rightLen + bottomLen) {
    return { col: size - 2 - (i - (topLen + rightLen)), row: size - 1 };
  }
  return { col: 0, row: size - 2 - (i - (topLen + rightLen + bottomLen)) };
}

function activePlayer(state: GameState | null) {
  if (!state) return null;
  const id = state.turnOrder[state.currentTurnIndex];
  return state.players.find((p) => p.id === id) ?? null;
}

function pendingCardOwner(state: GameState | null) {
  if (!state) return null;
  const pending = state.pending;
  if (!pending || pending.type !== "card") return null;
  return state.players.find((p) => p.id === pending.playerId) ?? null;
}

function TableCombatBoardPanel({ state }: { state: GameState }) {
  const pending = state.pending;
  if (!pending || pending.type !== "combat") return null;
  const attacker = state.players.find((p) => p.id === pending.attackerId);
  const need = pending.need + (pending.needMod ?? 0);
  const reactorNames = (pending.reactors ?? [])
    .map((id) => state.players.find((p) => p.id === id)?.name)
    .filter((n): n is string => !!n);
  const showMonsterCard = pending.monsterId !== "boss";
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 42,
        display: "grid",
        placeItems: "start center",
        paddingTop: 20,
        paddingLeft: 12,
        paddingRight: 12,
      }}
    >
      <div
        style={{
          width: "min(720px, 94vw)",
          borderRadius: 16,
          border: "1px solid #ffffff22",
          background: "rgba(11, 18, 38, 0.94)",
          padding: 16,
          textAlign: "left",
          boxShadow: "0 16px 48px rgba(0,0,0,0.45)",
          overflow: "visible",
        }}
      >
        <div style={{ opacity: 0.8, fontSize: 12, marginBottom: 6 }}>{sv.table.combatOverlayTitle}</div>
        <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
          {pending.phase === "chooseTeammate"
            ? sv.table.combatPhaseTeam
            : pending.phase === "enemyIntro"
            ? sv.table.combatPhase1
            : pending.phase === "reactions"
              ? sv.table.combatPhase2
              : pending.phase === "chooseHitMitigation"
                ? sv.table.combatPhase3Choice
                : sv.table.combatPhase3Result}
        </div>
        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>
          <b>{attacker?.name ?? "?"}</b> {sv.table.isFighting}
        </div>
        {pending.teamBattleRequired ? (
          <div style={{ opacity: 0.88, marginBottom: 8 }}>
            Team battle:{" "}
            <b>
              {pending.assistId
                ? (state.players.find((p) => p.id === pending.assistId)?.name ?? "okänd")
                : "väntar på val av medkämpe"}
            </b>
          </div>
        ) : null}
        {showMonsterCard ? (
          <div style={{ marginBottom: 8 }}>
            <MonsterEncounterCard
              title={pending.enemyName}
              artKey={pending.enemyArtKey}
              combatStrength={need}
              winGold={pending.rewardGold ?? 0}
              winItems={pending.rewardItems ?? 0}
              lossDamage={pending.baseDamage}
              lossKlunks={combatLossKlunksForDisplay(pending)}
              specialRules={pending.enemyIntroText?.trim() || undefined}
            />
          </div>
        ) : (
          <>
            <div style={{ fontWeight: 900, fontSize: 24, lineHeight: 1.05, color: "#f8fafc", marginBottom: 8 }}>
              {pending.enemyName}
            </div>
            <div style={{ opacity: 0.88, marginBottom: 8 }}>
              {sv.table.strength}: {need}
            </div>
          </>
        )}
        {pending.phase === "reactions" && reactorNames.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 13, opacity: 0.85 }}>
            <b>{sv.table.canIntervene}</b> {reactorNames.join(", ")}
          </div>
        )}
        {(pending.phase === "rollPreview" || pending.phase === "chooseHitMitigation") && (
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
            <DiceCube3D value={pending.previewDie ?? 1} size={52} />
            {pending.previewBroDie != null ? <DiceCube3D value={pending.previewBroDie} size={52} /> : null}
            <div style={{ fontSize: 14 }}>
              Totalt <b>{pending.previewTotal ?? 0}</b> mot styrka <b>{pending.previewNeed ?? need}</b>
              {pending.phase === "chooseHitMitigation" ? (
                <span style={{ display: "block", marginTop: 6, opacity: 0.85 }}>
                  {sv.table.attackerChoosesHit(pending.monsterId === "brewizard" ? 3 : 2)}
                </span>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TablePvpBoardPanel({ state }: { state: GameState }) {
  const pending = state.pending;
  if (!pending || pending.type !== "pvp") return null;
  const attacker = state.players.find((p) => p.id === pending.attackerId);
  const defender = state.players.find((p) => p.id === pending.defenderId);
  if (!attacker || !defender) return null;
  const ra = pending.rolls?.[pending.attackerId];
  const rd = pending.rolls?.[pending.defenderId];
  const rt = pending.resolvedTotals;

  function FighterCard(props: {
    role: string;
    player: (typeof state.players)[0];
    roll: { die: number; total: number } | undefined;
  }) {
    return (
      <div
        style={{
          flex: "1 1 200px",
          maxWidth: 300,
          borderRadius: 14,
          border: "1px solid #ffffff28",
          padding: 16,
          background: "rgba(0,0,0,0.28)",
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", opacity: 0.65, marginBottom: 6 }}>
          {props.role}
        </div>
        <div style={{ fontWeight: 800, fontSize: 19, marginBottom: 12, color: props.player.color }}>{props.player.name}</div>
        {props.roll ? (
          <>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <DiceCube3D value={props.roll.die} size={58} />
            </div>
            <div style={{ fontSize: 14, opacity: 0.92 }}>
              {sv.table.dieAttackTotal(props.roll.die, props.roll.total)}
            </div>
          </>
        ) : (
          <div style={{ opacity: 0.55, fontSize: 14, padding: "12px 0" }}>{sv.table.waitingRoll}</div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 43,
        display: "grid",
        placeItems: "start center",
        paddingTop: 22,
        paddingLeft: 12,
        paddingRight: 12,
      }}
    >
      <div
        style={{
          width: "min(760px, 96vw)",
          borderRadius: 20,
          border: "2px solid rgba(251, 191, 36, 0.5)",
          background: "linear-gradient(165deg, rgba(36, 20, 52, 0.97), rgba(11, 18, 38, 0.98))",
          padding: 22,
          textAlign: "center",
          boxShadow: "0 24px 64px rgba(0,0,0,0.55), 0 0 48px rgba(251, 191, 36, 0.12)",
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", opacity: 0.65, marginBottom: 4 }}>
          {sv.table.pvpSubtitle}
        </div>
        <div
          style={{
            fontWeight: 900,
            fontSize: 26,
            marginBottom: 18,
            color: "#fef9c3",
            textShadow: "0 0 28px rgba(251, 191, 36, 0.4)",
          }}
        >
          {sv.table.pvpDuel}
        </div>
        {pending.phase === "awaitingRolls" && (pending.pvpRound ?? 1) > 1 ? (
          <div style={{ marginBottom: 14, fontWeight: 800, fontSize: 18, color: "#fde68a" }}>
            {sv.table.pvpRound(pending.pvpRound ?? 1)}
            <span style={{ display: "block", marginTop: 6, fontSize: 13, fontWeight: 600, opacity: 0.85 }}>
              {sv.table.pvpTieRerollHint}
            </span>
          </div>
        ) : null}
        <div style={{ display: "flex", alignItems: "stretch", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
          <FighterCard role={sv.table.roleAttacker} player={attacker} roll={ra} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontWeight: 900,
              fontSize: 22,
              opacity: 0.45,
              padding: "0 4px",
            }}
          >
            VS
          </div>
          <FighterCard role={sv.table.roleDefender} player={defender} roll={rd} />
        </div>
        {rt ? (
          <div
            style={{
              marginTop: 18,
              paddingTop: 16,
              borderTop: "1px solid #ffffff22",
              fontSize: 16,
            }}
          >
            <div style={{ marginBottom: 10 }}>
              <span style={{ color: attacker.color, fontWeight: 800 }}>{attacker.name}</span>{" "}
              <b>{rt.attackerTotal}</b>
              <span style={{ opacity: 0.4, margin: "0 8px" }}>—</span>
              <span style={{ color: defender.color, fontWeight: 800 }}>{defender.name}</span>{" "}
              <b>{rt.defenderTotal}</b>
            </div>
            {pending.winnerId ? (
              <div style={{ fontWeight: 800, fontSize: 18, color: "#fef08a" }}>
                {sv.table.winner}: {state.players.find((p) => p.id === pending.winnerId)?.name ?? "—"}
              </div>
            ) : null}
            {pending.phase === "chooseLoot" ? (
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.72 }}>{sv.table.winnerChoosesLoot}</div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TableView() {
  const [sp] = useSearchParams();
  const room = (sp.get("room") ?? "").toUpperCase() || "TEST1";
  const name = sp.get("name") ?? "Bord";
  const modeParam = sp.get("mode");
  const config =
    modeParam === "goldenBeerEscape" || modeParam === "bossKill"
      ? { gameMode: modeParam as "bossKill" | "goldenBeerEscape" }
      : undefined;

  const [status, setStatus] = useState("connecting");
  const [state, setState] = useState<GameState | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [lastStateAt, setLastStateAt] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const tileSize = 120;
  /** Luft mellan tile-ytan och den gula målramen (px). */
  const targetRingOutset = 8;
  const gridSize = 7;
  /** Marginal inuti SVG så målram + tjock stroke inte klipps vid brädets kanter. */
  const boardPad = targetRingOutset + 4;
  const gridPixelW = gridSize * tileSize;
  const gridPixelH = gridSize * tileSize;
  const boardWidth = gridPixelW + 2 * boardPad;
  const boardHeight = gridPixelH + 2 * boardPad;

  // Smidig kamera: renderad cam lerpar mot targetCam.
  const targetCam = useRef<Cam>({
    x: -(boardWidth / 2),
    y: -(boardHeight / 2),
    scale: 1,
  });
  const [cam, setCam] = useState<Cam>(() => ({ ...targetCam.current }));
  const drag = useRef<
    { startX: number; startY: number; camX: number; camY: number } | null
  >(null);
  const isDraggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);
  const boardViewportRef = useRef<HTMLDivElement | null>(null);
  const [boardViewportPx, setBoardViewportPx] = useState({ w: 0, h: 0 });

  const client = useMemo(() => {
    return createClient({
      roomCode: room,
      playerName: name,
      as: "table",
      config,
      onStatus: setStatus,
      onMessage: (m: ServerMessage) => {
        if (m.type === "error") setErr(m.message);
        if (m.type === "state" && isGameState(m.state)) {
          setState(m.state);
          setLastStateAt(Date.now());
          setErr(null);
        }
      },
    });
  }, [room, name, modeParam]);

  useEffect(() => () => client.close(), [client]);
  useEffect(() => {
    if (status === "connected") setErr(null);
  }, [status]);

  useEffect(() => {
    // Två lägen:
    // - drag-läge: snabb respons så kameran följer fingret/musen direkt
    // - auto-fokus: trögare, mer cinematic panorering
    const dragPanStiffness = 0.18;
    const dragZoomStiffness = 0.14;
    const autoPanStiffness = 0.028;
    const autoZoomStiffness = 0.025;
    const tick = () => {
      setCam((c) => {
        const t = targetCam.current;
        const panStiffness = isDraggingRef.current ? dragPanStiffness : autoPanStiffness;
        const zoomStiffness = isDraggingRef.current ? dragZoomStiffness : autoZoomStiffness;
        const nx = c.x + (t.x - c.x) * panStiffness;
        const ny = c.y + (t.y - c.y) * panStiffness;
        const ns = c.scale + (t.scale - c.scale) * zoomStiffness;
        // när vi är nära målet, snappa helt för att undvika micro-jitter
        if (
          Math.abs(nx - t.x) < 0.1 &&
          Math.abs(ny - t.y) < 0.1 &&
          Math.abs(ns - t.scale) < 0.001
        ) {
          return t;
        }
        return { x: nx, y: ny, scale: ns };
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  // Håll loggen i botten när nya rader kommer.
  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [state?.log?.length]);

  // Faktisk spelyta (flex-viewport) — behövs för zoom som täcker rutor i bildfönstret.
  useEffect(() => {
    const el = boardViewportRef.current;
    if (!el) return;
    const applySize = (w: number, h: number) => {
      const ww = Math.max(1, w);
      const hh = Math.max(1, h);
      setBoardViewportPx((prev) => (prev.w === ww && prev.h === hh ? prev : { w: ww, h: hh }));
    };
    const measure = () => {
      const r = el.getBoundingClientRect();
      applySize(r.width, r.height);
    };
    measure();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver((entries) => {
        const cr = entries[0]?.contentRect;
        if (!cr) return;
        applySize(cr.width, cr.height);
      });
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const tiles = state?.levels?.[0]?.tiles ?? [];

  // Auto-fokus på aktiv spelare: centrera/zooma så att valbara tiles ryms i viewport.
  useEffect(() => {
    if (!state || state.phase !== "playing") return;
    const p = activePlayer(state);
    if (!p) return;

    const ringMargin = targetRingOutset + 6;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    const includeTile = (tileIndex: number) => {
      const { col, row } = ringPos(gridSize, tileIndex);
      const left = boardPad + col * tileSize - ringMargin;
      const top = boardPad + row * tileSize - ringMargin;
      const right = boardPad + (col + 1) * tileSize + ringMargin;
      const bottom = boardPad + (row + 1) * tileSize + ringMargin;
      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, right);
      maxY = Math.max(maxY, bottom);
    };

    includeTile(p.tileIndex);

    if (state.pending?.type === "moveChoice") {
      for (const o of state.pending.options) {
        if (o.target.levelIndex !== 0) continue;
        if (o.target.tileIndex < 0 || o.target.tileIndex >= tiles.length) continue;
        includeTile(o.target.tileIndex);
      }
    }

    const pend = state.pending;
    if (pend?.type === "card") {
      const owner = state.players.find((x) => x.id === pend.playerId);
      if (owner && owner.levelIndex === 0 && owner.tileIndex >= 0 && owner.tileIndex < tiles.length) {
        includeTile(owner.tileIndex);
      }
    }

    const contentW = Math.max(1, maxX - minX);
    const contentH = Math.max(1, maxY - minY);
    const breathe = tileSize * 0.2;
    const boxW = contentW + breathe;
    const boxH = contentH + breathe;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const { w: viewW, h: viewH } = boardViewportPx;
    if (viewW < 48 || viewH < 48) return;

    const fitMargin = 0.9;
    const desiredScale = clamp(
      Math.min((viewW * fitMargin) / boxW, (viewH * fitMargin) / boxH),
      0.45,
      1.85,
    );

    // translate(cam) scale(s) med origin 0,0: skärmposition = offset + s*p ⇒ centrera med cam = -s*center
    targetCam.current = {
      ...targetCam.current,
      x: -desiredScale * centerX,
      y: -desiredScale * centerY,
      scale: desiredScale,
    };
  }, [
    state?.currentTurnIndex,
    state?.phase,
    state?.pending,
    tiles.length,
    boardPad,
    boardViewportPx.w,
    boardViewportPx.h,
    gridSize,
    tileSize,
    targetRingOutset,
  ]);

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
  const moveTargets =
    state?.pending?.type === "moveChoice"
      ? new Set(state.pending.options.map((o) => `${o.target.levelIndex}-${o.target.tileIndex}`))
      : null;

  const playingTurn = state?.phase === "playing" && cur;

  return (
    <div
      style={{
        height: "100vh",
        maxHeight: "100vh",
        width: "100vw",
        maxWidth: "100vw",
        overflow: "hidden",
        display: "grid",
        gridTemplateRows: "auto 1fr",
        background: "#0b1020",
        color: "#e5e7eb",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateRows: "auto auto",
          borderBottom: "1px solid #ffffff22",
        }}
      >
        <header style={{ padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ fontWeight: 700 }}>{sv.table.board}</div>
          <div style={{ opacity: 0.8 }}>
            {sv.table.lobby}: {room}
          </div>
          <div style={{ opacity: 0.8 }}>
            {sv.table.status}: {wsStatusLabel(status)}
          </div>
          <div style={{ opacity: 0.65, fontSize: 12 }}>
            {sv.table.lastState}: {lastStateAt ? new Date(lastStateAt).toLocaleTimeString() : "—"}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <ArcadeButton
              variant="blue"
              size="sm"
              onClick={() => {
                targetCam.current = {
                  ...targetCam.current,
                  scale: clamp(targetCam.current.scale + 0.1, 0.5, 2),
                };
              }}
            >
              +
            </ArcadeButton>
            <ArcadeButton
              variant="blue"
              size="sm"
              onClick={() => {
                targetCam.current = {
                  ...targetCam.current,
                  scale: clamp(targetCam.current.scale - 0.1, 0.5, 2),
                };
              }}
            >
              –
            </ArcadeButton>
          </div>
        </header>
        {playingTurn ? (
          <div
            style={{
              background: cur!.color,
              padding: "10px 16px",
              textAlign: "center",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(1.35rem, 4.2vw, 2rem)",
                fontWeight: 900,
                lineHeight: 1.2,
                color: "#fafafa",
                textShadow: "0 1px 3px rgba(0,0,0,0.55), 0 0 1px rgba(0,0,0,0.8)",
                letterSpacing: "-0.02em",
              }}
            >
              {cur!.name}
            </h1>
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0, minWidth: 0, overflow: "hidden" }}>
        <div
          ref={boardViewportRef}
          style={{ position: "relative", overflow: "hidden", flex: 1, minWidth: 0 }}
          onWheel={(e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.08 : 0.08;
            targetCam.current = {
              ...targetCam.current,
              scale: clamp(targetCam.current.scale + delta, 0.5, 2),
            };
          }}
          onPointerDown={(e) => {
            (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
            isDraggingRef.current = true;
            // utgå från targetCam så drag känns stabilt även under lerp
            drag.current = {
              startX: e.clientX,
              startY: e.clientY,
              camX: targetCam.current.x,
              camY: targetCam.current.y,
            };
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const dx = e.clientX - drag.current.startX;
            const dy = e.clientY - drag.current.startY;
            targetCam.current = {
              ...targetCam.current,
              x: drag.current.camX + dx,
              y: drag.current.camY + dy,
            };
          }}
          onPointerUp={() => {
            drag.current = null;
            isDraggingRef.current = false;
          }}
          onPointerCancel={() => {
            drag.current = null;
            isDraggingRef.current = false;
          }}
          onPointerLeave={() => {
            if (!drag.current) isDraggingRef.current = false;
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.scale})`,
              transformOrigin: "0 0",
            }}
          >
            <svg
              width={boardWidth}
              height={boardHeight}
              style={{
                border: "1px solid #ffffff22",
                borderRadius: 12,
                backgroundColor: "#0f172a",
              }}
            >
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
                {tiles.map((t, i) => {
                  const { col, row } = ringPos(gridSize, i);
                  const x = boardPad + col * tileSize;
                  const y = boardPad + row * tileSize;
                  const w = tileSize - 12;
                  const h = tileSize - 12;
                  return (
                    <clipPath id={`tile-clip-${t.id}`} key={t.id}>
                      <rect x={x + 6} y={y + 6} width={w} height={h} rx={14} ry={14} />
                    </clipPath>
                  );
                })}
              </defs>
              {tiles.map((t, i) => {
                const { col, row } = ringPos(gridSize, i);
                const x = boardPad + col * tileSize;
                const y = boardPad + row * tileSize;
                const w = tileSize - 12;
                const h = tileSize - 12;
                const here = state?.players.filter((p) => p.levelIndex === 0 && p.tileIndex === i) ?? [];
                const isTarget = moveTargets?.has(`0-${i}`) ?? false;
                const ringW = w + 2 * targetRingOutset;
                const ringH = h + 2 * targetRingOutset;
                const ringR = 14 + targetRingOutset;
                const ringCx = x + 6 + w / 2;
                const ringCy = y + 6 + h / 2;
                return (
                  <g key={t.id}>
                    <g style={{ clipPath: `url(#tile-clip-${t.id})` }}>
                      <image
                        href={tileSvgHref(t.type)}
                        x={x + 6}
                        y={y + 6}
                        width={w}
                        height={h}
                        preserveAspectRatio="xMidYMid slice"
                      />
                    </g>
                    {isTarget ? (
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
                    {here.map((p, idx) => {
                      const innerCx = x + 6 + w / 2;
                      const innerCy = y + 6 + h / 2;
                      const n = here.length;
                      const spread = 44;
                      const cx = innerCx + (idx - (n - 1) / 2) * spread;
                      const cy = innerCy + 4;
                      const r = 21;
                      const initial = (p.name?.trim()?.[0] ?? "?").toUpperCase();
                      return (
                        <g key={p.id} filter="url(#playerTokenShadow)">
                          <circle cx={cx} cy={cy} r={r} fill={p.color} stroke="rgba(0,0,0,0.55)" strokeWidth={2.5} />
                          <text
                            x={cx}
                            y={cy + 7}
                            textAnchor="middle"
                            fill="rgba(255,255,255,0.95)"
                            fontSize={16}
                            fontWeight={900}
                            style={{ userSelect: "none" }}
                          >
                            {initial}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <button
          type="button"
          aria-label={sidebarOpen ? sv.table.hidePanel : sv.table.showPanel}
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen((o) => !o)}
          style={{
            width: 36,
            flexShrink: 0,
            alignSelf: "stretch",
            border: "none",
            borderLeft: "1px solid #ffffff22",
            background: "rgba(17, 24, 39, 0.9)",
            color: "#e5e7eb",
            cursor: "pointer",
            fontSize: 20,
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
        >
          {sidebarOpen ? "⟩" : "⟨"}
        </button>

        <aside
          style={{
            width: sidebarOpen ? 380 : 0,
            minWidth: 0,
            flexShrink: 0,
            borderLeft: sidebarOpen ? "1px solid #ffffff22" : "none",
            padding: sidebarOpen ? 12 : 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            boxSizing: "border-box",
            transition: "width 0.22s ease, padding 0.22s ease, border-color 0.15s ease",
            opacity: sidebarOpen ? 1 : 0,
            pointerEvents: sidebarOpen ? "auto" : "none",
          }}
        >
          <h2 style={{ marginTop: 0 }}>{sv.table.game}</h2>
          {!state && <div style={{ opacity: 0.8 }}>{sv.table.waitingState}</div>}
          {err && <div style={{ color: "#fca5a5" }}>{err}</div>}

          {state && (
            <>
              <div style={{ display: "grid", gap: 8 }}>
                <div>
                  <b>{sv.table.phase}:</b> {phaseLabelSv(state.phase)}
                </div>
                <div>
                  <b>{sv.table.players}:</b> {state.players.length}
                </div>
                {state.phase === "lobby" && <div>{sv.table.readyAll(readyCount, state.players.length)}</div>}
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <b>{sv.table.die}:</b>{" "}
                    {state.lastDiceRollerId ? `${state.lastDiceRollerId.slice(0, 4)}… = ${state.lastDiceRoll}` : "—"}
                  </div>
                  {state.pending?.type === "moveChoice" && (
                    <DiceCube3D
                      value={
                        typeof state.pending.baseDie === "number" && Number.isFinite(state.pending.baseDie)
                          ? state.pending.baseDie
                          : state.pending.die
                      }
                      size={48}
                    />
                  )}
                </div>
                <div>
                  <b>{sv.table.pending}:</b> {pendingTypeLabelSv(state.pending?.type)}
                </div>
              </div>

              <h3>{sv.table.lobbyList}</h3>
              <div style={{ display: "grid", gap: 6 }}>
                {state.players.map((p) => (
                  <div key={p.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 99, background: p.color, display: "inline-block" }} />
                    <div style={{ flex: 1 }}>
                      {p.name} {p.isHost ? "(värd)" : ""} {p.ready ? "✅" : "…"}
                    </div>
                  </div>
                ))}
              </div>

              <h3>{sv.table.log}</h3>
              <div
                ref={logRef}
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflow: "auto",
                  border: "1px solid #ffffff22",
                  borderRadius: 12,
                  padding: 10,
                  background: "#0b1226",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: 12,
                  whiteSpace: "pre-wrap",
                }}
              >
                {state.log.slice(-30).map((l, i) => (
                  <div key={i} style={{ opacity: 0.9 }}>
                    {l.message}
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>

      {state?.pending?.type === "pvp" && <TablePvpBoardPanel state={state} />}

      {state?.pending?.type === "combat" && <TableCombatBoardPanel state={state} />}

      {state?.pending?.type === "card" && tableCardModalReady && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            display: "grid",
            placeItems: "start center",
            paddingTop: 70,
            zIndex: 40,
            background: "rgba(2, 6, 23, 0.24)",
            animation: "bvTableOverlayFadeIn 900ms cubic-bezier(0.22, 0.61, 0.36, 1) both",
          }}
        >
          <div
            style={{
              width: "min(720px, 92vw)",
              borderRadius: 16,
              border: "1px solid #ffffff22",
              background: "rgba(11, 18, 38, 0.92)",
              padding: 16,
              textAlign: "left",
              animation: "bvTableCardIn 1100ms cubic-bezier(0.22, 0.61, 0.36, 1) both",
              transformOrigin: "top center",
            }}
          >
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>
              {sv.table.cardFor(cardOwner?.name ?? "spelare")}
            </div>
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
              return (
                <>
                  <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 8 }}>{p.title}</div>
                  <div
                    style={{
                      width: "92%",
                      margin: "0 auto 10px",
                      aspectRatio: "4/3",
                      borderRadius: 14,
                      overflow: "hidden",
                      border: "1px solid #ffffff22",
                      background: "rgba(255,255,255,0.92)",
                    }}
                  >
                    <img
                      src={artImageSrc(p.artKey)}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/card-placeholder.png";
                      }}
                      alt={sv.table.cardArtAlt}
                      style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                    />
                  </div>
                  <div style={{ opacity: 0.98, color: "#e5e7eb", whiteSpace: "pre-wrap", lineHeight: 1.45 }}>
                    {p.text}
                  </div>
                </>
              );
            })()}
            {state.pending.choices && state.pending.choices.length > 0 && (
              <div style={{ opacity: 0.75, fontSize: 12, marginTop: 10 }}>{sv.table.choosingOnPhone}</div>
            )}
            <div style={{ opacity: 0.65, fontSize: 12, marginTop: 10 }}>{sv.table.waitingConfirmPhone}</div>
          </div>
          <style>
            {`@keyframes bvTableOverlayFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes bvTableCardIn {
  from { opacity: 0; transform: translateY(-36px) scale(0.96); filter: blur(3px); }
  to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}`}
          </style>
        </div>
      )}
    </div>
  );
}

