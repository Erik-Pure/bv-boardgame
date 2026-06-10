import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  FINAL_BOSS_LIFE_TOTAL,
  isFinalBossMonsterId,
  monsterCombatEquipmentAttackBonus,
  type GameState,
  type MonsterId,
  type Player,
} from "@bv/game-core";
import { DiceCube3D } from "../DiceCube3D";
import { TeamBattleIntroCard } from "../TeamBattleIntroCard";
import { MonsterEncounterCard } from "../MonsterEncounterCard";
import { CardFlipModalShell, CardFlipScene } from "../CardFlipModalShell";
import cardFlipShellStyles from "../CardFlipModalShell.module.css";
import { CombatLoseCardContent } from "../CombatLoseCard";
import { CombatSheetFrame } from "../CombatResultSheet";
import { CombatWinCardContent } from "../CombatWinCard";
import { CombatCritFailDiceCaption } from "../combat/CombatCritFailDiceCaption";
import { combatPreviewShowsSkullOnOne } from "../../lib/combatCritFailUi";
import {
  combatLossKlunksForDisplay,
  monsterBoardFloorLevel,
  monsterEncounterCardPropsFromCombatPending,
  parseLegacyCombatLoseText,
  parseLegacyCombatWinText,
  resolveCombatLossViewer,
  resolveCombatWinViewer,
} from "../../lib/combatUi";
import { sv } from "../../lib/uiStrings";
import {
  TABLE_BOARD_MODAL_CARD_ANIMATION,
  TABLE_BOARD_MODAL_OVERLAY_ANIMATION,
  TABLE_BOARD_OVERLAY_BG,
  TABLE_MONSTER_COMBAT_DICE_PX,
} from "./tableConstants";
import combatStyles from "./TableCombatBoardPanel.module.css";
import { useTableOverlayContentScale } from "../../lib/tablePresentationScale";

type TableCombatPending = Extract<NonNullable<GameState["pending"]>, { type: "combat" }>;
type MonsterCombatResultHoldover = {
  preAck: GameState;
  outcomeCard: Extract<NonNullable<GameState["pending"]>, { type: "card" }>;
};

const OUTCOME_FLIP_MS = 700;
/** Lutning + translateX(8px) → 0 när resultat läget slår till (lite lugnare än ett enda frame). */
const HOLD_CARD_RESET_MS = 700;

/** Matchar mobil `PlayView` `CardModal` innehållsyta (combat win/lose); ramen kommer från `.faceBack`. */
const PLAY_COMBAT_OUTCOME_SURFACE: CSSProperties = {
  background: "var(--modal-panel-bg)",
  borderRadius: 16,
  color: "#ffffff",
};

/** Ungefärlig höjd före transform-scale (rubriker + kort + hint) — begränsar uppskalning så tablet inte klipper. */
const COMBAT_TABLE_UNSCALED_APPROX_HEIGHT_PX = 780;

function useVisualViewportHeight(): number {
  const [h, setH] = useState(() =>
    typeof window !== "undefined" ? window.visualViewport?.height ?? window.innerHeight : 900,
  );
  useEffect(() => {
    const tick = () => setH(window.visualViewport?.height ?? window.innerHeight);
    tick();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", tick);
    vv?.addEventListener("scroll", tick);
    window.addEventListener("resize", tick);
    return () => {
      vv?.removeEventListener("resize", tick);
      vv?.removeEventListener("scroll", tick);
      window.removeEventListener("resize", tick);
    };
  }, []);
  return h;
}

function formatSignedDiceModifier(sum: number): string | null {
  if (sum === 0) return null;
  return sum > 0 ? `+${sum}` : String(sum);
}

function helpContractLabel(contract: "free" | "pant" | "treasure" | "split" | undefined): string {
  switch (contract) {
    case "free":
      return "gratis";
    case "pant":
      return "mot panten";
    case "treasure":
      return "mot skatten";
    case "split":
      return "dela lika";
    default:
      return "okänt val";
  }
}

/**
 * Modifier som visas vid tärningen: kort/föremål (attackMods + ev. nextCombatModifier under reaktioner)
 * plus samma utrustningsattack som motorn (`weaponPower`).
 * Vid lagstrid: båda spelarnas bidrag; `nextCombatModifier` räknas bara i `reactions` (nollas när någon slagit).
 */
