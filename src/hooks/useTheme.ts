import { useCallback, useEffect, useState } from "react";

import {
  THEME_STORAGE_KEY,
  applyTheme,
  readStoredTheme,
  resolveTheme,
  type Theme,
} from "@/lib/theme";

/** Reads/writes the persisted theme preference and follows the OS when set to `system`. */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = readStoredTheme();
    setThemeState(stored);
    setResolved(resolveTheme(stored));
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      applyTheme(theme);
      setResolved(resolveTheme(theme));
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [theme, mounted]);

  const setTheme = useCallback((next: Theme) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolveTheme(readStoredTheme()) === "dark" ? "light" : "dark");
  }, [setTheme]);

  return { theme, resolvedTheme: resolved, mounted, setTheme, toggleTheme };
}
