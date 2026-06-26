import { useCallback, useMemo, type Dispatch, type MutableRefObject, type ReactNode, type SetStateAction } from "react";
import {
  klunkBurstCountForSipNotice,
  isPlayerActiveInMatch,
  PENALTY_XP_PER_KLUNK,
  type ClientAction,
  type GameState,
  type ItemId,
  type Pending,
  type Player,
  type ItemUseTarget,
  canUseItem,
} from "@bv/game-core";
import { readBoardPerformancePrefs } from "../../lib/boardPerformancePrefs";
import { playTableSfx } from "../../lib/tableSfx";
import { isMyPending, myOffTurnCombatEquipReplace } from "../../lib/playInteractionHelpers";
import { ArcadeButton } from "../ArcadeButton";
import {
  PlayCardOrSipActions,
  playCardOrSipActionsVisible,
  type AllyCombatOutcome,
} from "./PlayCardOrSipActions";
import { PlayInteractionSheet } from "./PlayInteractionSheet";
import { PlayItemDetailSheet, type ItemDetailSelection } from "./PlayItemDetailSheet";
import { itemMetaForView as resolveItemMetaForView } from "./playItemMeta";
import { computeBottomSheetPrimaryKind, computeBottomSheetZIndexFlags } from "./playBottomSheetHelpers";
import { usePlayStatFlash } from "./usePlayStatFlash";
import { myPersonalTurnPrompt } from "./playSessionHelpers";
import styles from "../../routes/PlayView.module.css";
import u from "../../styles/uiPrimitives.module.css";
import { useUiStrings, useLocale } from "../../lib/locale/LocaleContext";
import { usePlayBottomSheetAnimation, type BottomSheetPrimaryKind } from "./usePlayBottomSheetAnimation";

