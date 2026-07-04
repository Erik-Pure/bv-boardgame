/** Public production URL (custom domain on Vercel). */
export const DEFAULT_SITE_URL = "https://spela.bryggverket.se";

export function resolveSiteUrl() {
  const fromEnv = process.env.VITE_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, "")}`;
  return DEFAULT_SITE_URL;
}
