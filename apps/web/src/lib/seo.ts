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

const DEFAULT_OG_IMAGE = "/icons/bmm-logo.png";

export const PRODUCT_SITE_URL = "https://spela.bryggverket.se";

export const OG_IMAGE = {
  path: DEFAULT_OG_IMAGE,
  width: 779,
  height: 582,
} as const;

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
  return PRODUCT_SITE_URL;
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

export function buildStructuredData(
  pathname: string,
  ui: UiStrings,
  locale: GameLocale,
  origin = resolveSiteOrigin(),
): Record<string, unknown>[] | null {
  if (!isIndexablePath(pathname)) return null;

  const path = normalizePath(pathname);
  const seo = getPageSeo(path, ui);
  const siteUrl = origin || PRODUCT_SITE_URL;
  const pageUrl = absoluteUrl(path, siteUrl);
  const image = absoluteUrl(seo.image, siteUrl);
  const inLanguage = locale === "en" ? "en-US" : "sv-SE";

  const organization = {
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: "Bryggverket",
    url: "https://www.bryggverket.se/",
  };

  const webSite = {
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    url: `${siteUrl}/`,
    name: ui.home.title,
    description: ui.seo.homeDescription,
    inLanguage,
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  const graphs: Record<string, unknown>[] = [organization, webSite];

  if (seoPageKeyForPath(path) === "home") {
    graphs.push({
      "@type": "WebApplication",
      "@id": `${siteUrl}/#webapp`,
      name: ui.seo.homeTitle,
      url: `${siteUrl}/`,
      description: seo.description,
      applicationCategory: "GameApplication",
      operatingSystem: "Web",
      image,
      inLanguage,
      offers: { "@type": "Offer", price: "0", priceCurrency: "SEK" },
      publisher: { "@id": `${siteUrl}/#organization` },
      isPartOf: { "@id": `${siteUrl}/#website` },
    });
  } else {
    graphs.push({
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: seo.title,
      description: seo.description,
      inLanguage,
      isPartOf: { "@id": `${siteUrl}/#website` },
    });

    const breadcrumb = buildBreadcrumbStructuredData(path, ui, siteUrl);
    if (breadcrumb) graphs.push(breadcrumb);
  }

  return graphs;
}

function breadcrumbLabels(path: string, ui: UiStrings): { name: string; url: string }[] | null {
  const key = seoPageKeyForPath(path);
  if (key === "home") return null;

  const items: { name: string; url: string }[] = [
    { name: ui.seo.breadcrumbHome, url: "/" },
  ];

  if (key === "rules") {
    items.push({ name: ui.rules.title, url: "/rules" });
  } else if (key === "cards") {
    items.push({ name: ui.catalog.title, url: "/cards" });
  }

  return items;
}

export function buildBreadcrumbStructuredData(
  pathname: string,
  ui: UiStrings,
  origin = resolveSiteOrigin(),
): Record<string, unknown> | null {
  const path = normalizePath(pathname);
  const items = breadcrumbLabels(path, ui);
  if (!items) return null;

  const siteUrl = origin || PRODUCT_SITE_URL;
  const pageUrl = absoluteUrl(path, siteUrl);

  return {
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url, siteUrl),
    })),
  };
}
