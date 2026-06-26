import type { ImgHTMLAttributes } from "react";
import { useLocale } from "../lib/locale/LocaleContext";
import { brandLogoSources, type BrandLogoVariant } from "../lib/brandLogo";
import { PictureImg } from "./PictureImg";

export function BrandLogoImg(
  props: {
    variant: BrandLogoVariant;
    alt: string;
  } & Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt">,
) {
  const locale = useLocale();
  const { variant, alt, ...imgProps } = props;
  return <PictureImg sources={brandLogoSources(variant, locale)} alt={alt} {...imgProps} />;
}
