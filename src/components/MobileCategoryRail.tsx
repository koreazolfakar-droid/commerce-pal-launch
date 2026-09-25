import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { LayoutGrid } from "lucide-react";

import { useHydrated } from "@/hooks/useHydrated";
import { canonicalCategorySlug } from "@/lib/categoryCanonical";
import { categoryLabel, useLanguage } from "@/lib/i18n";
import { catalogQueryOptions } from "@/lib/queries";
import { cn } from "@/lib/utils";

/**
 * Non-home mobile category navigation.
 *
 * This is intentionally a separate lazy chunk. The homepage does not render the
 * category rail, so it should not pay the parse/evaluation cost of the catalog,
 * catalog query helpers and taxonomy code merely because the top bar is present.
 */
export function MobileCategoryRail({ activeSlug }: { activeSlug?: string | undefined }) {
  const { t, language } = useLanguage();
  const hydrated = useHydrated();
  const { data: catalog, isLoading } = useQuery(catalogQueryOptions());
  const list = hydrated ? (catalog?.categories ?? []) : [];

  if (!list.length && !isLoading) return null;

  return (
    <nav aria-label="Product categories" className="scroll-rail flex gap-2 px-4 pb-2">
      {isLoading && list.length === 0
        ? Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="shimmer h-8 w-20 shrink-0 rounded-full bg-surface"
              aria-hidden
            />
          ))
        : null}
      {list.length > 0 ? (
        <Link
          to="/shop"
          className={cn(
            "press flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-colors",
            !activeSlug
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-surface text-muted-foreground hover:bg-accent",
          )}
        >
          <LayoutGrid className="h-4 w-4 shrink-0" strokeWidth={1.9} />
          {t("all")}
        </Link>
      ) : null}
      <Link
        to="/used-phones"
        className="press flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-accent px-3 text-[12px] font-semibold text-accent-foreground"
      >
        {t("usedPhones")}
      </Link>
      {list.map((category) => {
        const Icon = category.icon;
        const canonicalSlug = canonicalCategorySlug(category.slug);
        const active = activeSlug === canonicalSlug;
        return (
          <Link
            key={category.slug}
            to="/category/$slug"
            params={{ slug: canonicalSlug }}
            className={cn(
              "press flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-surface text-muted-foreground hover:bg-accent",
            )}
          >
            {Icon ? <Icon className="h-4 w-4 shrink-0" strokeWidth={1.9} /> : null}
            <span className="max-w-28 truncate">{categoryLabel(category, language)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
