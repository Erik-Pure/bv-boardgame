import { useEffect, useRef, type MutableRefObject } from "react";
import { brewerLevel, type GameState, type Player } from "@bv/game-core";
import { eventCardDiceSfxKey } from "../lib/eventCardDice";
import { tableItemPlayUsesDieRollSfx } from "../lib/tableItemPlaySfx";
import { clearTableSfxQueue, playTableSfx } from "../lib/tableSfx";

type PendingCard = Extract<NonNullable<GameState["pending"]>, { type: "card" }>;

/** Kortmodal med flip på brädet — vila, händelse, skatt (ej tom gömma). */
function tableCardUsesCardFlipSfx(card: PendingCard): boolean {
  if (card.kind === "rest" || card.kind === "event") return true;
  return card.kind === "treasure" && card.cardId !== "treasure_empty";
}

function brewerDisplayLevel(player: Player): number {
  return Math.max(1, Math.floor(brewerLevel(player) || 0) + 1);
}

function lastTableItemRevealSeq(state: GameState): number | null {
  const reveals = state.tableItemPlayReveals;
  if (!reveals?.length) return null;
  return reveals[reveals.length - 1]!.seq;
}

/** Nyckel för PvE-stridstärning — ändras vid varje slag / rollPreview. */
function combatMonsterDiceSfxKey(state: GameState): string | null {
  const pend = state.pending;
  if (pend?.type !== "combat" || !pend.monsterId) return null;
  if (pend.phase === "rollPreview") {
    return `pv:${pend.previewDie}:${pend.previewBroDie ?? ""}:${pend.previewTotal}`;
  }
  const teamRolls = pend.teamRolls;
  if (!teamRolls || Object.keys(teamRolls).length === 0) return null;
  if (pend.phase !== "reactions" && pend.phase !== "enemyIntro") return null;
  return `tr:${Object.entries(teamRolls)
    .filter((entry): entry is [string, NonNullable<(typeof teamRolls)[string]>] => entry[1] != null)
    .map(([id, r]) => `${id}:${r.die}`)
    .sort()
    .join(",")}`;
}

function lastCombatReactionPlaySeq(state: GameState): number | null {
  const pend = state.pending;
  if (pend?.type !== "combat") return null;
  const plays = pend.reactionItemPlays;
  if (!plays?.length) return null;
  return plays[plays.length - 1]!.playSeq;
}

/** Nytt föremål i state — spela ljud när seq ökar (prev null/-1 = inga spelade än). */
function syncItemPlaySeq(
  curr: number | null,
  prevRef: MutableRefObject<number | null>,
  sfxEnabled: boolean,
  useDieRoll: boolean,
): void {
  if (curr == null) {
    prevRef.current = null;
    return;
  }
  const prev = prevRef.current ?? -1;
  if (curr > prev) {
    prevRef.current = curr;
    playTableSfx(useDieRoll ? "dieRoll" : "item", { enabled: sfxEnabled });
    return;
  }
  if (curr < prev) {
    prevRef.current = curr;
  } else {
    prevRef.current = curr;
  }
}

