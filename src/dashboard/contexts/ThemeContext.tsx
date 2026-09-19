import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme?: (theme: Theme) => void;
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
  storageKey?: string;
}

const DEFAULT_STORAGE_KEY = "spacecall-dashboard-theme";

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
  storageKey = DEFAULT_STORAGE_KEY,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (!switchable || typeof window === "undefined") return defaultTheme;
    const stored = window.localStorage.getItem(storageKey);
    return stored === "dark" || stored === "light" ? stored : defaultTheme;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.dataset.dashboardTheme = theme;
    root.style.colorScheme = theme;

    if (switchable) {
      window.localStorage.setItem(storageKey, theme);
    }
  }, [storageKey, switchable, theme]);

  useEffect(
    () => () => {
      const root = document.documentElement;
      delete root.dataset.dashboardTheme;
      root.style.removeProperty("color-scheme");
      root.classList.remove("dark");
    },
    [],
  );

  const setTheme = switchable ? (nextTheme: Theme) => setThemeState(nextTheme) : undefined;
  const toggleTheme = switchable
    ? () => setThemeState((current) => (current === "light" ? "dark" : "light"))
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
