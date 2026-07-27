import { brewerLevelFromXp } from "./brewerXp.js";
import { dismissInvalidLevelUpOffersForPlayer, isLevelUpOfferStillValid } from "./levelUpOffer.js";
import { playerMaxHpFromBase } from "./playerMaxHp.js";
import type { GameState, Pending, Player } from "./types.js";

export type BrewerPerkChoice = "attack" | "shield" | "hp" | "pvp" | "items";

export const BREWER_PERK_MAX_PER_CATEGORY = 3;

export const BREWER_PERK_CHOICES: readonly BrewerPerkChoice[] = [
  "attack",
  "shield",
  "hp",
  "pvp",
  "items",
];

export function brewerPerkPickCount(p: Player, choice: BrewerPerkChoice): number {
  switch (choice) {
    case "attack":
      return p.brewerAttackBonus ?? 0;
    case "shield":
      return p.brewerShieldBonus ?? 0;
    case "pvp":
      return p.brewerPvpBonus ?? 0;
    case "items":
      return p.brewerItemCardBonus ?? 0;
    case "hp":
      return Math.floor((p.brewerHpBonus ?? 0) / 2);
  }
}

export function isBrewerPerkChoiceAvailable(p: Player, choice: BrewerPerkChoice): boolean {
  return brewerPerkPickCount(p, choice) < BREWER_PERK_MAX_PER_CATEGORY;
}

export function availableBrewerPerkChoices(p: Player): BrewerPerkChoice[] {
  return BREWER_PERK_CHOICES.filter((choice) => isBrewerPerkChoiceAvailable(p, choice));
}

/** Konsumera oupplösta nivåer utan bonus när alla kategorier redan är maxade. */
export function consumeExhaustedBrewerPerkLevels(
  p: Player,
  log?: (msg: string) => void,
): number {
  let consumed = 0;
  let logged = false;
  while ((p.pendingBrewerPerkLevels ?? 0) > 0 && availableBrewerPerkChoices(p).length === 0) {
    p.brewerPerkLevelsClaimed = (p.brewerPerkLevelsClaimed ?? 0) + 1;
    normalizeBrewerPerkProgress(p);
    consumed++;
    if (!logged) {
      log?.(`${p.name}: alla bryggbonusar maxade — inget val kvar.`);
      logged = true;
    }
  }
  return consumed;
}

/** Stupad bryggare som startar om från början: alla permanenta bryggnivå-buffar nollställs. */
export function resetBrewerPerkProgress(p: Player): void {
  p.brewerAttackBonus = 0;
  p.brewerShieldBonus = 0;
  p.brewerPvpBonus = 0;
  p.brewerHpBonus = 0;
  p.brewerItemCardBonus = 0;
  p.brewerPerkLevelsClaimed = 0;
  p.pendingBrewerPerkLevels = 0;
}

/** Säkerställ att äldre sparade partier inte får retroaktiva val. */
export function normalizeBrewerPerkProgress(p: Player): void {
  const lvl = brewerLevelFromXp(p.xp ?? 0);
  if (typeof p.brewerPerkLevelsClaimed !== "number" || p.brewerPerkLevelsClaimed < 0) {
    p.brewerPerkLevelsClaimed = lvl;
  } else if (p.brewerPerkLevelsClaimed > lvl) {
    p.brewerPerkLevelsClaimed = lvl;
  }
  p.brewerAttackBonus = Math.max(0, Math.floor(p.brewerAttackBonus ?? 0));
  p.brewerShieldBonus = Math.max(0, Math.floor(p.brewerShieldBonus ?? 0));
  p.brewerPvpBonus = Math.max(0, Math.floor(p.brewerPvpBonus ?? 0));
  p.brewerHpBonus = Math.max(0, Math.floor(p.brewerHpBonus ?? 0));
  p.brewerItemCardBonus = Math.max(0, Math.floor(p.brewerItemCardBonus ?? 0));
  const owed = Math.max(0, lvl - (p.brewerPerkLevelsClaimed ?? 0));
  p.pendingBrewerPerkLevels = owed;
}

export function pendingBelongsToPlayer(pending: Pending, playerId: string): boolean {
  switch (pending.type) {
    case "moveChoice":
    case "card":
    case "merchant":
    case "door":
    case "levelUpOffer":
    case "brewerPerkChoice":
    case "equipmentReplaceOffer":
    case "brewerDown":
      return pending.playerId === playerId;
    case "encounterChoice":
      return pending.moverId === playerId;
    case "combat":
      return pending.attackerId === playerId || pending.assistId === playerId;
    case "pvp":
      return (
        pending.attackerId === playerId ||
        pending.defenderId === playerId ||
        pending.winnerId === playerId ||
        pending.loserId === playerId
      );
    default:
      return false;
  }
}

function brewerPerkPromptFor(p: Player): Extract<Pending, { type: "brewerPerkChoice" }> {
  return {
    type: "brewerPerkChoice",
    playerId: p.id,
    levelsRemaining: p.pendingBrewerPerkLevels ?? 0,
  };
}

/** Bevara stridsloot-bytesval så de inte raderas när bryggbonus tar `offTurnPersonalPending`. */
function requeueOffTurnEquipReplaceIfNeeded(state: GameState): void {
  const off = state.offTurnPersonalPending;
  if (off?.type !== "equipmentReplaceOffer") return;
  if (!off.catalogId) return;
  const q = state.combatEquipReplaceQueue ?? [];
  q.unshift({
    playerId: off.playerId,
    slot: off.slot,
    catalogId: off.catalogId,
    newName: off.newName,
  });
  state.combatEquipReplaceQueue = q;
}

