import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Check,
  Copy,
  Loader2,
  Scale,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AIPhoneComparison } from "@/components/AIPhoneComparison";
import { ProductImage } from "@/components/ProductImage";
import { StoreLayout } from "@/components/StoreLayout";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/useHydrated";
import { groupSpecs, parseDescription, splitSections } from "@/lib/productContent";
import { productsByHandlesQueryOptions } from "@/lib/queries";
import { absoluteUrl, canonicalLink } from "@/lib/seo";
import { formatPrice, productInStock, type ShopifyProduct } from "@/lib/shopify";
import { STORE_NAME } from "@/lib/storeConfig";
import { cn } from "@/lib/utils";
import { useCompareStore } from "@/stores/compareStore";

interface CompareSearch {
  products: string | undefined;
}

interface ComparisonRow {
  group: string;
  label: string;
  values: string[];
}

const EMPTY_VALUE = "—";

export const Route = createFileRoute("/compare")({
  validateSearch: (search: Record<string, unknown>): CompareSearch => ({
    products: typeof search["products"] === "string" ? search["products"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: `Compare Smartphones — ${STORE_NAME}` },
      {
        name: "description",
        content:
          "Compare live smartphone prices, availability and Shopify product specifications side by side.",
      },
      { property: "og:title", content: `Compare Smartphones — ${STORE_NAME}` },
      {
        property: "og:description",
        content: `Compare ${STORE_NAME} smartphones side by side using live Shopify product data.`,
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/compare") },
      { name: "robots", content: "noindex, follow" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `Compare Smartphones — ${STORE_NAME}` },
      {
        name: "twitter:description",
        content: `Compare ${STORE_NAME} smartphones side by side using live Shopify product data.`,
      },
    ],
    links: [canonicalLink("/compare")],
  }),
  component: ComparePage,
});

function productSpecs(product: ShopifyProduct) {
  const parsed = splitSections(
    parseDescription(product.node.descriptionHtml, product.node.description),
  );
  const variant = product.node.variants.edges[0]?.node;

  return groupSpecs([
    ...parsed.specs,
    ...(variant?.selectedOptions ?? [])
      .filter((option) => option.value !== "Default Title")
      .map((option) => ({ label: option.name, value: option.value })),
  ]).flatMap((group) => group.rows.map((row) => ({ ...row, group: group.title })));
}

function normalizedHandles(value: string | undefined) {
  if (!value) return [];
  return [...new Set(value.split(",").map((handle) => handle.trim()).filter(Boolean))].slice(0, 4);
}

