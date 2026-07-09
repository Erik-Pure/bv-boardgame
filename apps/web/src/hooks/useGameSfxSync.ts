import { useEffect, useRef } from "react";
import type { GameState } from "@bv/game-core";
import {
  affectsLocalPlayer,
  brewerDisplayLevel,
  combatMonsterDiceSfxKey,
  isCombatParticipant,
  lastCombatReactionPlaySeq,
  lastTableItemRevealSeq,
  shouldHearItemPlaySfx,
  syncItemPlaySeq,
  eventCardUsesBadBatchSfx,
  tableCardUsesCardFlipSfx,
  type PendingCard,
} from "../lib/gameSfxSyncHelpers";
import { eventCardDiceSfxKey } from "../lib/eventCardDice";
import { tableItemPlayUsesDieRollSfx } from "../lib/tableItemPlaySfx";
import {
  clearCombatIntroSfxKeys,
  clearTableSfxQueue,
  consumeOptimisticMoveRollSfx,
  playTableSfx,
  tryClaimCombatIntroAudio,
} from "../lib/tableSfx";

export type GameSfxSyncProps = {
  state: GameState | null;
  sfxEnabled: boolean;
  /** null = bräde (alla spelare). Satt = mobil (filtrera spelarspecifika triggers). */
  localPlayerId: string | null;
  cardOverlay: {
    pendingKey: string | null;
    pendingCard: PendingCard | null;
    /** Kort-overlay synlig — cardFlip, event, vinst/förlust. */
    visible: boolean;
    /** Modal redo — händelsekort-tärning (samma gate som brädets tableCardModalReady). */
    modalReady: boolean;
  };
  combatOverlay: {
    sessionKey: string | null;
    introVisible: boolean;
    monsterOutcomeSfxKey: string | null;
  };
};

