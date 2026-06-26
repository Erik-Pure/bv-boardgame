import { findBossTileIndexInLevel } from "./board.js";
import {
  attackerCannotSelfNegativeCombatItem,
  lengraddadBlockedForCombatParticipant,
} from "./combatItemRestrictions.js";
import { effectiveItemPlayGoldCost } from "./combatReactionAutopass.js";
import { playerCanCombatIntervene } from "./combatReactors.js";
import {
  isPositiveHelpItemId,
  POSITIVE_HELP_ITEM_IDS,
  PVP_PRE_ROUND_ITEM_IDS,
  PVP_ROLL_PHASE_ITEM_IDS,
} from "./itemRules.js";
import { shortcutDisplayPantGold, SHORTCUT_TELEPORT_GOLD_COST } from "./shortcutDisplayCost.js";
import { isPlayerActiveInMatch } from "./playerParticipation.js";
import type { GameState, ItemId, Pending, Player } from "./types.js";

export type ItemUseTarget = "self" | "other" | "self_or_other" | "combat" | "combat_bro" | "passive";

/** Genväg / Taproom-nyckel under rörelseval, handel eller mötesval på rutan. */
export function pendingAllowsShortcutTaproom(pe: Pending | null, userId: string): boolean {
  if (pe == null) return true;
  if (pe.type === "moveChoice" && pe.playerId === userId) return true;
  if (pe.type === "merchant" && pe.playerId === userId) return true;
  if (pe.type === "encounterChoice" && pe.moverId === userId) return true;
  return false;
}

function isPlayerTurn(state: GameState, playerId: string): boolean {
  const activeId = state.turnOrder[state.currentTurnIndex];
  return activeId === playerId;
}

/** Sant om spelaren kan spela minst ett positivt hjälpkort (pantkostnad räknas). */
export function playerHasPlayablePositiveHelpItem(state: GameState, player: Player): boolean {
  return (player.inventory ?? []).some((it) => {
    if (!isPositiveHelpItemId(it.itemId)) return false;
    const cost = effectiveItemPlayGoldCost(player, it.itemId);
    return cost <= 0 || player.gold >= cost;
  });
}

/**
 * Kan föremålet spelas just nu? Speglar mobil-UI (`isItemPlayableNow`) och motorns `useItem`-guards.
 * `target` kommer från föremålsmetadata (samma som PlayView `ITEM_TARGET`).
 */
