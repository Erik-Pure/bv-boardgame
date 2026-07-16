import type { ReactNode } from "react";
import { combatItemAttackModForBoardLevel } from "@bv/game-core";
import { TutorialInlineIcon } from "./TutorialInlineIcon";
import { CONTRACT_ICON_PANT_COLOR } from "../../lib/playInteractionHelpers";
import { formatSigned } from "../../lib/inventoryEffectBadges";
import styles from "../../routes/PlayView.module.css";

const ATTACK_ICON_COLOR = "#f8fafc";

/** Extra UI utöver attack-mod (pantkostnad / risktext). */
const COMBAT_ITEM_BUTTON_EXTRAS: Record<string, { pantCost?: number; risk?: boolean }> = {
  manopositiv: { pantCost: 10 },
  get_lucky: { risk: true },
};

function AttackIcon() {
  return (
    <TutorialInlineIcon src="/icons/combat-icon.svg" color={ATTACK_ICON_COLOR} gap="0 1px 0 0" />
  );
}

function PantIcon() {
  return (
    <TutorialInlineIcon src="/icons/pant-icon.svg" color={CONTRACT_ICON_PANT_COLOR} gap="0 1px 0 0" />
  );
}

/** Suffix efter föremålsnamn på stridsknappar — styrka/pant som ikoner (inkl. föremålsbonus + brädnivå). */
export function CombatItemButtonSuffix(props: {
  itemId: string;
  boardLevelIndex: number;
  itemCardBonus?: number;
  /** Lokaliserad text för t.ex. ölkompis (ingen siffra). */
  beerBroText?: string;
}): ReactNode {
  const id = String(props.itemId);
  if (id === "beer_bro" && props.beerBroText) {
    return props.beerBroText;
  }

  const attack = combatItemAttackModForBoardLevel(
    id,
    props.boardLevelIndex,
    props.itemCardBonus,
  );
  if (attack == null) return null;

  const extras = COMBAT_ITEM_BUTTON_EXTRAS[id];

  return (
    <span className={styles.contractOutcomeSuffix}>
      {" ("}
      {formatSigned(attack)}
      <AttackIcon />
      {extras?.pantCost != null ? (
        <>
          {", −"}
          {extras.pantCost}
          <PantIcon />
        </>
      ) : null}
      {extras?.risk ? ", risk" : null}
      {")"}
    </span>
  );
}