export function useGameSfxSync(props: GameSfxSyncProps): void {
  const { state, sfxEnabled, localPlayerId, cardOverlay, combatOverlay } = props;
  const {
    pendingKey: tableCardPendingKey,
    pendingCard,
    visible: cardOverlayVisible,
    modalReady: cardModalReady,
  } = cardOverlay;
  const {
    sessionKey: tableCombatSessionKey,
    introVisible: combatIntroVisible,
    monsterOutcomeSfxKey: tableMonsterOutcomeSfxKey,
  } = combatOverlay;

  const prevDiceRef = useRef<{ roll: number; rollerId: string } | null>(null);
  const prevPendingTypeRef = useRef<string | null>(null);
  const prevBrewerLevelsRef = useRef<Map<string, number> | null>(null);
  const playedCardSfxForKeyRef = useRef<string | null>(null);
  const prevCardOverlayVisibleRef = useRef(false);
  const eventLandSoundCardKeyRef = useRef<string | null>(null);
  const prevItemRevealSeqRef = useRef<number | null>(null);
  const prevReactionPlaySeqRef = useRef<number | null>(null);
  const prevCombatDiceSfxKeyRef = useRef<string | null>(null);
  const prevCombatSfxSessionRef = useRef<string | null>(null);
  const prevEventCardDiceSfxKeyRef = useRef<string | null>(null);
  const prevEventCardSfxSessionRef = useRef<string | null>(null);
  const prevMonsterOutcomeSfxKeyRef = useRef<string | null>(null);
  const prevBrewerDownSfxKeyRef = useRef<string | null>(null);
  const sfxSessionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const sessionKey = state ? `${state.roomCode ?? ""}:${state.phase}` : null;
    if (sessionKey === sfxSessionKeyRef.current) return;
    sfxSessionKeyRef.current = sessionKey;
    prevDiceRef.current = null;
    prevPendingTypeRef.current = null;
    prevBrewerLevelsRef.current = null;
    playedCardSfxForKeyRef.current = null;
    prevCardOverlayVisibleRef.current = false;
    eventLandSoundCardKeyRef.current = null;
    prevItemRevealSeqRef.current = null;
    prevReactionPlaySeqRef.current = null;
    prevCombatDiceSfxKeyRef.current = null;
    prevCombatSfxSessionRef.current = null;
    prevMonsterOutcomeSfxKeyRef.current = null;
    prevBrewerDownSfxKeyRef.current = null;
    prevPendingTypeRef.current = state?.pending?.type ?? null;
    clearCombatIntroSfxKeys();
    clearTableSfxQueue();
  }, [state?.roomCode, state?.phase]);

  useEffect(() => {
    if (tableCombatSessionKey === prevCombatSfxSessionRef.current) return;
    prevCombatSfxSessionRef.current = tableCombatSessionKey;
    prevCombatDiceSfxKeyRef.current = state ? combatMonsterDiceSfxKey(state) : null;
    prevReactionPlaySeqRef.current =
      tableCombatSessionKey && state ? (lastCombatReactionPlaySeq(state) ?? -1) : null;
  }, [tableCombatSessionKey, state]);

  useEffect(() => {
    if (tableCardPendingKey === prevEventCardSfxSessionRef.current) return;
    prevEventCardSfxSessionRef.current = tableCardPendingKey;
    prevEventCardDiceSfxKeyRef.current = pendingCard ? eventCardDiceSfxKey(pendingCard) : null;
  }, [tableCardPendingKey, pendingCard]);

  useEffect(() => {
    if (!state || state.phase !== "playing" || !sfxEnabled) {
      prevCombatDiceSfxKeyRef.current = null;
      return;
    }
    const pend = state.pending;
    if (localPlayerId && pend?.type === "combat" && !isCombatParticipant(pend, localPlayerId)) {
      prevCombatDiceSfxKeyRef.current = combatMonsterDiceSfxKey(state);
      return;
    }
    const key = combatMonsterDiceSfxKey(state);
    const prev = prevCombatDiceSfxKeyRef.current;
    if (key === prev) return;
    prevCombatDiceSfxKeyRef.current = key;
    if (key != null) {
      playTableSfx("dieRoll", { enabled: sfxEnabled });
    }
  }, [state, state?.pending, sfxEnabled, localPlayerId]);

  useEffect(() => {
    if (!state || state.phase !== "playing" || !sfxEnabled || !cardModalReady) {
      if (!sfxEnabled || state?.phase !== "playing") prevEventCardDiceSfxKeyRef.current = null;
      return;
    }
    const key = pendingCard ? eventCardDiceSfxKey(pendingCard) : null;
    const prev = prevEventCardDiceSfxKeyRef.current;
    if (key === prev) return;
    prevEventCardDiceSfxKeyRef.current = key;
    if (key != null) {
      playTableSfx("dieRoll", { enabled: sfxEnabled });
    }
  }, [state, pendingCard, sfxEnabled, cardModalReady, state?.phase]);

  useEffect(() => {
    if (!state || state.phase !== "playing" || !sfxEnabled) {
      prevDiceRef.current = null;
      return;
    }
    const roll = state.lastDiceRoll;
    const rollerId = state.lastDiceRollerId;
    if (roll == null || !rollerId) return;
    if (!affectsLocalPlayer(localPlayerId, rollerId)) return;

    const prev = prevDiceRef.current;
    if (!prev) {
      prevDiceRef.current = { roll, rollerId };
      return;
    }
    const isNewRoll = prev.roll !== roll || prev.rollerId !== rollerId;
    prevDiceRef.current = { roll, rollerId };
    if (!isNewRoll) return;

    if (consumeOptimisticMoveRollSfx()) return;
    playTableSfx("roll", { enabled: sfxEnabled });
  }, [state?.lastDiceRoll, state?.lastDiceRollerId, state?.phase, sfxEnabled, localPlayerId]);

  useEffect(() => {
    if (!state) {
      prevPendingTypeRef.current = null;
      return;
    }
    const curr = state.pending?.type ?? null;
    const prev = prevPendingTypeRef.current;
    prevPendingTypeRef.current = curr;
    if (!sfxEnabled || state.phase !== "playing") return;

    if (prev === "moveChoice" && curr !== "moveChoice") {
      const pend = state.pending;
      const landedEventOrTreasure =
        pend?.type === "card" &&
        (pend.kind === "event" || pend.kind === "treasure") &&
        affectsLocalPlayer(localPlayerId, pend.playerId);
      if (landedEventOrTreasure) {
        eventLandSoundCardKeyRef.current = `${pend.cardId}:${pend.playerId}`;
      }
    }

    if (prev !== "merchant" && curr === "merchant") {
      const merchantPlayerId = state.pending?.type === "merchant" ? state.pending.playerId : undefined;
      if (affectsLocalPlayer(localPlayerId, merchantPlayerId)) {
        playTableSfx("cans", { enabled: sfxEnabled });
      }
    }
  }, [state?.pending?.type, state?.phase, sfxEnabled, state, localPlayerId]);

  useEffect(() => {
    if (!state || state.phase !== "playing" || !sfxEnabled) {
      prevItemRevealSeqRef.current = null;
      prevReactionPlaySeqRef.current = null;
      return;
    }
    const lastReveal = state.tableItemPlayReveals?.length
      ? state.tableItemPlayReveals[state.tableItemPlayReveals.length - 1]
      : null;
    const lastReaction =
      state.pending?.type === "combat" && state.pending.reactionItemPlays?.length
        ? state.pending.reactionItemPlays[state.pending.reactionItemPlays.length - 1]
        : null;

    const revealHearOk = shouldHearItemPlaySfx(
      state,
      localPlayerId,
      lastReveal?.actorId,
      lastReveal?.targetPlayerId,
    );
    const reactionHearOk = shouldHearItemPlaySfx(
      state,
      localPlayerId,
      lastReaction?.actorId,
      lastReaction?.targetPlayerId,
    );

    if (revealHearOk) {
      syncItemPlaySeq(
        lastTableItemRevealSeq(state),
        prevItemRevealSeqRef,
        sfxEnabled,
        lastReveal
          ? tableItemPlayUsesDieRollSfx(lastReveal.itemId, lastReveal.actorId, lastReveal.targetPlayerId)
          : false,
      );
    } else {
      prevItemRevealSeqRef.current = lastTableItemRevealSeq(state);
    }

    if (reactionHearOk) {
      syncItemPlaySeq(
        lastCombatReactionPlaySeq(state),
        prevReactionPlaySeqRef,
        sfxEnabled,
        lastReaction
          ? tableItemPlayUsesDieRollSfx(lastReaction.itemId, lastReaction.actorId, lastReaction.targetPlayerId)
          : false,
      );
    } else {
      prevReactionPlaySeqRef.current = lastCombatReactionPlaySeq(state);
    }
  }, [state, state?.tableItemPlayReveals, state?.pending, sfxEnabled, localPlayerId]);

  useEffect(() => {
    if (!combatIntroVisible || !tableCombatSessionKey || !sfxEnabled) return;
    if (!tryClaimCombatIntroAudio(tableCombatSessionKey)) return;
    // Samma som händelse/skatt: cardflip vid modal, sedan rutanljud (köas — spelas efter varandra).
    playTableSfx("cardFlip", { enabled: sfxEnabled });
    playTableSfx("badBatch", { enabled: sfxEnabled });
  }, [combatIntroVisible, tableCombatSessionKey, sfxEnabled]);

  useEffect(() => {
    if (!state || state.phase !== "playing" || !sfxEnabled) {
      prevBrewerLevelsRef.current = null;
      return;
    }
    const playersToCheck = localPlayerId
      ? state.players.filter((p) => p.id === localPlayerId)
      : state.players;

    const currLevels = new Map<string, number>();
    for (const p of state.players) {
      currLevels.set(p.id, brewerDisplayLevel(p));
    }
    const prev = prevBrewerLevelsRef.current;
    prevBrewerLevelsRef.current = currLevels;
    if (!prev) return;

    let anyLevelUp = false;
    for (const p of playersToCheck) {
      const before = prev.get(p.id) ?? brewerDisplayLevel(p);
      const after = currLevels.get(p.id) ?? brewerDisplayLevel(p);
      if (after > before) {
        anyLevelUp = true;
        break;
      }
    }
    if (!anyLevelUp) return;
    const pend = state.pending;
    if (pend?.type === "card" && pend.cardId === "combat_win") return;
    playTableSfx("levelUp", { enabled: sfxEnabled });
  }, [state?.players, state?.pending, state?.phase, sfxEnabled, state, localPlayerId]);

  useEffect(() => {
    if (!sfxEnabled || !tableMonsterOutcomeSfxKey) {
      if (!tableMonsterOutcomeSfxKey) prevMonsterOutcomeSfxKeyRef.current = null;
      return;
    }
    if (prevMonsterOutcomeSfxKeyRef.current === tableMonsterOutcomeSfxKey) return;
    prevMonsterOutcomeSfxKeyRef.current = tableMonsterOutcomeSfxKey;
    if (tableMonsterOutcomeSfxKey.startsWith("combat_win:")) {
      playTableSfx("levelUp", { enabled: sfxEnabled });
    } else if (tableMonsterOutcomeSfxKey.startsWith("combat_lose:")) {
      playTableSfx("lose", { enabled: sfxEnabled });
    }
  }, [tableMonsterOutcomeSfxKey, sfxEnabled]);

  useEffect(() => {
    if (!state || state.phase !== "playing" || !sfxEnabled || !localPlayerId) {
      prevBrewerDownSfxKeyRef.current = null;
      return;
    }
    const pending = state.pending;
    if (pending?.type !== "brewerDown") {
      prevBrewerDownSfxKeyRef.current = null;
      return;
    }
    if (pending.playerId !== localPlayerId) return;
    const key = `${pending.playerId}:${pending.requestedAtMs ?? 0}`;
    if (prevBrewerDownSfxKeyRef.current === key) return;
    prevBrewerDownSfxKeyRef.current = key;
    playTableSfx("gameover", { enabled: sfxEnabled });
  }, [state, state?.pending, state?.phase, sfxEnabled, localPlayerId]);

  useEffect(() => {
    if (!tableCardPendingKey) {
      playedCardSfxForKeyRef.current = null;
      prevCardOverlayVisibleRef.current = false;
      return;
    }
  }, [tableCardPendingKey]);

  useEffect(() => {
    if (!tableCardPendingKey) return;

    const visible = cardOverlayVisible;
    const wasVisible = prevCardOverlayVisibleRef.current;
    prevCardOverlayVisibleRef.current = visible;

    if (!visible || wasVisible || !sfxEnabled || !pendingCard) return;
    if (playedCardSfxForKeyRef.current === tableCardPendingKey) return;
    playedCardSfxForKeyRef.current = tableCardPendingKey;

    const deferredLandTile = eventLandSoundCardKeyRef.current === tableCardPendingKey;

    if (tableCardUsesCardFlipSfx(pendingCard)) {
      playTableSfx("cardFlip", { enabled: sfxEnabled });
    }

    if (pendingCard.kind === "treasure" && pendingCard.cardId === "treasure_empty") {
      if (deferredLandTile) playTableSfx("eventTile", { enabled: sfxEnabled });
      playTableSfx("lose", { enabled: sfxEnabled });
      eventLandSoundCardKeyRef.current = null;
      return;
    }

    if (pendingCard.kind === "event") {
      if (eventCardUsesBadBatchSfx(pendingCard.cardId)) {
        playTableSfx("badBatch", { enabled: sfxEnabled });
        eventLandSoundCardKeyRef.current = null;
      } else if (deferredLandTile) {
        playTableSfx("eventTile", { enabled: sfxEnabled });
        eventLandSoundCardKeyRef.current = null;
      } else {
        playTableSfx("event", { enabled: sfxEnabled });
      }
      return;
    }

    if (pendingCard.kind === "treasure" && deferredLandTile) {
      playTableSfx("eventTile", { enabled: sfxEnabled });
      eventLandSoundCardKeyRef.current = null;
      return;
    }

    if (
      (pendingCard.cardId === "combat_win" && !tableMonsterOutcomeSfxKey) ||
      pendingCard.cardId === "boss_round_win" ||
      pendingCard.cardId === "boss_final_win"
    ) {
      playTableSfx("levelUp", { enabled: sfxEnabled });
    } else if (pendingCard.cardId === "combat_lose" && !tableMonsterOutcomeSfxKey) {
      playTableSfx("lose", { enabled: sfxEnabled });
    }
  }, [cardOverlayVisible, tableCardPendingKey, pendingCard, sfxEnabled, tableMonsterOutcomeSfxKey]);
}
