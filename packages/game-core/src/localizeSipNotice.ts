import { getEquipmentDisplayByEquippedName } from "./equipmentLocale.js";
import { getCardTitleBySvTitle } from "./cards/db.js";
import { formatCanAmount } from "./canFormat.js";
import type { GameLocale } from "./locale.js";
import { getMonsterDisplayBySvName } from "./monsterLocale.js";

const SV_TITLE_PENALTY = "Straffklunk";
const EN_TITLE_PENALTY = "Penalty sip";

function localizeWeaponNameInSip(weaponName: string, locale: GameLocale): string {
  if (locale === "sv") return weaponName;
  const display = getEquipmentDisplayByEquippedName(weaponName, locale);
  return display?.name ?? weaponName;
}

function localizeDestroyedSubjectName(subject: string, locale: GameLocale): string {
  const trimmed = subject.trim();
  if (!trimmed || locale === "sv") return subject;
  const cardTitle = getCardTitleBySvTitle(trimmed, locale);
  if (cardTitle && cardTitle !== trimmed) return cardTitle;
  const equipment = getEquipmentDisplayByEquippedName(trimmed, locale);
  if (equipment?.name) {
    const svEquipment = getEquipmentDisplayByEquippedName(trimmed, "sv");
    if (svEquipment && equipment.name !== svEquipment.name) return equipment.name;
  }
  return subject;
}

/** Localize sip notice sender (monster name, card title, generic combat label; player names unchanged). */
export function localizeSipNoticeFromPlayerName(fromPlayerName: string, locale: GameLocale): string {
  if (locale === "sv") return fromPlayerName;
  const trimmed = fromPlayerName.trim();
  if (!trimmed) return fromPlayerName;

  const compound = /^(.+?) \((.+)\)$/.exec(trimmed);
  if (compound) {
    const playerPart = compound[1]!;
    const cardSvTitle = compound[2]!;
    const cardTitle = getCardTitleBySvTitle(cardSvTitle, locale);
    if (cardTitle) return `${playerPart} (${cardTitle})`;
  }

  const monster = getMonsterDisplayBySvName(trimmed, locale);
  if (monster?.name) return monster.name;

  const cardTitle = getCardTitleBySvTitle(trimmed, locale);
  if (cardTitle) return cardTitle;

  if (trimmed === "Dålig batch") return "Bad batch";
  if (trimmed === "Striden") return "the fight";
  return fromPlayerName;
}

export function localizeSipNoticeTitle(title: string | undefined, locale: GameLocale): string | undefined {
  if (!title?.trim() || locale === "sv") return title;
  const trimmed = title.trim();
  if (trimmed === SV_TITLE_PENALTY) return EN_TITLE_PENALTY;
  const cardTitle = getCardTitleBySvTitle(trimmed, locale);
  if (cardTitle && cardTitle !== trimmed) return cardTitle;
  if (/^du förlorade duellen$/i.test(trimmed)) return "You lost the duel";
  if (trimmed === "Peka argt") return "Point angrily";
  return title;
}

