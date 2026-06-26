import { formatCanAmount } from "./canFormat.js";
import { getEquipmentDisplayByEquippedName } from "./equipmentLocale.js";
import type { GameLocale } from "./locale.js";
import { getMonsterDisplayBySvName } from "./monsterLocale.js";

function localizeEnemyName(name: string, locale: GameLocale): string {
  if (locale === "sv") return name;
  return getMonsterDisplayBySvName(name, locale)?.name ?? name;
}

function localizeWeaponName(name: string, locale: GameLocale): string {
  if (locale === "sv") return name;
  return getEquipmentDisplayByEquippedName(name, locale)?.name ?? name;
}

function localizeWeaponOrDefault(name: string | undefined, fallbackSv: string, fallbackEn: string, locale: GameLocale): string {
  if (name?.trim()) return localizeWeaponName(name, locale);
  return locale === "en" ? fallbackEn : fallbackSv;
}

function localizeEquipmentPieceLabel(pieceName: string, slot: string, locale: GameLocale): string {
  const trimmed = pieceName.trim();
  if (locale === "sv") return trimmed || slot;
  if (!trimmed || trimmed === slot) return slot;
  return localizeWeaponName(trimmed, locale);
}

/** Localize Swedish game-log lines that become board toasts (sip / pvp / vaska). */
export function localizeTableToastLog(message: string, locale: GameLocale): string {
  if (locale === "sv") return message;
  const t = message.trim();
  if (!t) return message;

  let m = /^(.+?) ger (.+?) en straffklunk \(\+1 klunk\)\.?$/i.exec(t);
  if (m) return `${m[1]} gives ${m[2]} a penalty sip (+1 sip).`;

  m = /^(.+?) får straffklunk \((.+?) vann mot (.+?)\)\.?$/i.exec(t);
  if (m) {
    const enemy = localizeEnemyName(m[3]!, locale);
    return `${m[1]} gets a penalty sip (${m[2]} won against ${enemy}).`;
  }

  m = /^(.+?)s (.+?) mildrar straffklunken vid förlust \(−(\d+)\)\.?$/i.exec(t);
  if (m) {
    const weapon = localizeWeaponName(m[2]!, locale);
    return `${m[1]}'s ${weapon} reduces penalty sips on loss (−${m[3]}).`;
  }

  m = /^(.+?) dricker en klunk för att mildra träffen från (.+?)\.?$/i.exec(t);
  if (m) {
    const enemy = localizeEnemyName(m[2]!, locale);
    return `${m[1]} drinks a sip to mitigate the hit from ${enemy}.`;
  }

  m = /^(.+?) spelar Split the G och tar (\d+) pant från (.+?)\.?$/i.exec(t);
  if (m) {
    return `${m[1]} plays Split the G and takes ${formatCanAmount(Number(m[2]))} from ${m[3]}.`;
  }

  m =
    /^(.+?) spelar Riggat spel och tar (.+?) \((.+?)\) från (.+?) \(−(\d+) pant\)\.?$/i.exec(t);
  if (m) {
    const piece = localizeEquipmentPieceLabel(m[2]!, m[3]!, locale);
    return `${m[1]} plays Rigged game and takes ${piece} (${m[3]}) from ${m[4]} (−${formatCanAmount(Number(m[5]))}).`;
  }

  m =
    /^(.+?) spelar Riggat spel och rycker (.+?) \((.+?)\) från (.+?) — välj om du tar emot den \(du har redan något där, −(\d+) pant\)\.?$/i.exec(
      t,
    );
  if (m) {
    const piece = localizeEquipmentPieceLabel(m[2]!, m[3]!, locale);
    return `${m[1]} plays Rigged game and snatches ${piece} (${m[3]}) from ${m[4]} — choose whether to take it (you already have something there, −${formatCanAmount(Number(m[5]))}).`;
  }

  m = /^(.+?) tar (\d+) pant från (.+?)\.?$/i.exec(t);
  if (m && !/\bspelar\b/i.test(m[1]!)) {
    return `${m[1]} takes ${formatCanAmount(Number(m[2]))} from ${m[3]}.`;
  }

  m = /^(.+?) ger (.+?) 2 skada i PvP \(HP (\d+) → (\d+)\)\.?$/i.exec(t);
  if (m) return `${m[1]} deals 2 damage to ${m[2]} in PvP (HP ${m[3]} → ${m[4]}).`;

  m = /^(.+?) tar (.+?) från (.+?)\.?$/i.exec(t);
  if (m && !/skada/i.test(t) && !/\bspelar\b/i.test(m[1]!)) {
    return `${m[1]} takes ${localizeWeaponName(m[2]!, locale)} from ${m[3]}.`;
  }

  m = /^(.+?) hittade inget i den platsen — tar (\d+) pant i stället\.?$/i.exec(t);
  if (m) return `${m[1]} found nothing there — takes ${formatCanAmount(Number(m[2]))} instead.`;

  m = /^(.+?) får \+(\d+) pant från Canman\.?$/i.exec(t);
  if (m) return `${m[1]} gains +${formatCanAmount(Number(m[2]))} from Canman.`;

  m = /^(.+?) får \+(\d+) pant från (.+?) efter vinsten\.?$/i.exec(t);
  if (m) {
    const weapon = localizeWeaponOrDefault(m[3], "vapnet", "the weapon", locale);
    return `${m[1]} gains +${formatCanAmount(Number(m[2]))} from ${weapon} after the win.`;
  }

  m = /^(.+?) ger (\d+) pant till (.+?) \(minst pant\) efter buskarnas förluststraff\.?$/i.exec(t);
  if (m) return `${m[1]} gives ${formatCanAmount(Number(m[2]))} to ${m[3]} (lowest cans) after the bush loss penalty.`;

  m = /^(.+?) tappar 1 pant från Burksvärdets stridskostnad\.?$/i.exec(t);
  if (m) return `${m[1]} loses 1 can from the Can Knight's combat cost.`;

  m = /^(.+?) tappar (\d+) pant efter förlusten mot (.+?)\.?$/i.exec(t);
  if (m) {
    const enemy = localizeEnemyName(m[3]!, locale);
    return `${m[1]} loses ${formatCanAmount(Number(m[2]))} after losing to ${enemy}.`;
  }

  m = /^(.+?) spelar Vaska och skippar den dåliga batchen\.?$/i.exec(t);
  if (m) return `${m[1]} plays Sink It and skips the bad batch.`;

  m = /^(.+?) plays Sink It and skips the bad batch\.?$/i.exec(t);
  if (m) return t;

  m = /^(.+?) mutar sig ur batchmötet \((.+?)\) och betalar (\d+) pant\.?$/i.exec(t);
  if (m) {
    const enemy = localizeEnemyName(m[2]!, locale);
    return `${m[1]} bribed out of the batch encounter (${enemy}) and paid ${formatCanAmount(Number(m[3]))}.`;
  }

  m = /^(.+?) betalar (\d+) pant för att mildra träffen från (.+?)\.?$/i.exec(t);
  if (m) {
    const enemy = localizeEnemyName(m[3]!, locale);
    return `${m[1]} pays ${formatCanAmount(Number(m[2]))} to mitigate the hit from ${enemy}.`;
  }

  m = /^(.+?) betalar (\d+) pant och undviker skadan från (.+?)\.?$/i.exec(t);
  if (m) {
    const enemy = localizeEnemyName(m[3]!, locale);
    return `${m[1]} pays ${formatCanAmount(Number(m[2]))} and avoids damage from ${enemy}.`;
  }

  return message;
}
