import { Grid2X2, List } from "lucide-react";

import type { ProductViewMode } from "@/hooks/useProductViewMode";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

export function ProductViewToggle({
  mode,
  onChange,
}: {
  mode: ProductViewMode;
  onChange: (mode: ProductViewMode) => void;
}) {
  const { t } = useLanguage();

  return (
    <div
      className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full border border-border/80 bg-card p-1 shadow-card"
      role="group"
      aria-label={`${t("viewGrid")} / ${t("viewList")}`}
    >
      <button
        type="button"
        onClick={() => onChange("grid")}
        aria-label={t("viewGrid")}
        aria-pressed={mode === "grid"}
        title={t("viewGrid")}
        className={cn(
          "press grid h-8 w-8 shrink-0 place-items-center rounded-full border border-transparent transition-colors",
          mode === "grid"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-surface/70 text-muted-foreground hover:bg-surface hover:text-foreground",
        )}
      >
        <Grid2X2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-label={t("viewList")}
        aria-pressed={mode === "list"}
        title={t("viewList")}
        className={cn(
          "press grid h-8 w-8 shrink-0 place-items-center rounded-full border border-transparent transition-colors",
          mode === "list"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-surface/70 text-muted-foreground hover:bg-surface hover:text-foreground",
        )}
      >
        <List className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
