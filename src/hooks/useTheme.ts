import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import {
  getRenderedTheme,
  getResolvedThemeSnapshot,
  getThemePreferenceSnapshot,
  setThemePreference,
  subscribeTheme,
  type Theme,
} from "@/lib/theme";

const getServerThemePreference = (): Theme => "system";
const getServerResolvedTheme = () => "light" as const;

/**
 * Shared theme hook backed by one external DOM/storage store.
 * Every instance stays synchronized without a heavyweight provider or library.
 */
export function useTheme() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemePreferenceSnapshot,
    getServerThemePreference,
  );
  const resolved = useSyncExternalStore(
    subscribeTheme,
    getResolvedThemeSnapshot,
    getServerResolvedTheme,
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemePreference(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemePreference(getRenderedTheme() === "dark" ? "light" : "dark");
  }, []);

  return { theme, resolvedTheme: resolved, mounted, setTheme, toggleTheme };
}
