import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";

import { ProductGrid } from "@/components/ProductGrid";
import { ProductViewToggle } from "@/components/ProductViewToggle";
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
import { useProductViewMode } from "@/hooks/useProductViewMode";

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
  const [min, setMin] = useState(filters.min?.toString() ?? "");
  const [max, setMax] = useState(filters.max?.toString() ?? "");
  const { t, language } = useLanguage();

  useEffect(() => {
    setMin(filters.min?.toString() ?? "");
    setMax(filters.max?.toString() ?? "");
  }, [filters.min, filters.max]);

  const applyPrice = () => {
    const parsed = parseProductSearch({ min, max });
    onChange({
      min: parsed.min,
      max: parsed.max,
    });
  };

  return (
    <div className="space-y-5">
      <FacetList
        title={t("allCategories")}
        items={(facets.categories ?? []).map((category) => ({
          ...category,
          label: categoryLabel(category, language),
        }))}
        selected={filters.category}
        onToggle={(slug) => onChange({ category: toggleValue(filters.category, slug) })}
      />
      <FacetList
        title={t("brands")}
        items={facets.brands ?? []}
        selected={filters.brand}
        onToggle={(slug) => onChange({ brand: toggleValue(filters.brand, slug) })}
      />
      <FacetList
        title={t("collections")}
        items={(facets.collections ?? []).map((collection) => ({
          slug: collection.handle,
          label: collection.title,
        }))}
        selected={filters.collection}
        onToggle={(slug) => onChange({ collection: toggleValue(filters.collection, slug) })}
      />

      <div className="border-b pb-5">
        <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-muted-foreground">
          {t("availability")}
        </h3>
        <div className="flex flex-wrap gap-2">
          {[
            { value: undefined, label: t("all") },
            { value: "in-stock" as const, label: t("inStock") },
            { value: "on-sale" as const, label: t("onSale") },
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => onChange({ availability: option.value })}
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
  topContent,
  hideHeading = false,
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
  topContent?: React.ReactNode;
  hideHeading?: boolean;
}) {
  const { t, direction, language } = useLanguage();
  const activeCount = activeFilterCount(filters);
  const [viewMode, setViewMode] = useProductViewMode("dense", "space-call-catalog-view-mode");

  return (
    <div className="mx-auto w-full max-w-[80rem] px-3 py-4 min-[390px]:px-4 sm:px-5 sm:py-6 lg:px-6 lg:py-8 xl:px-7">
      {topContent}
      {!hideHeading ? (
        <header className="mb-4 sm:mb-5">
          <h1 className="text-2xl font-extrabold tracking-tight lg:text-[2rem]">{title}</h1>
          {description && (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </header>
      ) : null}

      <div className="lg:grid lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-7 xl:grid-cols-[240px_minmax(0,1fr)] xl:gap-9">
        <aside className="hidden lg:block">
          <div className="sticky top-[5.75rem] space-y-5">
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
          <div className="-mx-3 mb-3.5 flex items-center gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[390px]:-mx-4 min-[390px]:px-4 sm:mx-0 sm:mb-4 sm:px-0 lg:hidden">
            <span className="shrink-0 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground">
              {t("all")}
            </span>
            {(facets.categories ?? []).slice(0, 6).map((category) => {
              const pressed = filters.category?.includes(category.slug) ?? false;
              return (
                <button
                  key={category.slug}
                  type="button"
                  onClick={() =>
                    onChange({ category: toggleValue(filters.category, category.slug) })
                  }
                  aria-pressed={pressed}
                  className="shrink-0 rounded-full border bg-card px-3.5 py-2 text-xs font-semibold text-foreground aria-pressed:border-primary aria-pressed:bg-accent"
                >
                  {categoryLabel(category, language)}
                </button>
              );
            })}
          </div>

          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 sm:mb-4 sm:flex-nowrap">
            <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground sm:text-sm">
              <span className="font-medium text-foreground">{products.length}</span> {t("ofLabel")}{" "}
              {total} {products.length === 1 ? t("product") : t("products")}
            </p>

            <div className="flex w-full shrink-0 items-center justify-between gap-2 sm:w-auto sm:justify-start">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="press rounded-md lg:hidden">
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

              <select
                value={filters.sort ?? "featured"}
                onChange={(event) =>
                  onChange({ sort: event.target.value as ProductFilters["sort"] })
                }
                className="h-9 min-w-0 max-w-[10.5rem] flex-1 rounded-md border bg-background px-3 text-[12px] font-medium outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 sm:max-w-none sm:flex-none sm:text-[13px]"
                aria-label={t("sort")}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {(
                      {
                        featured: t("featured"),
                        newest: t("newest"),
                        "price-asc": t("priceLowHigh"),
                        "price-desc": t("priceHighLow"),
                        discount: t("biggestDiscount"),
                        "title-asc": t("nameAZ"),
                      } as Record<string, string>
                    )[option.value] ?? option.label}
                  </option>
                ))}
              </select>

              <ProductViewToggle mode={viewMode} onChange={setViewMode} />
            </div>
          </div>

          {activeCount > 0 && (
            <div className="mb-3.5 flex flex-wrap gap-1.5 sm:mb-4 sm:gap-2">
              {[
                ...(filters.category ?? []).map((slug) => ({
                  key: `category-${slug}`,
                  label: categoryLabel(
                    facets.categories?.find((facet) => facet.slug === slug) ?? {
                      slug,
                      label: slug,
                    },
                    language,
                  ),
                  clear: () => onChange({ category: toggleValue(filters.category, slug) }),
                })),
                ...(filters.brand ?? []).map((slug) => ({
                  key: `brand-${slug}`,
                  label: facets.brands?.find((facet) => facet.slug === slug)?.label ?? slug,
                  clear: () => onChange({ brand: toggleValue(filters.brand, slug) }),
                })),
                ...(filters.collection ?? []).map((handle) => ({
                  key: `collection-${handle}`,
                  label:
                    facets.collections?.find((collection) => collection.handle === handle)?.title ??
                    handle,
                  clear: () => onChange({ collection: toggleValue(filters.collection, handle) }),
                })),
                ...(filters.availability
                  ? [
                      {
                        key: "availability",
                        label: filters.availability === "in-stock" ? t("inStock") : t("onSale"),
                        clear: () => onChange({ availability: undefined }),
                      },
                    ]
                  : []),
                ...(filters.min !== undefined || filters.max !== undefined
                  ? [
                      {
                        key: "price",
                        label: `${filters.min ?? priceMin} – ${filters.max ?? priceMax}`,
                        clear: () => onChange({ min: undefined, max: undefined }),
                      },
                    ]
                  : []),
              ].map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.clear}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-surface px-3 py-1 text-xs font-medium hover:border-primary hover:text-primary"
                >
                  {chip.label}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}

          <ProductGrid
            eagerCount={4}
            products={products}
            showViewToggle={false}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            action={
              activeCount > 0 ? (
                <Button variant="outline" onClick={onReset}>
                  {t("clearAll")}
                </Button>
              ) : undefined
            }
          />

          {header ? <div className="mt-8 border-t pt-6 sm:mt-10 sm:pt-7">{header}</div> : null}
        </div>
      </div>
    </div>
  );
}