function isBrewerPerkOpenFor(state: GameState, playerId: string): boolean {
  if (state.pending?.type === "brewerPerkChoice" && state.pending.playerId === playerId) {
    return true;
  }
  if (
    state.offTurnPersonalPending?.type === "brewerPerkChoice" &&
    state.offTurnPersonalPending.playerId === playerId
  ) {
    return true;
  }
  return false;
}

/** Efter XP-ökning: bokför oupplösta bryggnivåer som väntar på perk-val. */
export function recordBrewerLevelUpsAfterXp(
  state: GameState,
  p: Player,
  xpBefore: number,
): void {
  const beforeLvl = brewerLevelFromXp(xpBefore);
  normalizeBrewerPerkProgress(p);
  const afterLvl = brewerLevelFromXp(p.xp ?? 0);
  if (afterLvl <= beforeLvl) return;
  if ((p.pendingBrewerPerkLevels ?? 0) <= 0) return;
  tryOpenBrewerPerkChoice(state, p.id);
}

/**
 * Öppna bryggbonus-val direkt vid nivå-upp. Pausar spelarens egna `pending` (kort/strid m.m.)
 * i `deferredPending` tills valet är klart; annars `offTurnPersonalPending` om någon annan har turen.
 */
export function tryOpenBrewerPerkChoice(
  state: GameState,
  playerId: string,
  log?: (s: GameState, msg: string) => void,
  _opts?: { offTurn?: boolean },
): boolean {
  if (state.phase !== "playing") return false;
  const p = state.players.find((x) => x.id === playerId);
  if (!p || (p.pendingBrewerPerkLevels ?? 0) <= 0) return false;
  consumeExhaustedBrewerPerkLevels(p, (msg) => log?.(state, msg));
  if ((p.pendingBrewerPerkLevels ?? 0) <= 0) {
    if (isBrewerPerkOpenFor(state, playerId)) {
      finishBrewerPerkChoicePrompt(state, playerId);
    }
    return false;
  }
  if (isBrewerPerkOpenFor(state, playerId)) return true;

  const prompt = brewerPerkPromptFor(p);
  const cur = state.pending;
  const turnId = state.turnOrder[state.currentTurnIndex];

  if (!cur) {
    if (turnId === playerId) {
      state.pending = prompt;
    } else {
      const off = state.offTurnPersonalPending;
      if (off && off.playerId !== playerId) return false;
      requeueOffTurnEquipReplaceIfNeeded(state);
      state.offTurnPersonalPending = prompt;
    }
    log?.(state, `${p.name} har stigit i bryggnivå — välj bonus.`);
    return true;
  }

  if (cur.type === "brewerPerkChoice") {
    if (cur.playerId === playerId) return true;
    const off = state.offTurnPersonalPending;
    if (off && off.playerId !== playerId) return false;
    requeueOffTurnEquipReplaceIfNeeded(state);
    state.offTurnPersonalPending = prompt;
    log?.(state, `${p.name} har stigit i bryggnivå — välj bonus.`);
    return true;
  }

  if (pendingBelongsToPlayer(cur, playerId)) {
    state.deferredPending = cur;
    state.pending = prompt;
    log?.(state, `${p.name} har stigit i bryggnivå — välj bonus.`);
    return true;
  }

  const off = state.offTurnPersonalPending;
  if (off) {
    if (off.playerId !== playerId) return false;
    if (off.type === "brewerPerkChoice") return true;
  }
  requeueOffTurnEquipReplaceIfNeeded(state);
  state.offTurnPersonalPending = prompt;
  log?.(state, `${p.name} har stigit i bryggnivå — välj bonus.`);
  return true;
}

/** Stäng bryggbonus-prompt; återställ ev. pausad `pending`. Returnerar true om något återställdes. */
export function finishBrewerPerkChoicePrompt(state: GameState, playerId: string): boolean {
  if (
    state.offTurnPersonalPending?.type === "brewerPerkChoice" &&
    state.offTurnPersonalPending.playerId === playerId
  ) {
    state.offTurnPersonalPending = null;
    dismissInvalidLevelUpOffersForPlayer(state, playerId);
    return false;
  }
  if (state.pending?.type === "brewerPerkChoice" && state.pending.playerId === playerId) {
    if (state.deferredPending) {
      const restored = state.deferredPending;
      state.deferredPending = null;
      if (
        restored.type === "levelUpOffer" &&
        !isLevelUpOfferStillValid(state, playerId, restored)
      ) {
        state.pending = null;
      } else {
        state.pending = restored;
      }
      return true;
    }
    state.pending = null;
    return false;
  }
  return false;
}

export function applyBrewerPerkChoice(
  p: Player,
  choice: BrewerPerkChoice,
  baseMaxHp: number,
): boolean {
  if (!isBrewerPerkChoiceAvailable(p, choice)) return false;
  if (choice === "attack") {
    p.brewerAttackBonus = (p.brewerAttackBonus ?? 0) + 1;
  } else if (choice === "shield") {
    p.brewerShieldBonus = (p.brewerShieldBonus ?? 0) + 1;
  } else if (choice === "pvp") {
    p.brewerPvpBonus = (p.brewerPvpBonus ?? 0) + 1;
  } else if (choice === "items") {
    p.brewerItemCardBonus = (p.brewerItemCardBonus ?? 0) + 1;
  } else {
    p.brewerHpBonus = (p.brewerHpBonus ?? 0) + 2;
    p.maxHp = playerMaxHpFromBase(baseMaxHp, p);
    p.hp = Math.min(p.maxHp, p.hp + 2);
  }
  p.brewerPerkLevelsClaimed = (p.brewerPerkLevelsClaimed ?? 0) + 1;
  normalizeBrewerPerkProgress(p);
  return true;
}
