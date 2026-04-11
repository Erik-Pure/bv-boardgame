import type { CSSProperties } from "react";
import playerMarkerRaw from "../assets/player-marker.svg?raw";

/** viewBox from player-marker.svg */
export const PLAYER_MARKER_VIEWBOX = "0 0 134.116 119.386";
const [PLAYER_MARKER_VB_W, PLAYER_MARKER_VB_H] = [134.116, 119.386];

/** Token size on the table SVG (keeps viewBox aspect). */
export const PLAYER_MARKER_TOKEN_W = 52;
export const PLAYER_MARKER_TOKEN_H = Math.round(
  (PLAYER_MARKER_TOKEN_W * PLAYER_MARKER_VB_H) / PLAYER_MARKER_VB_W,
);

function prefixSvgIds(svgInner: string, prefix: string): string {
  const ids: string[] = [];
  const idRe = /\bid="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = idRe.exec(svgInner)) !== null) ids.push(m[1]!);
  const unique = [...new Set(ids)].sort((a, b) => b.length - a.length);
  let out = svgInner;
  for (const id of unique) {
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`url\\(#${esc}\\)`, "g"), `url(#${prefix}_${id})`);
    out = out.replace(new RegExp(`xlink:href="#${esc}"`, "g"), `xlink:href="#${prefix}_${id}"`);
  }
  for (const id of unique) {
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`\\bid="${esc}"`, "g"), `id="${prefix}_${id}"`);
  }
  return out;
}

const STRIPPED = playerMarkerRaw.replace(/^[\s\S]*?<svg[^>]*>/i, "").replace(/<\/svg>\s*$/i, "");

const innerCache = new Map<string, string>();

export function safePlayerMarkerIdPrefix(playerId: string): string {
  return `pm_${playerId.replace(/[^a-zA-Z0-9_]/g, "_")}`;
}

/** Inner markup (defs + graphics) with unique ids for embedding in the board SVG. */
export function playerMarkerSvgMarkupFor(playerId: string): string {
  const prefix = safePlayerMarkerIdPrefix(playerId);
  let hit = innerCache.get(prefix);
  if (!hit) {
    hit = prefixSvgIds(STRIPPED, prefix);
    innerCache.set(prefix, hit);
  }
  return hit;
}

/**
 * Theme vars for player-marker.svg (see src/assets/player-marker.svg).
 * Uses color-mix so rim / sheen / stroke track the player hue without hand-picking pairs.
 */
export function playerMarkerStyleVars(playerColor: string): CSSProperties {
  return {
    ["--pm-body"]: playerColor,
    ["--pm-rim"]: `color-mix(in srgb, ${playerColor} 68%, #0f172a)`,
    /** Lockets kant i radial z — mer spelarfärg, mindre vitt än tidigare */
    ["--pm-sheen"]: `color-mix(in srgb, ${playerColor} 78%, #ffffff)`,
    /** Mittspegeln på locket (radial z, offset 0) */
    ["--pm-face-center"]: `color-mix(in srgb, ${playerColor} 92%, #ffffff)`,
    /** Övre glansbåge (linear ab) — behåller höjd ljus men följer nyansen */
    ["--pm-dome-top-glint"]: `color-mix(in srgb, ${playerColor} 82%, #ffffff)`,
    ["--pm-glow"]: `color-mix(in srgb, ${playerColor} 28%, #e0f2fe)`,
    /** Kapsylkantens ljusa facetter (maskade trianglar): tonad mot spelarfärg, inte ren vitt */
    ["--pm-crimps-highlight"]: `color-mix(in srgb, ${playerColor} 50%, #ffffff)`,
  } as CSSProperties;
}
