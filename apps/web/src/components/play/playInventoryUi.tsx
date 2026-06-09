import type { CSSProperties, ReactNode } from "react";
import {
  BEER_HELM2_MIN_LEVEL,
  brewerDisplayLevel,
  effectiveItemPlayGoldCost,
  isLegendariskBurkhjälmName,
  itemPlayGoldCost,
  playerHasFreeInventoryItemPlay,
  type EquipmentSlot,
  type ItemId,
  type ItemInstance,
  type ItemUseTarget,
  type Player,
} from "@bv/game-core";
import {
  effectBadgeIconFilter,
  equipmentInventoryEffectBadges,
  itemInventoryEffectBadge,
  ITEM_EFFECT_BADGE_ICONS,
  type ItemInventoryBadgeOpts,
} from "../../lib/inventoryEffectBadges";
import styles from "../../routes/PlayView.module.css";
import { sv } from "../../lib/uiStrings";
import { EquipIcon } from "./EquipIcon";

export type StatFlash = "up" | "down" | null;

function lootRadialToneClass(flash: StatFlash): string | null {
  if (flash === "up") return styles.statsRadialPantUp;
  if (flash === "down") return styles.statsRadialHpDown;
  return null;
}

export function LootFlashShell(props: { flash: StatFlash | null; flashKey: number; children: ReactNode }) {
  const tone = props.flash ? lootRadialToneClass(props.flash) : null;
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 0,
        overflow: "visible",
        display: "grid",
        placeItems: "center",
      }}
    >
      {props.flash && tone ? (
        <div
          key={props.flashKey}
          className={`${styles.statsCellRadial} ${tone} ${styles.statsCellRadialRun}`}
          aria-hidden
        />
      ) : null}
      <div
        className={props.flash ? styles.statIconWobble : undefined}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "grid",
          placeItems: "center",
          minHeight: 0,
        }}
      >
        {props.children}
      </div>
    </div>
  );
}

export function EquipButton(props: {
  slot: "weapon" | "armor" | "helmet" | "accessory";
  equipped: boolean;
  equippedName?: string;
  equippedPiece?: Player["equipment"][EquipmentSlot];
  /** Burk-set: antal utrustade delar (tier för rustning / Burkhjälm I / sköld). */
  burkSetEquippedCount?: number;
  /** Vapenbricka: pant för Burksvärd m.fl. (samma trösklar som i strid). */
  effectBadgeGold?: number;
  /** För hjälmbonus som följer spelarens klunkar (t.ex. Ölfylld rymdhjälm). */
  effectBadgePlayer?: Player;
  lootFlash: StatFlash | null;
  lootFlashKey: number;
  onClick: () => void;
}) {
  const label =
    props.slot === "weapon"
      ? sv.play.equipWeapon
      : props.slot === "armor"
        ? sv.play.equipArmor
        : props.slot === "helmet"
          ? sv.play.equipHelmet
          : sv.play.equipAccessory;
  const disabled = !props.equipped;
  const lf = props.lootFlash;
  const legendaryBurkhjälmLocked =
    props.slot === "helmet" &&
    props.equipped &&
    isLegendariskBurkhjälmName(props.equippedName) &&
    brewerDisplayLevel(props.effectBadgePlayer ?? ({ xp: 0 } as Player)) < BEER_HELM2_MIN_LEVEL;
  return (
    <button
      type="button"
      onClick={() => {
        if (disabled) return;
        props.onClick();
      }}
      disabled={disabled}
      aria-label={disabled ? sv.equipAria.empty(label) : sv.equipAria.view(label)}
      style={{
        width: "100%",
        aspectRatio: "1 / 1",
        minHeight: 0,
        borderRadius: 14,
        border: "none",
        background: disabled
          ? "radial-gradient(155% 100% at 50% 112%, rgba(107,114,128,0.52) 0%, rgba(31,41,55,0.62) 42%, rgba(0,0,0,0.66) 100%)"
          : legendaryBurkhjälmLocked
            ? "radial-gradient(175% 125% at 50% 114%, rgba(248,113,113,1) 0%, rgba(220,38,38,0.92) 24%, rgba(15,23,42,0.52) 52%, rgba(0,0,0,0.62) 100%)"
            : "radial-gradient(175% 125% at 50% 114%, rgba(34,211,238,1) 0%, rgba(14,165,233,0.92) 24%, rgba(15,23,42,0.52) 52%, rgba(0,0,0,0.62) 100%)",
        boxShadow: disabled
          ? "none"
          : legendaryBurkhjälmLocked
            ? "0 10px 22px rgba(0,0,0,0.36), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -22px 30px rgba(248,113,113,0.32)"
            : "0 10px 22px rgba(0,0,0,0.36), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -22px 30px rgba(34,211,238,0.28)",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "grid",
        placeItems: "center",
        padding: 0,
        opacity: disabled ? 0.55 : 1,
        position: "relative",
        overflow: lf ? "visible" : "hidden",
        transition: "transform 120ms ease, filter 120ms ease, opacity 120ms ease",
      }}
    >
      <LootFlashShell flash={lf} flashKey={props.lootFlashKey}>
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            minHeight: 0,
            display: "grid",
            gridTemplateAreas: '"stack"',
            gridTemplateRows: "1fr",
            gridTemplateColumns: "1fr",
          }}
        >
          <div
            style={{
              gridArea: "stack",
              minHeight: 0,
              overflow: "hidden",
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
            }}
          >
            <EquipIcon slot={props.slot} disabled={disabled} equippedName={props.equippedName} />
          </div>
          <EquipmentInventoryEffectBadges
            piece={props.equippedPiece}
            playerGold={props.slot === "weapon" ? props.effectBadgeGold : undefined}
            burkSetEquippedCount={props.burkSetEquippedCount}
            player={props.effectBadgePlayer}
          />
        </div>
      </LootFlashShell>
    </button>
  );
}

