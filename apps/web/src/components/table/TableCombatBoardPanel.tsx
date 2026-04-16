import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  FINAL_BOSS_LIFE_TOTAL,
  isFinalBossMonsterId,
  playerCanCombatIntervene,
  type GameState,
  type MonsterId,
  type Player,
} from "@bv/game-core";
import { DiceCube3D } from "../DiceCube3D";
import { TeamBattleIntroCard } from "../TeamBattleIntroCard";
import { MonsterEncounterCard } from "../MonsterEncounterCard";
import { CardFlipModalShell, CardFlipScene } from "../CardFlipModalShell";
import cardFlipShellStyles from "../CardFlipModalShell.module.css";
import { combatLossKlunksForDisplay } from "../../lib/combatUi";
import { sv } from "../../lib/uiStrings";
import {
  TABLE_BOARD_MODAL_CARD_ANIMATION,
  TABLE_BOARD_MODAL_OVERLAY_ANIMATION,
  TABLE_BOARD_OVERLAY_BG,
  TABLE_BOSS_OVERLAY_BG,
  TABLE_BOSS_OVERLAY_PULSE,
  TABLE_MONSTER_COMBAT_DICE_PX,
} from "./tableConstants";

type TableCombatPending = Extract<NonNullable<GameState["pending"]>, { type: "combat" }>;

function formatSignedDiceModifier(sum: number): string | null {
  if (sum === 0) return null;
  return sum > 0 ? `+${sum}` : String(sum);
}

/** Kort/items som alltid räknas in i attackmodifiern (t6 + kraft + detta). Pip-vapnets bonus visas separat som valfri. */
function boardAttackerOutgoingRollModifier(pending: TableCombatPending, state: GameState): number {
  const attacker = state.players.find((p) => p.id === pending.attackerId);
  const fromCards = pending.attackMods?.[pending.attackerId] ?? 0;
  const fromItems = attacker?.nextCombatModifier ?? 0;
  return fromCards + fromItems;
}

function boardAttackerOptionalSipWeaponBonus(state: GameState, pending: TableCombatPending): number {
  const attacker = state.players.find((p) => p.id === pending.attackerId);
  return attacker?.equipment.weapon?.sipAttackBonus ?? 0;
}

export function TableCombatBoardPanel(props: { state: GameState; playersById: Map<string, Player> }) {
  const { state, playersById } = props;
  const pending = state.pending;
  const showMonsterForDiceAnim = pending?.type === "combat" && pending.monsterId !== "boss";

  const combatDiceAnimKey =
    pending?.type === "combat" ? `${pending.phase}-${pending.monsterId}-${pending.attackerId}-${pending.tileIndex}` : "";

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

    const isDicePhase = p.phase === "reactions" || p.phase === "rollPreview" || p.phase === "chooseHitMitigation";

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
  }, [showMonsterForDiceAnim, combatDiceAnimKey, state.pending]);

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
  const need = pending.need + (pending.needMod ?? 0);
  const reactorNames = (pending.reactors ?? [])
    .map((id) => playersById.get(id))
    .filter((p): p is Player => !!p && playerCanCombatIntervene(p))
    .map((p) => p.name);
  const showMonsterCard = pending.monsterId !== "boss";
  const diceBesideCardPhases =
    pending.phase === "reactions" || pending.phase === "rollPreview" || pending.phase === "chooseHitMitigation";
  /** Slutboss: röd overlay under intro + tärnings-/resultatfas (reactions → rollPreview → chooseHitMitigation). */
  const bossCombatPulse = isFinalBossCombat && (pending.phase === "enemyIntro" || diceBesideCardPhases);
  const finalBossRoundLabel = (() => {
    if (!isFinalBossCombat) return null;
    const raw = state.finalBossLivesRemaining ?? FINAL_BOSS_LIFE_TOTAL;
    const lives = Math.max(1, Math.min(FINAL_BOSS_LIFE_TOTAL, Math.floor(raw)));
    const round = FINAL_BOSS_LIFE_TOTAL - lives + 1;
    return `RUNDA ${round} AV ${FINAL_BOSS_LIFE_TOTAL}`;
  })();
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
    background: bossCombatPulse ? TABLE_BOSS_OVERLAY_BG : TABLE_BOARD_OVERLAY_BG,
    backgroundRepeat: bossCombatPulse ? "no-repeat" : undefined,
    backgroundSize: bossCombatPulse ? "100% 100%, 100% 100%" : undefined,
    backgroundPosition: bossCombatPulse ? "50% 16%, 50% 50%" : undefined,
    animation: bossCombatPulse
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
      {finalBossRoundLabel ? (
        <div
          style={{
            fontFamily: '"Permanent Marker", var(--heading), sans-serif',
            fontWeight: 900,
            fontSize: "clamp(30px, 6.6vw, 48px)",
            textAlign: "center",
            color: "#f8fafc",
            letterSpacing: "0.07em",
            lineHeight: 1.02,
            marginBottom: 14,
            textShadow: "0 2px 14px rgba(0,0,0,0.8), 0 0 26px rgba(239,68,68,0.42)",
          }}
        >
          {finalBossRoundLabel}
        </div>
      ) : null}
      <div style={monsterMeetTitleStyle}>{(attacker?.name ?? "?").toLocaleUpperCase("sv-SE")} MÖTER</div>
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
      ? (() => {
          const base = boardAttackerOutgoingRollModifier(pending, state);
          const sipOpt = boardAttackerOptionalSipWeaponBonus(state, pending);
          const baseStr = formatSignedDiceModifier(base);
          if (sipOpt > 0) {
            return baseStr ? `${baseStr} ${sv.table.diceModifierOptionalSipSuffix(sipOpt)}` : sv.table.diceModifierOnlyOptionalSip(sipOpt);
          }
          return baseStr;
        })()
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
        background: bossCombatPulse ? TABLE_BOSS_OVERLAY_BG : TABLE_BOARD_OVERLAY_BG,
        backgroundRepeat: bossCombatPulse ? "no-repeat" : undefined,
        backgroundSize: bossCombatPulse ? "100% 100%, 100% 100%" : undefined,
        backgroundPosition: bossCombatPulse ? "50% 16%, 50% 50%" : undefined,
        animation: bossCombatPulse
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

