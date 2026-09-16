/**
 * Theme tokens live in src/styles.css (`:root` for light, `.dark` for dark).
 * This module owns only preference persistence, DOM application, migration,
 * and the tiny shared external store used by all ThemeToggle instances.
 */
export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "space-call:theme";
export const LEGACY_THEME_STORAGE_KEY = "space-cell:theme";

const THEME_CHANGE_EVENT = "space-call:theme-change";
const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

/** Resolves the effective appearance for a stored preference. */
export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme !== "system") return theme;
  if (typeof window === "undefined") return "light";
  return window.matchMedia(DARK_MEDIA_QUERY).matches ? "dark" : "light";
}

/**
 * Reads the Space Call preference and migrates the historical Space Cell key.
 * Migration is intentionally scoped to this one theme key only.
 */
export function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";

  try {
    const current = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(current)) return current;

    const legacy = window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    if (isTheme(legacy)) {
      window.localStorage.setItem(THEME_STORAGE_KEY, legacy);
      window.localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
      return legacy;
    }
  } catch {
    // Storage can be unavailable in hardened/private browser contexts.
  }

  return "system";
}

/**
 * `document.documentElement` is the source of truth for what is actually
 * rendered. This keeps React state aligned with the CSS that the user sees.
 */
export function getRenderedTheme(): ResolvedTheme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function getThemePreferenceSnapshot(): Theme {
  if (typeof document !== "undefined") {
    const value = document.documentElement.dataset["theme"] ?? null;
    if (isTheme(value)) return value;
  }
  return readStoredTheme();
}

export function getResolvedThemeSnapshot(): ResolvedTheme {
  return getRenderedTheme();
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

export function setThemePreference(theme: Theme) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    window.localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
  } catch {
    // The DOM should still update even if persistence is unavailable.
  }

  applyTheme(theme);
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
}

/**
 * Shared subscription used by every hook instance. Same-tab updates are sent
 * through a lightweight custom event; cross-tab updates use the storage event;
 * OS scheme changes are applied only while preference === `system`.
 */
export function subscribeTheme(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;

  const media = window.matchMedia(DARK_MEDIA_QUERY);

  const onThemeChange = () => listener();
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY && event.key !== LEGACY_THEME_STORAGE_KEY) return;
    applyTheme(readStoredTheme());
    listener();
  };
  const onMediaChange = () => {
    const preference = readStoredTheme();
    if (preference !== "system") return;
    applyTheme(preference);
    listener();
  };

  window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
  window.addEventListener("storage", onStorage);
  media.addEventListener("change", onMediaChange);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
    window.removeEventListener("storage", onStorage);
    media.removeEventListener("change", onMediaChange);
  };
}

/**
 * Runs before hydration so the first paint already matches the stored choice.
 * It also performs the one-time Space Cell -> Space Call storage migration
 * before React mounts, preventing a preference reset or theme flash.
 */
export const THEME_INIT_SCRIPT = `(function(){var nk="${THEME_STORAGE_KEY}",ok="${LEGACY_THEME_STORAGE_KEY}",t="system";try{var s=localStorage.getItem(nk);if(s!=="light"&&s!=="dark"&&s!=="system"){var l=localStorage.getItem(ok);if(l==="light"||l==="dark"||l==="system"){s=l;localStorage.setItem(nk,l);localStorage.removeItem(ok);}}if(s==="light"||s==="dark"||s==="system")t=s;}catch(e){}var d=t==="dark"||(t==="system"&&window.matchMedia("${DARK_MEDIA_QUERY}").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";r.dataset.theme=t;})();`;