function boardMonsterDiceStackModifier(pending: TableCombatPending, state: GameState): number {
  const ids = pending.assistId ? [pending.attackerId, pending.assistId] : [pending.attackerId];
  let sum = 0;
  for (const id of ids) {
    const p = state.players.find((x) => x.id === id);
    if (!p) continue;
    sum += pending.attackMods?.[id] ?? 0;
    sum += monsterCombatEquipmentAttackBonus(p);
    if (pending.phase === "reactions") {
      sum += p.nextCombatModifier ?? 0;
    }
  }
  return sum;
}

function TableCombatBoardPanelInner(props: {
  state: GameState;
  playersById: Map<string, Player>;
  /** false: hoppa över monster-/tärningsanimationer på brädet. */
  boardAnimationsEnabled?: boolean;
  /**
   * När stridens `pending` redan är kort (combat_win/lose) på servern: samma monsterkort + CardFlipScene,
   * fryst rollPreview i `preAck`, resultat på baksidan (ingen andra overlay).
   */
  monsterResultHoldover?: MonsterCombatResultHoldover | null;
}) {
  const { state, playersById, boardAnimationsEnabled = true, monsterResultHoldover: hold } = props;
  const overlayScale = useTableOverlayContentScale();
  const vvHeight = useVisualViewportHeight();
  /** På tablet kan presentationScale > 1 trycka ner/klippa monsterkortet — håll inom ~90% av viewport-höjd. */
  const combatBlockScale = useMemo(() => {
    if (overlayScale <= 1) return overlayScale;
    const room = Math.max(340, vvHeight * 0.9);
    const capByHeight = room / COMBAT_TABLE_UNSCALED_APPROX_HEIGHT_PX;
    return Math.min(overlayScale, Math.max(1, capByHeight));
  }, [overlayScale, vvHeight]);

  const pending: TableCombatPending | null = hold
    ? (hold.preAck.pending as TableCombatPending)
    : state.pending?.type === "combat"
      ? state.pending
      : null;

  const modifierState = hold ? hold.preAck : state;

  const outcomeViewerName = hold
    ? state.players.find((pl) => pl.id === hold.outcomeCard.playerId)?.name
    : undefined;

  const outcomeWinData = useMemo(() => {
    if (!hold) return null;
    const c = hold.outcomeCard;
    if (c.cardId !== "combat_win") return null;
    return resolveCombatWinViewer(
      c.combatWin ?? parseLegacyCombatWinText(c.text, outcomeViewerName),
      outcomeViewerName,
    );
  }, [hold, outcomeViewerName]);

  const outcomeLoseData = useMemo(() => {
    if (!hold) return null;
    const c = hold.outcomeCard;
    if (c.cardId !== "combat_lose") return null;
    return resolveCombatLossViewer(
      c.combatLoss ?? parseLegacyCombatLoseText(c.text, outcomeViewerName),
      outcomeViewerName,
    );
  }, [hold, outcomeViewerName]);

  const showMonsterForDiceAnim = pending?.type === "combat" && pending.monsterId !== "boss";

  const combatDiceAnimKey =
    pending?.type === "combat" ? `${pending.phase}-${pending.monsterId}-${pending.attackerId}-${pending.tileIndex}` : "";

  const prevCombatPhaseRef = useRef<string | undefined>(undefined);
  /** Bordsmonster: intro → skjut kort höger → visa tärning vänster (samma DOM som intro = ingen blink). */
  const [monsterTableAnim, setMonsterTableAnim] = useState<"intro" | "shiftRight" | "diceIn">("intro");

  const holdOutcomeKey = hold ? `${hold.outcomeCard.cardId}:${hold.outcomeCard.playerId}` : null;
  const [outcomePhase, setOutcomePhase] = useState<"idle" | "reveal" | "settled">("idle");

  /** Direkt vid “Fortsätt”: vänd kort till resultat samma frame (ingen tärnfade-delay). */
  useLayoutEffect(() => {
    if (!holdOutcomeKey) {
      setOutcomePhase("idle");
      return;
    }
    setOutcomePhase("reveal");
  }, [holdOutcomeKey]);

  useEffect(() => {
    if (!holdOutcomeKey || outcomePhase !== "reveal") return;
    const flipMs = boardAnimationsEnabled ? OUTCOME_FLIP_MS : 0;
    const t = window.setTimeout(() => setOutcomePhase("settled"), flipMs);
    return () => window.clearTimeout(t);
  }, [holdOutcomeKey, outcomePhase, boardAnimationsEnabled]);

  useEffect(() => {
    const p = hold ? hold.preAck.pending : state.pending;
    if (!p || p.type !== "combat") return;

    if (hold) {
      prevCombatPhaseRef.current = p.phase;
      setMonsterTableAnim("diceIn");
      return;
    }

    const prev = prevCombatPhaseRef.current;

    if (p.phase === "enemyIntro") {
      prevCombatPhaseRef.current = p.phase;
      setMonsterTableAnim("intro");
      return;
    }

    const isDicePhase =
      p.phase === "reactions" ||
      p.phase === "helpChooseHelper" ||
      p.phase === "helpAwaitDecision" ||
      p.phase === "helpAwaitRequesterDecision" ||
      p.phase === "helpAwaitCard" ||
      p.phase === "rollPreview" ||
      p.phase === "chooseHitMitigation";

    if (!isDicePhase || !showMonsterForDiceAnim) {
      prevCombatPhaseRef.current = p.phase;
      return;
    }

    const reducedMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const skipMotion = reducedMotion || !boardAnimationsEnabled;

    if (skipMotion) {
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
  }, [hold, showMonsterForDiceAnim, combatDiceAnimKey, state.pending, boardAnimationsEnabled]);

  if (!pending || pending.type !== "combat") return null;

  if (pending.phase === "chooseTeammate" && pending.teamBattleRequired) {
    const att = state.players.find((p) => p.id === pending.attackerId);
    return (
      <TeamBattleIntroCard
        variant="table"
        attackerName={att?.name ?? "?"}
        cardCoverId={state.config.cardCover}
        tableOverlayAnimation={TABLE_BOARD_MODAL_OVERLAY_ANIMATION}
        tableCardEntranceAnimation={TABLE_BOARD_MODAL_CARD_ANIMATION}
        monster={monsterEncounterCardPropsFromCombatPending(pending, {
          finalBossLivesRemaining: state.finalBossLivesRemaining,
          monsterLossSipReduction: Math.max(
            0,
            Math.floor(att?.equipment.weapon?.monsterLossSipReduction ?? 0),
          ),
        })}
      />
    );
  }

  const attacker = state.players.find((p) => p.id === pending.attackerId);
  const isFinalBossCombat = isFinalBossMonsterId(pending.monsterId as MonsterId);
  const need = pending.need + (pending.needMod ?? 0);
  const showMonsterCard = pending.monsterId !== "boss";
  const diceBesideCardPhases =
    pending.phase === "reactions" ||
    pending.phase === "helpChooseHelper" ||
    pending.phase === "helpAwaitDecision" ||
    pending.phase === "helpAwaitRequesterDecision" ||
    pending.phase === "helpAwaitCard" ||
    pending.phase === "rollPreview" ||
    pending.phase === "chooseHitMitigation";
  /** Hjälpflöde: ingen slag ännu — rotera (inte previewDie ?? 1 / döskalle). */
  const combatBoardDiceSpinning =
    diceBesideCardPhases &&
    pending.phase !== "rollPreview" &&
    pending.phase !== "chooseHitMitigation";
  const showCritFailDiceCaption =
    pending.phase === "rollPreview" &&
    pending.previewCritFailOnOne === true &&
    !combatBoardDiceSpinning;
  const previewSkullOnOne = combatPreviewShowsSkullOnOne(pending.previewCritFailOnOne);
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
      pending.phase === "helpChooseHelper" ||
      pending.phase === "helpAwaitDecision" ||
      pending.phase === "helpAwaitRequesterDecision" ||
      pending.phase === "helpAwaitCard" ||
      pending.phase === "rollPreview" ||
      pending.phase === "chooseHitMitigation");

  const overlayDynamics: CSSProperties = isFinalBossCombat
    ? { background: "transparent" }
    : { background: TABLE_BOARD_OVERLAY_BG, animation: TABLE_BOARD_MODAL_OVERLAY_ANIMATION };

  const phaseLine =
    pending.phase === "chooseTeammate"
      ? sv.table.combatPhaseTeam
      : pending.phase === "enemyIntro"
        ? sv.table.combatPhase1
        : pending.phase === "reactions"
          ? sv.table.combatPhase2
          : pending.phase === "helpChooseHelper"
            ? "2.5 — Välj hjälpare"
            : pending.phase === "helpAwaitDecision"
              ? "2.6 — Väntar hjälpsvar"
              : pending.phase === "helpAwaitRequesterDecision"
                ? "2.65 — Väntar godkännande"
              : pending.phase === "helpAwaitCard"
                ? "2.7 — Väntar hjälpkort"
          : pending.phase === "chooseHitMitigation"
            ? sv.table.combatPhase3Choice
            : sv.table.combatPhase3Result;

  /** Boss / icke-kort: behåll äldre batch- + fasrubriker. */
  const combatBoardBossHeaderLines = (
    <>
      <div className={combatStyles.caption12Muted}>{sv.table.combatOverlayTitle}</div>
      <div className={combatStyles.phaseLine12}>{phaseLine}</div>
      <div className={combatStyles.fightLine14}>
        <b>{attacker?.name ?? "?"}</b> {sv.table.isFighting}
      </div>
      {pending.teamBattleRequired && !pending.assistId ? (
        <div className={combatStyles.teamWaitMuted}>
          Team battle: <b>väntar på val av medkämpe</b>
        </div>
      ) : pending.assistId ? (
        <div className={combatStyles.teammateChosenBannerLeft}>
          {pending.teamBattleRequired ? "Team battle:" : "Ölkompis:"}{" "}
          <span className={combatStyles.fw900}>
            {state.players.find((p) => p.id === pending.assistId)?.name ?? "okänd"}
          </span>
        </div>
      ) : null}
    </>
  );

  const monsterMeetHeader = (
    <>
      {finalBossRoundLabel ? <div className={combatStyles.finalBossRoundTitle}>{finalBossRoundLabel}</div> : null}
      <div className={combatStyles.monsterMeetTitle}>
        {(attacker?.name ?? "?").toLocaleUpperCase("sv-SE")} MÖTER
      </div>
      {pending.teamBattleRequired && !pending.assistId ? (
        <div className={combatStyles.teamBattlePickTeammate}>
          Team battle: <b>väntar på val av medkämpe</b>
        </div>
      ) : pending.assistId ? (
        <div className={combatStyles.teammateChosenBanner}>
          {pending.teamBattleRequired ? "Team battle:" : "Ölkompis:"}{" "}
          <span className={combatStyles.fw900}>
            {state.players.find((p) => p.id === pending.assistId)?.name ?? "okänd"}
          </span>
        </div>
      ) : null}
    </>
  );

  const boardMonsterCardProps = {
    title: pending.enemyName,
    boardLevel:
      showMonsterCard ? monsterBoardFloorLevel(pending.monsterId, pending.levelIndex) : undefined,
    artKey: pending.enemyArtKey,
    combatStrength: need,
    winGold: pending.rewardGold ?? 0,
    winItems: pending.rewardItems ?? 0,
    winXp: pending.rewardXp ?? 0,
    lossDamage: pending.baseDamage,
    lossKlunks: combatLossKlunksForDisplay(pending, {
      monsterLossSipReduction: Math.max(
        0,
        Math.floor(attacker?.equipment.weapon?.monsterLossSipReduction ?? 0),
      ),
    }),
    specialRules: pending.enemyIntroText?.trim() || undefined,
    bossLivesRemaining: isFinalBossCombat ? (state.finalBossLivesRemaining ?? 3) : undefined,
    bossWinLootAsDash: isFinalBossCombat,
  };
  const combatBoardMonsterFlipKey = `${pending.levelIndex}-${pending.tileIndex}-${pending.monsterId}-${pending.attackerId}`;
  const monsterEncounterCardEl = showMonsterCard ? (
    <MonsterEncounterCard {...boardMonsterCardProps} fillAvailableHeight={false} />
  ) : null;

  const combatWinLoseBackFace = hold ? (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        padding: 16,
        overflow: "auto",
        WebkitOverflowScrolling: "touch",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...PLAY_COMBAT_OUTCOME_SURFACE,
      }}
    >
      {outcomeWinData ? (
        <div style={{ textAlign: "center", color: "#ffffff", width: "100%" }}>
          <CombatSheetFrame showSheetTitle={false}>
            <CombatWinCardContent data={outcomeWinData} />
          </CombatSheetFrame>
        </div>
      ) : outcomeLoseData ? (
        <div style={{ textAlign: "center", color: "#ffffff", width: "100%" }}>
          <CombatSheetFrame showSheetTitle={false}>
            <CombatLoseCardContent data={outcomeLoseData} />
          </CombatSheetFrame>
        </div>
      ) : null}
    </div>
  ) : null;

  const mitigationBackFace =
    pending.phase === "chooseHitMitigation" ? (
      <div
        style={{
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          padding: 12,
          overflow: "auto",
          WebkitOverflowScrolling: "touch",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#030508",
        }}
      >
        <div style={{ textAlign: "center", color: "#e5e7eb", width: "100%" }}>
          <CombatSheetFrame
            sheetTitle={sv.table.combatPhase3Choice}
            titleStyle={{ textAlign: "center", fontSize: 16, marginBottom: 8 }}
          >
            {typeof pending.previewTotal === "number" && typeof pending.previewNeed === "number" ? (
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>
                Slag: {pending.previewTotal} (krävde {pending.previewNeed})
              </div>
            ) : null}
            <div style={{ fontSize: 14, lineHeight: 1.45, opacity: 0.92 }}>
              {sv.table.attackerChoosesHit(pending.monsterId === "kapten_interrobang" ? 3 : 2)}
            </div>
          </CombatSheetFrame>
        </div>
      </div>
    ) : undefined;

  const diceHeroMotionEase = "cubic-bezier(0.22, 0.61, 0.36, 1)";
  const showMonsterDiceColumn = monsterTableAnim === "diceIn" && diceBesideCardPhases;
  const diceBaseModifier = boardMonsterDiceStackModifier(pending, modifierState);
  const boardDiceModifierBaseStr = formatSignedDiceModifier(diceBaseModifier);
  const showDiceModifierStack =
    pending.phase === "reactions" ||
    pending.phase === "rollPreview" ||
    pending.phase === "chooseHitMitigation";
  const attackDiceDoubledCount =
    pending.phase === "reactions"
      ? [pending.attackerId, pending.assistId]
          .filter((id): id is string => !!id)
          .reduce((sum, id) => {
            const p = modifierState.players.find((x) => x.id === id);
            return sum + (p?.nextCombatAttackDiceDouble === true ? 1 : 0);
          }, 0)
      : pending.phase === "rollPreview" || pending.phase === "chooseHitMitigation"
        ? (pending.previewAttackDiceDoubled ? 1 : 0) + (pending.previewBroAttackDiceDoubled ? 1 : 0)
        : 0;
  const attackDiceDoubledHint =
    attackDiceDoubledCount <= 0
      ? null
      : attackDiceDoubledCount === 1
        ? "2 x tärningsslag"
        : `2 x tärningsslag (x${attackDiceDoubledCount})`;
  const sipWeaponTakenBonusFromPreview =
    (pending.phase === "rollPreview" || pending.phase === "chooseHitMitigation") &&
    pending.previewUsedSipWeaponBonus === true &&
    typeof pending.previewSipWeaponBonusValue === "number"
      ? pending.previewSipWeaponBonusValue
      : null;
  const sipWeaponTakenBonusFromReactions =
    pending.phase === "reactions"
      ? (() => {
          const ids = pending.assistId ? [pending.attackerId, pending.assistId] : [pending.attackerId];
          let sum = 0;
          for (const id of ids) {
            if (pending.sipWeaponBonusChoice?.[id] !== true) continue;
            const pl = modifierState.players.find((x) => x.id === id);
            const b = pl?.equipment.weapon?.sipAttackBonus ?? 0;
            if (b > 0) sum += b;
          }
          return sum > 0 ? sum : null;
        })()
      : null;
  const sipWeaponTakenBonus = sipWeaponTakenBonusFromPreview ?? sipWeaponTakenBonusFromReactions;
  const monsterCardWrapTransform = hold
    ? "translateX(0) rotate(0deg)"
    : monsterTableAnim === "intro"
      ? "translateX(0) rotate(0deg)"
      : monsterTableAnim === "shiftRight"
        ? "translateX(36px) rotate(0deg)"
        : "translateX(8px) rotate(5deg)";
  const monsterMotionTransition = !boardAnimationsEnabled
    ? "none"
    : hold
      ? `transform ${HOLD_CARD_RESET_MS}ms ${diceHeroMotionEase}`
      : `transform 0.55s ${diceHeroMotionEase}`;

  const headerAndMonster = (
    <>
      {showMonsterCard ? monsterMeetHeader : combatBoardBossHeaderLines}
      {showMonsterCard ? (
        monsterTableRowPhases ? (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              /* center: tärningskolumnen centreras mot kortets höjd (tärningen längre ner). Kortet align-self flex-start så det inte skjuts ner när tärningsstacken är högre. */
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
              marginTop: 2,
              marginBottom: 8,
              width: "100%",
              gap: hold ? 0 : showMonsterDiceColumn ? 20 : 0,
              transition: hold || !boardAnimationsEnabled ? "none" : `gap 0.35s ${diceHeroMotionEase}`,
            }}
          >
            <div
              style={{
                width: hold ? 0 : showMonsterDiceColumn ? 300 : 0,
                minWidth: 0,
                opacity: (() => {
                  if (!showMonsterDiceColumn) return 0;
                  if (hold) return 0;
                  return pending.phase === "chooseHitMitigation" ? 0 : 1;
                })(),
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                flexShrink: 0,
                transition:
                  hold || !boardAnimationsEnabled
                    ? "none"
                    : `width 0.35s ${diceHeroMotionEase}, opacity 0.4s ${diceHeroMotionEase}`,
                pointerEvents: showMonsterDiceColumn && !hold ? "auto" : "none",
              }}
            >
              <div className={combatStyles.diceRowWithModifiers}>
                {showDiceModifierStack &&
                (boardDiceModifierBaseStr || sipWeaponTakenBonus != null || attackDiceDoubledHint != null) ? (
                  <div
                    className={`${sipWeaponTakenBonus != null ? combatStyles.modifierStackGap4 : combatStyles.modifierStack} ${combatStyles.modifiersBesideDice}`}
                  >
                    {boardDiceModifierBaseStr ? (
                      <div className={combatStyles.diceModifierBig}>{boardDiceModifierBaseStr}</div>
                    ) : null}
                    {attackDiceDoubledHint ? (
                      <div className={combatStyles.attackDiceDoubledHint}>{attackDiceDoubledHint}</div>
                    ) : null}
                    {sipWeaponTakenBonus != null ? (
                      <div className={combatStyles.modifierStackGap2}>
                        <span className={combatStyles.sipBonusBig}>+{sipWeaponTakenBonus}</span>
                        <span className={combatStyles.sipTakenCaption}>{sv.table.diceModifierSipTakenSub}</span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <div className={combatStyles.diceGlowCircle}>
                  {combatBoardDiceSpinning ? (
                    <DiceCube3D idleSpin spinning={boardAnimationsEnabled} size={TABLE_MONSTER_COMBAT_DICE_PX} />
                  ) : (
                    <div className={combatStyles.flexCenterGap10}>
                      <DiceCube3D value={pending.previewDie ?? 1} size={TABLE_MONSTER_COMBAT_DICE_PX} oneAsSkullIcon={previewSkullOnOne} />
                      {pending.previewBroDie != null ? (
                        <DiceCube3D value={pending.previewBroDie} size={TABLE_MONSTER_COMBAT_DICE_PX} oneAsSkullIcon={previewSkullOnOne} />
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
              {showCritFailDiceCaption ? <CombatCritFailDiceCaption variant="table" /> : null}
              {pending.phase === "chooseHitMitigation" ? (
                <div className={combatStyles.hitMitigationHint}>
                  {sv.table.attackerChoosesHit(pending.monsterId === "kapten_interrobang" ? 3 : 2)}
                </div>
              ) : null}
            </div>
            <div
              className={combatStyles.monsterCardWrap}
              style={{
                transform: monsterCardWrapTransform,
                transition: monsterMotionTransition,
              }}
            >
              <CardFlipScene
                key={combatBoardMonsterFlipKey}
                maxWidth={400}
                faceInnerClassName={cardFlipShellStyles.faceInnerNoVerticalOverflow}
                blockPointerUntilFlipped={false}
                cardCoverId={state.config.cardCover}
                backFace={combatWinLoseBackFace ?? mitigationBackFace}
                flipToResultBack={
                  hold
                    ? outcomePhase === "reveal" || outcomePhase === "settled"
                    : pending.phase === "chooseHitMitigation"
                }
                resultFlipDelayMs={hold ? 0 : boardAnimationsEnabled ? 280 : 0}
              >
                <MonsterEncounterCard {...boardMonsterCardProps} fillAvailableHeight />
              </CardFlipScene>
            </div>
          </div>
        ) : (
          <div className={combatStyles.mb8}>{monsterEncounterCardEl}</div>
        )
      ) : (
        <>
          <div className={combatStyles.enemyTitle24}>{pending.enemyName}</div>
          <div className={combatStyles.strengthLine}>
            {sv.table.strength}: {need}
          </div>
        </>
      )}
    </>
  );

  const reactionsAndDice = hold ? null : (
    <>
      {pending.phase === "reactions" && (pending.reactors?.length ?? 0) > 0 && (
        <div
          className={
            showMonsterCard && monsterDiceHeroLayout ? combatStyles.hintLine13OnCard : combatStyles.hintLine13TightTop
          }
          style={{ marginTop: monsterDiceHeroLayout ? 2 : 12 }}
        >
          {sv.play.waitIntervene}
        </div>
      )}
      {pending.phase === "helpChooseHelper" ? (
        <div className={combatStyles.hintLine13}>
          <b>{sv.table.combatHelpAsking}</b>{" "}
          {(pending.helpCandidateIds ?? [])
            .map((id) => playersById.get(id)?.name ?? id)
            .join(", ")}
        </div>
      ) : null}
      {pending.phase === "helpAwaitDecision" && pending.helpSelectedHelperId ? (
        <div className={combatStyles.hintLine13}>
          {sv.table.combatHelpAwaitDecision(playersById.get(pending.helpSelectedHelperId)?.name ?? "spelaren")}
        </div>
      ) : null}
      {pending.phase === "helpAwaitRequesterDecision" && pending.helpSelectedHelperId ? (
        <div className={combatStyles.hintLine13}>
          {sv.table.combatHelpAwaitDecision(playersById.get(pending.attackerId)?.name ?? "angriparen")}
        </div>
      ) : null}
      {pending.phase === "helpAwaitCard" && pending.helpSelectedHelperId ? (
        <div className={combatStyles.hintLine13}>
          {sv.table.combatHelpAwaitCard(playersById.get(pending.helpSelectedHelperId)?.name ?? "spelaren")}
          {pending.helpAccepted && pending.helpContract ? (
            <div className={combatStyles.helpContractSub}>
              {sv.table.combatHelpAcceptedContract(
                playersById.get(pending.helpSelectedHelperId)?.name ?? "spelaren",
                helpContractLabel(pending.helpContract),
              )}
            </div>
          ) : null}
        </div>
      ) : null}
      {(pending.phase === "rollPreview" || pending.phase === "chooseHitMitigation") && !monsterDiceHeroLayout && (
        <div className={combatStyles.diceRowWrap}>
          <DiceCube3D value={pending.previewDie ?? 1} size={TABLE_MONSTER_COMBAT_DICE_PX} oneAsSkullIcon={previewSkullOnOne} />
          {pending.previewBroDie != null ? (
            <DiceCube3D value={pending.previewBroDie} size={TABLE_MONSTER_COMBAT_DICE_PX} oneAsSkullIcon={previewSkullOnOne} />
          ) : null}
          {showCritFailDiceCaption ? <CombatCritFailDiceCaption variant="table" /> : null}
          {pending.phase === "chooseHitMitigation" ? (
            <div className={combatStyles.hitChoiceLine}>
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
        cardCoverId={state.config.cardCover}
        aboveScene={combatBoardBossHeaderLines}
        contentScale={combatBlockScale}
      >
        <div className={combatStyles.innerBossIntro}>
          <div className={combatStyles.enemyTitle24}>{pending.enemyName}</div>
          <div className={combatStyles.strengthLine}>
            {sv.table.strength}: {need}
          </div>
        </div>
      </CardFlipModalShell>
    );
  }

  const panelBody = (
    <div
      className={`${combatStyles.panelShell} ${showMonsterCard ? combatStyles.panelInnerGhost : combatStyles.panelInnerCard}`}
      style={
        showMonsterCard
          ? undefined
          : { animation: TABLE_BOARD_MODAL_CARD_ANIMATION, transformOrigin: "top center" }
      }
    >
      {headerAndMonster}
      {reactionsAndDice}
    </div>
  );

  const overlayPanel = combatBlockScale !== 1 ? (
    <div
      style={{
        transform: `scale(${combatBlockScale})`,
        transformOrigin: "top center",
        width: "100%",
        display: "grid",
        justifyItems: "center",
      }}
    >
      {panelBody}
    </div>
  ) : (
    panelBody
  );

  return (
    <div className={combatStyles.overlayHost} style={overlayDynamics}>
      {overlayPanel}
    </div>
  );
}

export const TableCombatBoardPanel = memo(TableCombatBoardPanelInner);
