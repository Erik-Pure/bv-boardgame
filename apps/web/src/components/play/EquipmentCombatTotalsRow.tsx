import { sv } from "../../lib/uiStrings";
import styles from "../../routes/PlayView.module.css";

export type EquipmentCombatTotals = {
  maxHp: number;
  attack: number;
  shield: number;
  bvb: number;
  itemCards: number;
};

export function EquipmentCombatTotalsRow(props: {
  totals: EquipmentCombatTotals;
  className?: string;
}) {
  const { totals, className } = props;
  return (
    <div
      className={[styles.equipmentCombatTotalsRow, className ?? ""].filter(Boolean).join(" ")}
      role="group"
      aria-label={`${sv.play.equipmentMaxHpAria(totals.maxHp)} · ${sv.play.equipmentAttackFromGearAria(totals.attack)} · ${sv.play.equipmentDefenseFromGearAria(totals.shield)} · ${sv.play.equipmentBvbFromGearAria(totals.bvb)} · ${sv.play.brewerItemCardBonusAria(totals.itemCards)}`}
    >
      <div
        className={styles.equipmentCombatTotalPill}
        aria-label={sv.play.equipmentMaxHpAria(totals.maxHp)}
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
        className={`${styles.equipmentCombatTotalPill}${totals.attack === 0 ? ` ${styles.equipmentCombatTotalPillMuted}` : ""}`}
        aria-label={sv.play.equipmentAttackFromGearAria(totals.attack)}
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
      </div>
      <div
        className={`${styles.equipmentCombatTotalPill}${totals.shield === 0 ? ` ${styles.equipmentCombatTotalPillMuted}` : totals.shield < 0 ? ` ${styles.equipmentCombatTotalPillNegative}` : ""}`}
        aria-label={sv.play.equipmentDefenseFromGearAria(totals.shield)}
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
        aria-label={sv.play.equipmentBvbFromGearAria(totals.bvb)}
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
        aria-label={sv.play.brewerItemCardBonusAria(totals.itemCards)}
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
