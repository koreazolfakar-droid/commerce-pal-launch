import { lazy, Suspense, useEffect, useState } from "react";
import Auth0DashboardSecurity from "@/dashboard/security/Auth0DashboardSecurity";
import { ThemeProvider } from "@/dashboard/contexts/ThemeContext";

const DASHBOARD_CHUNK_RELOAD_KEY = "space-call:dashboard-chunk-reload";

function isDashboardChunkLoadError(error: unknown) {
  const message =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error);

  return /failed to fetch dynamically imported module|importing a module script failed|chunkloaderror|loading chunk|error loading dynamically imported module/i.test(
    message,
  );
}

async function loadDashboardApp() {
  try {
    const module = await import("./App");

    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(DASHBOARD_CHUNK_RELOAD_KEY);
      } catch {
        // Session storage is optional; a successful import needs no recovery state.
      }
    }

    return module;
  } catch (error) {
    if (typeof window !== "undefined" && isDashboardChunkLoadError(error)) {
      let canUseReloadGuard = false;
      let alreadyReloaded = false;

      try {
        canUseReloadGuard = true;
        alreadyReloaded =
          window.sessionStorage.getItem(DASHBOARD_CHUNK_RELOAD_KEY) === "1";
      } catch {
        // Do not auto-reload without a guard because that could create a reload loop.
      }

      if (canUseReloadGuard && !alreadyReloaded) {
        try {
          window.sessionStorage.setItem(DASHBOARD_CHUNK_RELOAD_KEY, "1");
        } catch {
          // The guard was available above; if this write fails, fall through to the root boundary.
          throw error;
        }

        window.location.reload();

        // Keep Suspense pending while the browser navigates to the fresh document.
        return await new Promise<never>(() => undefined);
      }
    }

    throw error;
  }
}

const App = lazy(loadDashboardApp);

export default function AppMount() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="min-h-screen bg-background" />;
  return (
    <ThemeProvider defaultTheme="light" switchable>
      <Auth0DashboardSecurity>
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
          <App />
        </Suspense>
      </Auth0DashboardSecurity>
    </ThemeProvider>
  );
}
