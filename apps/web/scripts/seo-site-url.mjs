/** Public production URL (custom domain on Vercel). */
export const DEFAULT_SITE_URL = "https://spela.bryggverket.se";

export function resolveSiteUrl() {
  const fromEnv = process.env.VITE_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  // Production builds on Vercel set VERCEL_URL to a *.vercel.app host that may be
  // SSO-protected, which breaks og:image for Facebook/Messenger crawlers.
  if (process.env.VERCEL_ENV === "production") {
    return DEFAULT_SITE_URL;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, "")}`;
  return DEFAULT_SITE_URL;
}
