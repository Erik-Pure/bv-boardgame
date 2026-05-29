import type { PictureSources } from "../components/PictureImg";

/** AVIF/WebP-varianter bredvid en PNG under `public/` (t.ex. `/icons/foo.png`). */
export function publicRasterSources(pngPath: string): PictureSources {
  if (!pngPath.endsWith(".png")) return { fallback: pngPath };
  const base = pngPath.slice(0, -".png".length);
  return {
    avif: `${base}.avif`,
    webp: `${base}.webp`,
    fallback: pngPath,
  };
}
