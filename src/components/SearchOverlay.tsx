import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { trackProductEvent } from "@/lib/analytics";
import { cdnImage } from "@/lib/image";
import { formatPrice, predictiveStorefront } from "@/lib/shopify";

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term), 250);
    return () => clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const { data, isFetching } = useQuery({
    queryKey: ["storefront-predictive-search", debounced],
    queryFn: () => predictiveStorefront(debounced),
    enabled: open && debounced.trim().length > 1,
    staleTime: 30_000,
  });

  const suggestions = useMemo(
    () => ["iPhone", "Samsung", "Xiaomi", "Earbuds", "Power bank", "256GB"],
    [],
  );

  if (!open) return null;

  const submitSearch = () => {
    const query = term.trim();
    if (!query) return;
    onClose();
    navigate({ to: "/search", search: { q: query } });
  };

  return (
    <div
      className="animate-fade fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-rise mx-auto mt-0 w-full max-w-3xl bg-background p-4 shadow-float sm:mt-16 sm:rounded-3xl sm:border"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitSearch();
            }}
            placeholder="Search for products..."
            className="border-0 shadow-none focus-visible:ring-0"
            aria-label="Search products"
          />
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="press grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 max-h-[65vh] overflow-y-auto border-t pt-4">
          {debounced.trim().length < 2 ? (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setTerm(suggestion)}
                  className="press rounded-full bg-surface px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : !data || (data.products.length === 0 && data.collections.length === 0) ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {isFetching ? "Searching…" : "No matches found"}
            </p>
          ) : (
            <div className="space-y-6">
              {data.collections.length > 0 && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Collections
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {data.collections.map((collection) => (
                      <Link
                        key={collection.id}
                        to="/collections/$handle"
                        params={{ handle: collection.handle }}
                        onClick={onClose}
                        className="rounded-full bg-surface px-3.5 py-1.5 text-[13px] font-medium transition-colors hover:bg-accent hover:text-primary"
                      >
                        {collection.title}
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {data.products.length > 0 && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Products
                  </h3>
                  <ul className="divide-y">
                    {data.products.map((product) => {
                      const node = product.node;
                      const image = node.images.edges[0]?.node;
                      return (
                        <li key={node.id}>
                          <Link
                            to="/product/$handle"
                            params={{ handle: node.handle }}
                            onClick={() => {
                              trackProductEvent("select_item", product, { item_list_name: "predictive_search" });
                              onClose();
                            }}
                            className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-surface"
                          >
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-image-stage">
                              {image && (
                                <img
                                  src={cdnImage(image.url, 96)}
                                  alt={image.altText ?? node.title}
                                  loading="lazy"
                                  decoding="async"
                                  width={48}
                                  height={48}
                                  className="h-full w-full object-contain p-1"
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{node.title}</p>
                              {node.vendor && (
                                <p className="truncate text-xs text-muted-foreground">
                                  {node.vendor}
                                </p>
                              )}
                            </div>
                            <span className="shrink-0 text-sm font-semibold">
                              {formatPrice(
                                node.priceRange.minVariantPrice.amount,
                                node.priceRange.minVariantPrice.currencyCode,
                              )}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              <button
                type="button"
                onClick={submitSearch}
                className="press flex min-h-11 w-full items-center justify-center gap-2 rounded-full border bg-background px-4 text-sm font-bold hover:border-primary hover:text-primary"
              >
                View all results
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