function sameHandles(left: string[], right: string[]) {
  return left.length === right.length && left.every((handle, index) => handle === right[index]);
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSpecLabel(label: string) {
  const normalized = normalizeText(label);
  const aliases: Record<string, string> = {
    "screen size": "display size",
    "display diagonal": "display size",
    "screen resolution": "resolution",
    "display resolution": "resolution",
    "screen refresh rate": "refresh rate",
    "display refresh rate": "refresh rate",
    chipset: "processor",
    soc: "processor",
    memory: "ram",
    "battery size": "battery capacity",
    battery: "battery capacity",
    os: "operating system",
    software: "operating system",
    "selfie camera": "front camera",
  };
  return aliases[normalized] ?? normalized;
}

function comparisonKey(group: string, label: string) {
  return `${normalizeText(group)}|${normalizeSpecLabel(label)}`;
}

function isDifferentRow(row: ComparisonRow) {
  if (row.values.length < 2) return false;
  const normalized = row.values.map((value) =>
    value === EMPTY_VALUE ? "__missing__" : normalizeText(value),
  );
  return new Set(normalized).size > 1;
}

function ComparePage() {
  const hydrated = useHydrated();
  const navigate = useNavigate({ from: "/compare" });
  const { products: sharedProducts } = Route.useSearch();
  const handles = useCompareStore((state) => state.handles);
  const remove = useCompareStore((state) => state.remove);
  const clear = useCompareStore((state) => state.clear);
  const replace = useCompareStore((state) => state.replace);
  const [aiRequested, setAiRequested] = useState(false);
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(false);
  const aiSectionRef = useRef<HTMLDivElement>(null);

  const sharedHandles = useMemo(() => normalizedHandles(sharedProducts), [sharedProducts]);
  const requestedHandles = useMemo(
    () => (sharedHandles.length > 0 ? sharedHandles : handles),
    [handles, sharedHandles],
  );

  const {
    data: fetchedProducts = [],
    isPending,
    isError,
    refetch,
  } = useQuery(productsByHandlesQueryOptions(hydrated ? requestedHandles : []));

  useEffect(() => {
    if (!hydrated || isPending || isError || requestedHandles.length === 0) return;

    const validHandles = requestedHandles.filter((handle) =>
      fetchedProducts.some((product) => product.node.handle === handle),
    );

    if (!sameHandles(validHandles, handles)) replace(validHandles);

    if (sharedProducts) {
      void navigate({ search: { products: undefined }, replace: true });
    }
  }, [
    fetchedProducts,
    handles,
    hydrated,
    isError,
    isPending,
    navigate,
    replace,
    requestedHandles,
    sharedProducts,
  ]);

  const products = useMemo(
    () =>
      (hydrated ? requestedHandles : [])
        .map((handle) => fetchedProducts.find((product) => product.node.handle === handle))
        .filter((product): product is ShopifyProduct => Boolean(product)),
    [fetchedProducts, hydrated, requestedHandles],
  );

  useEffect(() => {
    if (products.length < 2) {
      setAiRequested(false);
      setShowOnlyDifferences(false);
    }
  }, [products.length]);

  const rows = useMemo<ComparisonRow[]>(() => {
    const perProduct = products.map(productSpecs);
    const labels = new Map<string, { group: string; label: string }>();

    perProduct.flat().forEach((row) => {
      const key = comparisonKey(row.group, row.label);
      if (!labels.has(key)) labels.set(key, { group: row.group, label: row.label });
    });

    return [...labels.entries()].map(([key, meta]) => ({
      ...meta,
      values: perProduct.map(
        (specs) => specs.find((row) => comparisonKey(row.group, row.label) === key)?.value ?? EMPTY_VALUE,
      ),
    }));
  }, [products]);

  const groupedRows = useMemo(() => {
    const groups = new Map<string, ComparisonRow[]>();
    rows.forEach((row) => {
      const existing = groups.get(row.group) ?? [];
      existing.push(row);
      groups.set(row.group, existing);
    });
    return [...groups.entries()].map(([group, groupRows]) => ({ group, rows: groupRows }));
  }, [rows]);

  const differingRows = useMemo(() => rows.filter(isDifferentRow).length, [rows]);

  const visibleGroupedRows = useMemo(() => {
    if (!showOnlyDifferences) return groupedRows;
    return groupedRows
      .map(({ group, rows: groupRows }) => ({
        group,
        rows: groupRows.filter(isDifferentRow),
      }))
      .filter(({ rows: groupRows }) => groupRows.length > 0);
  }, [groupedRows, showOnlyDifferences]);

  const copyShareLink = async () => {
    const productHandles = products.map((product) => product.node.handle);
    if (productHandles.length === 0) return;

    const url = new URL("/compare", window.location.origin);
    url.searchParams.set("products", productHandles.join(","));

    try {
      await navigator.clipboard.writeText(url.toString());
      toast.success("Comparison link copied");
    } catch {
      toast.error("Unable to copy the comparison link");
    }
  };

  const openAiComparison = () => {
    setAiRequested(true);
    window.setTimeout(
      () => aiSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      30,
    );
  };

  const clearComparison = () => {
    setAiRequested(false);
    setShowOnlyDifferences(false);
    clear();
    if (sharedProducts) void navigate({ search: { products: undefined }, replace: true });
  };

  const loading = hydrated && requestedHandles.length > 0 && isPending;

  return (
    <StoreLayout>
      <div className="mx-auto w-full min-w-0 max-w-[90rem] overflow-x-clip px-3 py-6 sm:px-4 sm:py-8 lg:px-6 lg:py-12">
        <header className="overflow-hidden rounded-3xl border bg-card shadow-card">
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between lg:p-8">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">
                  <Scale className="h-3.5 w-3.5" /> Phone comparison
                </span>
                {products.length > 0 && (
                  <span className="rounded-full border px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                    {products.length} of 4 selected
                  </span>
                )}
              </div>
              <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
                Compare smartphones clearly
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Compare live store price, availability and specifications without squeezed columns
                or overlapping content.
              </p>
            </div>

            {products.length > 0 && (
              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
                {products.length >= 2 && (
                  <Button className="col-span-2 rounded-xl sm:col-span-1" onClick={openAiComparison}>
                    <Sparkles className="h-4 w-4" /> AI expert research
                  </Button>
                )}
                {products.length < 4 && (
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link to="/category/$slug" params={{ slug: "smartphones" }}>
                      Add phone
                    </Link>
                  </Button>
                )}
                <Button variant="outline" className="rounded-xl" onClick={copyShareLink}>
                  <Copy className="h-4 w-4" /> Share
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-xl text-muted-foreground"
                  onClick={clearComparison}
                >
                  <Trash2 className="h-4 w-4" /> Clear
                </Button>
              </div>
            )}
          </div>

          {products.length >= 2 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-surface/60 px-5 py-3 text-xs font-medium text-muted-foreground sm:px-6 lg:px-8">
              <span className="inline-flex min-w-0 items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span>
                  {differingRows} specification{differingRows === 1 ? "" : "s"} differ across the
                  selected products.
                </span>
              </span>
              <span className="rounded-full border bg-background px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">
                Missing values count as differences
              </span>
            </div>
          )}
        </header>

        {loading ? (
          <div className="grid min-h-[24rem] place-items-center text-center" aria-live="polite">
            <div>
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 font-semibold">Loading comparison…</p>
              <p className="mt-1 text-sm text-muted-foreground">Fetching the latest Shopify data.</p>
            </div>
          </div>
        ) : isError ? (
          <div className="mt-8 rounded-3xl border bg-card p-8 text-center shadow-card">
            <AlertTriangle className="mx-auto h-9 w-9 text-destructive" />
            <h2 className="mt-4 text-xl font-bold">Comparison could not be loaded</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              The selected products are still saved. Retry the Shopify request without losing your
              comparison.
            </p>
            <Button className="mt-5 rounded-xl" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        ) : products.length === 0 ? (
          <div className="grid min-h-[28rem] place-items-center text-center">
            <div className="max-w-md px-4">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent text-primary">
                <Scale className="h-7 w-7" />
              </span>
              <h2 className="mt-5 text-xl font-bold">No phones selected</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Add two or more smartphones from a product card or product page, then return here
                for a clean side-by-side comparison.
              </p>
              <Button asChild className="mt-6 rounded-xl">
                <Link to="/category/$slug" params={{ slug: "smartphones" }}>
                  Browse smartphones
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <section aria-label="Selected products" className="mt-6 sm:mt-8">
              <div className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-3 pb-3 sm:-mx-4 sm:px-4 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-4">
                {products.map((product) => {
                  const node = product.node;
                  const image = node.images.edges[0]?.node;
                  const price = node.variants.edges[0]?.node.price ?? node.priceRange.minVariantPrice;
                  const inStock = productInStock(product);

                  return (
                    <article
                      key={node.handle}
                      className="relative min-w-[82vw] snap-start overflow-hidden rounded-2xl border bg-card p-4 shadow-card sm:min-w-[20rem] md:min-w-0"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(node.handle)}
                        className="absolute end-3 top-3 z-20 h-9 w-9 rounded-full bg-background/90 shadow-sm backdrop-blur"
                        aria-label={`Remove ${node.title}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>

                      <Link
                        to="/product/$handle"
                        params={{ handle: node.handle }}
                        className="block min-w-0"
                      >
                        <ProductImage
                          url={image?.url}
                          alt={image?.altText ?? node.title}
                          size={320}
                          sizes="(min-width: 1280px) 240px, (min-width: 768px) 40vw, 76vw"
                          className="mx-auto w-full max-w-44 rounded-2xl"
                        />
                        <h2 className="mt-4 line-clamp-2 min-h-11 break-words pe-8 text-base font-bold leading-snug hover:text-primary">
                          {node.title}
                        </h2>
                      </Link>

                      {node.vendor && (
                        <p className="mt-1 truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {node.vendor}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                        <span className="text-lg font-extrabold">
                          {formatPrice(price.amount, price.currencyCode)}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                            inStock
                              ? "bg-success/10 text-success"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {inStock && <Check className="h-3.5 w-3.5" />}
                          {inStock ? "In stock" : "Out of stock"}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <div ref={aiSectionRef} className="min-w-0 scroll-mt-24">
              <AIPhoneComparison products={products} active={aiRequested} />
            </div>

            {rows.length === 0 ? (
              <div className="mt-6 rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground sm:mt-8">
                No comparable specifications were found in the selected Shopify product data.
              </div>
            ) : (
              <section aria-label="Specifications comparison" className="mt-6 min-w-0 sm:mt-8">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                      Store specifications
                    </h2>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                      Equivalent labels are aligned automatically, and differences are highlighted
                      even when one product is missing a value.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {products.length >= 2 && differingRows > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant={showOnlyDifferences ? "default" : "outline"}
                        className="rounded-xl"
                        onClick={() => setShowOnlyDifferences((current) => !current)}
                        aria-pressed={showOnlyDifferences}
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                        {showOnlyDifferences ? "Show all" : `Differences only (${differingRows})`}
                      </Button>
                    )}
                    {products.length === 1 && (
                      <Button asChild size="sm" variant="outline" className="rounded-xl">
                        <Link to="/category/$slug" params={{ slug: "smartphones" }}>
                          Add another phone
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>

                {showOnlyDifferences && visibleGroupedRows.length === 0 ? (
                  <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground shadow-card">
                    No differing specifications were found in the current store data.
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 xl:hidden">
                      {visibleGroupedRows.map(({ group, rows: groupItems }) => (
                        <div
                          key={group}
                          className="overflow-hidden rounded-2xl border bg-card shadow-card"
                        >
                          <div className="border-b bg-surface/70 px-4 py-3">
                            <h3 className="text-xs font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                              {group}
                            </h3>
                          </div>
                          <div className="divide-y">
                            {groupItems.map((row) => {
                              const different = isDifferentRow(row);
                              return (
                                <div key={`${row.group}-${row.label}`} className="p-4">
                                  <div className="flex min-w-0 items-start justify-between gap-3">
                                    <h4 className="min-w-0 break-words font-bold">{row.label}</h4>
                                    {different && products.length > 1 && (
                                      <span className="shrink-0 rounded-full bg-accent px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
                                        Different
                                      </span>
                                    )}
                                  </div>

                                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    {products.map((product, index) => {
                                      const value = row.values[index] ?? EMPTY_VALUE;
                                      return (
                                        <div
                                          key={`${row.label}-${product.node.handle}`}
                                          className={cn(
                                            "min-w-0 overflow-hidden rounded-xl border bg-background p-3",
                                            different && value !== EMPTY_VALUE && "border-primary/25 bg-primary/5",
                                            different && value === EMPTY_VALUE && "border-dashed bg-muted/25",
                                          )}
                                        >
                                          <p className="line-clamp-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                            {product.node.title}
                                          </p>
                                          <p
                                            className={cn(
                                              "mt-1 break-words text-sm font-semibold leading-5",
                                              value === EMPTY_VALUE && "text-muted-foreground",
                                            )}
                                          >
                                            {value}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="hidden min-w-0 overflow-hidden rounded-2xl border bg-card shadow-card xl:block">
                      <div className="max-w-full overflow-x-auto overscroll-x-contain">
                        <table
                          className="w-full border-collapse text-start text-sm"
                          style={{ minWidth: `${220 + products.length * 260}px` }}
                        >
                          <thead>
                            <tr className="border-b bg-surface/85">
                              <th
                                scope="col"
                                className="sticky start-0 z-30 w-[220px] min-w-[220px] border-e bg-surface p-4 text-start font-extrabold text-muted-foreground"
                              >
                                Specification
                              </th>
                              {products.map((product) => (
                                <th
                                  key={product.node.handle}
                                  scope="col"
                                  className="min-w-[260px] border-e p-4 text-start last:border-e-0"
                                >
                                  <Link
                                    to="/product/$handle"
                                    params={{ handle: product.node.handle }}
                                    className="line-clamp-2 font-extrabold hover:text-primary"
                                  >
                                    {product.node.title}
                                  </Link>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {visibleGroupedRows.map(({ group, rows: groupItems }) => (
                              <Fragment key={group}>
                                <tr className="border-b bg-muted/35">
                                  <th
                                    colSpan={products.length + 1}
                                    className="px-4 py-2.5 text-start text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground"
                                  >
                                    {group}
                                  </th>
                                </tr>
                                {groupItems.map((row) => {
                                  const different = isDifferentRow(row);
                                  return (
                                    <tr
                                      key={`${row.group}-${row.label}`}
                                      className="border-b last:border-b-0 hover:bg-surface/45"
                                    >
                                      <th
                                        scope="row"
                                        className="sticky start-0 z-20 w-[220px] min-w-[220px] border-e bg-card p-4 text-start font-semibold"
                                      >
                                        <span className="break-words">{row.label}</span>
                                        {different && (
                                          <span className="mt-2 block w-fit rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent-foreground">
                                            Different
                                          </span>
                                        )}
                                      </th>
                                      {row.values.map((value, valueIndex) => (
                                        <td
                                          key={`${row.label}-${products[valueIndex]?.node.handle ?? valueIndex}`}
                                          className={cn(
                                            "min-w-[260px] border-e p-4 align-top leading-6 last:border-e-0",
                                            different && value !== EMPTY_VALUE && "bg-primary/5 font-semibold",
                                            different && value === EMPTY_VALUE && "bg-muted/20 text-muted-foreground",
                                          )}
                                        >
                                          <span className="break-words">{value}</span>
                                        </td>
                                      ))}
                                    </tr>
                                  );
                                })}
                              </Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </StoreLayout>
  );
}
