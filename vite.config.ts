import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import inertia from "@inertiajs/vite";

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [
    // Absolute URLs like /sl.png point to static/, served by the Go server
    vue({ template: { transformAssetUrls: { includeAbsolute: false } } }),
    inertia({ ssr: "frontend/app.ts" }),
  ],
  // The Go server serves static/ itself, and proxies to Vite in development
  publicDir: false,
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: isSsrBuild ? "dist/ssr" : "dist/client",
    manifest: !isSsrBuild,
    rolldownOptions: { input: "frontend/app.ts" },
  },
}));
