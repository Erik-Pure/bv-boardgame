import { useMemo } from "react";
import {
  FINAL_BOSS_LIFE_TOTAL,
  isFinalBossMonsterId,
  type CombatLoseSummary,
  type CombatWinSummary,
  type GameState,
  type MonsterId,
  type Pending,
  type Player,
  type SipNoticeEntry,
} from "@bv/game-core";
import { BossFinaleOverlay } from "./BossFinaleOverlay";
import { CardModal, EnemyIntroModal, SipNoticeCardModal } from "./PlayCardModals";
import { TeamBattleIntroCard } from "../TeamBattleIntroCard";
import {
  buildCombatAllyLossSummary,
  buildCombatAllyWinSummary,
  combatAllyOutcomeRole,
  combatLossKlunksForDisplay,
  monsterBoardFloorLevel,
  monsterEncounterCardPropsFromCombatPending,
  resolveCombatLossViewer,
  resolveCombatWinViewer,
} from "../../lib/combatUi";
import { isMyPending } from "../../lib/playInteractionHelpers";
import styles from "../../routes/PlayView.module.css";
import { capitalizeWord, sv } from "../../lib/uiStrings";

type AllyCombatOutcome = {
  pending: Extract<Pending, { type: "card" }>;
  role: NonNullable<ReturnType<typeof combatAllyOutcomeRole>>;
  key: string;
};

function resolveAllyCombatOutcomeCard(
  allyCombatOutcome: AllyCombatOutcome | null,
  me: Player | null,
): {
  cardId: "combat_win" | "combat_lose";
  combatWin?: CombatWinSummary;
  combatLoss?: CombatLoseSummary;
} | null {
  if (!allyCombatOutcome || !me) return null;
  const { pending: p, role } = allyCombatOutcome;
  if (p.cardId === "combat_win" && p.combatWin) {
    return {
      cardId: p.cardId,
      combatWin: resolveCombatWinViewer(buildCombatAllyWinSummary(p.combatWin, role, me.name), me.name) ?? undefined,
      combatLoss: undefined,
    };
  }
  if (p.cardId === "combat_lose" && p.combatLoss) {
    return {
      cardId: p.cardId,
      combatWin: undefined,
      combatLoss: resolveCombatLossViewer(buildCombatAllyLossSummary(p.combatLoss, role, me.name), me.name) ?? undefined,
    };
  }
  return null;
}

