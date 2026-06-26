import type { GameLocale } from "@bv/game-core";
import {
  findBossTileIndexInLevel,
  getCard,
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
  if (String(itemId) !== "taproom_key" || !me || !state) return base;
  const levelsLen = state.levels?.length ?? 0;
  const lastIdx = levelsLen > 0 ? levelsLen - 1 : 0;
  const targetLevelIndex = me.levelIndex + 1;
  const onFinalFloor = levelsLen > 0 && me.levelIndex >= lastIdx;
  if (onFinalFloor) {
    const bossIdx = findBossTileIndexInLevel(state.levels[me.levelIndex]);
    if (bossIdx < 0) {
      return {
        ...base,
        text: `${base.text}\n${ui.play.itemShortcutNoBossTile}`,
      };
    }
    const goldCost =
      String(itemId) === "taproom_key"
        ? Math.max(0, shortcutItemGoldCostForTargetLevel(me.levelIndex) - 10)
        : shortcutItemGoldCostForTargetLevel(me.levelIndex);
    const onBoss = me.tileIndex === bossIdx;
    return {
      ...base,
      text: `${base.text}\n${ui.play.itemShortcutBossCost(goldCost, onBoss)}`,
    };
  }
  if (targetLevelIndex >= levelsLen) {
    return {
      ...base,
      text: `${base.text}\n${ui.play.itemShortcutTopFloor}`,
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
    ...base,
    text: `${base.text}\n${ui.play.itemShortcutLevelCost(goldCost, targetLevelIndex + 1)}`,
  };
}
