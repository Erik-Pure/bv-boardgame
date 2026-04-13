import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BOARD_RING_GRID_SIZE,
  isFinalBossMonsterId,
  playerCanCombatIntervene,
  ringGridSizeFromTileCount,
  ringTileCount,
  type GameState,
  type MonsterId,
  type Player,
  type TileType,
} from "@bv/game-core";
import { isGameState } from "../lib/gameTypes";
import { type ServerMessage } from "../lib/ws";
import { useWsGameClient } from "../lib/useWsGameClient";
import { EndedScoreboardPlayerLine } from "../components/EndedScoreboardPlayerLine";
import { ArcadeButton } from "../components/ArcadeButton";
import { DiceCube3D } from "../components/DiceCube3D";
import { CombatLoseCardContent } from "../components/CombatLoseCard";
import { CombatWinCardContent } from "../components/CombatWinCard";
import { CombatSheetFrame } from "../components/CombatResultSheet";
import { TeamBattleIntroCard } from "../components/TeamBattleIntroCard";
import { TreasureCardContent } from "../components/TreasureCardContent";
import { MonsterEncounterCard } from "../components/MonsterEncounterCard";
import { CardArtAttribution } from "../components/CardArtAttribution";
import { artAttributionLabel, artImageSrcForPending, resolveCardRevealArtKey } from "../lib/cardArt";
import { isEventStoryCardPending } from "../lib/eventStoryCardPending";
import monsterCardFrameStyles from "../components/MonsterEncounterCard.module.css";
import turnBannerStyles from "./turnBanner.module.css";
import {
  combatLossKlunksForDisplay,
  parseLegacyCombatLoseText,
  parseLegacyCombatWinText,
  resolveCombatLossViewer,
  resolveCombatWinViewer,
} from "../lib/combatUi";
import { sv, wsStatusLabel, tileTypeSv } from "../lib/uiStrings";
import { WsReconnectFooterHint } from "../components/WsReconnectOverlay";
import { CardFlipModalShell, CardFlipScene } from "../components/CardFlipModalShell";
import cardFlipShellStyles from "../components/CardFlipModalShell.module.css";
import {
  PLAYER_MARKER_TOKEN_H,
  PLAYER_MARKER_TOKEN_W,
  PLAYER_MARKER_VIEWBOX,
  playerMarkerStyleVars,
  playerMarkerSvgMarkupFor,
} from "../lib/playerMarkerSvg";

type Cam = { x: number; y: number; scale: number };

/** Vänta så kameran hinner panorera innan kortmodal på bordet visas. */
const TABLE_CARD_MODAL_DELAY_MS = 950;

const TABLE_BOARD_MODAL_OVERLAY_ANIMATION =
  "bvTableOverlayFadeIn 900ms cubic-bezier(0.22, 0.61, 0.36, 1) both";
const TABLE_BOARD_MODAL_CARD_ANIMATION =
  "bvTableCardIn 1100ms cubic-bezier(0.22, 0.61, 0.36, 1) both";

/** Halvtransparent dimning över brädet (strid, kortmodal m.m.). */
const TABLE_BOARD_OVERLAY_BG = "rgba(2, 6, 23, 0.4)";

/** Slutboss intro: stark röd radial puls som växer/krymper. */
const TABLE_BOSS_OVERLAY_BG =
  "radial-gradient(ellipse 120% 90% at 50% 16%, rgba(254, 121, 121, 0.72) 0%, rgba(239, 68, 68, 0.54) 28%, rgba(127, 29, 29, 0.44) 52%, rgba(18, 4, 8, 0) 74%), linear-gradient(180deg, rgba(60, 8, 12, 0.8) 0%, rgba(9, 2, 5, 0.9) 100%)";
const TABLE_BOSS_OVERLAY_PULSE = "bvBossTableOverlayPulse 1.7s cubic-bezier(0.4, 0, 0.2, 1) infinite";

/** Måste finnas i DOM när strids- och kortöverlägg animeras (keyframes är inte globala i Vite). */
const TABLE_BOARD_MODAL_KEYFRAMES_CSS = `@keyframes bvTableOverlayFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes bvTableCardIn {
  from { opacity: 0; transform: translateY(-36px) scale(0.96); filter: blur(3px); }
  to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}
@keyframes bvBossTableOverlayPulse {
  0% {
    box-shadow: inset 0 0 85px rgba(248, 113, 113, 0.2);
  }
  50% {
    box-shadow: inset 0 0 210px rgba(239, 68, 68, 0.62);
  }
  100% {
    box-shadow: inset 0 0 85px rgba(248, 113, 113, 0.2);
  }
}`;

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

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
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

/** Måste följa samma perimeterordning som `clockwiseTileIndex` i @bv/game-core (rörelse längs ringen). */
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

/** Nästa spelare i `turnOrder` (visning på brädet; samma ordning som servern). */
function nextTurnPlayer(state: GameState | null): Player | null {
  if (!state || state.phase !== "playing" || state.turnOrder.length < 2) return null;
  const nextIdx = (state.currentTurnIndex + 1) % state.turnOrder.length;
  const id = state.turnOrder[nextIdx];
  return state.players.find((p) => p.id === id) ?? null;
}

/** Min höjd på tur-banner — används för padding så brädet inte döljs under bannern. */
const TABLE_TURN_BANNER_RESERVE_PX = 112;
/** Extra utrymme när statusrad (t.ex. sömn) visas under namnet */
const TABLE_TURN_BANNER_RESERVE_WITH_STATUS_PX = 148;

/** Synliga tillstånd för spelare på brädet (sömn = hoppar turer). */
function tablePlayerAfflictionLines(p: Player): string[] {
  const lines: string[] = [];
  if ((p.skippedTurns ?? 0) > 0) {
    lines.push(sv.table.playerStatusSleepSkip(p.skippedTurns ?? 0));
  }
  return lines;
}

