import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

/**
 * CSS follows `html.dark` immediately, including before hydration. React only
 * supplies the persisted/shared state for interaction and accessibility.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, mounted, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { t } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={mounted ? (isDark ? t("switchLight") : t("switchDark")) : undefined}
      aria-pressed={mounted ? isDark : undefined}
      className={cn(
        "press relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-foreground transition-colors hover:bg-surface",
        className,
      )}
    >
      <span className="sr-only" aria-hidden={mounted ? true : undefined}>
        <span className="dark:hidden">{t("switchDark")}</span>
        <span className="hidden dark:inline">{t("switchLight")}</span>
      </span>
      <Sun
        className="h-[21px] w-[21px] scale-100 rotate-0 opacity-100 transition-all duration-300 dark:scale-0 dark:-rotate-90 dark:opacity-0"
        strokeWidth={1.9}
        aria-hidden
      />
      <Moon
        className="absolute h-[21px] w-[21px] scale-0 rotate-90 opacity-0 transition-all duration-300 dark:scale-100 dark:rotate-0 dark:opacity-100"
        strokeWidth={1.9}
        aria-hidden
      />
    </button>
  );
}
