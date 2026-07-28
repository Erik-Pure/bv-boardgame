import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  brewerDisplayLevel,
  brewerKlunkProgressRatio,
  monsterCombatEquipmentAttackBonus,
  pvpEquipmentDieBonusTotal,
  canAffordPant,
  playerCanCombatIntervene,
  equipmentDamageNegate,
  playerTotalItemCardBonus,
} from "@bv/game-core";
import { type ItemInventoryBadgeOpts } from "../lib/inventoryEffectBadges";
import { usePlaySfxSync } from "../hooks/usePlaySfxSync";
import { useScreenWakeLock } from "../hooks/useScreenWakeLock";
import {
  readBoardPerformancePrefs,
  subscribeBoardPerformancePrefs,
  syncLitePerformanceDocumentClass,
} from "../lib/boardPerformancePrefs";
import { subscribeTurnVibration } from "../lib/turnVibration";
import { WsReconnectFooterHint } from "../components/WsReconnectOverlay";
import { ArcadeButton } from "../components/ArcadeButton";
import { PlayerAvatarStack } from "../components/PlayerAvatarStack";
import { PlayCardCombatModals } from "../components/play/PlayCardCombatModals";
import { getMobileTutorialSteps } from "../components/play/mobileTutorialSteps";
import { PlayMobileTutorial } from "../components/play/PlayMobileTutorial";
import { PlayResponsibleReminderModal } from "../components/play/PlayResponsibleReminderModal";
import { PlayTurnOverlays } from "../components/play/PlayTurnOverlays";
import { PLAY_ROOT_MOBILE_GRADIENT_MQ } from "../components/play/playLayoutConstants";
import { usePlayOnboarding } from "../components/play/usePlayOnboarding";
import { usePlayTurnOverlays } from "../components/play/usePlayTurnOverlays";
import { usePlayXpGainPrompt } from "../components/play/usePlayXpGainPrompt";
import { PlayBrewerDownModal } from "../components/play/PlayBrewerDownModal";
import { PlayHeader } from "../components/play/playHeaderUi";
import {
  PlayBrewerPerkChoicePrompt,
  PlayLevelUpOfferPrompt,
} from "../components/play/PlayPersonalTurnPrompts";
import { usePlayBottomSheetContent } from "../components/play/usePlayBottomSheetContent";
import { PlayActionBusyProvider } from "../components/play/playActionBusy";
import { usePlayGameSession } from "../components/play/usePlayGameSession";
import { usePlayPendingTransitions } from "../components/play/usePlayPendingTransitions";
import { usePlayItemTargetedToast } from "../components/play/usePlayItemTargetedToast";
import { PlayEndedOverlay } from "../components/play/PlayEndedOverlay";
import { PlayEquipDetailModal } from "../components/play/PlayEquipDetailModal";
import { FloatingEmoteControl } from "../components/play/FloatingEmoteControl";
import { PlayBottomSheet } from "../components/play/PlayBottomSheet";
import { PlayPlayerInventoryPanel } from "../components/play/PlayPlayerInventoryPanel";
import { PlayPlayersModal } from "../components/play/PlayPlayersModal";
import { PlaySettingsModals } from "../components/play/PlaySettingsModals";
import { PlayItemDetailModal } from "../components/play/PlayItemDetailModal";
import { type ItemDetailSelection } from "../components/play/PlayItemDetailSheet";
import {
  normalizePlayToast,
  type PlayToastPayload,
  type ShowPlayToast,
} from "../components/play/playToast";
import { itemImageSrc } from "../lib/itemImageSrc";
import { isMyPending } from "../lib/playInteractionHelpers";
import { myPersonalTurnPrompt } from "../components/play/playSessionHelpers";
import styles from "./PlayView.module.css";
import { combatAllyOutcomeKey, combatAllyOutcomeRole } from "../lib/combatUi";
import { useUiStrings, useLocale } from "../lib/locale/LocaleContext";
import { localizePendingCard } from "../lib/localizePendingCard";
import { wsStatusLabel } from "../lib/uiStrings";

const RAINBOW_EFFECTS_STORAGE_KEY = "bv.play.rainbowEffectsEnabled";

function clearPlayRootBackground(): void {
  const root = document.getElementById("root");
  const html = document.documentElement;
  if (!root) return;
  for (const el of [root, html]) {
    el.style.removeProperty("background");
    el.style.removeProperty("background-image");
    el.style.removeProperty("background-color");
  }
}