export function usePlayBottomSheetContent(options: {
  state: GameState | null;
  me: Player | null;
  myId: string | null;
  status: string;
  send: (action: ClientAction) => void;
  pending: Pending | null;
  itemDetail: ItemDetailSelection | null;
  setItemDetail: Dispatch<SetStateAction<ItemDetailSelection | null>>;
  equipDetail: { slot: "weapon" | "armor" | "helmet" | "accessory" } | null;
  setEquipDetail: Dispatch<SetStateAction<{ slot: "weapon" | "armor" | "helmet" | "accessory" } | null>>;
  interactionPanelCollapsed: boolean;
  setInteractionPanelCollapsed: Dispatch<SetStateAction<boolean>>;
  footerTurnCaption: string | null;
  nowTick: number;
  combatDiceSpinning: boolean;
  setCombatDiceSpinning: (v: boolean) => void;
  pvpDiceSpinning: boolean;
  setPvpDiceSpinning: (v: boolean) => void;
  rollDiceSpinning: boolean;
  setRollDiceSpinning: (v: boolean) => void;
  cancelCombatHelpRequest: () => void;
  showToast: (message: string, durationMs?: number) => void;
  showXpGainPrompt: (xpAmount: number) => void;
  isMyTurn: boolean;
  readyCount: number;
  totalPlayers: number;
  canStart: boolean;
  mobileEquipmentCombatTotals: {
    maxHp: number;
    attack: number;
    shield: number;
    bvb: number;
    itemCards: number;
  } | null;
  hasBlockingSipNotice: boolean;
  mySipNotice: import("@bv/game-core").SipNoticeEntry | null;
  myEnemyIntroPending: Extract<Pending, { type: "combat" }> | null;
  skipMonsterIntroBecauseCantAffordSkip: boolean;
  canSkipMonsterEncounter: boolean;
  canAffordSkipMonsterEncounter: boolean;
  showAllyCombatOutcomeModal: boolean;
  allyCombatOutcome: AllyCombatOutcome | null;
  myCardPending: Extract<Pending, { type: "card" }> | null;
  bossFinaleExiting: boolean;
  bossFinaleFinishTimerRef: MutableRefObject<number | null>;
  setBossFinaleExitLocal: Dispatch<SetStateAction<boolean>>;
  allyCombatOutcomeAckRef: MutableRefObject<Set<string>>;
  setAllyCombatOutcomeDismissedKey: Dispatch<SetStateAction<string | null>>;
}) {
  const ui = useUiStrings();
  const locale = useLocale();
  const {
    state,
    me,
    myId,
    status,
    send,
    pending,
    itemDetail,
    setItemDetail,
    equipDetail,
    setEquipDetail,
    footerTurnCaption,
    nowTick,
    combatDiceSpinning,
    setCombatDiceSpinning,
    pvpDiceSpinning,
    setPvpDiceSpinning,
    rollDiceSpinning,
    setRollDiceSpinning,
    cancelCombatHelpRequest,
    showToast,
    showXpGainPrompt,
    isMyTurn,
    readyCount,
    totalPlayers,
    canStart,
    mobileEquipmentCombatTotals,
    hasBlockingSipNotice,
    mySipNotice,
    myEnemyIntroPending,
    skipMonsterIntroBecauseCantAffordSkip,
    canSkipMonsterEncounter,
    canAffordSkipMonsterEncounter,
    showAllyCombatOutcomeModal,
    allyCombatOutcome,
    myCardPending,
    bossFinaleExiting,
    bossFinaleFinishTimerRef,
    setBossFinaleExitLocal,
    allyCombatOutcomeAckRef,
    setAllyCombatOutcomeDismissedKey,
  } = options;

  const personalTurnPrompt = myPersonalTurnPrompt(state, me);
  const needsBrewerPerkChoice =
    personalTurnPrompt?.type === "brewerPerkChoice" || (me?.pendingBrewerPerkLevels ?? 0) > 0;
  const personalPromptBlocksRoll =
    needsBrewerPerkChoice || personalTurnPrompt?.type === "levelUpOffer";

  const isItemPlayableNow = useCallback(
    (itemId: string, target: ItemUseTarget) => {
      if (!me || !state) return false;
      return canUseItem(state, me.id, itemId as ItemId, target);
    },
    [me, state],
  );

  const itemMetaForView = useCallback(
    (itemId: string) => resolveItemMetaForView(itemId, me, state, locale),
    [me, state, locale],
  );

  const interaction =
    state && me ? (
      <PlayInteractionSheet
        state={state}
        me={me}
        status={status}
        send={send}
        readyCount={readyCount}
        totalPlayers={totalPlayers}
        canStart={canStart}
        needsBrewerPerkChoice={needsBrewerPerkChoice}
        mobileEquipmentCombatTotals={mobileEquipmentCombatTotals}
        isMyTurn={isMyTurn}
        personalTurnPrompt={personalTurnPrompt}
        personalPromptBlocksRoll={personalPromptBlocksRoll}
        nowTick={nowTick}
        combatDiceSpinning={combatDiceSpinning}
        setCombatDiceSpinning={setCombatDiceSpinning}
        pvpDiceSpinning={pvpDiceSpinning}
        setPvpDiceSpinning={setPvpDiceSpinning}
        rollDiceSpinning={rollDiceSpinning}
        setRollDiceSpinning={setRollDiceSpinning}
        sheetDiceBlockClass={styles.sheetDiceBlock}
        cancelCombatHelpRequest={cancelCombatHelpRequest}
        itemMetaForView={itemMetaForView}
        showToast={showToast}
        interactionPanelCollapsed={options.interactionPanelCollapsed}
        pending={pending}
        footerTurnCaption={footerTurnCaption}
      />
    ) : null;

  const myPending = isMyPending(pending, me);

  const cardOrSipActionsVisible = playCardOrSipActionsVisible({
    me: me!,
    state,
    needsBrewerPerkChoice,
    hasBlockingSipNotice,
    myEnemyIntroPending,
    skipMonsterIntroBecauseCantAffordSkip,
    showAllyCombatOutcomeModal,
    myCardPending,
  });

  const blocksStatFlashOverlay =
    !!me &&
    state?.phase === "playing" &&
    (!!hasBlockingSipNotice ||
      !!(myPending && pending?.type === "card") ||
      showAllyCombatOutcomeModal ||
      !!(myPending && pending?.type === "equipmentReplaceOffer") ||
      !!myOffTurnCombatEquipReplace(state, me) ||
      !!(pending?.type === "combat" && pending.postReactionEquipmentOffer?.playerId === me.id) ||
      !!itemDetail ||
      !!equipDetail ||
      cardOrSipActionsVisible ||
      !!interaction ||
      pending?.type === "brewerDown");

  const statFlash = usePlayStatFlash({ state, myId, blocksStatFlashOverlay });

  const cardOrSipActions =
    me && state && cardOrSipActionsVisible ? (
      <PlayCardOrSipActions
        me={me}
        state={state}
        needsBrewerPerkChoice={needsBrewerPerkChoice}
        hasBlockingSipNotice={hasBlockingSipNotice}
        myEnemyIntroPending={myEnemyIntroPending}
        skipMonsterIntroBecauseCantAffordSkip={skipMonsterIntroBecauseCantAffordSkip}
        canSkipMonsterEncounter={canSkipMonsterEncounter}
        canAffordSkipMonsterEncounter={canAffordSkipMonsterEncounter}
        showAllyCombatOutcomeModal={showAllyCombatOutcomeModal}
        allyCombatOutcome={allyCombatOutcome}
        myCardPending={myCardPending}
        bossFinaleExiting={bossFinaleExiting}
        sheetDiceBlockClass={styles.sheetDiceBlock}
        send={send}
        showToast={showToast}
        showXpGainPrompt={showXpGainPrompt}
        suppressNextHpFlashRef={statFlash.suppressNextHpFlashRef}
        allyCombatOutcomeAckRef={allyCombatOutcomeAckRef}
        setAllyCombatOutcomeDismissedKey={setAllyCombatOutcomeDismissedKey}
        setBossFinaleExitLocal={setBossFinaleExitLocal}
        bossFinaleFinishTimerRef={bossFinaleFinishTimerRef}
      />
    ) : null;

  const acknowledgeBlockingSipNotice = useCallback(() => {
    if (!me || !mySipNotice) return;
    const hasCustom = !!mySipNotice.title?.trim() || !!mySipNotice.body?.trim();
    const duelLoss = mySipNotice.noticeKind === "duel_loss";
    if (!hasCustom && !duelLoss) {
      const count = Math.max(1, Math.floor(mySipNotice.klunkCount ?? 1));
      showXpGainPrompt(count * PENALTY_XP_PER_KLUNK);
    }
    if (klunkBurstCountForSipNotice(mySipNotice) != null) {
      playTableSfx("klunk", { enabled: readBoardPerformancePrefs().mobileSfxEnabled });
    }
    send({ type: "sipNoticeAck", playerId: me.id });
  }, [me, mySipNotice, showXpGainPrompt, send]);

  const itemDetailSheet =
    itemDetail && me && state ? (
      <PlayItemDetailSheet
        itemDetail={itemDetail}
        onClose={() => setItemDetail(null)}
        state={state}
        me={me}
        send={send}
        itemMetaForView={itemMetaForView}
        isItemPlayableNow={isItemPlayableNow}
      />
    ) : null;

  const equipDetailSheet =
    equipDetail && me ? (
      <ArcadeButton variant="gray" fullWidth onClick={() => setEquipDetail(null)}>
        {ui.play.modalClose}
      </ArcadeButton>
    ) : null;

  const sipNoticeAckSheet =
    hasBlockingSipNotice && me && mySipNotice ? (
      <div className={u.stack10}>
        <ArcadeButton variant="pink" fullWidth onClick={acknowledgeBlockingSipNotice}>
          {mySipNotice.noticeKind === "duel_loss"
            ? ui.sipNotice.duelAck
            : mySipNotice.title?.trim() || mySipNotice.body?.trim()
              ? ui.sipNotice.ack
              : ui.sipNotice.cheers}
        </ArcadeButton>
      </div>
    ) : null;

  const brewerPerkPrioritized = needsBrewerPerkChoice;
  const personalPromptPrioritized = personalTurnPrompt?.type === "levelUpOffer";
  const turnPromptSheet =
    brewerPerkPrioritized || personalPromptPrioritized ? interaction : null;

  const bottomSheetPrimary: ReactNode =
    itemDetailSheet ??
    equipDetailSheet ??
    turnPromptSheet ??
    cardOrSipActions ??
    sipNoticeAckSheet ??
    interaction;

  const bottomSheetVisible = pending?.type !== "brewerDown" && !!bottomSheetPrimary;

  const bottomSheetPrimaryKind: BottomSheetPrimaryKind = computeBottomSheetPrimaryKind({
    hasItemDetail: !!itemDetailSheet,
    hasEquipDetail: !!equipDetailSheet,
    hasCardOrSip: cardOrSipActionsVisible,
    brewerPerkPrioritized,
    personalPromptPrioritized,
    hasSipAck: !!sipNoticeAckSheet,
    hasInteraction: !!interaction,
  });

  const zIndexFlags = computeBottomSheetZIndexFlags({
    me,
    state,
    pending,
    needsBrewerPerkChoice,
    personalTurnPrompt,
  });

  const raiseAboveCard = useMemo(
    () =>
      !!(
        itemDetailSheet ||
        equipDetailSheet ||
        cardOrSipActionsVisible ||
        sipNoticeAckSheet ||
        zIndexFlags.overTeamBattleIntro ||
        zIndexFlags.overEncounterChoice ||
        zIndexFlags.overTurnPrompt
      ),
    [
      itemDetailSheet,
      equipDetailSheet,
      cardOrSipActionsVisible,
      sipNoticeAckSheet,
      zIndexFlags.overTeamBattleIntro,
      zIndexFlags.overEncounterChoice,
      zIndexFlags.overTurnPrompt,
    ],
  );

  const showFloatingEmote = !!me && state?.phase === "playing" && isPlayerActiveInMatch(me);

  const {
    measureRef: bottomSheetMeasureRef,
    animatedHeight: bottomSheetAnimatedHeight,
    heightInstant: bottomSheetHeightInstant,
    enterDone: bottomSheetEnterDone,
    turnAnim: sheetTurnAnim,
    controlsAbovePx: controlsAboveBottomSheetPx,
  } = usePlayBottomSheetAnimation({
    visible: bottomSheetVisible,
    primaryKind: bottomSheetPrimaryKind,
    collapsed: options.interactionPanelCollapsed,
    setCollapsed: options.setInteractionPanelCollapsed,
    isMyTurn,
    playing: state?.phase === "playing",
  });

  return {
    personalTurnPrompt,
    needsBrewerPerkChoice,
    itemMetaForView,
    isItemPlayableNow,
    bottomSheetPrimary,
    bottomSheetVisible,
    bottomSheetPrimaryKind,
    bottomSheetMeasureRef,
    bottomSheetAnimatedHeight,
    bottomSheetHeightInstant,
    bottomSheetEnterDone,
    sheetTurnAnim,
    controlsAboveBottomSheetPx,
    showFloatingEmote,
    raiseAboveCard,
    zIndexFlags,
    ...statFlash,
  };
}
