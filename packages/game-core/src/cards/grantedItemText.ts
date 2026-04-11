import { allCards, getCard } from "./db.js";
import type { EffectApplyOut } from "./types.js";

/** `artKey` för det kort som visar utdelat föremål (mobil / modal). */
export function artKeyForGrantedItem(out: EffectApplyOut, fallback?: string): string | undefined {
  const gid = out.grantedItemId;
  if (typeof gid !== "string") return fallback;
  try {
    return getCard(`item_${gid}`).artKey ?? fallback;
  } catch {
    return fallback;
  }
}

/** Text efter kortbrödtext när `randomItem` satt `grantedItemId` i applyEffects `out`. */
export function appendTextForGrantedItem(out: EffectApplyOut): string {
  const gid = out.grantedItemId;
  if (typeof gid !== "string") return "";
  try {
    return `\n\nDu fick: ${getCard(`item_${gid}`).title}.`;
  } catch {
    return `\n\nFöremål: ${gid}.`;
  }
}

/**
 * Härleder item-kortets `artKey` från korttexten (samma rad som {@link appendTextForGrantedItem} lägger till).
 * Används som fallback i klienten om `grantedItemId` saknas i state men texten finns kvar.
 */
export function artKeyFromDuFickAppend(text: string): string | undefined {
  const du = text.lastIndexOf("Du fick:");
  if (du >= 0) {
    const rest = text.slice(du + "Du fick:".length).trim();
    const dot = rest.indexOf(".");
    if (dot >= 0) {
      const title = rest.slice(0, dot).trim();
      for (const c of allCards()) {
        if (c.kind === "item" && c.title.trim() === title) return c.artKey;
      }
    }
  }
  const fe = text.lastIndexOf("Föremål:");
  if (fe >= 0) {
    const rest = text.slice(fe + "Föremål:".length).trim();
    const dot = rest.indexOf(".");
    if (dot >= 0) {
      const id = rest.slice(0, dot).trim();
      try {
        return getCard(`item_${id}`).artKey ?? undefined;
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}