/** Ingripandekort i andras strider — röd/grön ton i inventory (PlayView `itemCardTone`, baserat på faktisk spelbarhet). */
const COMBAT_INTERVENE_EVIL_ITEM_IDS = new Set<string>([
  "weak_beer",
  "tripwire",
  "hangover",
  "paidassasin",
  "monster_hype",
  "lengraddad",
  "not_my_round",
  "spill_intentional",
  "yeast_sabotage",
]);
const COMBAT_INTERVENE_GOOD_ITEM_IDS = new Set<string>([
  "light_beer",
  "folk_beer",
  "double_hops",
  "beer_bomb",
  "manopositiv",
  "get_lucky",
  "beer_bro",
]);

export function inventoryGroupSortTier(itemId: string): number {
  if (COMBAT_INTERVENE_GOOD_ITEM_IDS.has(itemId)) return 0;
  if (COMBAT_INTERVENE_EVIL_ITEM_IDS.has(itemId)) return 1;
  return 2;
}
/** Spelbara kort som primärt är debuff/sabotage ska få röd ton i inventory. */
const PLAYABLE_DEBUFF_ITEM_IDS = new Set<string>([
  "weak_beer",
  "tripwire",
  "hangover",
  "paidassasin",
  "monster_hype",
  "lengraddad",
  "not_my_round",
  "spill_intentional",
  "rigged_game",
  "sleep_potion",
  "yeast_sabotage",
]);

/** Attack-effekt på föremålsbricka: stor färgkodad text med outline, utan ikon/bakgrund (övre vänster). */
export function ItemInventoryAttackCorner({
  itemId,
  instance,
  opts,
}: {
  itemId: string;
  instance?: ItemInstance | null;
  opts?: ItemInventoryBadgeOpts;
}) {
  const b = itemInventoryEffectBadge(itemId, instance, opts);
  if (!b || b.icon !== "attack") return null;
  const raw = b.label.trim();
  const isNegative =
    b.labelTone === "danger" || /^[\u2212-]/.test(raw) || raw.startsWith("−");
  const isPositive = raw.startsWith("+") || (raw.startsWith("×") && raw.length > 1);
  const fill = isNegative ? "#f87171" : isPositive ? "#4ade80" : "#f1f5f9";
  const outlineDirs: [number, number][] = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  const outline = [1, 2, 3]
    .flatMap((r) => outlineDirs.map(([dx, dy]) => `${dx * r}px ${dy * r}px 0 #0a0a12`))
    .join(", ");
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        top: 4,
        left: 4,
        zIndex: 3,
        fontFamily: "var(--sans), system-ui, sans-serif",
        fontSize: "clamp(16px, 5vw, 24px)",
        fontWeight: 900,
        fontVariantNumeric: "tabular-nums",
        lineHeight: 1,
        letterSpacing: "-0.03em",
        color: fill,
        textShadow: outline,
        pointerEvents: "none",
      }}
    >
      {b.label}
    </span>
  );
}

