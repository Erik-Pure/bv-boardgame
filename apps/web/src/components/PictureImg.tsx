import { useCallback, useState, type ImgHTMLAttributes, type ReactNode } from "react";

export type PictureSources = {
  avif?: string | null;
  webp?: string | null;
  /** Fallback till något som alltid funkar (t.ex. .png eller .webp). */
  fallback: string;
};

export function PictureImg(
  props: {
    sources: PictureSources;
    childrenAfterImg?: ReactNode;
  } & Omit<ImgHTMLAttributes<HTMLImageElement>, "src">,
) {
  const { sources, childrenAfterImg, ...imgProps } = props;
  const [disableSources, setDisableSources] = useState(false);

  // <img src> ska alltid vara den säkra fallbacken (oftast png).
  // Browsern väljer ändå <source> (avif/webp) när den fungerar.
  const imgSrc = sources.fallback;

  const onError = useCallback<NonNullable<ImgHTMLAttributes<HTMLImageElement>["onError"]>>(
    (e) => {
      // I vissa browsers kan <picture><source type="image/avif/webp"> göra att fallback aldrig slår in på ett
      // förväntat sätt när den valda källan saknas/är trasig. Då stänger vi av sources och tvingar fallback.
      if (!disableSources) setDisableSources(true);
      imgProps.onError?.(e);
    },
    [disableSources, imgProps],
  );
  return (
    <picture style={{ display: "block", width: "100%", height: "100%" }}>
      {!disableSources && sources.avif ? <source srcSet={sources.avif} type="image/avif" /> : null}
      {!disableSources && sources.webp ? <source srcSet={sources.webp} type="image/webp" /> : null}
      <img {...imgProps} src={imgSrc} onError={onError} />
      {childrenAfterImg}
    </picture>
  );
}

