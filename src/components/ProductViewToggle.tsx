import { List } from "lucide-react";

import type { ProductViewMode } from "@/hooks/useProductViewMode";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

function GridGlyph({ columns }: { columns: 2 | 3 }) {
  const cells = columns * columns;

  return (
    <span
      aria-hidden="true"
      className={cn("grid size-4 gap-[2px]", columns === 3 ? "grid-cols-3" : "grid-cols-2")}
    >
      {Array.from({ length: cells }).map((_, index) => (
        <span key={index} className="rounded-[1px] bg-current" />
      ))}
    </span>
  );
}

export function ProductViewToggle({
  mode,
  onChange,
}: {
  mode: ProductViewMode;
  onChange: (mode: ProductViewMode) => void;
}) {
  const { t } = useLanguage();

  const buttonClass = (active: boolean) =>
    cn(
      "press grid h-9 w-10 shrink-0 place-items-center rounded-full border border-transparent transition-[color,background-color,box-shadow,transform]",
      active
        ? "bg-background text-primary shadow-sm"
        : "text-muted-foreground hover:bg-background/75 hover:text-foreground",
    );

  return (
    <div
      className="inline-flex h-11 shrink-0 items-center gap-0.5 rounded-full bg-surface/95 p-1 shadow-inner ring-1 ring-border/45"
      role="group"
      aria-label={`${t("viewGrid")} / ${t("viewList")}`}
    >
      <button
        type="button"
        onClick={() => onChange("dense")}
        aria-label={t("viewThreeColumns")}
        aria-pressed={mode === "dense"}
        title={t("viewThreeColumns")}
        className={buttonClass(mode === "dense")}
      >
        <GridGlyph columns={3} />
      </button>

      <button
        type="button"
        onClick={() => onChange("grid")}
        aria-label={t("viewTwoColumns")}
        aria-pressed={mode === "grid"}
        title={t("viewTwoColumns")}
        className={buttonClass(mode === "grid")}
      >
        <GridGlyph columns={2} />
      </button>

      <button
        type="button"
        onClick={() => onChange("list")}
        aria-label={t("viewList")}
        aria-pressed={mode === "list"}
        title={t("viewList")}
        className={buttonClass(mode === "list")}
      >
        <List className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