export function ItemInventoryEffectBadge({
  itemId,
  instance,
  opts,
}: {
  itemId: string;
  instance?: ItemInstance | null;
  opts?: ItemInventoryBadgeOpts;
}) {
  const b = itemInventoryEffectBadge(itemId, instance, opts);
  if (!b || b.icon === "attack") return null;
  const danger = b.labelTone === "danger";
  const src = ITEM_EFFECT_BADGE_ICONS[b.icon];
  if (b.iconAfter) {
    return (
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "clamp(2px, 0.55vw, 3px)",
          padding: "clamp(2px, 0.55vw, 3px) clamp(4px, 1.15vw, 5px)",
          borderRadius: 999,
          background: "rgba(11,18,38,0.92)",
          border: danger ? "1px solid rgba(248,113,113,0.42)" : "1px solid rgba(255,255,255,0.2)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            fontSize: "clamp(10px, 2.8vw, 11px)",
            fontWeight: 900,
            fontVariantNumeric: "tabular-nums",
            color: danger ? "#fca5a5" : "#f8fafc",
            textShadow: danger ? "0 0 6px rgba(248,113,113,0.45)" : undefined,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {b.label}
        </span>
        <img
          src={src}
          alt=""
          width={14}
          height={14}
          draggable={false}
          style={{
            display: "block",
            width: "clamp(12px, 3.4vw, 15px)",
            height: "clamp(12px, 3.4vw, 15px)",
            objectFit: "contain",
            filter: effectBadgeIconFilter(b.icon, danger),
          }}
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "clamp(2px, 0.55vw, 3px)",
        padding: "clamp(2px, 0.55vw, 3px) clamp(4px, 1.15vw, 5px)",
        borderRadius: 999,
        background: "rgba(11,18,38,0.92)",
        border: danger ? "1px solid rgba(248,113,113,0.42)" : "1px solid rgba(255,255,255,0.2)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
        pointerEvents: "none",
      }}
    >
      <img
        src={src}
        alt=""
        width={14}
        height={14}
        draggable={false}
        style={{
          display: "block",
          width: "clamp(12px, 3.4vw, 15px)",
          height: "clamp(12px, 3.4vw, 15px)",
          objectFit: "contain",
          filter: effectBadgeIconFilter(b.icon, danger),
        }}
      />
      <span
        style={{
          fontSize: "clamp(10px, 2.8vw, 11px)",
          fontWeight: 900,
          fontVariantNumeric: "tabular-nums",
          color: danger ? "#fca5a5" : "#f8fafc",
          textShadow: danger ? "0 0 6px rgba(248,113,113,0.45)" : undefined,
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {b.label}
      </span>
    </span>
  );
}

export function ItemInventoryCostBadge({ itemId, player }: { itemId: string; player?: Player | null }) {
  if (player && playerHasFreeInventoryItemPlay(player)) return null;
  const cost = player
    ? effectiveItemPlayGoldCost(player, itemId as ItemId)
    : itemPlayGoldCost(itemId as ItemId);
  if (cost <= 0) return null;
  const src = ITEM_EFFECT_BADGE_ICONS.pant;
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "clamp(2px, 0.55vw, 3px)",
        padding: "clamp(2px, 0.55vw, 3px) clamp(4px, 1.15vw, 5px)",
        borderRadius: 999,
        background: "rgba(11,18,38,0.92)",
        border: "1px solid rgba(248,113,113,0.42)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          fontSize: "clamp(10px, 2.8vw, 11px)",
          fontWeight: 900,
          fontVariantNumeric: "tabular-nums",
          color: "#fca5a5",
          textShadow: "0 0 6px rgba(248,113,113,0.45)",
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        -{cost}
      </span>
      <img
        src={src}
        alt=""
        width={14}
        height={14}
        draggable={false}
        style={{
          display: "block",
          width: "clamp(12px, 3.4vw, 15px)",
          height: "clamp(12px, 3.4vw, 15px)",
          objectFit: "contain",
          filter: "brightness(0) invert(1) drop-shadow(0 0 4px rgba(248,113,113,0.9))",
        }}
      />
    </span>
  );
}

