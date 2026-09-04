import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";

import { ProductGrid } from "@/components/ProductGrid";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { activeFilterCount, SORT_OPTIONS, type ProductFilters } from "@/lib/filters";
import { formatPrice, type ShopifyCollection, type ShopifyProduct } from "@/lib/shopify";
import type { CatalogFacet } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

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
      <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-muted-foreground">{title}</h3>
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
                  <span className="text-xs tabular-nums text-muted-foreground/70">{item.count}</span>
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

  useEffect(() => {
    setMin(filters.min?.toString() ?? "");
    setMax(filters.max?.toString() ?? "");
  }, [filters.min, filters.max]);

  const applyPrice = () => {
    const parsedMin = parseFloat(min);
    const parsedMax = parseFloat(max);
    onChange({
      min: isFinite(parsedMin) ? parsedMin : undefined,
      max: isFinite(parsedMax) ? parsedMax : undefined,
    });
  };

  return (
    <div className="space-y-5">
      <FacetList
        title="Category"
        items={facets.categories ?? []}
        selected={filters.category}
        onToggle={(slug) => onChange({ category: toggleValue(filters.category, slug) })}
      />
      <FacetList
        title="Brand"
        items={facets.brands ?? []}
        selected={filters.brand}
        onToggle={(slug) => onChange({ brand: toggleValue(filters.brand, slug) })}
      />
      <FacetList
        title="Collection"
        items={(facets.collections ?? []).map((collection) => ({
          slug: collection.handle,
          label: collection.title,
        }))}
        selected={filters.collection}
        onToggle={(slug) => onChange({ collection: toggleValue(filters.collection, slug) })}
      />

      <div className="border-b pb-5">
        <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-muted-foreground">Availability</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { value: undefined, label: "All" },
            { value: "in-stock" as const, label: "In stock" },
            { value: "on-sale" as const, label: "On sale" },
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
        <h3 className="mb-1 text-[13px] font-bold uppercase tracking-wide text-muted-foreground">Price</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          {formatPrice(priceMin, currency)} – {formatPrice(priceMax, currency)}
        </p>
        <div className="flex items-center gap-2">
          <Input
            inputMode="decimal"
            value={min}
            onChange={(event) => setMin(event.target.value)}
            placeholder={String(priceMin)}
            aria-label="Minimum price"
            className="h-9"
          />
          <span className="text-muted-foreground">–</span>
          <Input
            inputMode="decimal"
            value={max}
            onChange={(event) => setMax(event.target.value)}
            placeholder={String(priceMax)}
            aria-label="Maximum price"
            className="h-9"
          />
          <Button type="button" size="sm" variant="secondary" onClick={applyPrice}>
            Go
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
  const activeCount = activeFilterCount(filters);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:py-10">
      {header}
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight lg:text-[2rem]">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </header>

      <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Filters</h2>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={onReset}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Clear all
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
              <span className="font-medium text-foreground">{products.length}</span> of {total}{" "}
              products
            </p>

            <div className="flex shrink-0 items-center gap-2">

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="press rounded-full lg:hidden">
                    <SlidersHorizontal className="mr-1.5 h-4 w-4" />
                    Filters
                    {activeCount > 0 && (
                      <span className="ml-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
                        {activeCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
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
                        Clear all filters
                      </Button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>

              <label className="flex items-center gap-2 text-sm">
                <span className="hidden text-muted-foreground sm:inline">Sort</span>
                <select
                  value={filters.sort ?? "featured"}
                  onChange={(event) =>
                    onChange({ sort: event.target.value as ProductFilters["sort"] })
                  }
                  className="h-9 rounded-full border bg-background px-3 text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Sort products"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {activeCount > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {[
                ...(filters.category ?? []).map((slug) => ({
                  key: `category-${slug}`,
                  label:
                    facets.categories?.find((facet) => facet.slug === slug)?.label ?? slug,
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
                        label: filters.availability === "in-stock" ? "In stock" : "On sale",
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
            products={products}
            action={
              activeCount > 0 ? (
                <Button variant="outline" onClick={onReset}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
