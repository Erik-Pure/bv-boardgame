import {
  isPlayerActiveInMatch,
  levelUpCostsForTargetLevel,
  type GameState,
  type TileType,
} from "@bv/game-core";
import { moveChoiceTileVisual } from "../../lib/moveChoiceTileVisual";
import { useLocale, useUiStrings } from "../../lib/locale/LocaleContext";
import { tileTypeLabel } from "../../lib/uiStrings";
import styles from "../../routes/PlayView.module.css";
import u from "../../styles/uiPrimitives.module.css";

/** Pant som krävs för nivå upp via dörren — samma som vid `door`-pending (rabatt på tillbehör). */
function doorTileAscendGoldCost(
  state: GameState,
  playerId: string,
  doorLevelIndex: number,
  doorTileIndex: number,
): number | null {
  const tile = state.levels[doorLevelIndex]?.tiles[doorTileIndex];
  if (!tile || tile.type !== "door") return null;
  const targetLevelIndex = tile.doorTargetLevelIndex ?? doorLevelIndex + 1;
  const base = levelUpCostsForTargetLevel(targetLevelIndex);
  const me = state.players.find((p) => p.id === playerId);
  const discount = me?.equipment.accessory?.levelUpDiscountGold ?? 0;
  return Math.max(0, base.gold - Math.max(0, discount));
}

export function MoveOptionLabel(props: {
  state: GameState;
  meId: string;
  levelIndex: number;
  tileIndex: number;
  tileType: TileType;
}) {
  const locale = useLocale();
  const ui = useUiStrings();
  const hasOtherPlayer = props.state.players.some(
    (p) =>
      p.id !== props.meId &&
      isPlayerActiveInMatch(p) &&
      p.levelIndex === props.levelIndex &&
      p.tileIndex === props.tileIndex,
  );
  const tileVisual = moveChoiceTileVisual(props.tileType);
  const tileLabel = tileTypeLabel(props.tileType, locale);
  const primary = hasOtherPlayer ? `${ui.play.moveChoiceBvbLabel} / ${tileLabel}` : tileLabel;
  const showDoorPant = props.tileType === "door" && !hasOtherPlayer;
  const doorGoldCost = showDoorPant
    ? doorTileAscendGoldCost(props.state, props.meId, props.levelIndex, props.tileIndex)
    : null;
  return (
    <span className={u.spanStack2Center}>
      <span
        style={{
          fontWeight: 900,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          flexWrap: "wrap",
          lineHeight: 1.15,
        }}
      >
        <span className={styles.moveChoiceTileIconBadge} aria-hidden>
          <img
            src={tileVisual.src}
            alt=""
            width={tileVisual.monochrome ? 22 : 26}
            height={tileVisual.monochrome ? 22 : 26}
            draggable={false}
            className={[styles.moveChoiceTileIconImg, tileVisual.monochrome ? styles.moveChoiceTileIconImgMono : ""]
              .filter(Boolean)
              .join(" ")}
          />
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            flexWrap: "wrap",
          }}
        >
          <span>{primary}</span>
          {showDoorPant && doorGoldCost != null ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                fontWeight: 900,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {"("}
              {doorGoldCost}
              <img
                src="/icons/pant-icon.svg"
                alt=""
                width={15}
                height={15}
                draggable={false}
                style={{
                  display: "block",
                  objectFit: "contain",
                  flexShrink: 0,
                  filter: "brightness(0) invert(1)",
                  opacity: 0.95,
                }}
              />
              {")"}
            </span>
          ) : null}
        </span>
      </span>
    </span>
  );
}
