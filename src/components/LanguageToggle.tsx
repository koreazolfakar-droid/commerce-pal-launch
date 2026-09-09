import { Languages } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { language, toggleLanguage } = useLanguage();
  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={language === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      title={language === "ar" ? "English" : "العربية"}
      className={
        compact
          ? "press inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-bold text-foreground transition-colors hover:bg-surface"
          : "press inline-flex h-9 items-center gap-1.5 rounded-full border bg-card px-3 text-xs font-bold text-foreground transition-colors hover:border-primary hover:bg-surface"
      }
    >
      <Languages className="h-4 w-4 shrink-0" strokeWidth={1.9} />
      <span>{language === "ar" ? "EN" : "ع"}</span>
    </button>
  );
}