export function useTableSfxSync(props: {
  state: GameState | null;
  sfxEnabled: boolean;
  tableCardModalReady: boolean;
  tableCardPendingKey: string | null;
  pendingCard: PendingCard | null;
  /** Vänta tills pjäsanimation klar innan kort-ljud (samma gate som kort-overlay). */
  deferTilePendingOverlays: boolean;
  tableCombatModalReady: boolean;
  tableCombatSessionKey: string | null;
  /** Monster-vinst/förlust på stridspanelen (inte CardFlipModalShell). */
  tableMonsterOutcomeSfxKey: string | null;
}): void {
  const {
    state,
    sfxEnabled,
    tableCardModalReady,
    tableCardPendingKey,
    pendingCard,
    deferTilePendingOverlays,
    tableCombatModalReady,
    tableCombatSessionKey,
    tableMonsterOutcomeSfxKey,
  } = props;

  const prevDiceRef = useRef<{ roll: number; rollerId: string } | null>(null);
  const prevPendingTypeRef = useRef<string | null>(null);
  const prevBrewerLevelsRef = useRef<Map<string, number> | null>(null);
  /** Kort-ljud spelas när modal är redo och pjäsanimation klar (inte bara vid första ready). */
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
  const playedCombatIntroSfxKeyRef = useRef<string | null>(null);
  const prevCombatIntroVisibleRef = useRef(false);
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
    playedCombatIntroSfxKeyRef.current = null;
    prevCombatIntroVisibleRef.current = false;
    prevPendingTypeRef.current = state?.pending?.type ?? null;
    clearTableSfxQueue();
  }, [state?.roomCode, state?.phase, state?.pending?.type]);

  useEffect(() => {
    if (tableCombatSessionKey === prevCombatSfxSessionRef.current) return;
    prevCombatSfxSessionRef.current = tableCombatSessionKey;
    playedCombatIntroSfxKeyRef.current = null;
    prevCombatIntroVisibleRef.current = false;
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
    const key = combatMonsterDiceSfxKey(state);
    const prev = prevCombatDiceSfxKeyRef.current;
    if (key === prev) return;
    prevCombatDiceSfxKeyRef.current = key;
    if (key != null) {
      playTableSfx("dieRoll", { enabled: sfxEnabled });
    }
  }, [state, state?.pending, sfxEnabled]);

  useEffect(() => {
    if (!state || state.phase !== "playing" || !sfxEnabled || !tableCardModalReady) {
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
  }, [state, pendingCard, sfxEnabled, tableCardModalReady, state?.phase]);

  useEffect(() => {
    if (!state || state.phase !== "playing" || !sfxEnabled) {
      prevDiceRef.current = null;
      return;
    }
    const roll = state.lastDiceRoll;
    const rollerId = state.lastDiceRollerId;
    if (roll == null || !rollerId) return;

    const prev = prevDiceRef.current;
    if (!prev) {
      prevDiceRef.current = { roll, rollerId };
      return;
    }
    const isNewRoll = prev.roll !== roll || prev.rollerId !== rollerId;
    prevDiceRef.current = { roll, rollerId };
    if (!isNewRoll) return;

    playTableSfx("roll", { enabled: sfxEnabled });
  }, [state?.lastDiceRoll, state?.lastDiceRollerId, state?.phase, sfxEnabled]);

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
      playTableSfx("roll", { enabled: sfxEnabled });
      const pend = state.pending;
      if (pend?.type === "card" && (pend.kind === "event" || pend.kind === "treasure")) {
        eventLandSoundCardKeyRef.current = `${pend.cardId}:${pend.playerId}`;
        // eventTile köas efter cardflip när modal fade:ar in (inte här — långa event-MP3 blockerar kön).
      }
    }
    if (prev !== "merchant" && curr === "merchant") {
      playTableSfx("cans", { enabled: sfxEnabled });
    }
  }, [state?.pending?.type, state?.phase, sfxEnabled, state]);

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
    syncItemPlaySeq(
      lastTableItemRevealSeq(state),
      prevItemRevealSeqRef,
      sfxEnabled,
      lastReveal
        ? tableItemPlayUsesDieRollSfx(lastReveal.itemId, lastReveal.actorId, lastReveal.targetPlayerId)
        : false,
    );
    syncItemPlaySeq(
      lastCombatReactionPlaySeq(state),
      prevReactionPlaySeqRef,
      sfxEnabled,
      lastReaction
        ? tableItemPlayUsesDieRollSfx(lastReaction.itemId, lastReaction.actorId, lastReaction.targetPlayerId)
        : false,
    );
  }, [state, state?.tableItemPlayReveals, state?.pending, sfxEnabled]);

  const combatIntroVisible =
    !!tableCombatSessionKey &&
    tableCombatModalReady &&
    !deferTilePendingOverlays &&
    state?.pending?.type === "combat" &&
    state.pending.phase === "enemyIntro";

  useEffect(() => {
    if (!tableCombatSessionKey) {
      playedCombatIntroSfxKeyRef.current = null;
      prevCombatIntroVisibleRef.current = false;
      return;
    }
    const visible = combatIntroVisible;
    const wasVisible = prevCombatIntroVisibleRef.current;
    prevCombatIntroVisibleRef.current = visible;
    if (!visible || wasVisible || !sfxEnabled) return;
    if (playedCombatIntroSfxKeyRef.current === tableCombatSessionKey) return;
    playedCombatIntroSfxKeyRef.current = tableCombatSessionKey;
    playTableSfx("cardFlip", { enabled: sfxEnabled });
    playTableSfx("badBatch", { enabled: sfxEnabled });
  }, [combatIntroVisible, tableCombatSessionKey, sfxEnabled]);

  useEffect(() => {
    if (!state || state.phase !== "playing" || !sfxEnabled) {
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

    let anyLevelUp = false;
    for (const p of state.players) {
      const before = prev.get(p.id) ?? brewerDisplayLevel(p);
      const after = currLevels.get(p.id) ?? brewerDisplayLevel(p);
      if (after > before) {
        anyLevelUp = true;
        break;
      }
    }
    if (!anyLevelUp) return;
    // Samma ljud spelas när combat_win-modalen blir redo — undvik dubbel vid strids-XP.
    const pend = state.pending;
    if (pend?.type === "card" && pend.cardId === "combat_win") return;
    playTableSfx("levelUp", { enabled: sfxEnabled });
  }, [state?.players, state?.pending, state?.phase, sfxEnabled, state]);

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
    if (!tableCardPendingKey) {
      playedCardSfxForKeyRef.current = null;
      prevCardOverlayVisibleRef.current = false;
      return;
    }
  }, [tableCardPendingKey]);

  const cardOverlayVisible =
    !!tableCardPendingKey && tableCardModalReady && !deferTilePendingOverlays;

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
      if (deferredLandTile) {
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
  }, [
    cardOverlayVisible,
    tableCardPendingKey,
    pendingCard,
    sfxEnabled,
    tableMonsterOutcomeSfxKey,
  ]);
}
