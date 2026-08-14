/**
 * Theme tokens live in src/styles.css (`:root` for light, `.dark` for dark).
 * This module only owns *which* class is applied, and persistence of the choice.
 */
export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "space-cell:theme";

/** Resolves the effective appearance for a stored preference. */
export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme !== "system") return theme;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const value = window.localStorage.getItem(THEME_STORAGE_KEY);
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

/** Toggles the `dark` class and keeps native UI (scrollbars, form controls) in sync. */
export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(theme);
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  root.dataset["theme"] = theme;
}

/**
 * Runs before hydration so the first paint already matches the stored choice —
 * this is what prevents a light flash and a theme-related hydration mismatch.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k="${THEME_STORAGE_KEY}";var s=localStorage.getItem(k);var t=(s==="light"||s==="dark"||s==="system")?s:"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";r.dataset.theme=t;}catch(e){}})();`;
