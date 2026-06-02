export const AVATAR_PART_COUNT = 12;

export type AvatarPartKind = "head" | "eyes" | "mouth";

export type PlayerAvatar = Record<AvatarPartKind, number>;

export function randomPlayerAvatar(rng: () => number = Math.random): PlayerAvatar {
  const pick = () => 1 + Math.floor(rng() * AVATAR_PART_COUNT);
  return {
    head: pick(),
    eyes: pick(),
    mouth: pick(),
  };
}

export function isValidPlayerAvatar(value: unknown): value is PlayerAvatar {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  for (const key of ["head", "eyes", "mouth"] as const) {
    const n = o[key];
    if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > AVATAR_PART_COUNT) {
      return false;
    }
  }
  return true;
}

export function normalizePlayerAvatar(avatar: PlayerAvatar): PlayerAvatar {
  return {
    head: clampAvatarPart(avatar.head),
    eyes: clampAvatarPart(avatar.eyes),
    mouth: clampAvatarPart(avatar.mouth),
  };
}

function clampAvatarPart(n: number): number {
  const i = Math.floor(n);
  if (i < 1) return 1;
  if (i > AVATAR_PART_COUNT) return AVATAR_PART_COUNT;
  return i;
}