/** Neutral mobilgradient när spelarfärg saknas (t.ex. under återanslutning). */
const PLAY_ROOT_FALLBACK_TINT = "#1e293b";

function applyPlayRootBackground(playerTint: string | undefined): void {
  const root = document.getElementById("root");
  const html = document.documentElement;
  if (!root) return;
  const useGradient = window.matchMedia(PLAY_ROOT_MOBILE_GRADIENT_MQ).matches;
  const tint = playerTint ?? (useGradient ? PLAY_ROOT_FALLBACK_TINT : undefined);
  if (!tint) {
    clearPlayRootBackground();
    return;
  }
  if (useGradient) {
    const gradient = `linear-gradient(180deg, ${tint} 0%, ${tint} 10%, #0a0a12 45%, #000000 100%)`;
    for (const el of [root, html]) {
      el.style.background = gradient;
      el.style.backgroundColor = "#000000";
    }
  } else {
    for (const el of [root, html]) {
      el.style.removeProperty("background-image");
      el.style.background = tint;
      el.style.backgroundColor = tint;
    }
  }
}

export function PlayView() {
  const ui = useUiStrings();
  const locale = useLocale();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const room = (sp.get("room") ?? "").toUpperCase() || "TEST1";
  const name = sp.get("name") ?? "Bryggare";

  const [toast, setToast] = useState<PlayToastPayload | null>(null);
  const toastHideTimerRef = useRef<number | null>(null);

  const showToast = useCallback<ShowPlayToast>((payload, durationMs = 3600) => {
    if (toastHideTimerRef.current != null) {
      window.clearTimeout(toastHideTimerRef.current);
      toastHideTimerRef.current = null;
    }
    setToast(normalizePlayToast(payload));
    toastHideTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastHideTimerRef.current = null;
    }, durationMs);
  }, []);

  useEffect(() => {
    return () => {
      if (toastHideTimerRef.current != null) {
        window.clearTimeout(toastHideTimerRef.current);
        toastHideTimerRef.current = null;
      }
    };
  }, []);
  const [showPlayers, setShowPlayers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [interactionPanelCollapsed, setInteractionPanelCollapsed] = useState(false);
  const [rainbowEffectsEnabled, setRainbowEffectsEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(RAINBOW_EFFECTS_STORAGE_KEY) !== "0";
  });
  const [mobileSfxEnabled, setMobileSfxEnabled] = useState(
    () => readBoardPerformancePrefs().mobileSfxEnabled,
  );
  const [equipDetail, setEquipDetail] = useState<{
    slot: "weapon" | "armor" | "helmet" | "accessory";
  } | null>(null);
  const [itemDetail, setItemDetail] = useState<ItemDetailSelection | null>(null);
  /** Efter första "Använd" för föremål som kräver målspelare: visa då mål-knapparna. */
  /** «Ett sjätte ölsinne»: vald tärningsyta innan useItem. */
  /** Lengräddad, En enkel stöld, Spilla med flit — kräver målspelare vid ingripande. */
  const [isMobilePlayLayout, setIsMobilePlayLayout] = useState(
    () => typeof window !== "undefined" && window.matchMedia(PLAY_ROOT_MOBILE_GRADIENT_MQ).matches,
  );
  const allyCombatOutcomeAckRef = useRef<Set<string>>(new Set());
  const [allyCombatOutcomeDismissedKey, setAllyCombatOutcomeDismissedKey] = useState<string | null>(
    null,
  );
  const bossFinaleFinishTimerRef = useRef<number | null>(null);
  const [bossFinaleExitLocal, setBossFinaleExitLocal] = useState(false);

  const {
    state,
    myId,
    me,
    status,
    reconnectAttemptN,
    overlayPhase,
    requestReconnect,
    showReconnectOverlay,
    send,
    actionBusy,
    leaveCurrentGame,
  } = usePlayGameSession({ room, name, showToast, navigate });

  const [boardPerf, setBoardPerf] = useState(() => readBoardPerformancePrefs());
  useScreenWakeLock(
    boardPerf.preventSleepEnabled &&
      (state?.phase === "playing" || state?.phase === "lobby"),
  );

  const {
    showResponsibleReminder,
    showMobileTutorial,
    mobileTutorialStep,
    setMobileTutorialStep,
    tutorialBodyNeedsScroll,
    tutorialBodyScrollRef,
    dismissResponsibleReminder,
    dismissMobileTutorial,
    openMobileTutorial,
  } = usePlayOnboarding({ room, status, state, myId });

  const { xpGainPromptText, xpGainPromptKey, showXpGainPrompt } = usePlayXpGainPrompt();

  useEffect(() => {
    syncLitePerformanceDocumentClass();
    return subscribeBoardPerformancePrefs(() => {
      setMobileSfxEnabled(readBoardPerformancePrefs().mobileSfxEnabled);
      setBoardPerf(readBoardPerformancePrefs());
      syncLitePerformanceDocumentClass();
    });
  }, []);

  usePlaySfxSync({ state, meId: me?.id ?? null });
  const lobbyCardCoverId = state?.config.cardCover;

  useEffect(() => subscribeTurnVibration(), []);

  const itemInvBadgeOpts = useMemo<ItemInventoryBadgeOpts | undefined>(() => {
    if (!me || !state?.levels?.length) return undefined;
    return {
      playerLevelIndex: me.levelIndex,
      levelCount: state.levels.length,
      itemCardBonus: playerTotalItemCardBonus(me),
    };
  }, [me, state?.levels?.length, me?.levelIndex, me?.brewerItemCardBonus, me?.equipment]);
  const mobileEquipmentCombatTotals = useMemo(() => {
    if (!me || state?.phase !== "playing") return null;
    return {
      maxHp: me.maxHp,
      attack: monsterCombatEquipmentAttackBonus(me),
      nextCombatMod: me.nextCombatModifier ?? 0,
      shield: equipmentDamageNegate(me),
      bvb: pvpEquipmentDieBonusTotal(me),
      itemCards: playerTotalItemCardBonus(me),
    };
  }, [me, state?.phase, me?.brewerItemCardBonus, me?.equipment, me?.nextCombatModifier]);
  const activeId = state?.turnOrder?.[state.currentTurnIndex ?? 0] ?? null;
  const footerTurnCaption = useMemo(() => {
    if (!state || state.phase !== "playing" || !activeId) return null;
    const p = state.players.find((x) => x.id === activeId);
    const name = p?.name?.trim() || "—";
    if (me && activeId === me.id) return ui.play.footerTurnYou;
    return ui.play.footerTurnOther(name);
  }, [state, activeId, me?.id]);
  const isMyTurn = me && activeId === me.id && state?.phase === "playing";
  /** Spelarfärg på #root/html; smal vy: gradient spelarfärg → svart längst ned. */
  useEffect(() => {
    const mq = window.matchMedia(PLAY_ROOT_MOBILE_GRADIENT_MQ);
    const apply = () => applyPlayRootBackground(me?.color);
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      clearPlayRootBackground();
    };
  }, [me?.color]);

  useEffect(() => {
    const mq = window.matchMedia(PLAY_ROOT_MOBILE_GRADIENT_MQ);
    const sync = () => setIsMobilePlayLayout(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const showHeaderStatsBar = Boolean(state && me && state.phase !== "lobby");
  const headerStatusTag = useMemo(() => {
    if (!me) return "";
    const parts: string[] = [];
    if ((me.skippedTurns ?? 0) > 0 && me.skipTurnReasons?.includes("normal")) parts.push("(Zzz)");
    if (me.skipTurnReasons?.includes("oil")) parts.push(`(${ui.table.playerStatusOilInEye})`);
    return parts.length ? parts.join(" ") : "";
  }, [me]);
  const brewerProgressUi = useMemo(() => {
    if (!state || !me || state.phase !== "playing") return null;
    const bl = brewerDisplayLevel(me);
    const ratio = brewerKlunkProgressRatio(me.xp);
    return { brewerLevel: bl, ratio };
  }, [state, me]);
  /* Namnrad: 12+46+12=70 (knapp 46px). Stats-rad är något lägre efter mindre level-ikon, så total offset justeras för att undvika glipa mot utrustning. */
  const headerTopPad = showHeaderStatsBar ? 130 : 70;
  /** Fixed utrustningspanel har egen botten-padding; håll sidans bottenmarginal låg. */
  const pageBottomPad = 12;
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(RAINBOW_EFFECTS_STORAGE_KEY, rainbowEffectsEnabled ? "1" : "0");
  }, [rainbowEffectsEnabled]);

  const pending = state?.pending ?? null;

  const combatFighterSheet =
    !!me &&
    pending?.type === "combat" &&
    pending.phase === "reactions" &&
    (pending.attackerId === me.id || pending.assistId === me.id);

  const pvpPending = pending?.type === "pvp" ? pending : null;
  const pvpParticipant =
    !!me && !!pvpPending && (pvpPending.attackerId === me.id || pvpPending.defenderId === me.id);
  const pvpRollSheet = pvpParticipant && pvpPending?.phase === "awaitingRolls";
  const myPvpRoll = me && pvpPending?.phase === "awaitingRolls" ? pvpPending.rolls?.[me.id] : undefined;
  const pvpRound = pvpPending ? (pvpPending.roundNumber ?? pvpPending.pvpRound ?? 1) : 1;

  const personalTurnPromptEarly = myPersonalTurnPrompt(state, me);
  const personalPromptBlocksRollEarly =
    personalTurnPromptEarly?.type === "brewerPerkChoice" ||
    (me?.pendingBrewerPerkLevels ?? 0) > 0 ||
    personalTurnPromptEarly?.type === "levelUpOffer";
  const onRollDieScreen = !!isMyTurn && !pending && !personalPromptBlocksRollEarly;

  const myEnemyIntroPending = useMemo(() => {
    if (!state || state.phase !== "playing" || !me) return null;
    if (state.pending?.type !== "combat" || state.pending.phase !== "enemyIntro") return null;
    return state.pending.attackerId === me.id ? state.pending : null;
  }, [state?.pending, state?.phase, me?.id]);

  const canSkipMonsterEncounter =
    !!myEnemyIntroPending && me?.equipment?.accessory?.canSkipMonsterEncounter === true;
  const canAffordSkipMonsterEncounter = canAffordPant(me, 2);
  const skipMonsterIntroBecauseCantAffordSkip =
    canSkipMonsterEncounter && !canAffordSkipMonsterEncounter;

  const {
    nowTick,
    rollDiceSpinning,
    setRollDiceSpinning,
    combatDiceSpinning,
    setCombatDiceSpinning,
    pvpDiceSpinning,
    setPvpDiceSpinning,
    sheetFlash,
    cancelCombatHelpRequest,
  } = usePlayPendingTransitions({
    pending,
    me,
    state,
    status,
    showToast,
    send,
    myEnemyIntroPending,
    skipMonsterIntroBecauseCantAffordSkip,
    combatFighterSheet,
    pvpRollSheet: !!pvpRollSheet,
    myPvpRoll,
    pvpRound,
    onRollDieScreen,
    allyCombatOutcomeAckRef,
  });

  const readyCount = state?.players?.filter((p) => p.ready).length ?? 0;
  const totalPlayers = state?.players?.length ?? 0;
  const canStart =
    !!me?.isHost && state?.phase === "lobby" && totalPlayers >= 2 && readyCount === totalPlayers;

  /** Regnbåge även off-turn när du har konkret interaktion (ingripande, ölkompis-strid, hjälpkontrakt m.m.). */
  const hasCombatMobileAttention = useMemo(() => {
    if (!me || state?.phase !== "playing" || pending?.type !== "combat") return false;
    if (combatFighterSheet) return true;
    if (pending.phase === "reactions") {
      const isEligibleReactor =
        (pending.reactors?.includes(me.id) ?? false) && playerCanCombatIntervene(me);
      const hasPassed = pending.reacted?.[me.id] === "pass";
      const deadlineAt = pending.reactionsDeadlineAt ?? 0;
      const secondsLeft = deadlineAt > 0 ? Math.max(0, Math.ceil((deadlineAt - nowTick) / 1000)) : 0;
      const reactionOpen = deadlineAt <= 0 || secondsLeft > 0;
      if (isEligibleReactor && !hasPassed && reactionOpen) return true;
    }
    const pid = me.id;
    if (pending.phase === "helpChooseHelper" && pending.attackerId === pid) return true;
    if (pending.phase === "helpAwaitDecision" && pending.helpSelectedHelperId === pid) return true;
    if (pending.phase === "helpAwaitRequesterDecision" && pending.attackerId === pid) return true;
    if (pending.phase === "helpAwaitCard" && pending.helpSelectedHelperId === pid) return true;
    if (pending.phase === "chooseTeammate" && pending.attackerId === pid) return true;
    if (pending.phase === "rollPreview" && pending.attackerId === pid) return true;
    if (pending.phase === "chooseHitMitigation" && pending.attackerId === pid) return true;
    return false;
  }, [me, state?.phase, pending, combatFighterSheet, nowTick]);
  const inCombat = pending?.type === "combat";
  const inPvpAwaitingRolls = pvpParticipant && pvpPending?.phase === "awaitingRolls";
  const inPvpPreRoundItems = pvpParticipant && pvpPending?.phase === "preRoundItems";

  const mySipNotice = useMemo(() => {
    if (!me || !state || state.phase !== "playing") return null;
    const list = state.sipNotices ?? [];
    return list.find((n) => n.recipientId === me.id) ?? null;
  }, [state?.sipNotices, state?.phase, me?.id]);
  const myCardPending = useMemo(() => {
    if (!state || state.phase !== "playing" || !me) return null;
    if (state.pending?.type !== "card") return null;
    return state.pending.playerId === me.id ? state.pending : null;
  }, [state?.pending, state?.phase, me?.id]);
  const allyCombatOutcome = useMemo(() => {
    if (!state || state.phase !== "playing" || !me) return null;
    const p = state.pending;
    if (p?.type !== "card") return null;
    if (p.playerId === me.id) return null;
    if (p.cardId !== "combat_win" && p.cardId !== "combat_lose") return null;
    const role = combatAllyOutcomeRole(p, me.id);
    if (!role) return null;
    return { pending: p, role, key: combatAllyOutcomeKey(p) };
  }, [state?.pending, state?.phase, me?.id]);
  useEffect(() => {
    if (!allyCombatOutcome) {
      setAllyCombatOutcomeDismissedKey(null);
      return;
    }
    setAllyCombatOutcomeDismissedKey((prev) =>
      prev === allyCombatOutcome.key ? prev : null,
    );
  }, [allyCombatOutcome?.key]);
  const showAllyCombatOutcomeModal =
    !!allyCombatOutcome && allyCombatOutcomeDismissedKey !== allyCombatOutcome.key;
  const myPending = isMyPending(pending, me);
  const highlightPulse =
    !!isMyTurn ||
    state?.phase === "lobby" ||
    !!canStart ||
    !!myPending ||
    showAllyCombatOutcomeModal ||
    hasCombatMobileAttention;
  const showRainbowPulse = highlightPulse && rainbowEffectsEnabled;
  const bossFinalePending = useMemo(() => {
    if (!state || state.phase !== "playing") return null;
    if (state.pending?.type !== "card" || state.pending.cardId !== "boss_final_win") return null;
    return localizePendingCard(state.pending, locale);
  }, [state?.pending, state?.phase, locale]);
  const bossFinaleExiting =
    bossFinaleExitLocal || (state?.bossFinaleExitStartedAt ?? null) != null;
  useEffect(() => {
    if (!bossFinalePending) setBossFinaleExitLocal(false);
  }, [bossFinalePending]);
  useEffect(() => {
    return () => {
      if (bossFinaleFinishTimerRef.current != null) {
        window.clearTimeout(bossFinaleFinishTimerRef.current);
        bossFinaleFinishTimerRef.current = null;
      }
    };
  }, []);

  /** Straffklunk efter monsterförlust: visa Vaskad-kortet först, sedan sip-modal (motorn lägger sip i kö före kortet). */
  const suppressSipNoticeForCombatLoseCard =
    myCardPending?.cardId === "combat_lose" ||
    (showAllyCombatOutcomeModal && allyCombatOutcome?.pending.cardId === "combat_lose");
  const hasBlockingSipNotice =
    !!mySipNotice &&
    mySipNotice.noticeKind !== "toast" &&
    !suppressSipNoticeForCombatLoseCard &&
    pending?.type !== "brewerDown";

  usePlayItemTargetedToast({
    state,
    me,
    showToast,
    hasBlockingSipNotice,
  });

  const { showMyTurnOverlay, showLevelUpOverlay } = usePlayTurnOverlays({
    isMyTurn: !!isMyTurn,
    state,
    me,
    showToast,
    showResponsibleReminder,
    showMobileTutorial,
    allyCombatOutcome,
    allyCombatOutcomeDismissedKey,
    hasBlockingSipNotice,
  });

  const {
    personalTurnPrompt,
    needsBrewerPerkChoice,
    itemMetaForView,
    isItemPlayableNow,
    bottomSheetPrimary,
    bottomSheetVisible,
    bottomSheetMeasureRef,
    bottomSheetAnimatedHeight,
    bottomSheetHeightInstant,
    bottomSheetEnterDone,
    sheetTurnAnim,
    controlsAboveBottomSheetPx,
    showFloatingEmote,
    raiseAboveCard,
    hpFlash,
    hpFlashKey,
    pantFlash,
    pantFlashKey,
    klunkFlash,
    klunkFlashKey,
    equipFlash,
    equipFlashKey,
    itemFlash,
    itemFlashKey,
  } = usePlayBottomSheetContent({
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
    interactionPanelCollapsed,
    setInteractionPanelCollapsed,
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
    isMyTurn: !!isMyTurn,
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
  });

  const floatingEmoteBottom =
    controlsAboveBottomSheetPx ?? "max(10px, env(safe-area-inset-bottom))";

  const mobileTutorialSteps = useMemo(() => getMobileTutorialSteps(ui), [ui]);
  const tutorialStep = mobileTutorialSteps[Math.max(0, Math.min(mobileTutorialStep, mobileTutorialSteps.length - 1))];

  return (
    <PlayActionBusyProvider busy={actionBusy}>
    <div
      className={styles.page}
      style={{
        width: "100%",
        maxWidth: 740,
        margin: "0 auto",
        /* Headerhöjd = exakt under fixed header (namn + ev. stats); ska matcha .playerEquipmentShell top */
        padding: `${headerTopPad}px 16px ${pageBottomPad}px`,
        boxSizing: "border-box",
        ["--play-toast-top" as string]: `${headerTopPad}px`,
      }}
    >
      <PlayHeader
        me={me}
        displayName={name}
        headerStatusTag={headerStatusTag}
        showHeaderStatsBar={showHeaderStatsBar}
        hasState={!!state}
        onOpenSettings={() => setShowSettings(true)}
        onOpenPlayers={() => setShowPlayers(true)}
        hpFlash={hpFlash}
        hpFlashKey={hpFlashKey}
        pantFlash={pantFlash}
        pantFlashKey={pantFlashKey}
        klunkFlash={klunkFlash}
        klunkFlashKey={klunkFlashKey}
        brewerLevel={brewerProgressUi?.brewerLevel ?? 1}
        brewerRatio={brewerProgressUi?.ratio ?? 0}
        xpGainPromptText={xpGainPromptText}
        xpGainPromptKey={xpGainPromptKey}
      />

      {/* Utanför .content så fixed-modaler inte fastnar under header (z 60) i .content:s stacking context */}
      {state && me ? (
        <PlayCardCombatModals
          state={state}
          me={me}
          pending={pending ?? null}
          cardCoverId={lobbyCardCoverId}
          needsBrewerPerkChoice={needsBrewerPerkChoice}
          showAllyCombatOutcomeModal={showAllyCombatOutcomeModal}
          allyCombatOutcome={allyCombatOutcome}
          myEnemyIntroPending={myEnemyIntroPending}
          skipMonsterIntroBecauseCantAffordSkip={skipMonsterIntroBecauseCantAffordSkip}
          mySipNotice={mySipNotice}
          hasBlockingSipNotice={hasBlockingSipNotice}
          bossFinalePending={bossFinalePending}
          bossFinaleExiting={bossFinaleExiting}
        />
      ) : null}
      {state?.phase === "playing" &&
        me &&
        personalTurnPrompt?.type === "levelUpOffer" &&
        personalTurnPrompt.playerId === me.id && (
        <PlayLevelUpOfferPrompt personalTurnPrompt={personalTurnPrompt} cardCoverId={lobbyCardCoverId} />
      )}
      {state?.phase === "playing" && me && needsBrewerPerkChoice && (
        <PlayBrewerPerkChoicePrompt
          levelsRemaining={
            personalTurnPrompt?.type === "brewerPerkChoice"
              ? personalTurnPrompt.levelsRemaining
              : (me.pendingBrewerPerkLevels ?? 1)
          }
          cardCoverId={lobbyCardCoverId}
        />
      )}
      {state?.phase === "playing" && pending?.type === "brewerDown" && me && (
        <PlayBrewerDownModal pending={pending} me={me} state={state} cardCoverId={lobbyCardCoverId} send={send} />
      )}

      {state ? <PlayEndedOverlay state={state} onLeaveHome={() => navigate("/", { replace: true })} /> : null}

      <div className={styles.content}>
        {!state && <div>{ui.play.waitingState}</div>}

        {state && state.phase !== "ended" && (
          <>
            {(!me || state.phase !== "lobby") && (
              <section
                className={styles.playerBoardPanel}
                style={{
                  marginBottom: me ? 0 : 12,
                  width: "100%",
                  minWidth: 0,
                  boxSizing: "border-box",
                }}
              >
                {!me ? (
                  <div className={styles.sessionRecovery}>
                    <p className={styles.sessionRecoveryText}>
                      {status === "connected" && state
                        ? ui.play.sessionStale
                        : ui.play.lookingForPlayer}
                    </p>
                    {status === "connected" && state ? (
                      <ArcadeButton variant="pink" fullWidth onClick={() => leaveCurrentGame()}>
                        {ui.play.sessionStaleLeave}
                      </ArcadeButton>
                    ) : null}
                  </div>
                ) : null}
                {me ? (
                  <PlayPlayerInventoryPanel
                    me={me}
                    pending={pending}
                    headerTopPad={headerTopPad}
                    bottomSheetVisible={bottomSheetVisible}
                    bottomSheetAnimatedHeight={bottomSheetAnimatedHeight}
                    bottomSheetHeightInstant={bottomSheetHeightInstant}
                    mobileEquipmentCombatTotals={mobileEquipmentCombatTotals}
                    equipFlash={equipFlash}
                    equipFlashKey={equipFlashKey}
                    itemFlash={itemFlash}
                    itemFlashKey={itemFlashKey}
                    itemInvBadgeOpts={itemInvBadgeOpts}
                    onEquipClick={(slot) => setEquipDetail({ slot })}
                    onItemClick={setItemDetail}
                    itemMetaForView={itemMetaForView}
                    isItemPlayableNow={isItemPlayableNow}
                    inCombat={inCombat}
                    inPvpPreRoundItems={inPvpPreRoundItems}
                    inPvpAwaitingRolls={inPvpAwaitingRolls}
                  />
                ) : null}
              </section>
            )}

            {state.phase === "lobby" && me && (
              <section
                style={{
                  padding: 12,
                  border: "1px solid #3333",
                  borderRadius: 12,
                  marginBottom: 12,
                  width: "100%",
                  boxSizing: "border-box",
                  textAlign: "center",
                }}
              >
                <h2 style={{ marginTop: 0 }}>{ui.play.lobbySectionTitle}</h2>
                <div style={{ opacity: 0.8, marginBottom: 8 }}>{ui.play.lobbyReadyLine(readyCount, state.players.length)}</div>
                <div style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}>
                  <PlayerAvatarStack avatar={me.avatar} color={me.color} size="lobby" />
                </div>
                {!isMobilePlayLayout ? (
                  <ul
                    style={{
                      listStyle: "none",
                      margin: "0 0 10px",
                      padding: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      fontSize: 14,
                    }}
                  >
                    {state.players.map((p) => (
                      <li key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: p.color,
                            flexShrink: 0,
                          }}
                        />
                        <span>
                          {p.name}
                          {p.isHost ? ` ${ui.play.hostTag}` : ""}
                          {p.ready ? " ✓" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {!isMobilePlayLayout ? (
                  <div style={{ opacity: 0.75, fontSize: 12 }}>{ui.play.lobbyBottomHint}</div>
                ) : null}
              </section>
            )}
          </>
        )}
      </div>

      {showFloatingEmote && me ? (
        <FloatingEmoteControl
          me={me}
          send={send}
          bottom={floatingEmoteBottom}
          bottomInstant={bottomSheetHeightInstant}
        />
      ) : null}

      <PlayBottomSheet
        visible={bottomSheetVisible}
        collapsed={interactionPanelCollapsed}
        onToggleCollapsed={() => setInteractionPanelCollapsed((v) => !v)}
        controlsAbovePx={controlsAboveBottomSheetPx}
        showRainbowPulse={showRainbowPulse}
        enterDone={bottomSheetEnterDone}
        turnAnim={sheetTurnAnim}
        animatedHeight={bottomSheetAnimatedHeight}
        heightInstant={bottomSheetHeightInstant}
        measureRef={bottomSheetMeasureRef}
        sheetFlash={sheetFlash}
        raiseAboveCard={raiseAboveCard}
      >
        {bottomSheetPrimary}
      </PlayBottomSheet>

      <PlayTurnOverlays showMyTurnOverlay={showMyTurnOverlay} showLevelUpOverlay={showLevelUpOverlay} />

      <PlayResponsibleReminderModal
        open={showResponsibleReminder}
        cardCoverId={lobbyCardCoverId}
        onDismiss={dismissResponsibleReminder}
      />
      <PlayMobileTutorial
        open={showMobileTutorial}
        step={tutorialStep}
        stepIndex={mobileTutorialStep}
        stepCount={mobileTutorialSteps.length}
        bodyNeedsScroll={tutorialBodyNeedsScroll}
        bodyScrollRef={tutorialBodyScrollRef}
        onDismiss={dismissMobileTutorial}
        onBack={() => setMobileTutorialStep((s) => Math.max(0, s - 1))}
        onNext={() => setMobileTutorialStep((s) => Math.min(mobileTutorialSteps.length - 1, s + 1))}
      />

      <PlaySettingsModals
        cardCoverId={lobbyCardCoverId}
        room={room}
        status={status}
        footerTurnCaption={footerTurnCaption}
        showSettings={showSettings}
        onCloseSettings={() => setShowSettings(false)}
        showLeaveConfirm={showLeaveConfirm}
        onCloseLeaveConfirm={() => setShowLeaveConfirm(false)}
        onConfirmLeave={() => {
          setShowLeaveConfirm(false);
          setShowSettings(false);
          leaveCurrentGame();
        }}
        rainbowEffectsEnabled={rainbowEffectsEnabled}
        onRainbowEffectsChange={setRainbowEffectsEnabled}
        boardAnimationsEnabled={boardPerf.boardAnimationsEnabled}
        mobileSfxEnabled={mobileSfxEnabled}
        onMobileSfxChange={setMobileSfxEnabled}
        onOpenTutorial={() => {
          openMobileTutorial();
          setShowSettings(false);
        }}
        onRequestLeave={() => setShowLeaveConfirm(true)}
      />

      {state ? (
        <PlayPlayersModal
          open={showPlayers}
          state={state}
          cardCoverId={lobbyCardCoverId}
          onClose={() => setShowPlayers(false)}
        />
      ) : null}

      {me ? (
        <PlayEquipDetailModal
          equipDetail={equipDetail}
          onClose={() => setEquipDetail(null)}
          me={me}
          isMyTurn={!!isMyTurn}
          cardCoverId={lobbyCardCoverId}
          send={send}
        />
      ) : null}

      {me && state ? (
        <PlayItemDetailModal
          itemDetail={itemDetail}
          onClose={() => setItemDetail(null)}
          me={me}
          state={state}
          cardCoverId={lobbyCardCoverId}
          itemMetaForView={itemMetaForView}
          itemInvBadgeOpts={itemInvBadgeOpts}
        />
      ) : null}

      {showReconnectOverlay ? (
        <div className={styles.reconnectBar}>
          <div className={styles.reconnectBarText}>
            {room} · {wsStatusLabel(status, locale)}
          </div>
          <WsReconnectFooterHint
            phase={overlayPhase}
            attempt={reconnectAttemptN}
            connectingShort={ui.play.wsReconnectFooterConnecting}
            waitingShort={ui.play.wsReconnectFooterWaiting}
            retryLabel={ui.play.wsRetry}
            onRetry={requestReconnect}
          />
        </div>
      ) : null}

      {toast ? (
        <div
          className={[
            styles.playToast,
            toast.itemId ? styles.playToastRich : "",
            toast.tone === "positive" ? styles.playToastPositive : "",
            toast.tone === "negative" ? styles.playToastNegative : "",
          ]
            .filter(Boolean)
            .join(" ")}
          role="status"
          aria-live="polite"
        >
          {toast.itemId ? (
            <>
              <img
                src={itemImageSrc(String(toast.itemId))}
                alt=""
                className={styles.playToastArt}
                draggable={false}
              />
              <div className={styles.playToastBody}>
                {toast.itemTitle ? <div className={styles.playToastTitle}>{toast.itemTitle}</div> : null}
                <div className={styles.playToastMessage}>{toast.message}</div>
              </div>
            </>
          ) : (
            toast.message
          )}
        </div>
      ) : null}
    </div>
    </PlayActionBusyProvider>
  );
}

