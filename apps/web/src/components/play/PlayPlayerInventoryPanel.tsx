import {
  BEER_CAN_HELM1_NAME,
  BEER_CAN_RUSTNING_NAME,
  beerCanSetPiecesEquippedCount,
  isBeerCanShieldName,
  type EquipmentSlot,
  type GameState,
  type ItemUseTarget,
  type Player,
} from "@bv/game-core";
import type { ItemInventoryBadgeOpts } from "../../lib/inventoryEffectBadges";
import { itemImageSrc } from "../../lib/itemImageSrc";
import { EquipmentCombatTotalsRow } from "./EquipmentCombatTotalsRow";
import type { ItemDetailSelection } from "./PlayItemDetailSheet";
import type { MobileEquipmentCombatTotals } from "./PlayInteractionPanel";
import {
  EquipButton,
  getItemCardTone,
  groupInventoryEntries,
  ItemInventoryAttackCorner,
  ItemInventoryCostBadge,
  ItemInventoryEffectBadge,
  LootFlashShell,
  type StatFlash,
} from "./playInventoryUi";
import styles from "../../routes/PlayView.module.css";
import u from "../../styles/uiPrimitives.module.css";
import { sv } from "../../lib/uiStrings";

export type PlayPlayerInventoryPanelProps = {
  me: Player;
  pending: GameState["pending"];
  headerTopPad: number;
  bottomSheetVisible: boolean;
  bottomSheetAnimatedHeight: number | null;
  mobileEquipmentCombatTotals: MobileEquipmentCombatTotals | null;
  equipFlash: Record<EquipmentSlot, StatFlash>;
  equipFlashKey: Record<EquipmentSlot, number>;
  itemFlash: Record<string, StatFlash>;
  itemFlashKey: Record<string, number>;
  itemInvBadgeOpts?: ItemInventoryBadgeOpts;
  onEquipClick: (slot: EquipmentSlot) => void;
  onItemClick: (selection: ItemDetailSelection) => void;
  itemMetaForView: (itemId: string) => { title: string; text: string; target: ItemUseTarget };
  isItemPlayableNow: (itemId: string, target: ItemUseTarget) => boolean;
  inCombat: boolean;
  inPvpPreRoundItems: boolean;
  inPvpAwaitingRolls: boolean;
};