function pendingCardOwner(state: GameState | null) {
  if (!state) return null;
  const pending = state.pending;
  if (!pending || pending.type !== "card") return null;
  return state.players.find((p) => p.id === pending.playerId) ?? null;
}

type TableCombatPending = Extract<NonNullable<GameState["pending"]>, { type: "combat" }>;

/** Kort/items + vapnets sip-bonus (läggs på vid slag) — samma delar som motorn använder till attacktärningen. */
function boardAttackerOutgoingRollModifier(pending: TableCombatPending, state: GameState): number {
  const attacker = state.players.find((p) => p.id === pending.attackerId);
  const fromCards = pending.attackMods?.[pending.attackerId] ?? 0;
  const fromItems = attacker?.nextCombatModifier ?? 0;
  const fromWeaponSip = attacker?.equipment.weapon?.sipAttackBonus ?? 0;
  return fromCards + fromItems + fromWeaponSip;
}

function formatSignedDiceModifier(sum: number): string | null {
  if (sum === 0) return null;
  return sum > 0 ? `+${sum}` : String(sum);
}

/** Tärningsstorlek i monster-raden: samma för idle-spin och resultat. */
const TABLE_MONSTER_COMBAT_DICE_PX = 78;

function TableCombatBoardPanel({ state }: { state: GameState }) {
  const pending = state.pending;
  const showMonsterForDiceAnim = pending?.type === "combat" && pending.monsterId !== "boss";

  const combatDiceAnimKey =
    pending?.type === "combat"
      ? `${pending.phase}-${pending.monsterId}-${pending.attackerId}-${pending.tileIndex}`
      : "";

  const prevCombatPhaseRef = useRef<string | undefined>(undefined);
  /** Bordsmonster: intro → skjut kort höger → visa tärning vänster (samma DOM som intro = ingen blink). */
  const [monsterTableAnim, setMonsterTableAnim] = useState<"intro" | "shiftRight" | "diceIn">("intro");

  useEffect(() => {
    const p = state.pending;
    if (!p || p.type !== "combat") return;

    const prev = prevCombatPhaseRef.current;

    if (p.phase === "enemyIntro") {
      prevCombatPhaseRef.current = p.phase;
      setMonsterTableAnim("intro");
      return;
    }

    const isDicePhase =
      p.phase === "reactions" || p.phase === "rollPreview" || p.phase === "chooseHitMitigation";

    if (!isDicePhase || !showMonsterForDiceAnim) {
      prevCombatPhaseRef.current = p.phase;
      return;
    }

    const reducedMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
      prevCombatPhaseRef.current = p.phase;
      setMonsterTableAnim("diceIn");
      return;
    }

    if (prev === "enemyIntro" && p.phase === "reactions") {
      prevCombatPhaseRef.current = p.phase;
      setMonsterTableAnim("intro");
      let outer = 0;
      let inner = 0;
      let to: ReturnType<typeof setTimeout> | undefined;
      outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => {
          setMonsterTableAnim("shiftRight");
          to = setTimeout(() => setMonsterTableAnim("diceIn"), 520);
        });
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
        if (to) clearTimeout(to);
      };
    }

    prevCombatPhaseRef.current = p.phase;
    setMonsterTableAnim("diceIn");
  }, [showMonsterForDiceAnim, combatDiceAnimKey]);

  if (!pending || pending.type !== "combat") return null;

  if (pending.phase === "chooseTeammate" && pending.teamBattleRequired) {
    const att = state.players.find((p) => p.id === pending.attackerId);
    return (
      <TeamBattleIntroCard
        variant="table"
        attackerName={att?.name ?? "?"}
        tableOverlayAnimation={TABLE_BOARD_MODAL_OVERLAY_ANIMATION}
        tableCardEntranceAnimation={TABLE_BOARD_MODAL_CARD_ANIMATION}
      />
    );
  }

  const attacker = state.players.find((p) => p.id === pending.attackerId);
  const isFinalBossCombat = isFinalBossMonsterId(pending.monsterId as MonsterId);
  const bossIntroPulse = isFinalBossCombat && pending.phase === "enemyIntro";
  const need = pending.need + (pending.needMod ?? 0);
  const reactorNames = (pending.reactors ?? [])
    .map((id) => state.players.find((p) => p.id === id))
    .filter((p): p is Player => !!p && playerCanCombatIntervene(p))
    .map((p) => p.name);
  const showMonsterCard = pending.monsterId !== "boss";
  const diceBesideCardPhases =
    pending.phase === "reactions" || pending.phase === "rollPreview" || pending.phase === "chooseHitMitigation";
  const monsterDiceHeroLayout = showMonsterCard && diceBesideCardPhases;
  /** Monster: samma rad + inbäddad CardFlipScene så kortet inte unmountas intro → tärning. */
  const monsterTableRowPhases =
    showMonsterCard &&
    (pending.phase === "enemyIntro" ||
      pending.phase === "reactions" ||
      pending.phase === "rollPreview" ||
      pending.phase === "chooseHitMitigation");

  const overlayStyle: CSSProperties = {
    pointerEvents: "none",
    placeItems: "start center",
    paddingTop: 70,
    paddingLeft: 12,
    paddingRight: 12,
    background: bossIntroPulse ? TABLE_BOSS_OVERLAY_BG : TABLE_BOARD_OVERLAY_BG,
    backgroundRepeat: bossIntroPulse ? "no-repeat" : undefined,
    backgroundSize: bossIntroPulse ? "100% 100%, 100% 100%" : undefined,
    backgroundPosition: bossIntroPulse ? "50% 16%, 50% 50%" : undefined,
    animation: bossIntroPulse
      ? `${TABLE_BOARD_MODAL_OVERLAY_ANIMATION}, ${TABLE_BOSS_OVERLAY_PULSE}`
      : TABLE_BOARD_MODAL_OVERLAY_ANIMATION,
  };

  const innerPanelStyle: CSSProperties = {
    width: "100%",
    borderRadius: 16,
    border: "1px solid #ffffff22",
    background: "rgba(11, 18, 38, 0.94)",
    padding: 16,
    textAlign: "left",
    boxShadow: "0 16px 48px rgba(0,0,0,0.45)",
    overflow: "visible",
  };

  const phaseLine =
    pending.phase === "chooseTeammate"
      ? sv.table.combatPhaseTeam
      : pending.phase === "enemyIntro"
        ? sv.table.combatPhase1
        : pending.phase === "reactions"
          ? sv.table.combatPhase2
          : pending.phase === "chooseHitMitigation"
            ? sv.table.combatPhase3Choice
            : sv.table.combatPhase3Result;

  /** Boss / icke-kort: behåll äldre batch- + fasrubriker. */
  const combatBoardBossHeaderLines = (
    <>
      <div style={{ opacity: 0.8, fontSize: 12, marginBottom: 6 }}>{sv.table.combatOverlayTitle}</div>
      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>{phaseLine}</div>
      <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>
        <b>{attacker?.name ?? "?"}</b> {sv.table.isFighting}
      </div>
      {pending.teamBattleRequired && !pending.assistId ? (
        <div style={{ opacity: 0.88, marginBottom: 8 }}>
          Team battle: <b>väntar på val av medkämpe</b>
        </div>
      ) : pending.assistId ? (
        <div style={{ opacity: 0.88, marginBottom: 8 }}>
          {pending.teamBattleRequired ? "Team battle:" : "Ölkompis:"}{" "}
          <b>{state.players.find((p) => p.id === pending.assistId)?.name ?? "okänd"}</b>
        </div>
      ) : null}
    </>
  );

  const monsterMeetTitleStyle: CSSProperties = {
    fontFamily: '"Permanent Marker", var(--heading), sans-serif',
    fontWeight: 900,
    fontSize: "clamp(26px, 5.5vw, 36px)",
    textAlign: "center",
    color: "#f8fafc",
    letterSpacing: "0.04em",
    lineHeight: 1.05,
    marginBottom: 28,
    textShadow: "0 2px 18px rgba(0,0,0,0.45)",
  };

  const monsterMeetHeader = (
    <>
      <div style={monsterMeetTitleStyle}>
        {(attacker?.name ?? "?").toLocaleUpperCase("sv-SE")} MÖTER
      </div>
      {pending.teamBattleRequired && !pending.assistId ? (
        <div
          style={{
            textAlign: "center",
            opacity: 0.95,
            marginBottom: 10,
            fontSize: 14,
            color: "#f1f5f9",
            textShadow: "0 1px 3px rgba(0,0,0,0.85), 0 0 10px rgba(0,0,0,0.45)",
          }}
        >
          Team battle: <b>väntar på val av medkämpe</b>
        </div>
      ) : pending.assistId ? (
        <div
          style={{
            textAlign: "center",
            opacity: 0.95,
            marginBottom: 10,
            fontSize: 14,
            color: "#f1f5f9",
            textShadow: "0 1px 3px rgba(0,0,0,0.85), 0 0 10px rgba(0,0,0,0.45)",
          }}
        >
          {pending.teamBattleRequired ? "Team battle:" : "Ölkompis:"}{" "}
          <b>{state.players.find((p) => p.id === pending.assistId)?.name ?? "okänd"}</b>
        </div>
      ) : null}
    </>
  );

  const boardMonsterCardProps = {
    title: pending.enemyName,
    artKey: pending.enemyArtKey,
    combatStrength: need,
    winGold: pending.rewardGold ?? 0,
    winItems: pending.rewardItems ?? 0,
    lossDamage: pending.baseDamage,
    lossKlunks: combatLossKlunksForDisplay(pending),
    specialRules: pending.enemyIntroText?.trim() || undefined,
    bossLivesRemaining: isFinalBossCombat ? (state.finalBossLivesRemaining ?? 3) : undefined,
    bossWinLootAsDash: isFinalBossCombat,
  };
  const combatBoardMonsterFlipKey = `${pending.levelIndex}-${pending.tileIndex}-${pending.monsterId}-${pending.attackerId}`;
  const monsterEncounterCardEl = showMonsterCard ? (
    <MonsterEncounterCard {...boardMonsterCardProps} fillAvailableHeight={false} />
  ) : null;

  const diceHeroMotionEase = "cubic-bezier(0.22, 0.61, 0.36, 1)";
  const showMonsterDiceColumn = monsterTableAnim === "diceIn" && diceBesideCardPhases;
  const boardDiceModifierLabel =
    pending.phase === "reactions"
      ? formatSignedDiceModifier(boardAttackerOutgoingRollModifier(pending, state))
      : null;
  const monsterCardWrapTransform =
    monsterTableAnim === "intro"
      ? "translateX(0) rotate(0deg)"
      : monsterTableAnim === "shiftRight"
        ? "translateX(36px) rotate(0deg)"
        : "translateX(8px) rotate(5deg)";

  const headerAndMonster = (
    <>
      {showMonsterCard ? monsterMeetHeader : combatBoardBossHeaderLines}
      {showMonsterCard ? (
        monsterTableRowPhases ? (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
              marginTop: 2,
              marginBottom: 8,
              width: "100%",
              gap: showMonsterDiceColumn ? 20 : 0,
            }}
          >
            <div
              style={{
                width: showMonsterDiceColumn ? 200 : 0,
                opacity: showMonsterDiceColumn ? 1 : 0,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                flexShrink: 0,
                transition: `width 0.5s ${diceHeroMotionEase}, opacity 0.45s ${diceHeroMotionEase}`,
                pointerEvents: showMonsterDiceColumn ? "auto" : "none",
              }}
            >
              <div
                style={{
                  padding: "22px 30px",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.06) 42%, transparent 68%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 140,
                }}
              >
                {pending.phase === "reactions" ? (
                  <DiceCube3D idleSpin size={TABLE_MONSTER_COMBAT_DICE_PX} />
                ) : (
                  <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center" }}>
                    <DiceCube3D value={pending.previewDie ?? 1} size={TABLE_MONSTER_COMBAT_DICE_PX} oneAsMonsterIcon />
                    {pending.previewBroDie != null ? (
                      <DiceCube3D value={pending.previewBroDie} size={TABLE_MONSTER_COMBAT_DICE_PX} oneAsMonsterIcon />
                    ) : null}
                  </div>
                )}
              </div>
              {boardDiceModifierLabel ? (
                <div
                  style={{
                    fontFamily: '"Permanent Marker", var(--heading), sans-serif',
                    fontWeight: 400,
                    fontSize: "clamp(30px, 7vw, 44px)",
                    lineHeight: 1,
                    letterSpacing: "0.02em",
                    color: "#f8fafc",
                    textAlign: "center",
                    textShadow: "0 2px 12px rgba(0,0,0,0.75), 0 0 20px rgba(0,0,0,0.45)",
                  }}
                >
                  {boardDiceModifierLabel}
                </div>
              ) : null}
              {pending.phase === "chooseHitMitigation" ? (
                <div
                  style={{
                    fontSize: 13,
                    textAlign: "center",
                    maxWidth: 248,
                    lineHeight: 1.35,
                    color: "#f1f5f9",
                    textShadow: "0 1px 3px rgba(0,0,0,0.85), 0 0 14px rgba(0,0,0,0.55)",
                  }}
                >
                  {sv.table.attackerChoosesHit(pending.monsterId === "kapten_interrobang" ? 3 : 2)}
                </div>
              ) : null}
            </div>
            <div
              style={{
                width: "100%",
                maxWidth: 400,
                flex: "0 1 auto",
                transform: monsterCardWrapTransform,
                transformOrigin: "center center",
                transition: `transform 0.55s ${diceHeroMotionEase}`,
                boxSizing: "border-box",
              }}
            >
              <CardFlipScene
                key={combatBoardMonsterFlipKey}
                maxWidth={400}
                faceInnerClassName={cardFlipShellStyles.faceInnerNoVerticalOverflow}
                blockPointerUntilFlipped={false}
              >
                <MonsterEncounterCard {...boardMonsterCardProps} fillAvailableHeight />
              </CardFlipScene>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 8 }}>{monsterEncounterCardEl}</div>
        )
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
    </>
  );

  const reactionsAndDice = (
    <>
      {pending.phase === "reactions" && reactorNames.length > 0 && (
        <div
          style={{
            marginTop: monsterDiceHeroLayout ? 2 : 12,
            fontSize: 13,
            opacity: 0.95,
            textAlign: "center",
            ...(showMonsterCard && monsterDiceHeroLayout
              ? { textShadow: "0 1px 3px rgba(0,0,0,0.85), 0 0 12px rgba(0,0,0,0.5)", color: "#f1f5f9" }
              : {}),
          }}
        >
          <b>{sv.table.canIntervene}</b> {reactorNames.join(", ")}
        </div>
      )}
      {(pending.phase === "rollPreview" || pending.phase === "chooseHitMitigation") && !monsterDiceHeroLayout && (
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <DiceCube3D value={pending.previewDie ?? 1} size={TABLE_MONSTER_COMBAT_DICE_PX} oneAsMonsterIcon />
          {pending.previewBroDie != null ? (
            <DiceCube3D value={pending.previewBroDie} size={TABLE_MONSTER_COMBAT_DICE_PX} oneAsMonsterIcon />
          ) : null}
          {pending.phase === "chooseHitMitigation" ? (
            <div style={{ fontSize: 14, maxWidth: 280, lineHeight: 1.35 }}>
              {sv.table.attackerChoosesHit(pending.monsterId === "kapten_interrobang" ? 3 : 2)}
            </div>
          ) : null}
        </div>
      )}
    </>
  );

  if (pending.phase === "enemyIntro" && !showMonsterCard) {
    return (
      <CardFlipModalShell
        zIndex={44}
        maxWidth={400}
        blockPointerUntilFlipped={false}
        style={overlayStyle}
        aboveScene={combatBoardBossHeaderLines}
      >
        <div
          style={{
            ...innerPanelStyle,
            padding: "0 16px 16px",
            display: "flex",
            flexDirection: "column",
            minHeight: "100%",
            textAlign: "left",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 24, lineHeight: 1.05, color: "#f8fafc", marginBottom: 8 }}>
            {pending.enemyName}
          </div>
          <div style={{ opacity: 0.88, marginBottom: 8 }}>
            {sv.table.strength}: {need}
          </div>
        </div>
      </CardFlipModalShell>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 42,
        display: "grid",
        placeItems: "start center",
        paddingTop: 70,
        paddingLeft: 12,
        paddingRight: 12,
        background: bossIntroPulse ? TABLE_BOSS_OVERLAY_BG : TABLE_BOARD_OVERLAY_BG,
        backgroundRepeat: bossIntroPulse ? "no-repeat" : undefined,
        backgroundSize: bossIntroPulse ? "100% 100%, 100% 100%" : undefined,
        backgroundPosition: bossIntroPulse ? "50% 16%, 50% 50%" : undefined,
        animation: bossIntroPulse
          ? `${TABLE_BOARD_MODAL_OVERLAY_ANIMATION}, ${TABLE_BOSS_OVERLAY_PULSE}`
          : TABLE_BOARD_MODAL_OVERLAY_ANIMATION,
      }}
    >
      <div
        style={{
          width: "min(720px, 92vw)",
          textAlign: "left",
          overflow: "visible",
          ...(showMonsterCard
            ? {
                borderRadius: 0,
                border: "none",
                background: "transparent",
                padding: "4px 8px",
                boxShadow: "none",
              }
            : {
                borderRadius: 16,
                border: "1px solid #ffffff22",
                background: "rgba(11, 18, 38, 0.94)",
                padding: 16,
                boxShadow: "0 16px 48px rgba(0,0,0,0.45)",
                animation: TABLE_BOARD_MODAL_CARD_ANIMATION,
                transformOrigin: "top center",
              }),
        }}
      >
        {headerAndMonster}
        {reactionsAndDice}
      </div>
    </div>
  );
}

