import { avatarPartSrc, tintAvatarHeadSvg } from "./randomAvatar";

const markupCache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

function cacheKey(headIndex: number, color: string): string {
  return `${headIndex}:${color}`;
}

export function loadTintedAvatarHeadMarkup(headIndex: number, color: string): Promise<string | null> {
  const key = cacheKey(headIndex, color);
  const cached = markupCache.get(key);
  if (cached) return Promise.resolve(cached);

  let pending = inflight.get(key);
  if (!pending) {
    const src = avatarPartSrc("head", headIndex);
    pending = fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`head ${headIndex}`);
        return res.text();
      })
      .then((raw) => {
        const markup = tintAvatarHeadSvg(raw, color);
        markupCache.set(key, markup);
        return markup;
      })
      .catch(() => null)
      .finally(() => {
        inflight.delete(key);
      });
    inflight.set(key, pending);
  }
  return pending;
}
