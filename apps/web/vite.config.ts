import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const webRoot = dirname(fileURLToPath(import.meta.url));
const webPkg = JSON.parse(readFileSync(join(webRoot, "package.json"), "utf8")) as { version: string };

function resolveBuildId(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA;
  if (sha && sha.length >= 7) return sha.slice(0, 7);
  return process.env.NODE_ENV === "production" ? "" : "dev";
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(webPkg.version),
    __APP_BUILD_ID__: JSON.stringify(resolveBuildId()),
  },
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    /** Alla gränssnitt — mobil på samma Wi‑Fi når http://<datorns-IP>:5173 */
    host: "0.0.0.0",
    /**
     * WebSocket → spelserver på 3001 via samma port som Vite.
     * Då slipper mobilen nå port 3001 direkt (macOS-brandvägg blockerar ofta 3001).
     */
    proxy: {
      "/bv-ws": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/bv-ws\/?/, "/") || "/",
      },
      "/auth": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
      "/admin": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },
});
