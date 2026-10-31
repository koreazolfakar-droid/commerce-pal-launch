import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import { fileURLToPath } from "node:url";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vite";

const APP_VERSION = new Date()
  .toISOString()
  .replace(/[-:TZ.]/g, "")
  .slice(0, 14);

// Standalone framework configuration. Production Workers use vite.cloudflare.config.ts.
export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
      // Start enables automatic route splitting; its schema deliberately omits that option.
      server: { entry: "server" },
    }),
    // Lovable deploys `dist/`, so the build must write its server bundle and
    // static assets there (dist/server + dist/client) instead of Nitro's
    // default `.output/` directory.
    ...(command === "build"
      ? [
          nitro({
            preset: "cloudflare-module",
            output: {
              dir: "dist",
              serverDir: "dist/server",
              publicDir: "dist/client",
            },
            cloudflare: { nodeCompat: true, deployConfig: true },
          }),
        ]
      : []),
    react(),
  ],
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  css: { transformer: "lightningcss" },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  server: { host: "::", port: 8080, allowedHosts: ["terminal.local"] },
  optimizeDeps: {
    exclude: [
      "@tanstack/react-start",
      "@tanstack/react-start/client",
      "@tanstack/react-start-client",
      "@tanstack/start-client-core",
    ],
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/router-core",
      "@tanstack/router-core/isServer",
      "@tanstack/router-core/ssr/client",
      "seroval",
    ],
  },
}));
