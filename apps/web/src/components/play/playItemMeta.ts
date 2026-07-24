import type { GameLocale, ItemId } from "@bv/game-core";
import {
  COMBAT_ITEM_BASE_ATTACK_MODS,
  combatItemAttackModForBoardLevel,
  findBossTileIndexInLevel,
  FLAT_ITEM_USE_BASE_AMOUNTS,
  flatCombatItemAttackDisplayBase,
  flatItemUseAmount,
  getCard,
  playerTotalItemCardBonus,
  type GameState,
  type ItemUseTarget,
  type Player,
} from "@bv/game-core";
import { getUiStrings } from "../../lib/uiStrings";

const ITEM_TARGET: Record<string, ItemUseTarget> = {
  healing_potion: "self_or_other",
  sleep_potion: "other",
  sip_card: "other",
  weak_beer: "combat",
  light_beer: "combat",
  folk_beer: "combat",
  tripwire: "combat",
  double_hops: "combat",
  beer_bomb: "combat",
  manopositiv: "combat",
  beard_back: "self",
  hangover: "combat",
  paidassasin: "combat",
  pretzel_snack: "self_or_other",
  coin_purse: "self",
  charity: "self",
  shortcut: "other",
  taproom_key: "self",
  six_sense: "self",
  rigged_game: "other",
  monster_hype: "combat",
  yeast_sabotage: "combat",
  beer_bro: "combat_bro",
  split_the_g: "other",
  shuffle: "other",
  lengraddad: "combat",
  canman: "passive",
  not_my_round: "other",
  spill_intentional: "other",
  early_night: "combat",
  bribes: "combat",
  get_lucky: "combat",
};

/** Katalogstil: unicode-minus för negativa värden. */
export function formatItemEffectAmount(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${Math.abs(n)}`;
  return "0";
}

/**
 * Ersätter effektens baskatalogsiffra med buffat/skalat värde.
 * Kostnader (andra siffror i samma text) lämnas orörda genom att först matcha
 * den signerade formen av basvärdet.
 */
export function replaceItemEffectAmountInText(text: string, base: number, adjusted: number): string {
  if (base === adjusted || !text) return text;
  const adjSigned = formatItemEffectAmount(adjusted);

  if (base > 0) {
    const plusBase = `+${base}`;
    if (text.includes(plusBase)) {
      return text.replace(plusBase, adjSigned);
    }
    // Heal-texter m.m. med bar siffra ("återställ 3 HP")
    return text.replace(new RegExp(`(?<![\\d+−\\-])${base}(?!\\d)`), String(adjusted));
  }

  if (base < 0) {
    const abs = Math.abs(base);
    const uni = `−${abs}`;
    const ascii = `-${abs}`;
    if (text.includes(uni)) return text.replace(uni, adjSigned);
    if (text.includes(ascii)) return text.replace(ascii, adjSigned);
  }

  return text;
}

export function applyItemCardBonusToItemText(
  itemId: string,
  text: string,
  me: Player,
  state: GameState | null,
): string {
  const id = String(itemId);
  const bonus = playerTotalItemCardBonus(me);

  const useBase = FLAT_ITEM_USE_BASE_AMOUNTS[id as ItemId];
  if (typeof useBase === "number") {
    const adjusted = flatItemUseAmount(id as ItemId, bonus);
    if (adjusted == null) return text;
    return replaceItemEffectAmountInText(text, useBase, adjusted);
  }

  const combatBase = COMBAT_ITEM_BASE_ATTACK_MODS[id];
  if (typeof combatBase === "number") {
    const boardLevel = me.levelIndex;
    const adjusted =
      state?.levels?.length && Number.isFinite(boardLevel)
        ? combatItemAttackModForBoardLevel(id, boardLevel, bonus)
        : flatCombatItemAttackDisplayBase(id, bonus);
    if (adjusted == null) return text;
    return replaceItemEffectAmountInText(text, combatBase, adjusted);
  }

  return text;
}

export function shortcutItemGoldCostForTargetLevel(targetLevelIndex: number): number {
  const levelNumber = Math.max(1, Math.floor(targetLevelIndex) + 1);
  return Math.max(0, levelNumber * 10);
}

export function itemMeta(
  itemId: string,
  locale: GameLocale = "sv",
): { title: string; text: string; target: ItemUseTarget } {
  const ui = getUiStrings(locale);
  const id = String(itemId);
  const target = ITEM_TARGET[id] ?? "self";
  try {
    const card = getCard(`item_${id}`, locale);
    return { title: card.title, text: card.text, target };
  } catch {
    const row = (ui.items as Record<string, { title: string; text: string } | undefined>)[id];
    if (row) return { title: row.title, text: row.text, target };
    return { title: id, text: "", target };
  }
}

export function itemMetaForView(
  itemId: string,
  me: Player | null,
  state: GameState | null,
  locale: GameLocale = "sv",
): { title: string; text: string; target: ItemUseTarget } {
  const ui = getUiStrings(locale);
  const base = itemMeta(itemId, locale);
  const textWithBonus =
    me != null ? applyItemCardBonusToItemText(itemId, base.text, me, state) : base.text;
  const withBonus = textWithBonus === base.text ? base : { ...base, text: textWithBonus };

  if (String(itemId) !== "taproom_key" || !me || !state) return withBonus;
  const levelsLen = state.levels?.length ?? 0;
  const lastIdx = levelsLen > 0 ? levelsLen - 1 : 0;
  const targetLevelIndex = me.levelIndex + 1;
  const onFinalFloor = levelsLen > 0 && me.levelIndex >= lastIdx;
  if (onFinalFloor) {
    const bossIdx = findBossTileIndexInLevel(state.levels[me.levelIndex]);
    if (bossIdx < 0) {
      return {
        ...withBonus,
        text: `${withBonus.text}\n${ui.play.itemShortcutNoBossTile}`,
      };
    }
    const goldCost =
      String(itemId) === "taproom_key"
        ? Math.max(0, shortcutItemGoldCostForTargetLevel(me.levelIndex) - 10)
        : shortcutItemGoldCostForTargetLevel(me.levelIndex);
    const onBoss = me.tileIndex === bossIdx;
    return {
      ...withBonus,
      text: `${withBonus.text}\n${ui.play.itemShortcutBossCost(goldCost, onBoss)}`,
    };
  }
  if (targetLevelIndex >= levelsLen) {
    return {
      ...withBonus,
      text: `${withBonus.text}\n${ui.play.itemShortcutTopFloor}`,
    };
  }
  const goldCost =
    String(itemId) === "taproom_key"
      ? (() => {
          const shortcutCost = shortcutItemGoldCostForTargetLevel(targetLevelIndex);
          return Math.max(0, shortcutCost - 10);
        })()
      : shortcutItemGoldCostForTargetLevel(targetLevelIndex);
  return {
    ...withBonus,
    text: `${withBonus.text}\n${ui.play.itemShortcutLevelCost(goldCost, targetLevelIndex + 1)}`,
  };
}
