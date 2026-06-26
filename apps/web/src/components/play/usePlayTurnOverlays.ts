import { useEffect, useRef, useState } from "react";
import { brewerDisplayLevel, type GameState, type Player } from "@bv/game-core";
import { vibrateMyTurn } from "../../lib/turnVibration";
import { useUiStrings } from "../../lib/locale/LocaleContext";
import { isMobilePlayLayout, PLAY_ROOT_MOBILE_GRADIENT_MQ } from "./playLayoutConstants";

type AllyCombatOutcome = {
  key: string;
} | null;

export function usePlayTurnOverlays(options: {
  isMyTurn: boolean;
  state: GameState | null;
  me: Player | null;
  showToast: (message: string, durationMs?: number) => void;
  showResponsibleReminder: boolean;
  showMobileTutorial: boolean;
  allyCombatOutcome: AllyCombatOutcome;
  allyCombatOutcomeDismissedKey: string | null;
  hasBlockingSipNotice: boolean;
}) {
  const ui = useUiStrings();
  const {
    isMyTurn,
    state,
    me,
    showToast,
    showResponsibleReminder,
    showMobileTutorial,
    allyCombatOutcome,
    allyCombatOutcomeDismissedKey,
    hasBlockingSipNotice,
  } = options;

  const [showMyTurnOverlay, setShowMyTurnOverlay] = useState(false);
  const [showLevelUpOverlay, setShowLevelUpOverlay] = useState<number | null>(null);
  const [queuedLevelUpOverlay, setQueuedLevelUpOverlay] = useState<number | null>(null);

  const prevMyTurnOverlayRef = useRef(false);
  const myTurnOverlayTimerRef = useRef<number | null>(null);
  const prevBrewerLevelsRef = useRef<Map<string, number> | null>(null);
  const levelUpOverlayTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const isPlaying = state?.phase === "playing";
    const curr = !!isMyTurn && isPlaying;
    const prev = prevMyTurnOverlayRef.current;
    prevMyTurnOverlayRef.current = curr;

    if (myTurnOverlayTimerRef.current != null) {
      window.clearTimeout(myTurnOverlayTimerRef.current);
      myTurnOverlayTimerRef.current = null;
    }

    if (!curr) {
      setShowMyTurnOverlay(false);
      return;
    }
    if (prev === curr) return;
    if (showResponsibleReminder || showMobileTutorial) return;
    if (typeof window !== "undefined" && !window.matchMedia(PLAY_ROOT_MOBILE_GRADIENT_MQ).matches) return;

    setShowMyTurnOverlay(true);
    vibrateMyTurn();
    myTurnOverlayTimerRef.current = window.setTimeout(() => {
      setShowMyTurnOverlay(false);
      myTurnOverlayTimerRef.current = null;
    }, 3000);

    return () => {
      if (myTurnOverlayTimerRef.current != null) {
        window.clearTimeout(myTurnOverlayTimerRef.current);
        myTurnOverlayTimerRef.current = null;
      }
    };
  }, [isMyTurn, state?.phase, showResponsibleReminder, showMobileTutorial]);

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
    const leveled = state.players
      .map((p) => ({
        player: p,
        prev: prev.get(p.id) ?? brewerDisplayLevel(p),
        curr: currLevels.get(p.id) ?? brewerDisplayLevel(p),
      }))
      .filter((x) => x.curr > x.prev);
    if (leveled.length === 0) return;
    const own = me ? leveled.find((x) => x.player.id === me.id) : null;
    const pvpRoundRevealOpen = state.pending?.type === "pvp" && state.pending.phase === "roundReveal";
    const allyOutcomeBlocksCelebration =
      !!allyCombatOutcome && allyCombatOutcomeDismissedKey !== allyCombatOutcome.key;
    if (own) {
      const ownCombatResultCardOpen =
        state.pending?.type === "card" &&
        state.pending.playerId === own.player.id &&
        (state.pending.cardId === "combat_win" || state.pending.cardId === "combat_lose");
      const sipBlocksLevelCelebration = (state.sipNotices ?? []).some(
        (n) => n.recipientId === own.player.id && n.noticeKind !== "toast",
      );
      if (ownCombatResultCardOpen || sipBlocksLevelCelebration || pvpRoundRevealOpen || allyOutcomeBlocksCelebration) {
        setQueuedLevelUpOverlay(own.curr);
        return;
      }
      showToast(ui.play.levelUpBrewerToast(own.curr));
      if (isMobilePlayLayout() && !showResponsibleReminder && !showMobileTutorial) {
        if (levelUpOverlayTimerRef.current != null) {
          window.clearTimeout(levelUpOverlayTimerRef.current);
          levelUpOverlayTimerRef.current = null;
        }
        setShowLevelUpOverlay(own.curr);
        levelUpOverlayTimerRef.current = window.setTimeout(() => {
          setShowLevelUpOverlay(null);
          levelUpOverlayTimerRef.current = null;
        }, 3400);
      }
    }
  }, [
    state,
    me,
    showToast,
    showResponsibleReminder,
    showMobileTutorial,
    allyCombatOutcome,
    allyCombatOutcomeDismissedKey,
  ]);

  useEffect(() => {
    if (queuedLevelUpOverlay == null || !state || !me) return;
    const pvpRoundRevealOpen = state.pending?.type === "pvp" && state.pending.phase === "roundReveal";
    const allyOutcomeBlocksCelebration =
      !!allyCombatOutcome && allyCombatOutcomeDismissedKey !== allyCombatOutcome.key;
    const ownCombatResultCardOpen =
      state.pending?.type === "card" &&
      state.pending.playerId === me.id &&
      (state.pending.cardId === "combat_win" || state.pending.cardId === "combat_lose");
    if (ownCombatResultCardOpen || pvpRoundRevealOpen || allyOutcomeBlocksCelebration) return;
    if (hasBlockingSipNotice) return;
    showToast(ui.play.levelUpBrewerToast(queuedLevelUpOverlay));
    if (isMobilePlayLayout() && !showResponsibleReminder && !showMobileTutorial) {
      if (levelUpOverlayTimerRef.current != null) {
        window.clearTimeout(levelUpOverlayTimerRef.current);
        levelUpOverlayTimerRef.current = null;
      }
      setShowLevelUpOverlay(queuedLevelUpOverlay);
      levelUpOverlayTimerRef.current = window.setTimeout(() => {
        setShowLevelUpOverlay(null);
        levelUpOverlayTimerRef.current = null;
      }, 3400);
    }
    setQueuedLevelUpOverlay(null);
  }, [
    queuedLevelUpOverlay,
    state,
    me,
    hasBlockingSipNotice,
    showToast,
    showResponsibleReminder,
    showMobileTutorial,
    allyCombatOutcome,
    allyCombatOutcomeDismissedKey,
  ]);

  useEffect(() => {
    return () => {
      if (levelUpOverlayTimerRef.current != null) {
        window.clearTimeout(levelUpOverlayTimerRef.current);
        levelUpOverlayTimerRef.current = null;
      }
    };
  }, []);

  return { showMyTurnOverlay, showLevelUpOverlay };
}
