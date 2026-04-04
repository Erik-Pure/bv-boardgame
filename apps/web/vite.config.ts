import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
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
    },
  },
});
