import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Loader2, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { ProductImage } from "@/components/ProductImage";
import { storefrontSearchQueryOptions } from "@/lib/queries";
import { formatPrice, productPrimaryVariant } from "@/lib/productPricing";
import { useLanguage } from "@/lib/i18n";

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [returnFocusTo] = useState<HTMLElement | null>(() =>
    typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null),
  );
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const navigate = useNavigate();
  const { language, direction, t } = useLanguage();
  const ar = language === "ar";
  const query = term.trim();

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isFetching, isError, refetch } = useQuery({
    ...storefrontSearchQueryOptions(debounced),
    enabled: open && Boolean(debounced),
  });
  const busy = query !== debounced || isFetching;
  const suggestions = ar
    ? ["آيفون", "سامسونج", "شاومي", "سماعات", "شاحن", "باور بانك"]
    : ["iPhone", "Samsung", "Xiaomi", "Earbuds", "Charger", "Power bank"];
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!query) return;
    onClose();
    void navigate({ to: "/search", search: { q: query } });
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm" />
        <Dialog.Content
          dir={direction}
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (returnFocusTo?.isConnected) returnFocusTo.focus();
          }}
          className="fixed left-1/2 top-3 z-50 flex max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-3xl -translate-x-1/2 flex-col overflow-hidden rounded-2xl border bg-background p-4 shadow-float focus:outline-none sm:top-16 sm:max-h-[calc(100dvh-8rem)]"
        >
          <Dialog.Title className="sr-only">
            {ar ? "البحث عن المنتجات" : "Search products"}
          </Dialog.Title>
          <form onSubmit={submit} className="flex shrink-0 items-center gap-2" role="search">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <Input
              autoFocus
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder={ar ? "ابحث عن منتج أو علامة تجارية…" : "Search for products..."}
              className="min-w-0 border-0 shadow-none focus-visible:ring-0"
              aria-label={ar ? "البحث عن المنتجات" : "Search products"}
              enterKeyHint="search"
            />
            {busy && (
              <Loader2
                className="h-4 w-4 shrink-0 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
            )}
            <button
              type="submit"
              disabled={!query}
              aria-label={ar ? "عرض نتائج البحث" : "View search results"}
              className="grid size-11 shrink-0 place-items-center rounded-full text-primary hover:bg-accent disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
            </button>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label={ar ? "إغلاق البحث" : "Close search"}
                className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-surface focus-visible:outline-2 focus-visible:outline-ring"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </form>

          <div
            className="mt-3 min-h-0 overflow-y-auto overscroll-contain border-t pt-4"
            aria-busy={busy}
          >
            {!query ? (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setTerm(suggestion)}
                    className="min-h-11 rounded-full bg-surface px-3.5 py-2 text-[13px] font-medium text-muted-foreground hover:bg-accent hover:text-primary"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : busy ? (
              <p role="status" className="py-8 text-center text-sm text-muted-foreground">
                {ar ? "جارٍ البحث…" : "Searching…"}
              </p>
            ) : isError ? (
              <div role="alert" className="py-6 text-center text-sm">
                <p>
                  {ar
                    ? "تعذّر تحميل النتائج. حاول مجددًا."
                    : "Search could not load. Please try again."}
                </p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="mt-3 min-h-11 rounded-full border px-4 text-primary"
                >
                  {t("tryAgain")}
                </button>
              </div>
            ) : !data || (data.products.length === 0 && data.collections.length === 0) ? (
              <p role="status" className="py-8 text-center text-sm text-muted-foreground">
                {ar
                  ? "لا توجد نتائج مطابقة. جرّب اسم المنتج أو نوعه."
                  : "No matches found. Try a product name or category."}
              </p>
            ) : (
              <div className="space-y-5">
                {data.collections.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
                      {t("collections")}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {data.collections.slice(0, 6).map((collection) => (
                        <Link
                          key={collection.id}
                          to="/collections/$handle"
                          params={{ handle: collection.handle }}
                          onClick={onClose}
                          className="inline-flex min-h-11 items-center rounded-full bg-surface px-3.5 py-2 text-[13px] font-medium hover:bg-accent hover:text-primary"
                        >
                          {collection.title}
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
                {data.products.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
                      {t("products")}
                    </h3>
                    <ul className="divide-y">
                      {data.products.slice(0, 8).map((product) => {
                        const node = product.node;
                        const displayTitle = ar && node.titleAr?.trim() ? node.titleAr : node.title;
                        const image = node.images.edges[0]?.node;
                        const price =
                          productPrimaryVariant(product)?.price ?? node.priceRange.minVariantPrice;
                        return (
                          <li key={node.id}>
                            <Link
                              to="/product/$handle"
                              params={{ handle: node.handle }}
                              onClick={onClose}
                              className="flex min-w-0 items-center gap-3 rounded-xl px-2 py-3 hover:bg-surface"
                            >
                              <ProductImage
                                url={image?.thumbnailUrl ?? image?.url}
                                fallbackUrl={image?.url}
                                alt={image?.altText ?? displayTitle}
                                size={96}
                                className="!size-12 shrink-0 rounded-xl"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="line-clamp-2 break-words text-sm font-medium">
                                  {displayTitle}
                                </p>
                                {node.vendor && (
                                  <p className="truncate text-xs text-muted-foreground">
                                    {node.vendor}
                                  </p>
                                )}
                              </div>
                              <bdi className="shrink-0 text-sm font-semibold">
                                {formatPrice(price.amount, price.currencyCode)}
                              </bdi>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}
              </div>
            )}
          </div>
          {query ? (
            <Link
              to="/search"
              search={{ q: query }}
              onClick={onClose}
              className="mt-3 flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              {ar ? "عرض كل النتائج" : "View all results"}
              <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
