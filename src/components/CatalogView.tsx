import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";

import { ProductGrid } from "@/components/ProductGrid";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  activeFilterCount,
  parseProductSearch,
  SORT_OPTIONS,
  type ProductFilters,
} from "@/lib/filters";
import { formatPrice, type ShopifyCollection, type ShopifyProduct } from "@/lib/shopify";
import type { CatalogFacet } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { categoryLabel, useLanguage } from "@/lib/i18n";

export interface FacetGroups {
  categories?: CatalogFacet[];
  brands?: CatalogFacet[];
  collections?: ShopifyCollection[];
}

type Patch = Partial<ProductFilters>;

function toggleValue(list: string[] | undefined, value: string) {
  const current = list ?? [];
  const next = current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
  return next.length > 0 ? next : undefined;
}

function FacetList({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: Array<{ slug: string; label: string; count?: number }>;
  selected: string[] | undefined;
  onToggle: (slug: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="border-b pb-5 last:border-0">
      <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item) => {
          const checked = (selected ?? []).includes(item.slug);
          return (
            <li key={item.slug}>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
                <Checkbox checked={checked} onCheckedChange={() => onToggle(item.slug)} />
                <span className={cn("flex-1 truncate", checked && "font-medium text-foreground")}>
                  {item.label}
                </span>
                {item.count !== undefined && (
                  <span className="text-xs tabular-nums text-muted-foreground/70">
                    {item.count}
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FilterControls({
  filters,
  facets,
  priceMin,
  priceMax,
  currency,
  onChange,
}: {
  filters: ProductFilters;
  facets: FacetGroups;
  priceMin: number;
  priceMax: number;
  currency: string;
  onChange: (patch: Patch) => void;
}) {
  const { t, language } = useLanguage();
  const [min, setMin] = useState(filters.minPrice?.toString() ?? "");
  const [max, setMax] = useState(filters.maxPrice?.toString() ?? "");

  useEffect(() => setMin(filters.minPrice?.toString() ?? ""), [filters.minPrice]);
  useEffect(() => setMax(filters.maxPrice?.toString() ?? ""), [filters.maxPrice]);

  const applyPrice = () => {
    const parsedMin = min === "" ? undefined : Number(min);
    const parsedMax = max === "" ? undefined : Number(max);
    onChange({
      minPrice: Number.isFinite(parsedMin) ? parsedMin : undefined,
      maxPrice: Number.isFinite(parsedMax) ? parsedMax : undefined,
    });
  };

  return (
    <div className="space-y-5">
      {facets.categories && (
        <FacetList
          title={t("categories")}
          items={facets.categories.map((item) => ({ ...item, label: categoryLabel(item, language) }))}
          selected={filters.category}
          onToggle={(slug) => onChange({ category: toggleValue(filters.category, slug) })}
        />
      )}
      {facets.brands && (
        <FacetList
          title={t("brands")}
          items={facets.brands}
          selected={filters.brand}
          onToggle={(slug) => onChange({ brand: toggleValue(filters.brand, slug) })}
        />
      )}
      {facets.collections && (
        <FacetList
          title={t("collections")}
          items={facets.collections.map((item) => ({ slug: item.handle, label: item.title }))}
          selected={filters.collection}
          onToggle={(slug) => onChange({ collection: toggleValue(filters.collection, slug) })}
        />
      )}

      <div className="border-b pb-5">
        <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-muted-foreground">
          {t("availability")}
        </h3>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "in-stock", label: t("inStock") },
            { value: "on-sale", label: t("onSale") },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                onChange({
                  availability:
                    filters.availability === option.value
                      ? undefined
                      : (option.value as ProductFilters["availability"]),
                })
              }
              className={cn(
                "press rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                filters.availability === option.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground hover:bg-accent hover:text-primary",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-[13px] font-bold uppercase tracking-wide text-muted-foreground">
          {t("price")}
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          {formatPrice(priceMin, currency)} – {formatPrice(priceMax, currency)}
        </p>
        <div className="flex items-center gap-2">
          <Input
            inputMode="decimal"
            value={min}
            onChange={(event) => setMin(event.target.value)}
            placeholder={String(priceMin)}
            aria-label={t("minimumPrice")}
            className="h-9"
          />
          <span className="text-muted-foreground">–</span>
          <Input
            inputMode="decimal"
            value={max}
            onChange={(event) => setMax(event.target.value)}
            placeholder={String(priceMax)}
            aria-label={t("maximumPrice")}
            className="h-9"
          />
          <Button type="button" size="sm" variant="secondary" onClick={applyPrice}>
            {t("go")}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Shared catalog view: facet sidebar, sort toolbar and product grid.
 * Every facet value comes from the live Shopify catalog.
 */
export function CatalogView({
  title,
  description,
  products,
  total,
  filters,
  facets,
  priceMin,
  priceMax,
  currency,
  onChange,
  onReset,
  header,
}: {
  title: string;
  description?: string;
  products: ShopifyProduct[];
  total: number;
  filters: ProductFilters;
  facets: FacetGroups;
  priceMin: number;
  priceMax: number;
  currency: string;
  onChange: (patch: Patch) => void;
  onReset: () => void;
  header?: React.ReactNode;
}) {
  const { t, direction, language } = useLanguage();
  const activeCount = activeFilterCount(filters);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight lg:text-[2rem]">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </header>
      {header}

      <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{t("filters")}</h2>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={onReset}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {t("clearAll")}
                </button>
              )}
            </div>
            <FilterControls
              filters={filters}
              facets={facets}
              priceMin={priceMin}
              priceMax={priceMax}
              currency={currency}
              onChange={onChange}
            />
          </div>
        </aside>

        <div>
          <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <p className="min-w-0 truncate text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{products.length}</span> {t("ofLabel")}{" "}
              {total} {products.length === 1 ? t("product") : t("products")}
            </p>

            <div className="flex shrink-0 items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="press rounded-full lg:hidden">
                    <SlidersHorizontal className="me-1.5 h-4 w-4" />
                    {t("filters")}
                    {activeCount > 0 && (
                      <span className="ms-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
                        {activeCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side={direction === "rtl" ? "right" : "left"}
                  dir={direction}
                  className="w-[88vw] max-w-sm overflow-y-auto"
                >
                  <SheetHeader>
                    <SheetTitle>{t("filters")}</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 pb-10">
                    <FilterControls
                      filters={filters}
                      facets={facets}
                      priceMin={priceMin}
                      priceMax={priceMax}
                      currency={currency}
                      onChange={onChange}
                    />
                    {activeCount > 0 && (
                      <Button variant="ghost" className="mt-5 w-full" onClick={onReset}>
                        {t("clearAll")}
                      </Button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>

              <label className="flex items-center gap-2 text-sm">
                <span className="hidden text-muted-foreground sm:inline">{t("sort")}</span>
                <select
                  value={filters.sort ?? "featured"}
                  onChange={(event) =>
                    onChange({ sort: event.target.value as ProductFilters["sort"] })
                  }
                  className="h-9 rounded-full border bg-background px-3 text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={t("sort")}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {(
                        {
                          featured: t("featured"),
                          newest: t("newest"),
                          "price-low": t("priceLowHigh"),
                          "price-high": t("priceHighLow"),
                          "name-az": t("nameAZ"),
                        } as const
                      )[option.value]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {activeCount > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">{t("activeFilters")}</span>
              <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs" onClick={onReset}>
                <X className="me-1 h-3.5 w-3.5" /> {t("clearAll")}
              </Button>
            </div>
          )}

          <ProductGrid products={products} />
        </div>
      </div>
    </div>
  );
}

export { parseProductSearch };
