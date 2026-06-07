import type { CombatReactionItemPlay, GameState, TableItemPlayReveal } from "@bv/game-core";
import { itemDisplayTitle, playerTotalItemCardBonus } from "@bv/game-core";
import { equipmentCatalogImageSrc } from "./equipmentImageSrc";
import { itemImageSrc } from "./itemImageSrc";
import type { ItemPlayModifierBadge } from "./tableItemPlayModifier";
import { tableItemPlayModifierBadge } from "./tableItemPlayModifier";

export type TableFanCardModel = {
  key: string;
  title: string;
  imageSrc: string;
  actorName: string;
  actorColor?: string;
  targetPlayerName?: string;
  targetPlayerColor?: string;
  modifierBadge: ItemPlayModifierBadge | null;
};

type PlayLike = Pick<
  CombatReactionItemPlay,
  | "itemId"
  | "actorId"
  | "targetPlayerId"
  | "sideInventoryItemId"
  | "sideEquipmentSlot"
  | "sideEquipmentName"
> & { playSeq: number };

function fanCardsForOnePlay(state: GameState, play: PlayLike): TableFanCardModel[] {
  const actor = state.players.find((p) => p.id === play.actorId);
  const actorName = actor?.name?.trim() || "—";
  const actorColor = actor?.color;
  const tgt = play.targetPlayerId
    ? state.players.find((p) => p.id === play.targetPlayerId)
    : undefined;
  const targetPlayerName =
    play.targetPlayerId && play.targetPlayerId !== play.actorId ? tgt?.name?.trim() : undefined;
  const targetPlayerColor =
    play.targetPlayerId && play.targetPlayerId !== play.actorId ? tgt?.color : undefined;
  const victimName = tgt?.name?.trim() || "—";
  const victimColor = tgt?.color;
  const boardLevelIndex = actor?.levelIndex ?? 0;
  const actorItemCardBonus = actor ? playerTotalItemCardBonus(actor) : 0;

  const main: TableFanCardModel = {
    key: `${play.playSeq}-main-${play.itemId}`,
    title: itemDisplayTitle(play.itemId),
    imageSrc: itemImageSrc(play.itemId),
    actorName,
    actorColor,
    targetPlayerName,
    targetPlayerColor,
    modifierBadge: tableItemPlayModifierBadge(play.itemId, boardLevelIndex, actorItemCardBonus),
  };

  const side: TableFanCardModel[] = [];
  if (play.sideInventoryItemId) {
    side.push({
      key: `${play.playSeq}-side-inv-${play.sideInventoryItemId}`,
      title: itemDisplayTitle(play.sideInventoryItemId),
      imageSrc: itemImageSrc(play.sideInventoryItemId),
      actorName: victimName,
      actorColor: victimColor,
      targetPlayerName: undefined,
      modifierBadge: tableItemPlayModifierBadge(play.sideInventoryItemId),
    });
  } else if (play.sideEquipmentSlot && play.sideEquipmentName) {
    side.push({
      key: `${play.playSeq}-side-eq-${play.sideEquipmentSlot}`,
      title: play.sideEquipmentName,
      imageSrc: equipmentCatalogImageSrc(play.sideEquipmentName, play.sideEquipmentSlot),
      actorName: victimName,
      actorColor: victimColor,
      targetPlayerName: undefined,
      modifierBadge: null,
    });
  }

  return [main, ...side];
}

export function expandReactionPlaysToFanCards(
  state: GameState,
  plays: CombatReactionItemPlay[],
): TableFanCardModel[] {
  const out: TableFanCardModel[] = [];
  for (const play of plays) {
    out.push(...fanCardsForOnePlay(state, play));
  }
  return out;
}

export function expandTableRevealsToFanCards(
  state: GameState,
  reveals: readonly TableItemPlayReveal[],
): TableFanCardModel[] {
  const out: TableFanCardModel[] = [];
  for (const reveal of reveals) {
    out.push(
      ...fanCardsForOnePlay(state, {
        playSeq: reveal.seq,
        itemId: reveal.itemId,
        actorId: reveal.actorId,
        targetPlayerId: reveal.targetPlayerId,
        sideInventoryItemId: reveal.sideInventoryItemId,
        sideEquipmentSlot: reveal.sideEquipmentSlot,
        sideEquipmentName: reveal.sideEquipmentName,
      }),
    );
  }
  return out;
}
