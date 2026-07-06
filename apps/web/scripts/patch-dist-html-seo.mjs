import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSiteUrl } from "./seo-site-url.mjs";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const siteUrl = resolveSiteUrl();
const indexPath = join(webRoot, "dist", "index.html");
let html = readFileSync(indexPath, "utf8");

html = html.replace(
  "</head>",
  [
    `    <link rel="canonical" href="${siteUrl}/" />`,
    `    <meta property="og:url" content="${siteUrl}/" />`,
    "  </head>",
  ].join("\n"),
);
html = html.replaceAll('content="/icons/bmm-logo.png"', `content="${siteUrl}/icons/bmm-logo.png"`);

writeFileSync(indexPath, html, "utf8");
console.log(`Patched dist/index.html SEO URLs for ${siteUrl}`);
