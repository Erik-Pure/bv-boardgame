import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSiteUrl } from "./seo-site-url.mjs";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(webRoot, "public");

const INDEXABLE_PATHS = ["/", "/rules", "/cards"];
const PRIVATE_PATHS = ["/play", "/table", "/join", "/host-lobby", "/login"];

const siteUrl = resolveSiteUrl();

const robotsLines = [
  "User-agent: *",
  ...PRIVATE_PATHS.map((path) => `Disallow: ${path}`),
  "Allow: /",
];

if (siteUrl) {
  robotsLines.push("", `Sitemap: ${siteUrl}/sitemap.xml`);
}

writeFileSync(join(publicDir, "robots.txt"), `${robotsLines.join("\n")}\n`, "utf8");

if (siteUrl) {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = INDEXABLE_PATHS.map((path) => {
    const loc = path === "/" ? `${siteUrl}/` : `${siteUrl}${path}`;
    return [
      "  <url>",
      `    <loc>${loc}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      "    <changefreq>weekly</changefreq>",
      "  </url>",
    ].join("\n");
  }).join("\n");

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
    "",
  ].join("\n");

  writeFileSync(join(publicDir, "sitemap.xml"), sitemap, "utf8");
  console.log(`Generated sitemap.xml for ${siteUrl}`);
} else {
  console.log("Skipped sitemap.xml (set VITE_SITE_URL or deploy on Vercel to generate).");
}

console.log("Generated robots.txt");