/** Localize custom sip notice body (weapon-boost penalty sip from combat). */
export function localizeSipNoticeBody(body: string | undefined, locale: GameLocale): string | undefined {
  if (!body?.trim() || locale === "sv") return body;
  const t = body.trim();
  const single = /^En straffklunk från (.+?)\.\s*\+(\d+) XP\.?$/i.exec(t);
  if (single) {
    const weapon = localizeWeaponNameInSip(single[1]!, locale);
    return `A penalty sip from ${weapon}. +${single[2]} XP.`;
  }
  const multi = /^(\d+) straffklunkar från (.+?)\.\s*\+(\d+) XP\.?$/i.exec(t);
  if (multi) {
    const count = Number(multi[1]);
    const weapon = localizeWeaponNameInSip(multi[2]!, locale);
    const xp = multi[3];
    const phrase = count === 1 ? "A penalty sip" : `${count} penalty sips`;
    return `${phrase} from ${weapon}. +${xp} XP.`;
  }

  const spillDestroyed = /^(.+?) förstörde (.+?) hos dig\.?$/i.exec(t);
  if (spillDestroyed) {
    const actor = spillDestroyed[1]!;
    const subject = localizeDestroyedSubjectName(spillDestroyed[2]!, locale);
    return `${actor} destroyed ${subject} on you.`;
  }

  const stoleEquipment = /^(.+?) stal (.+?) från dig\.?$/i.exec(t);
  if (stoleEquipment) {
    const actor = stoleEquipment[1]!;
    const subject = localizeDestroyedSubjectName(stoleEquipment[2]!, locale);
    return `${actor} stole ${subject} from you.`;
  }

  const tookEquipment = /^(.+?) har tagit din (.+?)\.?$/i.exec(t);
  if (tookEquipment) {
    const actor = tookEquipment[1]!;
    const subject = localizeDestroyedSubjectName(tookEquipment[2]!, locale);
    return `${actor} took your ${subject}.`;
  }

  const riggedGameTook = /^(.+?) tog (.+?) från dig med Riggat spel\.?$/i.exec(t);
  if (riggedGameTook) {
    const actor = riggedGameTook[1]!;
    const subject = localizeDestroyedSubjectName(riggedGameTook[2]!, locale);
    const itemName = getCardTitleBySvTitle("Riggat spel", locale) ?? "Rigged game";
    return `${actor} took ${subject} from you with ${itemName}.`;
  }

  const splitTheG = /^(.+?) tog (\d+) pant från dig med Split the G\.?$/i.exec(t);
  if (splitTheG) {
    return `${splitTheG[1]} took ${formatCanAmount(Number(splitTheG[2]))} from you with Split the G.`;
  }

  const sleepPotion = /^(.+?) spelade Sömnmedel på dig\. Du hoppar över din nästa tur\.?$/i.exec(t);
  if (sleepPotion) {
    return `${sleepPotion[1]} played Sleeping brew on you. You skip your next turn.`;
  }

  const duelGold = /^(.+?) tog (\d+) pant från dig efter duellen\.?$/i.exec(t);
  if (duelGold) {
    return `${duelGold[1]} took ${duelGold[2]} cans from you after the duel.`;
  }

  const duelEmptySlotGold = /^(.+?) valde en tom plats och tog (\d+) pant från dig i stället\.?$/i.exec(t);
  if (duelEmptySlotGold) {
    return `${duelEmptySlotGold[1]} chose an empty slot and took ${duelEmptySlotGold[2]} cans from you instead.`;
  }

  const duelTookGearAfter = /^(.+?) tog din (.+?) efter duellen\.?$/i.exec(t);
  if (duelTookGearAfter) {
    const actor = duelTookGearAfter[1]!;
    const subject = localizeDestroyedSubjectName(duelTookGearAfter[2]!, locale);
    return `${actor} took your ${subject} after the duel.`;
  }

  const duelTookGear = /^(.+?) tog din (.+?)\.?$/i.exec(t);
  if (duelTookGear) {
    const actor = duelTookGear[1]!;
    const subject = localizeDestroyedSubjectName(duelTookGear[2]!, locale);
    return `${actor} took your ${subject}.`;
  }

  const duelDamage = /^(.+?) gav dig (\d+) skada efter duellen \(HP (\d+) → (\d+)\)\.?$/i.exec(t);
  if (duelDamage) {
    return `${duelDamage[1]} dealt ${duelDamage[2]} damage to you after the duel (HP ${duelDamage[3]} → ${duelDamage[4]}).`;
  }

  const pekaArgt = /^(.+?) pekade argt på dig\. Du tar 1 skada\.?$/i.exec(t);
  if (pekaArgt) {
    return `${pekaArgt[1]} pointed angrily at you. You take 1 damage.`;
  }

  return body;
}
