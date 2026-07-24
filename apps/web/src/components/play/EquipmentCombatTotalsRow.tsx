import { useUiStrings } from "../../lib/locale/LocaleContext";
import styles from "../../routes/PlayView.module.css";

export type EquipmentCombatTotals = {
  maxHp: number;
  /** Attack från utrustning + bryggbonus (utan tillfällig nextCombatModifier). */
  attack: number;
  /** Tillfällig attackmodifierare (t.ex. Lengräddad) till nästa strid. */
  nextCombatMod: number;
  shield: number;
  bvb: number;
  itemCards: number;
};

function formatSignedMod(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

export function EquipmentCombatTotalsRow(props: {
  totals: EquipmentCombatTotals;
  className?: string;
}) {
  const ui = useUiStrings();
  const { totals, className } = props;
  const tempMod = totals.nextCombatMod ?? 0;
  const attackAria =
    tempMod !== 0
      ? ui.play.equipmentAttackFromGearWithTempAria(totals.attack, tempMod)
      : ui.play.equipmentAttackFromGearAria(totals.attack);
  return (
    <div
      className={[styles.equipmentCombatTotalsRow, className ?? ""].filter(Boolean).join(" ")}
      role="group"
      aria-label={`${ui.play.equipmentMaxHpAria(totals.maxHp)} · ${attackAria} · ${ui.play.equipmentDefenseFromGearAria(totals.shield)} · ${ui.play.equipmentBvbFromGearAria(totals.bvb)} · ${ui.play.brewerItemCardBonusAria(totals.itemCards)}`}
    >
      <div
        className={styles.equipmentCombatTotalPill}
        aria-label={ui.play.equipmentMaxHpAria(totals.maxHp)}
      >
        <img
          className={styles.equipmentCombatTotalIcon}
          src="/icons/hp.svg"
          alt=""
          width={18}
          height={18}
          draggable={false}
        />
        <span>{totals.maxHp}</span>
      </div>
      <div
        className={`${styles.equipmentCombatTotalPill}${totals.attack === 0 && tempMod === 0 ? ` ${styles.equipmentCombatTotalPillMuted}` : ""}${tempMod < 0 ? ` ${styles.equipmentCombatTotalPillNegative}` : ""}`}
        aria-label={attackAria}
      >
        <img
          className={styles.equipmentCombatTotalIcon}
          src="/icons/combat-icon.svg"
          alt=""
          width={18}
          height={18}
          draggable={false}
        />
        <span>{totals.attack}</span>
        {tempMod !== 0 ? (
          <span className={styles.equipmentCombatTempMod} title={ui.play.equipmentNextCombatModHint}>
            {formatSignedMod(tempMod)}
          </span>
        ) : null}
      </div>
      <div
        className={`${styles.equipmentCombatTotalPill}${totals.shield === 0 ? ` ${styles.equipmentCombatTotalPillMuted}` : totals.shield < 0 ? ` ${styles.equipmentCombatTotalPillNegative}` : ""}`}
        aria-label={ui.play.equipmentDefenseFromGearAria(totals.shield)}
      >
        <img
          className={styles.equipmentCombatTotalIcon}
          src="/icons/armor-icon.svg"
          alt=""
          width={18}
          height={18}
          draggable={false}
        />
        <span>{totals.shield > 0 ? `+${totals.shield}` : totals.shield}</span>
      </div>
      <div
        className={`${styles.equipmentCombatTotalPill}${totals.bvb === 0 ? ` ${styles.equipmentCombatTotalPillMuted}` : ""}`}
        aria-label={ui.play.equipmentBvbFromGearAria(totals.bvb)}
      >
        <img
          className={styles.equipmentCombatTotalIcon}
          src="/icons/bvb-icon.svg"
          alt=""
          width={18}
          height={18}
          draggable={false}
        />
        <span>{totals.bvb}</span>
      </div>
      <div
        className={`${styles.equipmentCombatTotalPill}${totals.itemCards === 0 ? ` ${styles.equipmentCombatTotalPillMuted}` : ""}`}
        aria-label={ui.play.brewerItemCardBonusAria(totals.itemCards)}
      >
        <img
          className={styles.equipmentCombatTotalIcon}
          src="/icons/cards-icon.svg"
          alt=""
          width={18}
          height={18}
          draggable={false}
        />
        <span>{totals.itemCards > 0 ? `+${totals.itemCards}` : totals.itemCards}</span>
      </div>
    </div>
  );
}