const PVP_MARKER = '"Permanent Marker", var(--heading), sans-serif' as const;

function TablePvpBoardPanel({ state }: { state: GameState }) {
  const pending = state.pending;
  if (!pending || pending.type !== "pvp") return null;
  const attacker = state.players.find((p) => p.id === pending.attackerId);
  const defender = state.players.find((p) => p.id === pending.defenderId);
  if (!attacker || !defender) return null;
  const ra = pending.rolls?.[pending.attackerId];
  const rd = pending.rolls?.[pending.defenderId];
  const rt = pending.resolvedTotals;
  const pvpRoundN = pending.pvpRound ?? 1;
  const awaiting = pending.phase === "awaitingRolls";

  function PvpFighterColumn(props: {
    role: string;
    player: (typeof state.players)[0];
    roll: { die: number; total: number } | undefined;
    nameRotateDeg: number;
  }) {
    return (
      <div
        style={{
          flex: "1 1 140px",
          minWidth: 0,
          maxWidth: 280,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          padding: "8px 4px",
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", opacity: 0.72 }}>{props.role}</div>
        <div
          style={{
            fontFamily: PVP_MARKER,
            fontSize: "clamp(22px, 4.2vw, 34px)",
            lineHeight: 1.05,
            color: props.player.color,
            transform: `rotate(${props.nameRotateDeg}deg)`,
            textAlign: "center",
            wordBreak: "break-word",
          }}
        >
          {props.player.name}
        </div>
        {props.roll ? (
          <>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <DiceCube3D value={props.roll.die} size={52} />
            </div>
            <div style={{ fontSize: 13, opacity: 0.9, textAlign: "center" }}>
              {sv.table.dieAttackTotal(props.roll.die, props.roll.total)}
            </div>
          </>
        ) : (
          <div style={{ opacity: 0.55, fontSize: 13, textAlign: "center", maxWidth: 200 }}>{sv.table.waitingRoll}</div>
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
            fontFamily: PVP_MARKER,
            fontSize: "clamp(36px, 7vw, 52px)",
            lineHeight: 1.05,
            marginBottom: 6,
            color: "#fef9c3",
            textShadow: "0 0 28px rgba(251, 191, 36, 0.35)",
          }}
        >
          {sv.table.pvpDuel}
        </div>
        {awaiting ? (
          <div
            style={{
              fontFamily: PVP_MARKER,
              fontSize: "clamp(16px, 3.2vw, 22px)",
              color: "rgba(255,255,255,0.88)",
              marginBottom: pvpRoundN > 1 ? 6 : 16,
            }}
          >
            {sv.table.pvpRound(pvpRoundN)}
          </div>
        ) : (
          <div style={{ height: 8 }} />
        )}
        {awaiting && pvpRoundN > 1 ? (
          <div style={{ marginBottom: 16, fontSize: 13, fontWeight: 600, opacity: 0.82 }}>{sv.table.pvpTieRerollHint}</div>
        ) : awaiting ? null : (
          <div style={{ marginBottom: 8 }} />
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          <PvpFighterColumn role={sv.table.roleAttacker} player={attacker} roll={ra} nameRotateDeg={-11} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: PVP_MARKER,
              fontSize: "clamp(32px, 6vw, 44px)",
              lineHeight: 1,
              color: "#fff",
              opacity: 0.92,
              padding: "0 2px",
              flex: "0 0 auto",
            }}
          >
            VS
          </div>
          <PvpFighterColumn role={sv.table.roleDefender} player={defender} roll={rd} nameRotateDeg={11} />
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

type TableLobbyPlayer = GameState["players"][number];

function TableLobbyPlayerRow({ p }: { p: TableLobbyPlayer }) {
  const afflictions = tablePlayerAfflictionLines(p);
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          background: p.color,
          borderRadius: 10,
          padding: "8px 12px",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
        }}
      >
        <div
          style={{
            fontWeight: 800,
            color: "#fafafa",
            textShadow: "0 1px 2px rgba(0,0,0,0.75)",
          }}
        >
          <span>
            {p.name}
            {p.isHost ? " (värd)" : ""}
          </span>
          {afflictions.length > 0 ? (
            <div
              style={{
                marginTop: 4,
                fontSize: 11,
                fontWeight: 700,
                lineHeight: 1.35,
                opacity: 0.92,
                wordBreak: "break-word",
              }}
            >
              {afflictions.join(" · ")}
            </div>
          ) : null}
        </div>
      </div>
      <span
        title={p.ready ? sv.play.ready : sv.play.unready}
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          flexShrink: 0,
          background: p.ready ? "#22c55e" : "#ef4444",
          border: "1px solid rgba(255,255,255,0.35)",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.25)",
        }}
        aria-label={p.ready ? sv.play.ready : sv.play.unready}
      />
    </div>
  );
}

