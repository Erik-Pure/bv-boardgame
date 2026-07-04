import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { absoluteUrl, getPageSeo, normalizePath, ogLocaleForGameLocale } from "./seo";
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
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", seo.title);
    upsertMeta("name", "twitter:description", seo.description);
    upsertMeta("name", "twitter:image", image);
    upsertLink("canonical", canonical);
  }, [pathname, locale, ui]);
}