export function PlayCardCombatModals(props: {
  state: GameState;
  me: Player;
  pending: Pending | null;
  cardCoverId: string | undefined;
  needsBrewerPerkChoice: boolean;
  showAllyCombatOutcomeModal: boolean;
  allyCombatOutcome: AllyCombatOutcome | null;
  myEnemyIntroPending: Extract<Pending, { type: "combat" }> | null;
  skipMonsterIntroBecauseCantAffordSkip: boolean;
  mySipNotice: SipNoticeEntry | null;
  hasBlockingSipNotice: boolean;
  bossFinalePending: Extract<Pending, { type: "card" }> | null;
  bossFinaleExiting: boolean;
}) {
  const {
    state,
    me,
    pending,
    cardCoverId,
    needsBrewerPerkChoice,
    showAllyCombatOutcomeModal,
    allyCombatOutcome,
    myEnemyIntroPending,
    skipMonsterIntroBecauseCantAffordSkip,
    mySipNotice,
    hasBlockingSipNotice,
    bossFinalePending,
    bossFinaleExiting,
  } = props;

  const myPending = isMyPending(pending, me);
  const allyCombatOutcomeCard = useMemo(
    () => resolveAllyCombatOutcomeCard(allyCombatOutcome, me),
    [allyCombatOutcome, me],
  );

  if (state.phase !== "playing") return null;

  return (
    <>
      {myPending &&
        !needsBrewerPerkChoice &&
        pending?.type === "card" &&
        pending.cardId !== "boss_final_win" && (
          <CardModal
            title={pending.title}
            text={pending.text}
            artKey={pending.artKey}
            grantedItemId={pending.grantedItemId}
            kind={pending.kind}
            cardId={pending.cardId}
            combatWin={pending.combatWin}
            combatLoss={pending.combatLoss}
            viewerName={me.name}
            cardCoverId={cardCoverId}
            gameState={state}
            cardOwnerPlayerId={pending.playerId}
            bossFinalWin={pending.bossFinalWin}
          />
        )}

      {showAllyCombatOutcomeModal && allyCombatOutcomeCard && allyCombatOutcome && (
        <CardModal
          title={allyCombatOutcome.pending.title}
          text={allyCombatOutcome.pending.text}
          artKey={allyCombatOutcome.pending.artKey}
          grantedItemId={allyCombatOutcome.pending.grantedItemId}
          kind={allyCombatOutcome.pending.kind}
          cardId={allyCombatOutcomeCard.cardId}
          combatWin={allyCombatOutcomeCard.combatWin}
          combatLoss={allyCombatOutcomeCard.combatLoss}
          viewerName={me.name}
          cardCoverId={cardCoverId}
          gameState={state}
          cardOwnerPlayerId={allyCombatOutcome.pending.playerId}
        />
      )}

      {pending?.type === "combat" &&
        pending.teamBattleRequired &&
        pending.phase === "chooseTeammate" && (
          <TeamBattleIntroCard
            variant="play"
            cardCoverId={cardCoverId}
            attackerName={
              state.players.find((p) => p.id === pending.attackerId)?.name ??
              capitalizeWord(sv.play.theAttacker)
            }
            monster={monsterEncounterCardPropsFromCombatPending(pending, {
              finalBossLivesRemaining: state.finalBossLivesRemaining,
              monsterLossSipReduction: Math.max(
                0,
                Math.floor(
                  state.players.find((pl) => pl.id === pending.attackerId)?.equipment.weapon
                    ?.monsterLossSipReduction ?? 0,
                ),
              ),
            })}
          />
        )}

      {myEnemyIntroPending &&
        myEnemyIntroPending.phase === "enemyIntro" &&
        !needsBrewerPerkChoice &&
        !skipMonsterIntroBecauseCantAffordSkip && (
        <EnemyIntroModal
          enemyName={myEnemyIntroPending.enemyName}
          enemyArtKey={myEnemyIntroPending.enemyArtKey}
          need={myEnemyIntroPending.need}
          needMod={myEnemyIntroPending.needMod}
          rewardGold={myEnemyIntroPending.rewardGold}
          rewardItems={myEnemyIntroPending.rewardItems}
          rewardXp={myEnemyIntroPending.rewardXp}
          baseDamage={myEnemyIntroPending.baseDamage}
          lossKlunks={combatLossKlunksForDisplay(myEnemyIntroPending, {
            monsterLossSipReduction: Math.max(
              0,
              Math.floor(me.equipment.weapon?.monsterLossSipReduction ?? 0),
            ),
          })}
          specialRules={myEnemyIntroPending.enemyIntroText?.trim() || undefined}
          showCard={myEnemyIntroPending.monsterId !== "boss"}
          bossLivesRemaining={
            isFinalBossMonsterId(myEnemyIntroPending.monsterId as MonsterId)
              ? (state.finalBossLivesRemaining ?? 3)
              : undefined
          }
          bossWinLootDash={isFinalBossMonsterId(myEnemyIntroPending.monsterId as MonsterId)}
          bossPulsingBackdrop={isFinalBossMonsterId(myEnemyIntroPending.monsterId as MonsterId)}
          boardLevel={monsterBoardFloorLevel(
            myEnemyIntroPending.monsterId,
            myEnemyIntroPending.levelIndex,
          )}
          teammateName={
            myEnemyIntroPending.assistId
              ? state.players.find((p) => p.id === myEnemyIntroPending.assistId)?.name
              : undefined
          }
          cardCoverId={cardCoverId}
        />
      )}

      {mySipNotice && hasBlockingSipNotice && !needsBrewerPerkChoice && (
        <SipNoticeCardModal
          fromPlayerName={mySipNotice.fromPlayerName}
          klunkCount={mySipNotice.klunkCount ?? 1}
          customTitle={mySipNotice.title}
          customBody={mySipNotice.body}
          noticeKind={mySipNotice.noticeKind ?? "custom"}
          imageEquipmentName={mySipNotice.equipmentName}
        />
      )}

      {bossFinalePending?.cardId === "boss_final_win" ? (
        <>
          <div
            className={[styles.bossFinaleBackdrop, bossFinaleExiting ? styles.bossFinaleBackdropExiting : ""]
              .filter(Boolean)
              .join(" ")}
            aria-hidden
          />
          <BossFinaleOverlay
            roundLabel={
              bossFinalePending.bossFinalWin?.roundLabel ??
              `RUNDA ${FINAL_BOSS_LIFE_TOTAL} AV ${FINAL_BOSS_LIFE_TOTAL}`
            }
            winnerName={bossFinalePending.bossFinalWin?.winnerName ?? bossFinalePending.text}
            bossName={bossFinalePending.bossFinalWin?.bossName}
            exiting={bossFinaleExiting}
          />
        </>
      ) : null}
    </>
  );
}