function tablePlayersAtTile(
  players: GameState["players"] | undefined,
  levelIndex: number,
  tileIndex: number,
  nTiles: number,
) {
  if (!players?.length) return [];
  return players.filter((p) => {
    if (p.levelIndex !== levelIndex) return false;
    const ti = nTiles <= 0 ? 0 : Math.min(Math.max(0, p.tileIndex), nTiles - 1);
    return ti === tileIndex;
  });
}

export function TableView() {
  const [sp] = useSearchParams();
  const room = (sp.get("room") ?? "").toUpperCase() || "TEST1";
  const name = sp.get("name") ?? "Bord";

  const [state, setState] = useState<GameState | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [lastStateAt, setLastStateAt] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTileTypeLabels, setShowTileTypeLabels] = useState(false);

  const stackLevels = state?.levels?.length ? state.levels : [];

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
  /** Kamera: ny tur → hel våning; rörelseval → inzoom mot målrutor; landning → följ ny ruta. */
  const prevTurnIndexForCamRef = useRef<number | null>(null);
  const turnStartTileKeyForCamRef = useRef<string | null>(null);

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
          setLastStateAt(Date.now());
          setErr(null);
        }
      },
    });
  useEffect(() => {
    if (status === "connected" || status === "connecting") setErr(null);
  }, [status]);

  useEffect(() => {
    // Under spel styr tur-byten kameran per våning — undvik att hoppa till alla våningars mitt.
    if (state?.phase === "playing") return;
    targetCam.current = {
      ...targetCam.current,
      x: -(totalSvgWidth / 2),
      y: -(boardHeight / 2),
    };
  }, [boardWidth, boardHeight, totalSvgWidth, state?.phase]);

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

  useEffect(() => {
    if (!state || state.phase !== "playing") {
      prevTurnIndexForCamRef.current = null;
      turnStartTileKeyForCamRef.current = null;
      return;
    }
    const p = activePlayer(state);
    if (!p) return;
    const lvls = state.levels;
    if (!lvls?.length) return;

    const { w: viewW, h: viewH } = boardViewportPx;
    if (viewW < 48 || viewH < 48) return;

    const turnChanged = prevTurnIndexForCamRef.current !== state.currentTurnIndex;
    const pend = state.pending;

    const xForLevel = (levelIndex: number) => levelIndex * (boardWidth + RING_STACK_GAP);
    const ringMargin = targetRingOutset + 6;

    const applyTightCam = (mode: "player" | "moveChoice" | "card") => {
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      const includeTile = (levelIndex: number, tileIndex: number) => {
        const level = lvls[levelIndex];
        if (!level || tileIndex < 0 || tileIndex >= level.tiles.length) return;
        const xOff = xForLevel(levelIndex);
        const { col, row } = ringPos(gridSize, tileIndex);
        const left = xOff + boardPad + col * tileSize - ringMargin;
        const top = boardPad + row * tileSize - ringMargin;
        const right = xOff + boardPad + (col + 1) * tileSize + ringMargin;
        const bottom = boardPad + (row + 1) * tileSize + ringMargin;
        minX = Math.min(minX, left);
        minY = Math.min(minY, top);
        maxX = Math.max(maxX, right);
        maxY = Math.max(maxY, bottom);
      };

      includeTile(p.levelIndex, p.tileIndex);
      if (mode === "moveChoice" && pend?.type === "moveChoice") {
        for (const o of pend.options) {
          includeTile(o.target.levelIndex, o.target.tileIndex);
        }
      }
      if (mode === "card" && pend?.type === "card") {
        const owner = state.players.find((x) => x.id === pend.playerId);
        if (owner) includeTile(owner.levelIndex, owner.tileIndex);
      }

      if (!Number.isFinite(minX)) return;

      const contentW = Math.max(1, maxX - minX);
      const contentH = Math.max(1, maxY - minY);
      const breathe = tileSize * 0.2;
      const boxW = contentW + breathe;
      const boxH = contentH + breathe;
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const fitMargin = 0.9;
      const desiredScale = clamp(
        Math.min((viewW * fitMargin) / boxW, (viewH * fitMargin) / boxH),
        0.45,
        1.85,
      );
      targetCam.current = {
        ...targetCam.current,
        x: -desiredScale * centerX,
        y: -desiredScale * centerY,
        scale: desiredScale,
      };
    };

    if (pend?.type === "moveChoice") {
      applyTightCam("moveChoice");
      if (turnChanged) prevTurnIndexForCamRef.current = state.currentTurnIndex;
      return;
    }

    if (pend?.type === "card") {
      applyTightCam("card");
      if (turnChanged) prevTurnIndexForCamRef.current = state.currentTurnIndex;
      return;
    }

    if (turnChanged) {
      prevTurnIndexForCamRef.current = state.currentTurnIndex;
      turnStartTileKeyForCamRef.current = `${p.levelIndex}-${p.tileIndex}`;
      const xOff = p.levelIndex * (boardWidth + RING_STACK_GAP);
      const centerX = xOff + boardWidth / 2;
      const centerY = boardHeight / 2;
      const fitMargin = 0.92;
      const desiredScale = clamp(
        Math.min((viewW * fitMargin) / boardWidth, (viewH * fitMargin) / boardHeight),
        0.45,
        2,
      );
      targetCam.current = {
        ...targetCam.current,
        x: -desiredScale * centerX,
        y: -desiredScale * centerY,
        scale: desiredScale,
      };
      return;
    }

    const tileKey = `${p.levelIndex}-${p.tileIndex}`;
    if (tileKey !== turnStartTileKeyForCamRef.current) {
      applyTightCam("player");
      turnStartTileKeyForCamRef.current = tileKey;
    }
  }, [
    state?.currentTurnIndex,
    state?.phase,
    state?.pending,
    state?.players,
    boardPad,
    boardWidth,
    boardHeight,
    RING_STACK_GAP,
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
  const moveTargets =
    state?.pending?.type === "moveChoice"
      ? new Set(state.pending.options.map((o) => `${o.target.levelIndex}-${o.target.tileIndex}`))
      : null;

  const playingTurn = state?.phase === "playing" && cur;
  const nextPlayer = playingTurn ? nextTurnPlayer(state) : null;
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
  const turnBannerBottomReservePx =
    playingTurn && currentTurnAfflictions.length > 0
      ? TABLE_TURN_BANNER_RESERVE_WITH_STATUS_PX
      : TABLE_TURN_BANNER_RESERVE_PX;

  return (
    <div
      style={{
        minHeight: "100vh",
        height: "100dvh",
        maxHeight: "100dvh",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        overflow: "hidden",
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr)",
        gridTemplateColumns: "minmax(0, 1fr)",
        background: "#0b1020",
        color: "#e5e7eb",
        boxSizing: "border-box",
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          borderBottom: "1px solid #ffffff22",
          minWidth: 0,
          maxWidth: "100%",
          width: "100%",
          overflow: "hidden",
        }}
      >
        <header
          style={{
            padding: "8px 10px",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: 8,
            alignItems: "center",
            columnGap: 10,
            minWidth: 0,
          }}
        >
          <div
            style={{
              minWidth: 0,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "4px 10px",
            }}
          >
            <span style={{ fontWeight: 700, flexShrink: 0 }}>{sv.table.board}</span>
            <span
              style={{
                opacity: 0.85,
                fontSize: 13,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "100%",
              }}
              title={`${sv.table.lobby}: ${room}`}
            >
              {sv.table.lobby}: {room}
            </span>
            <span style={{ opacity: 0.85, fontSize: 13, flexShrink: 0 }}>
              {sv.table.status}: {wsStatusLabel(status)}
            </span>
            <span
              style={{
                opacity: 0.7,
                fontSize: 11,
                minWidth: 0,
                flex: "1 1 120px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={
                lastStateAt
                  ? `${sv.table.lastState}: ${new Date(lastStateAt).toLocaleTimeString()}`
                  : undefined
              }
            >
              {sv.table.lastState}: {lastStateAt ? new Date(lastStateAt).toLocaleTimeString() : "—"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
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
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          maxWidth: "100%",
          height: "100%",
          overflow: "hidden",
          alignItems: "stretch",
          paddingBottom: playingTurn
            ? `calc(${turnBannerBottomReservePx}px + env(safe-area-inset-bottom, 0px))`
            : undefined,
          boxSizing: "border-box",
        }}
      >
        <div
          ref={boardViewportRef}
          style={{
            position: "relative",
            overflow: "hidden",
            flex: "1 1 0%",
            minWidth: 0,
            minHeight: 0,
            height: "100%",
            contain: "layout",
          }}
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
              width={totalSvgWidth}
              height={totalSvgHeight}
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
                        const isTarget = moveTargets?.has(`${li}-${i}`) ?? false;
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
                        const nTiles = level.tiles.length;
                        const here = tablePlayersAtTile(state?.players, li, i, nTiles);
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
          </div>

          {state?.phase === "lobby" ? (
            <div
              role="dialog"
              aria-label={sv.table.lobby}
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "min(20px, 4vw)",
                boxSizing: "border-box",
                background: "rgba(7, 11, 24, 0.9)",
                backdropFilter: "blur(10px)",
              }}
            >
              <div
                style={{
                  width: "min(440px, 100%)",
                  maxHeight: "min(88dvh, 100%)",
                  overflow: "auto",
                  borderRadius: 16,
                  border: "1px solid #ffffff2e",
                  background: "linear-gradient(165deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.99) 100%)",
                  boxShadow: "0 20px 50px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)",
                  padding: "clamp(22px, 4.5vmin, 36px)",
                }}
              >
                <div
                  style={{
                    fontSize: "clamp(2.4rem, 10vmin, 4rem)",
                    fontWeight: 900,
                    letterSpacing: "0.14em",
                    lineHeight: 1.05,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                    color: "#f8fafc",
                    textShadow: "0 2px 16px rgba(0,0,0,0.55)",
                    textAlign: "center",
                    marginBottom: 4,
                    wordBreak: "break-all",
                  }}
                >
                  {room}
                </div>
                <h2
                  style={{
                    margin: "12px 0 6px",
                    fontSize: "clamp(1.2rem, 3.2vmin, 1.55rem)",
                    fontWeight: 900,
                    textAlign: "center",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {sv.table.lobby}
                </h2>
                <div
                  style={{
                    textAlign: "center",
                    opacity: 0.88,
                    fontSize: "clamp(0.9rem, 2.4vmin, 1rem)",
                    fontWeight: 700,
                    marginBottom: 18,
                  }}
                >
                  {sv.table.readyAll(readyCount, state.players.length)}
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {state.players.map((p) => (
                    <TableLobbyPlayerRow key={p.id} p={p} />
                  ))}
                </div>
              </div>
            </div>
          ) : state?.phase === "ended" ? (
            <div
              role="dialog"
              aria-label={sv.play.gameOver}
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "min(20px, 4vw)",
                boxSizing: "border-box",
                background: "rgba(7, 11, 24, 0.92)",
                backdropFilter: "blur(10px)",
              }}
            >
              <div
                style={{
                  width: "min(480px, 100%)",
                  maxHeight: "min(88dvh, 100%)",
                  overflow: "auto",
                  borderRadius: 16,
                  border: "1px solid #ffffff2e",
                  background: "linear-gradient(165deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.99) 100%)",
                  padding: "clamp(22px, 4.5vmin, 36px)",
                  color: "#f8fafc",
                }}
              >
                <h2 style={{ marginTop: 0, textAlign: "center" }}>{sv.play.gameOver}</h2>
                <p style={{ textAlign: "center", marginBottom: 16 }}>
                  {sv.play.winner}: <b>{state.winnerName ?? "—"}</b>
                </p>
                <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>{sv.play.scoreboardTitle}</h3>
                <p style={{ margin: "0 0 12px", opacity: 0.8, fontSize: 13 }}>{sv.play.scoreboardHint}</p>
                <ol style={{ margin: 0, paddingLeft: 22, display: "grid", gap: 12, fontSize: 15 }}>
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
                      <li
                        key={p.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <EndedScoreboardPlayerLine player={p} isWinner={p.id === state.winnerId} />
                      </li>
                    ))}
                </ol>
              </div>
            </div>
          ) : null}
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
            /**
             * Bredd i % av *flex-raden* — inte 100vw (som räknar hela skärmen och ignorerar att
             * brädet redan tar plats). Det var orsaken till overflow efter fler våningar + smal viewport.
             */
            flexGrow: 0,
            flexShrink: 1,
            flexBasis: sidebarOpen ? "min(380px, 42%)" : 0,
            width: sidebarOpen ? "min(380px, 42%)" : 0,
            minWidth: 0,
            maxWidth: sidebarOpen ? "min(380px, 42%)" : 0,
            borderLeft: sidebarOpen ? "1px solid #ffffff22" : "none",
            padding: sidebarOpen ? "10px min(12px, 3vw)" : 0,
            overflowX: "hidden",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            boxSizing: "border-box",
            transition: "width 0.2s ease, max-width 0.2s ease, padding 0.2s ease, border-color 0.15s ease",
            opacity: sidebarOpen ? 1 : 0,
            pointerEvents: sidebarOpen ? "auto" : "none",
            wordBreak: "break-word",
            overflowWrap: "anywhere",
          }}
        >
          <h2 style={{ marginTop: 0 }}>{sv.table.game}</h2>
          {!state && <div style={{ opacity: 0.8 }}>{sv.table.waitingState}</div>}
          {err && <div style={{ color: "#fca5a5" }}>{err}</div>}

          {state && (
            <>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                  cursor: "pointer",
                  userSelect: "none",
                  fontSize: 14,
                }}
              >
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
                  <div style={{ display: "grid", gap: 8 }}>
                    {state.players.map((p) => (
                      <TableLobbyPlayerRow key={p.id} p={p} />
                    ))}
                  </div>
                </>
              ) : null}

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

      <style>{TABLE_BOARD_MODAL_KEYFRAMES_CSS}</style>

      {state?.pending?.type === "combat" && tableCombatModalReady && <TableCombatBoardPanel state={state} />}

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
            background: TABLE_BOARD_OVERLAY_BG,
            animation: TABLE_BOARD_MODAL_OVERLAY_ANIMATION,
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
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 40000,
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
            minWidth: 0,
            boxSizing: "border-box",
            pointerEvents: "none",
          }}
          aria-live="polite"
        >
          <div
            className={[
              turnBannerStyles.colorBar,
              turnBannerHandoff ? turnBannerStyles.colorBarHandoff : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              background: cur!.color,
              minHeight: currentTurnAfflictions.length > 0 ? 118 : 96,
              padding: "16px 20px",
              boxShadow: "0 -8px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18)",
              minWidth: 0,
            }}
          >
            {turnBannerHandoff ? (
              <div className={turnBannerStyles.shineSweep} key={cur!.id} aria-hidden />
            ) : null}
            <div
              className={turnBannerStyles.bannerContent}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) max-content",
                alignItems: "center",
                gap: 14,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  minWidth: 0,
                  gap: 6,
                  overflow: "hidden",
                }}
              >
                <h1
                  className={turnBannerHandoff ? turnBannerStyles.playerNameHandoff : undefined}
                  style={{
                    margin: 0,
                    fontSize: "clamp(1.35rem, 5.5vmin, 2.35rem)",
                    fontWeight: 900,
                    lineHeight: 1.12,
                    color: "#fafafa",
                    textShadow: "0 2px 4px rgba(0,0,0,0.55), 0 0 1px rgba(0,0,0,0.85)",
                    letterSpacing: "-0.02em",
                    textAlign: "center",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    width: "100%",
                    maxWidth: "100%",
                  }}
                >
                  {cur!.name}
                </h1>
                {currentTurnAfflictions.length > 0 ? (
                  <div
                    style={{
                      fontSize: "clamp(0.72rem, 2vmin, 0.95rem)",
                      fontWeight: 800,
                      lineHeight: 1.3,
                      color: "#fafafa",
                      textShadow: "0 1px 3px rgba(0,0,0,0.65)",
                      textAlign: "center",
                      maxWidth: "100%",
                      opacity: 0.95,
                      wordBreak: "break-word",
                    }}
                  >
                    {currentTurnAfflictions.join(" · ")}
                  </div>
                ) : null}
              </div>
              {nextPlayer ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: "clamp(0.82rem, 2.2vmin, 1.12rem)",
                      fontWeight: 800,
                      lineHeight: 1.25,
                      color: "#fafafa",
                      textShadow: "0 1px 3px rgba(0,0,0,0.65)",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      textAlign: "right",
                    }}
                    title={
                      [nextPlayer.name, ...tablePlayerAfflictionLines(nextPlayer)].filter(Boolean).join(" — ") ||
                      nextPlayer.name
                    }
                  >
                    {sv.table.turnBannerNext(nextPlayer.name)}
                  </span>
                </div>
              ) : (
                <div style={{ width: 1, flexShrink: 0 }} aria-hidden />
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showReconnectOverlay ? (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 45000,
            borderTop: "1px solid #ffffff22",
            background: "rgba(11, 18, 38, 0.92)",
            backdropFilter: "blur(8px)",
            padding: "8px 16px",
            paddingBottom: "max(8px, env(safe-area-inset-bottom))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            minWidth: 0,
            fontSize: 12,
            color: "#f8fafc",
          }}
        >
          <div
            style={{
              minWidth: 0,
              flex: "1 1 auto",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              opacity: 0.92,
            }}
          >
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