export function PlayPlayerInventoryPanel(props: PlayPlayerInventoryPanelProps) {
  const {
    me,
    pending,
    headerTopPad,
    bottomSheetVisible,
    bottomSheetAnimatedHeight,
    mobileEquipmentCombatTotals,
    equipFlash,
    equipFlashKey,
    itemFlash,
    itemFlashKey,
    itemInvBadgeOpts,
    onEquipClick,
    onItemClick,
    itemMetaForView,
    isItemPlayableNow,
    inCombat,
    inPvpPreRoundItems,
    inPvpAwaitingRolls,
  } = props;
  const inventoryEntries = groupInventoryEntries(me);

  return (
    <div
      className={styles.playerEquipmentShell}
                  style={{
                    top: headerTopPad,
                    /* Luft under föremålsgrid när nedersta panelen täcker — kan scrollas fram */
                    ...(bottomSheetVisible
                      ? {
                          paddingBottom: `calc(max(12px, env(safe-area-inset-bottom, 0px)) + ${(bottomSheetAnimatedHeight ?? 110) + 12}px)`,
                        }
                      : {}),
                  }}
                >
                  <div className={styles.equipmentGridWrap}>
                    <div className={styles.equipmentGrid}>
                      <EquipButton
                        slot="weapon"
                        equipped={!!me.equipment.weapon}
                        equippedName={me.equipment.weapon?.name}
                        equippedPiece={me.equipment.weapon}
                        effectBadgeGold={me.gold}
                        effectBadgePlayer={me}
                        lootFlash={equipFlash.weapon}
                        lootFlashKey={equipFlashKey.weapon}
                        onClick={() => onEquipClick("weapon")}
                      />
                      <EquipButton
                        slot="armor"
                        equipped={!!me.equipment.armor}
                        equippedName={me.equipment.armor?.name}
                        equippedPiece={me.equipment.armor}
                        burkSetEquippedCount={
                          me.equipment.armor?.name === BEER_CAN_RUSTNING_NAME
                            ? beerCanSetPiecesEquippedCount(me)
                            : undefined
                        }
                        effectBadgePlayer={me}
                        lootFlash={equipFlash.armor}
                        lootFlashKey={equipFlashKey.armor}
                        onClick={() => onEquipClick("armor")}
                      />
                      <EquipButton
                        slot="helmet"
                        equipped={!!me.equipment.helmet}
                        equippedName={me.equipment.helmet?.name}
                        equippedPiece={me.equipment.helmet}
                        burkSetEquippedCount={
                          me.equipment.helmet?.name === BEER_CAN_HELM1_NAME
                            ? beerCanSetPiecesEquippedCount(me)
                            : undefined
                        }
                        effectBadgePlayer={me}
                        lootFlash={equipFlash.helmet}
                        lootFlashKey={equipFlashKey.helmet}
                        onClick={() => onEquipClick("helmet")}
                      />
                      <EquipButton
                        slot="accessory"
                        equipped={!!me.equipment.accessory}
                        equippedName={me.equipment.accessory?.name}
                        equippedPiece={me.equipment.accessory}
                        burkSetEquippedCount={
                          me.equipment.accessory?.name &&
                          isBeerCanShieldName(me.equipment.accessory.name)
                            ? beerCanSetPiecesEquippedCount(me)
                            : undefined
                        }
                        effectBadgePlayer={me}
                        lootFlash={equipFlash.accessory}
                        lootFlashKey={equipFlashKey.accessory}
                        onClick={() => onEquipClick("accessory")}
                      />
                    </div>
                    {mobileEquipmentCombatTotals ? (
                      <EquipmentCombatTotalsRow totals={mobileEquipmentCombatTotals} />
                    ) : null}
                  </div>

                  <div className={u.stack8FullMin1}>
                    <div className={u.itemsHeadingRow}>{sv.play.itemsHeading}</div>
                    <div className={styles.equipmentGridWrap}>
                      {inventoryEntries.length === 0 ? (
                        <div className={styles.inventoryEmpty}>{sv.play.itemsEmpty}</div>
                      ) : (
                        <div className={styles.equipmentGrid}>
                          {inventoryEntries.map((info) => {
                            const itemId = info.itemId;
                            const itemMeta = itemMetaForView(itemId);
                            const invPlayable = isItemPlayableNow(itemId, itemMeta.target);
                            const tone = getItemCardTone(itemId, itemMeta.target, isItemPlayableNow, invPlayable);
                            const dimUnplayableInCombat =
                              !invPlayable &&
                              (inCombat || inPvpPreRoundItems || inPvpAwaitingRolls);
                            const iflash = itemFlash[itemId] ?? null;
                            const iflashKey = itemFlashKey[itemId] ?? 0;
                            const invInst =
                              me.inventory?.find((x) => x.instanceId === info.firstInstanceId) ?? null;
                            return (
                              <button
                                key={info.groupKey}
                                type="button"
                                onClick={() => {
                                  const pvpSpillTarget =
                                    pending?.type === "pvp" &&
                                    (pending.phase === "preRoundItems" || pending.phase === "awaitingRolls") &&
                                    me &&
                                    (pending.attackerId === me.id || pending.defenderId === me.id) &&
                                    info.itemId === "spill_intentional"
                                      ? pending.attackerId === me.id
                                        ? pending.defenderId
                                        : pending.attackerId
                                      : undefined;
                                  onItemClick({
                                    instanceId: info.firstInstanceId,
                                    initialTargetId: pvpSpillTarget,
                                  });
                                }}
                                aria-label={itemMeta.title}
                                style={{
                                  width: "100%",
                                  aspectRatio: "1 / 1",
                                  minHeight: 0,
                                  boxSizing: "border-box",
                                  borderRadius: 14,
                                  border: tone.border,
                                  background: tone.background,
                                  boxShadow: tone.boxShadow,
                                  position: "relative",
                                  overflow: iflash ? "visible" : "hidden",
                                  padding: 0,
                                  cursor: "pointer",
                                  display: "flex",
                                  flexDirection: "column",
                                  opacity: dimUnplayableInCombat ? 0.28 : 1,
                                  filter: dimUnplayableInCombat
                                    ? "grayscale(0.72) brightness(0.75)"
                                    : undefined,
                                }}
                              >
                                <div
                                  style={{
                                    flex: 1,
                                    minHeight: 0,
                                    minWidth: 0,
                                    width: "100%",
                                    padding: 4,
                                    boxSizing: "border-box",
                                    display: "flex",
                                    flexDirection: "column",
                                  }}
                                >
                                  <div style={{ flex: 1, minHeight: 0, minWidth: 0, width: "100%" }}>
                                  <LootFlashShell flash={iflash} flashKey={iflashKey}>
                                    {/*
                                      WebKit/mobil: två grid-barn med samma area gav overlay-flex min-innehållshöjd
                                      som tryckte ut bilden. Bild i absolute inset 0 + overlay absolute ovanpå.
                                    */}
                                    <div
                                      style={{
                                        position: "relative",
                                        width: "100%",
                                        height: "100%",
                                        minHeight: 0,
                                      }}
                                    >
                                      <div
                                        style={{
                                          position: "absolute",
                                          inset: 0,
                                          overflow: "hidden",
                                          borderRadius: 10,
                                        }}
                                      >
                                        <img
                                          src={itemImageSrc(itemId)}
                                          onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).src = "/card-placeholder.png";
                                          }}
                                          alt=""
                                          aria-hidden
                                          style={{
                                            position: "absolute",
                                            inset: 0,
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                            objectPosition: "center center",
                                            display: "block",
                                          }}
                                        />
                                      </div>
                                      <div
                                        style={{
                                          position: "absolute",
                                          inset: 0,
                                          zIndex: 2,
                                          pointerEvents: "none",
                                        }}
                                      >
                                        {info.count > 1 ? (
                                          <span
                                            style={{
                                              position: "absolute",
                                              bottom: 2,
                                              left: 2,
                                              minWidth: 24,
                                              minHeight: 20,
                                              borderRadius: 999,
                                              border: "1px solid #ffffff55",
                                              background: "rgba(11,18,38,0.88)",
                                              color: "#fff",
                                              fontSize: 12,
                                              fontWeight: 800,
                                              display: "grid",
                                              placeItems: "center",
                                              padding: "0 4px",
                                              lineHeight: 1,
                                            }}
                                          >
                                            x{info.count}
                                          </span>
                                        ) : null}
                                        <ItemInventoryAttackCorner
                                          itemId={itemId}
                                          instance={invInst}
                                          opts={itemInvBadgeOpts}
                                        />
                                        <div
                                          style={{
                                            position: "absolute",
                                            right: 2,
                                            bottom: 2,
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "flex-end",
                                            gap: 2,
                                          }}
                                        >
                                          <ItemInventoryEffectBadge
                                            itemId={itemId}
                                            instance={invInst}
                                            opts={itemInvBadgeOpts}
                                          />
                                          <ItemInventoryCostBadge itemId={itemId} player={me} />
                                        </div>
                                      </div>
                                    </div>
                                  </LootFlashShell>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
    </div>
  );
}
