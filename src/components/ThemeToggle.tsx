import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

/** Light/dark switch. Renders a stable shell before mount to avoid hydration drift. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, mounted, toggleTheme } = useTheme();
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
      className={cn(
        "press relative grid h-10 w-10 place-items-center rounded-full text-foreground transition-colors hover:bg-surface",
        className,
      )}
    >
      <Sun
        className={cn(
          "h-[21px] w-[21px] transition-all duration-300",
          isDark ? "scale-0 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100",
        )}
        strokeWidth={1.9}
        aria-hidden
      />
      <Moon
        className={cn(
          "absolute h-[21px] w-[21px] transition-all duration-300",
          isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0",
        )}
        strokeWidth={1.9}
        aria-hidden
      />
    </button>
  );
}
