import type { MutableRefObject } from "react";
import { PENALTY_XP_PER_KLUNK, type ClientAction, type GameState, type Player } from "@bv/game-core";
import { bossFinaleExitTotalMs } from "../../lib/useBossFinaleExit";
import { PlayArcadeButton as ArcadeButton } from "./PlayArcadeButton";
import { DiceCube3D } from "../DiceCube3D";
import styles from "../../routes/PlayView.module.css";
import u from "../../styles/uiPrimitives.module.css";
import { sv } from "../../lib/uiStrings";

type CardPending = Extract<NonNullable<GameState["pending"]>, { type: "card" }>;
type EnemyIntroPending = Extract<NonNullable<GameState["pending"]>, { type: "combat" }>;

export type AllyCombatOutcome = {
  pending: CardPending;
  role: "helpMate" | "beerBro";
  key: string;
};

export type PlayCardOrSipActionsProps = {
  me: Player;
  state: GameState | null;
  needsBrewerPerkChoice: boolean;
  hasBlockingSipNotice: boolean;
  myEnemyIntroPending: EnemyIntroPending | null;
  skipMonsterIntroBecauseCantAffordSkip: boolean;
  canSkipMonsterEncounter: boolean;
  canAffordSkipMonsterEncounter: boolean;
  showAllyCombatOutcomeModal: boolean;
  allyCombatOutcome: AllyCombatOutcome | null;
  myCardPending: CardPending | null;
  bossFinaleExiting: boolean;
  sheetDiceBlockClass: string;
  send: (action: ClientAction) => void;
  showToast: (message: string, durationMs?: number) => void;
  showXpGainPrompt: (xpAmount: number) => void;
  suppressNextHpFlashRef: MutableRefObject<boolean>;
  allyCombatOutcomeAckRef: MutableRefObject<Set<string>>;
  setAllyCombatOutcomeDismissedKey: (key: string) => void;
  setBossFinaleExitLocal: (v: boolean) => void;
  bossFinaleFinishTimerRef: MutableRefObject<number | null>;
};

export function playCardOrSipActionsVisible(
  props: Pick<
    PlayCardOrSipActionsProps,
    | "me"
    | "state"
    | "needsBrewerPerkChoice"
    | "hasBlockingSipNotice"
    | "myEnemyIntroPending"
    | "skipMonsterIntroBecauseCantAffordSkip"
    | "showAllyCombatOutcomeModal"
    | "myCardPending"
  >,
): boolean {
  if (!props.me) return false;
  if (props.needsBrewerPerkChoice) return false;
  if (props.state?.pending?.type === "brewerDown") return false;
  if (props.hasBlockingSipNotice) return false;
  if (props.myEnemyIntroPending && !props.skipMonsterIntroBecauseCantAffordSkip) return true;
  if (props.showAllyCombatOutcomeModal) return true;
  return !!props.myCardPending;
}

