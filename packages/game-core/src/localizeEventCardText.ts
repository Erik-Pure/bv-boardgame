import { getCardDefById } from "./cards/db.js";
import { EQUIPMENT_CATALOG } from "./equipmentDefs.js";
import { getEquipmentDisplay, getEquipmentDisplayByEquippedName } from "./equipmentLocale.js";
import type { GameLocale } from "./locale.js";
import type { EquipmentSlot } from "./types.js";

const DEFAULT_EQUIPMENT_EFFECT_SV =
  "Utrustning aktiverar sina effekter automatiskt när den är utrustad.";
const DEFAULT_EQUIPMENT_EFFECT_EN =
  "Equipment automatically activates its effects when equipped.";
const EQUIPMENT_REPLACE_OFFER_SV =
  "Du har redan något utrustat på denna plats — välj efter att du stängt kortet om du vill byta ut.";
const EQUIPMENT_REPLACE_OFFER_EN =
  "You already have something equipped in this slot — choose after closing the card if you want to swap.";

export type LocalizeEventCardTextOptions = {
  grantedItemId?: string;
  equipmentReplaceOffer?: {
    slot: EquipmentSlot;
    catalogId?: string;
    newName: string;
  };
};

/** Parsar slaget från uppdaterad korttext efter tärningsval. */
export function parseRolledDieFromCardText(text: string): number | null {
  const m = /(?:Tärning|Die):\s*(\d+)/i.exec(text);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.min(6, Math.round(n)));
}

function dieMatchesRollOutcomeRange(range: string, die: number): boolean {
  const r = range.trim();
  if (r.endsWith("+")) {
    const min = Number(r.slice(0, -1));
    return Number.isFinite(min) && die >= min;
  }
  const parts = r.split(/[–-]/).map((s) => Number(s.trim()));
  if (parts.length === 2 && parts.every((n) => Number.isFinite(n))) {
    return die >= parts[0]! && die <= parts[1]!;
  }
  if (parts.length === 1 && Number.isFinite(parts[0])) {
    return die === parts[0];
  }
  return false;
}

function rollOutcomeTextForDie(cardId: string, die: number, locale: GameLocale): string | undefined {
  const def = getCardDefById(cardId, locale);
  const row = def?.rollOutcomes?.find((r) => dieMatchesRollOutcomeRange(r.range, die));
  return row?.text;
}

/** Cards not in cards.json but shown via engine (treasure_empty). */
const HARDCODED_CARD_LOCALE_EN: Record<string, { title: string; text: string }> = {
  treasure_empty: {
    title: "Empty stash",
    text: "Someone got there first. Nothing left.",
  },
};

function swapTreasureCacheSubstitutedIntro(text: string, locale: GameLocale): string {
  if (locale === "sv") return text;
  const m = /^Du hittar en gömma\.\s*\+(\d+)\s*pant\.?$/i.exec(text.trim());
  if (m) return `You find a stash. +${m[1]} cans.`;
  return text;
}

function swapBossRoundWinIntro(text: string, locale: GameLocale): string {
  if (locale === "sv") return text;
  const m =
    /^Slutbossen har (\d+) liv kvar\. Bekräfta för att gå vidare till nästa runda\.$/i.exec(text.trim());
  if (!m) return text;
  const lives = Number(m[1]);
  const lifeWord = lives === 1 ? "life" : "lives";
  return `The final boss has ${lives} ${lifeWord} left. Confirm to continue to the next round.`;
}

function swapCardIntro(text: string, cardId: string, locale: GameLocale): string {
  const hardcoded = HARDCODED_CARD_LOCALE_EN[cardId];
  if (hardcoded && locale === "en") {
    if (text === "Någon hann före. Det finns inget kvar.") return hardcoded.text;
    if (text.startsWith("Någon hann före")) return hardcoded.text;
  }
  if (cardId === "treasure_cache") {
    const substituted = swapTreasureCacheSubstitutedIntro(text, locale);
    if (substituted !== text) return substituted;
  }
  if (cardId === "boss_round_win") {
    const substituted = swapBossRoundWinIntro(text, locale);
    if (substituted !== text) return substituted;
  }
  const svDef = getCardDefById(cardId, "sv");
  const locDef = getCardDefById(cardId, locale);
  if (!svDef || !locDef) return text;
  if (text.startsWith(svDef.text)) {
    return locDef.text + text.slice(svDef.text.length);
  }
  if (text === svDef.text) return locDef.text;
  return text;
}

function localizeStatDeltaLines(text: string): string {
  return text
    .replace(/^Pant:\s*/gm, "Cans: ")
    .replace(/^Klunkar:\s*/gm, "Sips: ")
    .replace(/^Dina klunkar:\s*/gm, "Your sips: ")
    .replace(/^(.+?)\s+klunkar:\s*/gm, "$1 sips: ");
}

function replaceLocalizedBlock(text: string, svBlock: string, enBlock: string): string {
  const svTrim = svBlock.trim();
  const enTrim = enBlock.trim();
  if (text.trim() === svTrim) return enTrim;
  for (const prefix of ["\n\n", "\n", ""]) {
    const sv = `${prefix}${svBlock}`;
    const en = `${prefix}${enBlock}`;
    if (text.includes(sv)) return text.replace(sv, en);
  }
  return text;
}

