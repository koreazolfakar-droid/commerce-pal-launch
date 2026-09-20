// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

function buildVersion() {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const min = String(now.getUTCMinutes()).padStart(2, "0");
  const sec = String(now.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}.${hh}${min}${sec}`;
}

const APP_VERSION = buildVersion();

export default defineConfig({
  vite: {
    define: {
      __APP_VERSION__: JSON.stringify(APP_VERSION),
    },
    // Pre-bundle the Start client graph at startup. Without this, Vite can
    // discover these modules after the first document request, force a reload,
    // and abort the browser's in-flight dynamic entry import.
    optimizeDeps: {
      include: [
        "@tanstack/react-start/client",
        "@tanstack/router-core",
        "@tanstack/router-core/isServer",
        "@tanstack/router-core/ssr/client",
        "seroval",
      ],
    },
  },
  tanstackStart: {
    // Let TanStack split route UI into on-demand chunks instead of shipping every
    // page component with the first storefront visit. The Lovable wrapper already
    // owns the Start/Router plugins, so configure its existing plugin rather than
    // registering a duplicate @tanstack/router-plugin instance.
    router: {
      autoCodeSplitting: true,
    },
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