export function PlayCardOrSipActions(props: PlayCardOrSipActionsProps) {
  const {
    me,
    state,
    needsBrewerPerkChoice,
    hasBlockingSipNotice,
    myEnemyIntroPending,
    skipMonsterIntroBecauseCantAffordSkip,
    canSkipMonsterEncounter,
    canAffordSkipMonsterEncounter,
    showAllyCombatOutcomeModal,
    allyCombatOutcome,
    myCardPending,
    bossFinaleExiting,
    sheetDiceBlockClass,
    send,
    showToast,
    showXpGainPrompt,
    suppressNextHpFlashRef,
    allyCombatOutcomeAckRef,
    setAllyCombatOutcomeDismissedKey,
    setBossFinaleExitLocal,
    bossFinaleFinishTimerRef,
  } = props;

  if (!me) return null;
  if (needsBrewerPerkChoice) return null;
  if (state?.pending?.type === "brewerDown") return null;
  if (hasBlockingSipNotice) return null;
  if (myEnemyIntroPending) {
    if (skipMonsterIntroBecauseCantAffordSkip) return null;
    return (
      <div className={u.stack10}>
        {canSkipMonsterEncounter ? (
          <ArcadeButton
            variant="gray"
            fullWidth
            disabled={!canAffordSkipMonsterEncounter}
            onClick={() => {
              send({ type: "skipMonsterEncounter", playerId: me.id });
              const enemy = myEnemyIntroPending?.enemyName ?? "batchmötet";
              showToast(sv.play.skipMonsterEncounterToast(me.name, enemy));
            }}
          >
            {sv.play.skipMonsterEncounter}
          </ArcadeButton>
        ) : null}
        <ArcadeButton variant="pink" fullWidth onClick={() => send({ type: "combatIntroAck", playerId: me.id })}>
          {sv.play.continue}
        </ArcadeButton>
      </div>
    );
  }
  if (showAllyCombatOutcomeModal && allyCombatOutcome && me) {
    const ackKey = allyCombatOutcome.key;
    const isWin = allyCombatOutcome.pending.cardId === "combat_win";
    const cw = allyCombatOutcome.pending.combatWin;
    const cl = allyCombatOutcome.pending.combatLoss;
    const impact =
      allyCombatOutcome.role === "helpMate" ? cl?.helpMateImpact : cl?.assistPartnerImpact;
    return (
      <ArcadeButton
        variant="pink"
        fullWidth
        onClick={() => {
          allyCombatOutcomeAckRef.current.add(ackKey);
          setAllyCombatOutcomeDismissedKey(ackKey);
          if (isWin && cw) {
            const loot: string[] = [];
            if (
              allyCombatOutcome.role === "beerBro" &&
              cw.beerBroGrantedRewardTitles?.length
            ) {
              loot.push(...cw.beerBroGrantedRewardTitles);
            }
            if (
              allyCombatOutcome.role === "helpMate" &&
              cw.helpMateGrantedRewardTitles?.length
            ) {
              loot.push(...cw.helpMateGrantedRewardTitles);
            }
            if (loot.length > 0) {
              showToast(
                sv.play.combatWinGrantedLootToast(loot),
                Math.min(9000, 2800 + loot.length * 1200),
              );
            }
            return;
          }
          if (!isWin && impact && impact.playerId === me.id) {
            const hpLoss = Math.max(0, Math.floor(impact.hpLost));
            const klunk = Math.max(0, Math.floor(impact.klunksGained));
            if (hpLoss === 0) suppressNextHpFlashRef.current = true;
            if (klunk > 0) showXpGainPrompt(klunk * PENALTY_XP_PER_KLUNK);
          }
        }}
      >
        {sv.cardModal.continue}
      </ArcadeButton>
    );
  }
  if (!myCardPending) return null;
  const rolledEventDie = (() => {
    if (myCardPending.kind !== "event") return null;
    const m = /Tärning:\s*(\d+)/i.exec(myCardPending.text);
    if (!m) return null;
    const n = Number(m[1]);
    if (!Number.isFinite(n)) return null;
    return Math.max(1, Math.min(6, Math.round(n)));
  })();
  if (myCardPending.choices && myCardPending.choices.length > 0) {
    const showEventRollDie =
      myCardPending.kind === "event" && myCardPending.choices.some((c) => c.id === "roll");
    return (
      <div className={u.stack8}>
        {showEventRollDie ? (
          <div className={sheetDiceBlockClass}>
            <DiceCube3D idleSpin spinning size={76} />
            <div className={styles.sheetDiceCaption} aria-hidden />
          </div>
        ) : null}
        {myCardPending.choices.map((c) => (
          <ArcadeButton
            key={c.id}
            variant="blue"
            fullWidth
            onClick={() => send({ type: "chooseCardOption", playerId: me.id, choiceId: c.id })}
          >
            {c.label}
          </ArcadeButton>
        ))}
      </div>
    );
  }
  return (
    <div className={u.stack8}>
      {rolledEventDie != null ? (
        <div className={sheetDiceBlockClass}>
          <DiceCube3D value={rolledEventDie} size={76} />
          <div className={styles.sheetDiceCaption} aria-hidden />
        </div>
      ) : null}
      <ArcadeButton
        variant="pink"
        fullWidth
        disabled={myCardPending.cardId === "boss_final_win" && bossFinaleExiting}
        onClick={() => {
          if (myCardPending.cardId === "combat_win") {
            showXpGainPrompt(myCardPending.combatWin?.rewardXp ?? 0);
            const lootTitles = myCardPending.combatWin?.grantedRewardTitles;
            if (lootTitles && lootTitles.length > 0) {
              showToast(sv.play.combatWinGrantedLootToast(lootTitles), Math.min(9000, 2800 + lootTitles.length * 1200));
            }
            send({ type: "confirmCard", playerId: me.id });
            return;
          }
          if (myCardPending.cardId === "combat_lose") {
            const klunk = Math.max(0, Math.floor(myCardPending.combatLoss?.klunkGained ?? 0));
            const hpLoss = Math.max(0, Math.floor(myCardPending.combatLoss?.damage ?? 0));
            if (hpLoss === 0) suppressNextHpFlashRef.current = true;
            showXpGainPrompt(klunk * PENALTY_XP_PER_KLUNK);
            send({ type: "confirmCard", playerId: me.id });
            return;
          }
          if (myCardPending.cardId === "boss_final_win") {
            if (bossFinaleExiting) return;
            if (bossFinaleFinishTimerRef.current != null) return;
            const reducedMotion =
              typeof window !== "undefined" &&
              window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            setBossFinaleExitLocal(true);
            send({ type: "confirmCard", playerId: me.id });
            bossFinaleFinishTimerRef.current = window.setTimeout(() => {
              bossFinaleFinishTimerRef.current = null;
              send({ type: "confirmCard", playerId: me.id });
            }, bossFinaleExitTotalMs(reducedMotion));
            return;
          }
          send({ type: "confirmCard", playerId: me.id });
        }}
      >
        {myCardPending.cardId === "boss_final_win" && bossFinaleExiting
          ? sv.play.bossFinaleEnding
          : sv.cardModal.continue}
      </ArcadeButton>
    </div>
  );
}