function localizeGrantedItemBlocks(
  text: string,
  locale: GameLocale,
  options?: LocalizeEventCardTextOptions,
): string {
  if (options?.grantedItemId) {
    const svItem = getCardDefById(`item_${options.grantedItemId}`, "sv");
    const enItem = getCardDefById(`item_${options.grantedItemId}`, locale);
    if (svItem && enItem) {
      const svCore = `${svItem.title}\n${svItem.text.trim()}`;
      const enCore = `${enItem.title}\n${enItem.text.trim()}`;
      text = replaceLocalizedBlock(text, svCore, enCore);
    }
  }

  if (options?.equipmentReplaceOffer?.catalogId) {
    const catalogId = options.equipmentReplaceOffer.catalogId;
    const svDisplay = getEquipmentDisplay(catalogId, "sv");
    const enDisplay = getEquipmentDisplay(catalogId, locale);
    const o = options.equipmentReplaceOffer;
    const svEffect = svDisplay?.rulesText?.trim() || DEFAULT_EQUIPMENT_EFFECT_SV;
    const enEffect = enDisplay?.rulesText?.trim() || DEFAULT_EQUIPMENT_EFFECT_EN;
    const svCore = `${o.newName}\n${svEffect}\n\n${EQUIPMENT_REPLACE_OFFER_SV}`;
    const enCore = `${enDisplay?.name ?? o.newName}\n${enEffect}\n\n${EQUIPMENT_REPLACE_OFFER_EN}`;
    text = replaceLocalizedBlock(text, svCore, enCore);
  }

  for (const eq of EQUIPMENT_CATALOG) {
    const enDisplay = getEquipmentDisplay(eq.id, locale);
    const svEffect = eq.rulesText?.trim() || DEFAULT_EQUIPMENT_EFFECT_SV;
    const enEffect = enDisplay?.rulesText?.trim() || DEFAULT_EQUIPMENT_EFFECT_EN;
    const svCore = `${eq.name}\n${svEffect}`;
    const enCore = `${enDisplay?.name ?? eq.name}\n${enEffect}`;
    text = replaceLocalizedBlock(text, svCore, enCore);
  }

  return text
    .replaceAll(DEFAULT_EQUIPMENT_EFFECT_SV, DEFAULT_EQUIPMENT_EFFECT_EN)
    .replaceAll(EQUIPMENT_REPLACE_OFFER_SV, EQUIPMENT_REPLACE_OFFER_EN)
    .replace(/\n\nFöremål\n/g, "\n\nItem\n");
}

function localizeEventSuffix(
  text: string,
  cardId: string,
  locale: GameLocale,
  options?: LocalizeEventCardTextOptions,
): string {
  let out = text;

  out = out.replace(/\nTärning:\s*(\d+)\s*→\s*\+(\d+)\s*pant\./g, "\nDie: $1 → +$2 cans.");
  out = out.replace(/\nTärning:\s*(\d+)\./g, "\nDie: $1.");

  const die = parseRolledDieFromCardText(out);

  if (cardId === "event_fummel" && die != null && out.includes("\nInget tappades.")) {
    const outcome = rollOutcomeTextForDie(cardId, die, locale);
    out = out.replace(/\nInget tappades\./, `\n${outcome ?? "Nothing dropped."}`);
  } else {
    out = out.replace(/\nInget tappades\./g, "\nNothing dropped.");
  }

  out = out.replace(
    /\nDu tappade (.+?) \((weapon|armor|helmet|accessory)\)\./g,
    (_match, name: string, slot: string) => {
      const localized = name === "en utrustning" ? "a piece of equipment" : name;
      const display =
        name === "en utrustning"
          ? null
          : getEquipmentDisplayByEquippedName(name, locale);
      const shown = display?.name ?? localized;
      return `\nYou dropped ${shown} (${slot}).`;
    },
  );
  out = out.replace(/\nDu hade ingen utrustning att tappa\./g, "\nYou had no equipment to drop.");

  out = out.replace(
    /\n(.+?) var fattigast och fick (\d+) pant\./g,
    "\n$1 was poorest and received $2 cans.",
  );
  out = out.replace(/\nIngen pant överfördes\./g, "\nNo cans were transferred.");

  out = out.replace(/\nValt: /g, "\nChosen: ");

  out = localizeStatDeltaLines(out);
  out = localizeGrantedItemBlocks(out, locale, options);

  return out;
}

/** Localize event card title/text for display (intro + server-appended Swedish suffix). */
export function localizeEventCardPendingText(
  text: string,
  cardId: string,
  locale: GameLocale,
  options?: LocalizeEventCardTextOptions,
): string {
  if (locale === "sv") return text;
  const withIntro = swapCardIntro(text, cardId, locale);
  return localizeEventSuffix(withIntro, cardId, locale, options);
}

/** Localized card title when `cardId` is known. */
export function localizeEventCardTitle(cardId: string, locale: GameLocale, fallback: string): string {
  if (locale === "sv") return fallback;
  const hardcoded = HARDCODED_CARD_LOCALE_EN[cardId];
  if (hardcoded && (fallback === "Tom gömma" || cardId === "treasure_empty")) {
    return hardcoded.title;
  }
  return getCardDefById(cardId, locale)?.title ?? fallback;
}