export function EquipmentInventoryEffectBadges(props: {
  piece?: Player["equipment"][EquipmentSlot];
  playerGold?: number;
  burkSetEquippedCount?: number;
  player?: Player;
}) {
  const badges = equipmentInventoryEffectBadges(
    props.piece,
    props.playerGold,
    props.burkSetEquippedCount,
    props.player,
  );
  if (badges.length === 0) return null;
  const cornerStyle = (idx: number): CSSProperties => {
    const row = Math.floor(idx / 2);
    if (idx % 2 === 0) return { bottom: 3 + row * 23, right: 3 };
    return { bottom: 3 + row * 23, left: 3 };
  };
  return (
    <span
      aria-hidden
      style={{
        gridArea: "stack",
        position: "relative",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      {badges.map((b, idx) => {
        const src = ITEM_EFFECT_BADGE_ICONS[b.icon];
        const danger = b.labelTone === "danger";
        return (
          <span
            key={`${idx}-${b.icon}:${b.label}:${b.labelTone ?? ""}`}
            style={{
              position: "absolute",
              ...cornerStyle(idx),
              display: "inline-flex",
              alignItems: "center",
              gap: "clamp(2px, 0.55vw, 3px)",
              padding: "clamp(2px, 0.55vw, 3px) clamp(4px, 1.15vw, 5px)",
              borderRadius: 999,
              background: "rgba(11,18,38,0.92)",
              border: danger ? "1px solid rgba(248,113,113,0.42)" : "1px solid rgba(255,255,255,0.2)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
              maxWidth: "100%",
            }}
          >
            <img
              src={src}
              alt=""
              width={14}
              height={14}
              draggable={false}
              style={{
                display: "block",
                width: "clamp(12px, 3.4vw, 15px)",
                height: "clamp(12px, 3.4vw, 15px)",
                objectFit: "contain",
                filter: effectBadgeIconFilter(b.icon, danger),
              }}
            />
            <span
              style={{
                fontSize: "clamp(10px, 2.8vw, 11px)",
                fontWeight: 900,
                fontVariantNumeric: "tabular-nums",
                color: danger ? "#fca5a5" : "#f8fafc",
                textShadow: danger ? "0 0 6px rgba(248,113,113,0.45)" : undefined,
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              {b.label}
            </span>
          </span>
        );
      })}
    </span>
  );
}
export function getItemCardTone(
  itemId: string,
  target: ItemUseTarget,
  isPlayable: (id: string, t: ItemUseTarget) => boolean,
  playableHint?: boolean,
) {
  const playable = playableHint ?? isPlayable(itemId, target);
  const id = String(itemId);
  const greenPositive = {
    border: "2px solid rgba(74,222,128,0.9)",
    background: "rgba(21,128,61,0.13)",
    boxShadow: "0 8px 16px rgba(0,0,0,0.28), 0 0 0 1px rgba(74,222,128,0.35) inset",
  };
  const redEvil = {
    border: "2px solid rgba(248,113,113,0.95)",
    background: "rgba(127,29,29,0.14)",
    boxShadow: "0 8px 16px rgba(0,0,0,0.28), 0 0 0 1px rgba(248,113,113,0.4) inset",
  };
  const neutral = {
    border: "2px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 8px 16px rgba(0,0,0,0.28)",
  };
  if (playable) {
    if (PLAYABLE_DEBUFF_ITEM_IDS.has(id)) return redEvil;
    return greenPositive;
  }
  return neutral;
}

export function groupInventoryEntries(me: Player) {
  const acc: Record<string, { count: number; firstInstanceId: string; itemId: string }> = {};
  for (const it of me.inventory ?? []) {
    const groupKey = it.itemId === "canman" ? `canman:${it.instanceId}` : String(it.itemId);
    const cur = acc[groupKey];
    if (!cur) acc[groupKey] = { count: 1, firstInstanceId: it.instanceId, itemId: String(it.itemId) };
    else cur.count += 1;
  }
  const rows = Object.entries(acc).map(([groupKey, v]) => ({ groupKey, ...v }));
  rows.sort((a, b) => {
    const ta = inventoryGroupSortTier(a.itemId);
    const tb = inventoryGroupSortTier(b.itemId);
    if (ta !== tb) return ta - tb;
    return a.groupKey.localeCompare(b.groupKey);
  });
  return rows;
}
