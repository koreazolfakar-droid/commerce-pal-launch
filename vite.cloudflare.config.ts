// Parallel Cloudflare Workers staging build. The Lovable production Vite config remains untouched.
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vite";

const APP_VERSION = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);

export default defineConfig({
  plugins: [
    cloudflare({ configPath: "./wrangler.jsonc", viteEnvironment: { name: "ssr" } }),
    tanstackStart({
      router: { autoCodeSplitting: true },
      // Preserve the hardened production request wrapper rather than bypassing it.
      server: { entry: "server" },
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  // Preserve TanStack Start compiler boundaries from the known-good configuration.
  optimizeDeps: {
    exclude: [
      "@tanstack/react-start",
      "@tanstack/react-start/client",
      "@tanstack/react-start-client",
      "@tanstack/start-client-core",
    ],
    include: [
      "@tanstack/router-core",
      "@tanstack/router-core/isServer",
      "@tanstack/router-core/ssr/client",
      "seroval",
    ],
  },
});
