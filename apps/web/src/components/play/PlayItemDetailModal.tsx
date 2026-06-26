import type { GameState, ItemUseTarget, Player } from "@bv/game-core";
import type { ItemInventoryBadgeOpts } from "../../lib/inventoryEffectBadges";
import { itemImageSrc } from "../../lib/itemImageSrc";
import { CardRichText } from "../CardRichText";
import { PlayModal } from "./PlayModal";
import { ItemModalEffectBadge, ITEM_MODAL_TITLE_STYLE } from "./playModalBadges";
import type { ItemDetailSelection } from "./PlayItemDetailSheet";
import styles from "../../routes/PlayView.module.css";
import u from "../../styles/uiPrimitives.module.css";
import { useUiStrings } from "../../lib/locale/LocaleContext";

export function PlayItemDetailModal(props: {
  itemDetail: ItemDetailSelection | null;
  onClose: () => void;
  me: Player;
  state: GameState;
  cardCoverId?: string | null;
  itemMetaForView: (itemId: string) => { title: string; text: string; target: ItemUseTarget };
  itemInvBadgeOpts?: ItemInventoryBadgeOpts;
}) {
  const ui = useUiStrings();
  const { itemDetail, onClose, me, state, cardCoverId, itemMetaForView, itemInvBadgeOpts } = props;
  if (!itemDetail || !me || !state) return null;

  const inst = (me.inventory ?? []).find((x) => x.instanceId === itemDetail.instanceId);
  const modalTitle = inst ? itemMetaForView(inst.itemId).title : ui.play.itemNotFound;

  return (
    <PlayModal
      cardCoverId={cardCoverId}
      title={modalTitle}
      onClose={onClose}
      instantFront
      hideClose
      headerRight={
        inst ? (
          <ItemModalEffectBadge itemId={inst.itemId} instance={inst} opts={itemInvBadgeOpts} />
        ) : undefined
      }
      titleStyle={inst ? ITEM_MODAL_TITLE_STYLE : undefined}
    >
      {!inst ? (
        <div style={{ opacity: 0.9 }}>{ui.play.itemNotFound}</div>
      ) : (
        <div className={u.stack10}>
          <div className={styles.itemModalArtFrame}>
            <img
              src={itemImageSrc(inst.itemId)}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/card-placeholder.png";
              }}
              alt=""
              aria-hidden
              className={styles.itemModalArtImage}
            />
          </div>
          <CardRichText
            text={itemMetaForView(inst.itemId).text}
            style={{ opacity: 0.9, color: "#e5e7eb", fontSize: 15, lineHeight: 1.45 }}
          />
        </div>
      )}
    </PlayModal>
  );
}
