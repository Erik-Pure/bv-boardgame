import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import type { ClientAction, GameState, Pending, Player } from "@bv/game-core";
import { combatAllyOutcomeKey } from "../../lib/combatUi";
import { sv } from "../../lib/uiStrings";

export function usePlayPendingTransitions(options: {
  pending: Pending | null;
  me: Player | null;
  state: GameState | null;
  status: string;
  showToast: (message: string, durationMs?: number) => void;
  send: (action: ClientAction) => void;
  myEnemyIntroPending: Extract<Pending, { type: "combat" }> | null;
  skipMonsterIntroBecauseCantAffordSkip: boolean;
  combatFighterSheet: boolean;
  pvpRollSheet: boolean;
  myPvpRoll: { die: number; total: number } | undefined;
  pvpRound: number;
  onRollDieScreen: boolean;
  allyCombatOutcomeAckRef: MutableRefObject<Set<string>>;
}) {
  const {
    pending,
    me,
    state,
    status,
    showToast,
    send,
    myEnemyIntroPending,
    skipMonsterIntroBecauseCantAffordSkip,
    combatFighterSheet,
    pvpRollSheet,
    myPvpRoll,
    pvpRound,
    onRollDieScreen,
    allyCombatOutcomeAckRef,
  } = options;

  const prevPendingRef = useRef<Pending | null>(null);
  const combatHelpCancelBySelfRef = useRef(false);
  const lastToastSipNoticeRef = useRef<string | null>(null);
  const autoCombatIntroAckSigRef = useRef<string | null>(null);

  const [nowTick, setNowTick] = useState(() => Date.now());
  const [rollDiceSpinning, setRollDiceSpinning] = useState(true);
  const [combatDiceSpinning, setCombatDiceSpinning] = useState(true);
  const [pvpDiceSpinning, setPvpDiceSpinning] = useState(true);
  const [sheetFlashGen, setSheetFlashGen] = useState(0);
  const [sheetFlash, setSheetFlash] = useState(false);

  useEffect(() => {
    if (combatFighterSheet) return;
    setCombatDiceSpinning(true);
  }, [combatFighterSheet]);

  useEffect(() => {
    if (!pvpRollSheet) {
      setPvpDiceSpinning(true);
      return;
    }
    if (!myPvpRoll) setPvpDiceSpinning(true);
  }, [pvpRollSheet, myPvpRoll, pvpRound]);

  useEffect(() => {
    if (!(pending?.type === "combat" && pending.phase === "reactions" && (pending.reactionsDeadlineAt ?? 0) > 0)) {
      return;
    }
    const t = window.setInterval(() => setNowTick(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [pending]);

  useEffect(() => {
    if (onRollDieScreen) return;
    setRollDiceSpinning(true);
  }, [onRollDieScreen]);

  useEffect(() => {
    const prev = prevPendingRef.current;

    if (me?.id && prev?.type === "card" && prev.cardId === "combat_win" && prev.combatWin) {
      const stillCombatWin = pending?.type === "card" && pending.cardId === "combat_win";
      const ackKey = combatAllyOutcomeKey(prev);
      if (!stillCombatWin && !allyCombatOutcomeAckRef.current.has(ackKey)) {
        const cw = prev.combatWin;
        const loot: string[] = [];
        if (cw.assistPlayerId === me.id && cw.beerBroGrantedRewardTitles?.length) {
          loot.push(...cw.beerBroGrantedRewardTitles);
        }
        if (cw.helpMatePlayerId === me.id && cw.helpMateGrantedRewardTitles?.length) {
          loot.push(...cw.helpMateGrantedRewardTitles);
        }
        if (loot.length > 0) {
          showToast(sv.play.combatWinGrantedLootToast(loot), Math.min(9000, 2800 + loot.length * 1200));
        }
      }
    }

    if (me?.id && prev?.type === "card" && prev.cardId === "combat_lose" && prev.combatLoss) {
      const stillCombatLose = pending?.type === "card" && pending.cardId === "combat_lose";
      const ackKey = combatAllyOutcomeKey(prev);
      if (!stillCombatLose && !allyCombatOutcomeAckRef.current.has(ackKey)) {
        const cl = prev.combatLoss;
        const impactToastMs = 5200;
        const hmImpact = cl.helpMateImpact;
        if (
          hmImpact &&
          hmImpact.playerId === me.id &&
          (hmImpact.hpLost > 0 || hmImpact.klunksGained > 0)
        ) {
          showToast(
            sv.play.combatLoseAllyImpactToast("helpMate", hmImpact.hpLost, hmImpact.klunksGained),
            impactToastMs,
          );
        }
        const broImpact = cl.assistPartnerImpact;
        if (
          broImpact &&
          broImpact.playerId === me.id &&
          (broImpact.hpLost > 0 || broImpact.klunksGained > 0)
        ) {
          showToast(
            sv.play.combatLoseAllyImpactToast("beerBro", broImpact.hpLost, broImpact.klunksGained),
            impactToastMs,
          );
        }
      }
    }

    if (
      me?.id &&
      prev?.type === "combat" &&
      prev.phase === "helpAwaitDecision" &&
      prev.helpSelectedHelperId &&
      pending?.type === "combat" &&
      pending.phase === "reactions" &&
      pending.attackerId === me.id &&
      !combatHelpCancelBySelfRef.current
    ) {
      const helperName =
        state?.players.find((p) => p.id === prev.helpSelectedHelperId)?.name ?? "Spelaren";
      showToast(sv.play.combatHelpDeniedToast(helperName));
    }
    combatHelpCancelBySelfRef.current = false;

    if (me) {
      const now = pending?.type === "moveChoice" && pending.playerId === me.id;
      const was = prev?.type === "moveChoice" && prev.playerId === me.id;
      if (now && !was) setSheetFlashGen((g) => g + 1);
    }
    prevPendingRef.current = pending;
  }, [pending, me, state?.players, showToast]);

  useEffect(() => {
    if (sheetFlashGen < 1) return;
    setSheetFlash(true);
    const t = window.setTimeout(() => setSheetFlash(false), 980);
    return () => clearTimeout(t);
  }, [sheetFlashGen]);

  const cancelCombatHelpRequest = useCallback(() => {
    if (!me) return;
    combatHelpCancelBySelfRef.current = true;
    send({ type: "combatCancelHelpRequest", playerId: me.id });
  }, [me, send]);

  const mySipNotice = me && state?.phase === "playing"
    ? (state.sipNotices ?? []).find((n) => n.recipientId === me.id) ?? null
    : null;

  useEffect(() => {
    if (!me || !mySipNotice || mySipNotice.noticeKind !== "toast") return;
    const sig = `${mySipNotice.title ?? ""}|${mySipNotice.body ?? ""}|${mySipNotice.fromPlayerName}`;
    if (lastToastSipNoticeRef.current === sig) return;
    lastToastSipNoticeRef.current = sig;
    const msg =
      mySipNotice.body?.trim() ||
      sv.play.pekaArgtDamageToast(mySipNotice.fromPlayerName || sv.sipNotice.fallbackFrom);
    showToast(msg, 4500);
    send({ type: "sipNoticeAck", playerId: me.id });
  }, [mySipNotice, me?.id, showToast, send]);

  useEffect(() => {
    if (!myEnemyIntroPending || status !== "connected" || !me) {
      if (!myEnemyIntroPending) autoCombatIntroAckSigRef.current = null;
      return;
    }
    if (!skipMonsterIntroBecauseCantAffordSkip) return;
    const sig = `${myEnemyIntroPending.attackerId}:${myEnemyIntroPending.monsterId}:${myEnemyIntroPending.enemyName}:${myEnemyIntroPending.need}:${myEnemyIntroPending.needMod ?? 0}`;
    if (autoCombatIntroAckSigRef.current === sig) return;
    autoCombatIntroAckSigRef.current = sig;
    send({ type: "combatIntroAck", playerId: me.id });
  }, [myEnemyIntroPending, me?.id, skipMonsterIntroBecauseCantAffordSkip, status, send]);

  return {
    nowTick,
    rollDiceSpinning,
    setRollDiceSpinning,
    combatDiceSpinning,
    setCombatDiceSpinning,
    pvpDiceSpinning,
    setPvpDiceSpinning,
    sheetFlash,
    cancelCombatHelpRequest,
  };
}
