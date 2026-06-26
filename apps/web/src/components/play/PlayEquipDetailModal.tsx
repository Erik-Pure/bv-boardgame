import {
  BEER_CAN_HELM1_NAME,
  BEER_CAN_RUSTNING_NAME,
  beerCanSetPiecesEquippedCount,
  getEquipmentDisplay,
  getEquipmentDisplayByEquippedName,
  isBeerCanShieldName,
  plastbackAccessorySellPant,
  plastbackPackRemainingCount,
  type ClientAction,
  type EquipmentSlot,
  type Player,
} from "@bv/game-core";
import { equipmentCatalogByEquippedName } from "../../lib/inventoryEffectBadges";
import { equipmentModalDetailLines } from "../../lib/playInteractionEquipmentEffects";
import { equipmentUniqueImageSrc } from "../../lib/equipmentImageSrc";
import { CardRichText } from "../CardRichText";
import { ArcadeButton } from "../ArcadeButton";
import { EquipIcon } from "./EquipIcon";
import { PlayModal } from "./PlayModal";
import { EquipmentModalEffectBadge, ITEM_MODAL_TITLE_STYLE } from "./playModalBadges";
import u from "../../styles/uiPrimitives.module.css";
import { useLocale, useUiStrings } from "../../lib/locale/LocaleContext";
import { capitalizeWord, equipmentSlotLabel } from "../../lib/uiStrings";

export type EquipDetailSelection = { slot: EquipmentSlot };

export function PlayEquipDetailModal(props: {
  equipDetail: EquipDetailSelection | null;
  onClose: () => void;
  me: Player;
  isMyTurn: boolean;
  cardCoverId?: string | null;
  send: (action: ClientAction) => void;
}) {
  const locale = useLocale();
  const ui = useUiStrings();
  const { equipDetail, onClose, me, isMyTurn, cardCoverId, send } = props;
  if (!equipDetail) return null;

  const slot = equipDetail.slot;
  const equipPiece =
    slot === "weapon"
      ? me.equipment.weapon
      : slot === "armor"
        ? me.equipment.armor
        : slot === "helmet"
          ? me.equipment.helmet
          : me.equipment.accessory;
  const pieceName =
    slot === "weapon"
      ? me.equipment.weapon?.name
      : slot === "armor"
        ? me.equipment.armor?.name
        : slot === "helmet"
          ? me.equipment.helmet?.name
          : me.equipment.accessory?.name;
  const equipped = !!pieceName;
  const slotLabel = capitalizeWord(equipmentSlotLabel(slot, locale));
  const display = equipped ? getEquipmentDisplayByEquippedName(pieceName, locale) : null;
  const modalTitle = display?.name ?? pieceName ?? slotLabel;
  const catalogRow = equipped ? equipmentCatalogByEquippedName(pieceName) : undefined;
  const rulesText =
    catalogRow != null ? getEquipmentDisplay(catalogRow.id, locale).rulesText?.trim() : undefined;
  const bodyLines = equipped ? equipmentModalDetailLines(slot, equipPiece, pieceName, ui, locale) : [];
  const uniqueArt = pieceName ? equipmentUniqueImageSrc(pieceName) : null;

  return (
    <PlayModal
      cardCoverId={cardCoverId}
      title={modalTitle}
      onClose={onClose}
      instantFront
      hideClose
      titleStyle={ITEM_MODAL_TITLE_STYLE}
      headerRight={
        equipped ? (
          <EquipmentModalEffectBadge
            piece={equipPiece}
            playerGold={me.gold}
            burkSetEquippedCount={
              (slot === "armor" && pieceName === BEER_CAN_RUSTNING_NAME) ||
              (slot === "helmet" && pieceName === BEER_CAN_HELM1_NAME) ||
              (slot === "accessory" && pieceName && isBeerCanShieldName(pieceName))
                ? beerCanSetPiecesEquippedCount(me)
                : undefined
            }
            player={me}
          />
        ) : undefined
      }
    >
      <div className={u.stack10}>
        <div
          style={{
            width: "100%",
            aspectRatio: "16/9",
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid #ffffff22",
            background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: equipped && uniqueArt ? 12 : 14,
            boxSizing: "border-box",
            minHeight: 0,
          }}
        >
          <EquipIcon
            slot={slot}
            disabled={false}
            equippedName={equipped ? pieceName : undefined}
            iconSize={equipped && uniqueArt ? undefined : 96}
          />
        </div>
        {!equipped ? (
          <div style={{ opacity: 0.9, fontSize: 15 }}>{ui.play.emptySlot}</div>
        ) : (
          <>
            {bodyLines.length > 0 ? (
              <div className={u.stack8Fs15}>
                {bodyLines.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            ) : null}
            {rulesText ? (
              <CardRichText
                text={rulesText}
                style={{
                  opacity: 0.88,
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              />
            ) : null}
            {pieceName === "Plastback" && isMyTurn ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <ArcadeButton
                  variant="blue"
                  fullWidth
                  disabled={plastbackPackRemainingCount(me) <= 0}
                  onClick={() => {
                    send({ type: "takePlastbackBottle", playerId: me.id });
                    onClose();
                  }}
                >
                  {ui.play.takePlastbackBottle(plastbackPackRemainingCount(me))}
                </ArcadeButton>
                <ArcadeButton
                  variant="pink"
                  fullWidth
                  onClick={() => {
                    send({ type: "sellAccessory", playerId: me.id });
                    onClose();
                  }}
                >
                  {ui.play.sellPlastbackAccessory(plastbackAccessorySellPant(me))}
                </ArcadeButton>
              </div>
            ) : null}
          </>
        )}
      </div>
    </PlayModal>
  );
}