export function canUseItem(
  state: GameState,
  playerId: string,
  itemId: ItemId,
  target: ItemUseTarget,
): boolean {
  if (target === "passive") return false;
  const me = state.players.find((p) => p.id === playerId);
  if (!me || state.phase !== "playing") return false;

  const pending = state.pending;
  const isMyTurn = isPlayerTurn(state, playerId);
  const inCombat = pending?.type === "combat";
  const inCombatReactions = inCombat && pending.phase === "reactions";
  const pvpPending = pending?.type === "pvp" ? pending : null;
  const pvpParticipant =
    !!pvpPending && (pvpPending.attackerId === playerId || pvpPending.defenderId === playerId);
  const pvpRollSheet = pvpParticipant && pvpPending?.phase === "awaitingRolls";
  const inPvpAwaitingRolls = pvpParticipant && pvpPending?.phase === "awaitingRolls";
  const inPvpPreRoundItems = pvpParticipant && pvpPending?.phase === "preRoundItems";
  const isCombatFighterNow =
    inCombatReactions &&
    pending?.type === "combat" &&
    (pending.attackerId === playerId || pending.assistId === playerId);
  const isThirdPartyCombatIntervention =
    inCombatReactions &&
    pending?.type === "combat" &&
    pending.attackerId !== playerId &&
    pending.assistId !== playerId &&
    (pending.reactors?.includes(playerId) ?? false) &&
    playerCanCombatIntervene(me);

  const itemPlayGoldCost = (id: ItemId) => effectiveItemPlayGoldCost(me, id);

  if (itemId === "healing_potion" || itemId === "pretzel_snack") {
    if (me.eliminated) return false;
    if (pending?.type === "brewerDown") return false;
    if (
      pending?.type === "combat" &&
      pending.phase === "helpAwaitCard" &&
      playerId === pending.helpSelectedHelperId
    ) {
      return false;
    }
    return true;
  }

  if (itemId === "shortcut") {
    if (inCombatReactions || inPvpPreRoundItems) return false;
    if (!isMyTurn) return false;
    const hasOtherActive = state.players.some(
      (p) => p.id !== playerId && isPlayerActiveInMatch(p),
    );
    if (!hasOtherActive) return false;
    if (me.gold < SHORTCUT_TELEPORT_GOLD_COST) return false;
    return pendingAllowsShortcutTaproom(pending, playerId);
  }

  if (itemId === "taproom_key") {
    if (inCombatReactions || inPvpPreRoundItems) return false;
    if (!isMyTurn) return false;
    const levelsLen = state.levels?.length ?? 0;
    const lastIdx = levelsLen > 0 ? levelsLen - 1 : 0;
    const tli = me.levelIndex + 1;
    const onFinalFloor = levelsLen > 0 && me.levelIndex >= lastIdx;
    if (onFinalFloor) {
      const bossIdx = findBossTileIndexInLevel(state.levels[me.levelIndex]);
      if (bossIdx < 0) return false;
    } else if (tli >= levelsLen) {
      return false;
    }
    const goldCost = shortcutDisplayPantGold(itemId, me.levelIndex, levelsLen);
    if (me.gold < goldCost) return false;
    return pendingAllowsShortcutTaproom(pending, playerId);
  }

  if (itemId === "charity") {
    if (me.eliminated) return false;
    if (pending?.type === "brewerDown") return false;
    if (inCombatReactions || inPvpPreRoundItems || inPvpAwaitingRolls) return false;
    const missingHp = Math.max(0, me.maxHp - me.hp);
    if (missingHp <= 0) return false;
    const donation = Math.min(missingHp, me.gold);
    if (donation <= 0) return false;
    return pendingAllowsShortcutTaproom(pending, playerId);
  }

  if (itemId === "shuffle") {
    if (inCombatReactions || inPvpPreRoundItems || inPvpAwaitingRolls) return false;
    if (!isMyTurn) return false;
    const cost = itemPlayGoldCost(itemId);
    if (cost > 0 && me.gold < cost) return false;
    return pendingAllowsShortcutTaproom(pending, playerId);
  }

  if (itemId === "lengraddad" && inCombatReactions) {
    if (pending?.type === "combat" && lengraddadBlockedForCombatParticipant(playerId, pending)) {
      return false;
    }
    return true;
  }
  if (itemId === "lengraddad" && inPvpPreRoundItems) return true;
  if (itemId === "lengraddad") return false;

  if (itemId === "early_night") {
    if (pending?.type !== "combat") return false;
    if (pending.phase !== "enemyIntro" && pending.phase !== "reactions") return false;
    return pending.attackerId === playerId;
  }

  if (itemId === "bribes") {
    if (pending?.type !== "combat") return false;
    if (pending.phase !== "enemyIntro" && pending.phase !== "reactions") return false;
    if (pending.attackerId !== playerId) return false;
    const cost = itemPlayGoldCost("bribes");
    return cost <= 0 || me.gold >= cost;
  }

  if (itemId === "not_my_round" && inCombatReactions) {
    return isCombatFighterNow || isThirdPartyCombatIntervention;
  }
  if (itemId === "spill_intentional" && inCombatReactions) {
    return isCombatFighterNow || isThirdPartyCombatIntervention;
  }

  const playCost = itemPlayGoldCost(itemId);
  if (playCost > 0 && me.gold < playCost) return false;

  if (itemId === "spill_intentional" && (inPvpPreRoundItems || pvpRollSheet)) return true;
  if (itemId === "get_lucky" && inCombatReactions) return isCombatFighterNow || isThirdPartyCombatIntervention;
  if (itemId === "beard_back" && inCombatReactions) return isCombatFighterNow;
  if (itemId === "beard_back" && inPvpPreRoundItems) return true;
  if (itemId === "beard_back" && inPvpAwaitingRolls) return true;
  if (itemId === "beard_back") return false;

  if (itemId === "six_sense") {
    if (inCombatReactions) return isCombatFighterNow;
    if (inPvpPreRoundItems) return true;
    if (inPvpAwaitingRolls) return true;
    if (isMyTurn) return true;
    return false;
  }

  if (inPvpPreRoundItems) return PVP_PRE_ROUND_ITEM_IDS.has(itemId);

  if (
    pending?.type === "combat" &&
    (pending.phase === "reactions" || pending.phase === "enemyIntro") &&
    pending.attackerId === playerId &&
    attackerCannotSelfNegativeCombatItem(itemId, pending.attackerId, playerId)
  ) {
    return false;
  }

  if (isMyTurn) return (target !== "combat" && target !== "combat_bro") || inCombat;
  if (inCombatReactions) return target === "combat" || target === "combat_bro";
  return false;
}
