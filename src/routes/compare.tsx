import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Copy, Scale, Trash2, X, Sparkles } from "lucide-react";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";

import { ProductImage } from "@/components/ProductImage";
import { StoreLayout } from "@/components/StoreLayout";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/useHydrated";
import { groupSpecs, parseDescription, splitSections } from "@/lib/productContent";
import { productsByHandlesQueryOptions } from "@/lib/queries";
import { formatPrice, productInStock, type ShopifyProduct } from "@/lib/shopify";
import { useCompareStore } from "@/stores/compareStore";
import { absoluteUrl, canonicalLink } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { STORE_NAME } from "@/lib/storeConfig";

interface CompareSearch {
  products: string | undefined;
}

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

function ComparePage() {
  const hydrated = useHydrated();
  const { products: sharedProducts } = Route.useSearch();
  const handles = useCompareStore((state) => state.handles);
  const remove = useCompareStore((state) => state.remove);
  const clear = useCompareStore((state) => state.clear);
  const replace = useCompareStore((state) => state.replace);
  const requestedHandles = useMemo(
    () =>
      sharedProducts
        ? [...new Set([...handles, ...sharedProducts.split(",").filter(Boolean)])].slice(0, 4)
        : handles,
    [handles, sharedProducts],
  );
  const { data: fetchedProducts = [] } = useQuery(
    productsByHandlesQueryOptions(hydrated ? requestedHandles : []),
  );

  useEffect(() => {
    if (!sharedProducts) return;
    const valid = sharedProducts
      .split(",")
      .filter((handle) => fetchedProducts.some((product) => product.node.handle === handle));
    if (valid.length > 0 && valid.join(",") !== handles.join(",")) replace(valid);
  }, [sharedProducts, fetchedProducts, handles, replace]);

  const products = (hydrated ? handles : [])
    .map((handle) => fetchedProducts.find((product) => product.node.handle === handle))
    .filter((product): product is ShopifyProduct => Boolean(product));

  const rows = useMemo(() => {
    const perProduct = products.map(productSpecs);
    const labels = new Map<string, { group: string; label: string }>();
    perProduct.flat().forEach((row) =>
      labels.set(`${row.group}|${row.label.toLowerCase()}`, {
        group: row.group,
        label: row.label,
      }),
    );
    return [...labels.entries()].map(([key, meta]) => ({
      ...meta,
      values: perProduct.map(
        (specs) =>
          specs.find((row) => `${row.group}|${row.label.toLowerCase()}` === key)?.value ?? "—",
      ),
    }));
  }, [products]);

  const winningRows = useMemo(
    () =>
      rows.filter((row) => {
        const values = row.values.filter((value) => value !== "—");
        return values.length > 1 && new Set(values).size > 1;
      }).length,
    [rows],
  );

  const copyShareLink = async () => {
    const url = `${window.location.origin}/compare?products=${encodeURIComponent(handles.join(","))}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Comparison link copied");
    } catch {
      toast.error("Unable to copy the link");
    }
  };

  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
              Phone comparison
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Compare smartphones</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Live product details from Shopify. Compare up to four phones with differences
              highlighted automatically.
            </p>
          </div>
          {products.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-surface px-3 py-2 text-xs font-semibold text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> {winningRows} differing specs
              </span>
              <Button variant="outline" className="rounded-full" onClick={copyShareLink}>
                <Copy className="h-4 w-4" /> Share
              </Button>
              <Button
                variant="ghost"
                className="rounded-full text-muted-foreground"
                onClick={clear}
              >
                <Trash2 className="h-4 w-4" /> Clear
              </Button>
            </div>
          )}
        </div>

        {products.length === 0 ? (
          <div className="grid min-h-[28rem] place-items-center text-center">
            <div className="max-w-md">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent text-primary">
                <Scale className="h-7 w-7" />
              </span>
              <h2 className="mt-5 text-xl font-bold">No phones selected</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Add two or more smartphones from a product card or product page to compare them
                here.
              </p>
              <Button asChild className="mt-6 rounded-full">
                <Link to="/category/$slug" params={{ slug: "smartphones" }}>
                  Browse smartphones
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="scroll-rail mt-8 overflow-x-auto rounded-2xl border bg-card shadow-card">
            <table className="w-full min-w-[720px] border-collapse text-start text-sm">
              <thead>
                <tr className="align-top">
                  <th className="sticky left-0 z-10 w-44 border-b border-r bg-card p-4 text-muted-foreground">
                    Product
                  </th>
                  {products.map((product) => {
                    const node = product.node;
                    const image = node.images.edges[0]?.node;
                    const price =
                      node.variants.edges[0]?.node.price ?? node.priceRange.minVariantPrice;
                    return (
                      <th
                        key={node.handle}
                        className="min-w-56 border-b border-r p-4 last:border-r-0"
                      >
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(node.handle)}
                            className="absolute right-0 top-0 h-8 w-8 rounded-full"
                            aria-label={`Remove ${node.title}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Link
                            to="/product/$handle"
                            params={{ handle: node.handle }}
                            className="block pr-8"
                          >
                            <ProductImage
                              url={image?.url}
                              alt={image?.altText ?? node.title}
                              size={240}
                              sizes="224px"
                              className="max-w-40 rounded-xl"
                            />
                            <span className="mt-3 block line-clamp-2 font-bold text-foreground hover:text-primary">
                              {node.title}
                            </span>
                          </Link>
                          <span className="mt-2 block text-base font-extrabold">
                            {formatPrice(price.amount, price.currencyCode)}
                          </span>
                          <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                            {productInStock(product) && (
                              <Check className="h-3.5 w-3.5 text-success" />
                            )}
                            {productInStock(product) ? "In stock" : "Out of stock"}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={`${row.group}-${row.label}`}
                    className={index % 2 === 0 ? "bg-surface/60" : undefined}
                  >
                    <th className="sticky left-0 z-10 border-r bg-inherit p-4 font-semibold">
                      <span className="block text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                        {row.group}
                      </span>
                      {row.label}
                    </th>
                    {row.values.map((value, valueIndex) => {
                      const comparable = row.values.filter((item) => item !== "—");
                      const different =
                        comparable.length > 1 && new Set(comparable).size > 1 && value !== "—";
                      return (
                        <td
                          key={`${row.label}-${products[valueIndex]?.node.handle}`}
                          className={cn(
                            "border-r p-4 align-top last:border-r-0",
                            different && "bg-primary/5 font-semibold",
                          )}
                        >
                          {value}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
