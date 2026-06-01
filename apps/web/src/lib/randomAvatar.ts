/** Same palette as `PLAYER_COLORS` in game-core engine. */
export const AVATAR_PLAYER_COLORS = [
  "#c41e3a",
  "#2563eb",
  "#16a34a",
  "#ca8a04",
  "#9333ea",
  "#db2777",
] as const;

/** Highest index in public/avatar/{head,eyes,mouth}NN.svg (update when adding variants). */
export const AVATAR_PART_COUNT = 12;

export type AvatarPartKind = "head" | "eyes" | "mouth";

export type AvatarParts = Record<AvatarPartKind, number>;

export function avatarPartSrc(kind: AvatarPartKind, index: number): string {
  const n = String(index).padStart(2, "0");
  return `/avatar/${kind}${n}.svg`;
}

export function randomAvatarParts(): AvatarParts {
  const pick = () => 1 + Math.floor(Math.random() * AVATAR_PART_COUNT);
  return {
    head: pick(),
    eyes: pick(),
    mouth: pick(),
  };
}

const AVATAR_HEAD_SHADOW_GROUP_RE =
  /<g\s[^>]*\bopacity\s*=["'][^"']*["'][^>]*>[\s\S]*?<\/g>/gi;

function replaceHeadBodyFill(fragment: string, fillColor: string): string {
  return fragment.replace(/fill="#fff(?:fff)?"/gi, `fill="${fillColor}"`);
}

/**
 * Player color on the main head fill only — skips `<g opacity="…">` shadow/highlight layers.
 */
export function tintAvatarHeadSvg(raw: string, fillColor: string): string {
  const safe = fillColor.replace(/"/g, "'");
  const out: string[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  AVATAR_HEAD_SHADOW_GROUP_RE.lastIndex = 0;
  while ((match = AVATAR_HEAD_SHADOW_GROUP_RE.exec(raw)) !== null) {
    out.push(replaceHeadBodyFill(raw.slice(last, match.index), safe));
    out.push(match[0]);
    last = match.index + match[0].length;
  }
  out.push(replaceHeadBodyFill(raw.slice(last), safe));
  return out.join("");
}
