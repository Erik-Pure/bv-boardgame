import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSiteUrl } from "./seo-site-url.mjs";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const siteUrl = resolveSiteUrl();
if (!siteUrl) {
  console.log("Skipped dist/index.html SEO patch (set VITE_SITE_URL or deploy on Vercel).");
  process.exit(0);
}

const indexPath = join(webRoot, "dist", "index.html");
let html = readFileSync(indexPath, "utf8");

html = html.replace(
  "</head>",
  `    <link rel="canonical" href="${siteUrl}/" />\n  </head>`,
);
html = html.replaceAll('content="/icons/bmm-explainer.png"', `content="${siteUrl}/icons/bmm-explainer.png"`);

writeFileSync(indexPath, html, "utf8");
console.log(`Patched dist/index.html SEO URLs for ${siteUrl}`);
