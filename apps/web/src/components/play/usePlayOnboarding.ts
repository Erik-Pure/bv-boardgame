import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { GameState } from "@bv/game-core";
import { PLAY_ROOT_MOBILE_GRADIENT_MQ } from "./playLayoutConstants";
import { mobileTutorialAckKey, responsibleReminderAckKey } from "./playOnboardingKeys";

export function usePlayOnboarding(options: {
  room: string;
  status: string;
  state: GameState | null;
  myId: string | null;
}) {
  const { room, status, state, myId } = options;

  const [showResponsibleReminder, setShowResponsibleReminder] = useState(false);
  const [showMobileTutorial, setShowMobileTutorial] = useState(false);
  const [mobileTutorialStep, setMobileTutorialStep] = useState(0);
  const [tutorialBodyNeedsScroll, setTutorialBodyNeedsScroll] = useState(false);
  const tutorialBodyScrollRef = useRef<HTMLDivElement | null>(null);

  const dismissResponsibleReminder = useCallback(() => {
    try {
      window.sessionStorage.setItem(responsibleReminderAckKey(room), "1");
    } catch {
      // ignore
    }
    setShowResponsibleReminder(false);
  }, [room]);

  const dismissMobileTutorial = useCallback(() => {
    try {
      window.sessionStorage.setItem(mobileTutorialAckKey(room), "1");
    } catch {
      // ignore
    }
    setShowMobileTutorial(false);
  }, [room]);

  const openMobileTutorial = useCallback(() => {
    setMobileTutorialStep(0);
    setShowMobileTutorial(true);
  }, []);

  useEffect(() => {
    setShowResponsibleReminder(false);
    setShowMobileTutorial(false);
    setMobileTutorialStep(0);
  }, [room]);

  useEffect(() => {
    if (status !== "connected") {
      setShowResponsibleReminder(false);
      return;
    }
    if (showResponsibleReminder) return;
    if (!state || !myId) return;
    if (!state.players.some((p) => p.id === myId)) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia(PLAY_ROOT_MOBILE_GRADIENT_MQ).matches) return;
    try {
      if (window.sessionStorage.getItem(responsibleReminderAckKey(room)) === "1") return;
    } catch {
      return;
    }
    setShowResponsibleReminder(true);
  }, [status, state, myId, room, showResponsibleReminder]);

  useEffect(() => {
    if (status !== "connected") {
      setShowMobileTutorial(false);
      return;
    }
    if (showResponsibleReminder || showMobileTutorial) return;
    if (!state || !myId) return;
    if (!state.players.some((p) => p.id === myId)) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia(PLAY_ROOT_MOBILE_GRADIENT_MQ).matches) return;
    try {
      if (window.sessionStorage.getItem(mobileTutorialAckKey(room)) === "1") return;
    } catch {
      return;
    }
    setMobileTutorialStep(0);
    setShowMobileTutorial(true);
  }, [status, state, myId, room, showResponsibleReminder, showMobileTutorial]);

  useLayoutEffect(() => {
    if (!showMobileTutorial) return;
    const measure = () => {
      const el = tutorialBodyScrollRef.current;
      if (!el) return;
      setTutorialBodyNeedsScroll(el.scrollHeight > el.clientHeight + 2);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [showMobileTutorial, mobileTutorialStep]);

  return {
    showResponsibleReminder,
    showMobileTutorial,
    mobileTutorialStep,
    setMobileTutorialStep,
    tutorialBodyNeedsScroll,
    tutorialBodyScrollRef,
    dismissResponsibleReminder,
    dismissMobileTutorial,
    openMobileTutorial,
  };
}
