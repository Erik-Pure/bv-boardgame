import type { GameLocale } from "@bv/game-core";
import type { UiStrings } from "./uiStrings";

export const INDEXABLE_PATHS = ["/", "/rules", "/cards"] as const;

export type SeoPageKey = "home" | "rules" | "cards" | "private";

export type PageSeo = {
  title: string;
  description: string;
  robots: "index, follow" | "noindex, nofollow";
  image: string;
};

const DEFAULT_OG_IMAGE = "/icons/bmm-explainer.png";

export function seoPageKeyForPath(pathname: string): SeoPageKey {
  const path = normalizePath(pathname);
  if (path === "/") return "home";
  if (path === "/rules") return "rules";
  if (path === "/cards") return "cards";
  return "private";
}

export function isIndexablePath(pathname: string): boolean {
  return seoPageKeyForPath(pathname) !== "private";
}

export function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function resolveSiteOrigin(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL as string | undefined;
  if (fromEnv?.trim()) return fromEnv.trim().replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function absoluteUrl(pathname: string, origin = resolveSiteOrigin()): string {
  const path = normalizePath(pathname);
  if (!origin) return path;
  return `${origin}${path === "/" ? "/" : path}`;
}

export function getPageSeo(pathname: string, ui: UiStrings): PageSeo {
  const key = seoPageKeyForPath(pathname);
  const seo = ui.seo;

  if (key === "home") {
    return {
      title: seo.homeTitle,
      description: seo.homeDescription,
      robots: "index, follow",
      image: DEFAULT_OG_IMAGE,
    };
  }
  if (key === "rules") {
    return {
      title: seo.rulesTitle,
      description: seo.rulesDescription,
      robots: "index, follow",
      image: DEFAULT_OG_IMAGE,
    };
  }
  if (key === "cards") {
    return {
      title: seo.cardsTitle,
      description: seo.cardsDescription,
      robots: "index, follow",
      image: DEFAULT_OG_IMAGE,
    };
  }

  return {
    title: seo.privateTitle,
    description: seo.privateDescription,
    robots: "noindex, nofollow",
    image: DEFAULT_OG_IMAGE,
  };
}

export function ogLocaleForGameLocale(locale: GameLocale): string {
  return locale === "en" ? "en_US" : "sv_SE";
}
