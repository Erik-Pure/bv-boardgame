import {
  localizeEventCardPendingText,
  localizeEventCardTitle,
  localizeFinalBossDisplayName,
  localizeFinalBossRoundLabel,
  localizeMonsterCombatCardText,
  localizeMonsterCombatCardTitle,
  localizeMonsterCombatChoiceLabel,
  monsterIdFromCardId,
  type GameLocale,
  type Pending,
} from "@bv/game-core";

type PendingCard = Extract<Pending, { type: "card" }>;

/** Resolve card title/text/choices from catalog when `cardId` is known (runtime locale). */
export function localizePendingCard<T extends PendingCard>(pending: T, locale: GameLocale): T {
  if (locale === "sv") return pending;
  const monsterId = monsterIdFromCardId(pending.cardId);
  const text = monsterId
    ? localizeMonsterCombatCardText(pending.cardId, pending.text, locale)
    : localizeEventCardPendingText(pending.text, pending.cardId, locale, {
        grantedItemId: pending.grantedItemId,
        equipmentReplaceOffer: pending.equipmentReplaceOffer,
      });
  const title = monsterId
    ? localizeMonsterCombatCardTitle(pending.cardId, pending.title, locale)
    : localizeEventCardTitle(pending.cardId, locale, pending.title);
  const choices = pending.choices?.map((choice) => ({
    ...choice,
    label: localizeMonsterCombatChoiceLabel(pending.cardId, choice.id, choice.label, locale),
  }));
  const bossFinalWin =
    pending.cardId === "boss_final_win" && pending.bossFinalWin
      ? {
          ...pending.bossFinalWin,
          bossName: localizeFinalBossDisplayName(pending.bossFinalWin.bossName, locale),
          roundLabel: localizeFinalBossRoundLabel(pending.bossFinalWin.roundLabel, locale),
        }
      : pending.bossFinalWin;
  return {
    ...pending,
    title,
    text,
    ...(bossFinalWin ? { bossFinalWin } : {}),
    ...(choices ? { choices } : {}),
  };
}
