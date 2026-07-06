import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  absoluteUrl,
  buildStructuredData,
  getPageSeo,
  normalizePath,
  OG_IMAGE,
  ogLocaleForGameLocale,
} from "./seo";
import { useLocale, useUiStrings } from "./locale/LocaleContext";

function upsertMeta(attr: "name" | "property", key: string, content: string): void {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string): void {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function upsertJsonLd(graphs: Record<string, unknown>[] | null): void {
  document.querySelectorAll('script[data-seo-jsonld="page"]').forEach((node) => node.remove());
  if (!graphs?.length) return;

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.dataset.seoJsonld = "page";
  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": graphs,
  });
  document.head.appendChild(script);
}

export function usePageSeo(): void {
  const { pathname } = useLocation();
  const locale = useLocale();
  const ui = useUiStrings();

  useEffect(() => {
    const path = normalizePath(pathname);
    const seo = getPageSeo(path, ui);
    const canonical = absoluteUrl(path);
    const image = absoluteUrl(seo.image);

    document.title = seo.title;
    upsertMeta("name", "description", seo.description);
    upsertMeta("name", "robots", seo.robots);
    upsertMeta("property", "og:title", seo.title);
    upsertMeta("property", "og:description", seo.description);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:locale", ogLocaleForGameLocale(locale));
    upsertMeta("property", "og:image", image);
    upsertMeta("property", "og:image:width", String(OG_IMAGE.width));
    upsertMeta("property", "og:image:height", String(OG_IMAGE.height));
    upsertMeta("property", "og:image:alt", seo.robots === "index, follow" ? ui.seo.ogImageAlt : seo.title);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", seo.title);
    upsertMeta("name", "twitter:description", seo.description);
    upsertMeta("name", "twitter:image", image);
    upsertMeta("name", "twitter:image:alt", seo.robots === "index, follow" ? ui.seo.ogImageAlt : seo.title);
    upsertLink("canonical", canonical);
    upsertJsonLd(buildStructuredData(path, ui, locale));
  }, [pathname, locale, ui]);
}
