import type { GameLocale } from "@bv/game-core";
import type { PictureSources } from "../components/PictureImg";
import { publicRasterSources } from "./publicRasterSources";

export type BrandLogoVariant = "stacked" | "horizontal";

/** PNG path for brand logo (`stacked` = home/join, `horizontal` = header/lobby). */
export function brandLogoPngPath(variant: BrandLogoVariant, locale: GameLocale): string {
  if (locale === "en") {
    return variant === "horizontal"
      ? "/icons/bmm-logo-horisontal-en.png"
      : "/icons/bmm-logo-en.png";
  }
  return variant === "horizontal" ? "/icons/bmm-logo-horisontal.png" : "/icons/bmm-logo.png";
}

export function brandLogoSources(variant: BrandLogoVariant, locale: GameLocale): PictureSources {
  return publicRasterSources(brandLogoPngPath(variant, locale));
}
