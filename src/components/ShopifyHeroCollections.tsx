import { useQueries } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Loader2, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ProductImage } from "@/components/ProductImage";
import { useLanguage } from "@/lib/i18n";
import { cdnImage, cdnSrcSet } from "@/lib/image";
import { homeHeroCollections } from "@/lib/homeMerchandising";
import { productPrimaryVariant } from "@/lib/productPricing";
import { collectionQueryOptions } from "@/lib/queries";
import {
  formatPrice,
  variantSummary,
  type ShopifyCollection,
  type ShopifyProduct,
} from "@/lib/shopify";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";

function cleanTabTitle(collection: ShopifyCollection) {
  return collection.title.replace(/^hero\s*[-:|]\s*/i, "").trim() || collection.title;
}

function HeroProductCard({ product }: { product: ShopifyProduct }) {
  const { t } = useLanguage();
  const addItem = useCartStore((state) => state.addItem);
  const isLoading = useCartStore((state) => state.isLoading);
  const node = product.node;
  const variant = productPrimaryVariant(product);
  const image = node.images.edges[0]?.node;
  const price = variant?.price ?? node.priceRange.minVariantPrice;
  const summary = variantSummary(variant?.selectedOptions);
  const inStock = variant?.availableForSale ?? node.availableForSale ?? true;

  const handleAdd = async () => {
    if (!variant || !inStock) return;
    const success = await addItem({
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions ?? [],
    });
    if (success) toast.success(`${node.title}: ${t("addedToCart")}`, { position: "top-center" });
    else toast.error(t("addToCartFailed"), { position: "top-center" });
  };

  return (
    <article className="min-w-0 rounded-[1.15rem] border bg-card p-2 shadow-card sm:p-3">
      <div className="relative overflow-hidden rounded-[0.95rem] bg-surface">
        <Link
          to="/product/$handle"
          params={{ handle: node.handle }}
          aria-label={node.title}
          className="block"
        >
          <ProductImage
            url={image?.url}
            alt={image?.altText ?? node.title}
            size={320}
            sizes="(max-width: 639px) 31vw, 220px"
            className="border-0 bg-transparent"
            imageClassName="p-[8%]"
          />
        </Link>
        <button
          type="button"
          onClick={handleAdd}
          disabled={isLoading || !variant || !inStock}
          aria-label={`Add ${node.title} to bag`}
          className="press absolute bottom-1.5 end-1.5 grid h-9 w-9 place-items-center rounded-full border bg-background text-primary shadow-card-hover transition hover:scale-105 disabled:opacity-40 sm:h-10 sm:w-10"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-5 w-5" />}
        </button>
      </div>
      <div className="mt-2 min-w-0 space-y-1">
        <bdi className="block truncate text-[0.8rem] font-extrabold tracking-tight sm:text-sm">
          {formatPrice(price.amount, price.currencyCode)}
        </bdi>
        <Link to="/product/$handle" params={{ handle: node.handle }} className="block min-w-0">
          <h3 className="line-clamp-2 min-h-[2.45rem] break-words text-[0.7rem] font-semibold leading-[1.35] sm:text-sm">
            {node.title}
          </h3>
        </Link>
        {summary && (
          <p className="truncate text-[0.62rem] text-muted-foreground sm:text-xs">{summary}</p>
        )}
      </div>
    </article>
  );
}

export function ShopifyHeroCollections({ collections }: { collections: ShopifyCollection[] }) {
  const { t } = useLanguage();
  const candidates = useMemo(() => homeHeroCollections(collections), [collections]);
  const [activeHandle, setActiveHandle] = useState(candidates[0]?.handle ?? "");

  useEffect(() => {
    if (!candidates.length) return;
    if (!candidates.some((collection) => collection.handle === activeHandle)) {
      setActiveHandle(candidates[0]!.handle);
    }
  }, [activeHandle, candidates]);

  const queries = useQueries({
    queries: candidates.map((collection) => collectionQueryOptions(collection.handle)),
  });

  if (!candidates.length) return null;

  const activeIndex = Math.max(
    0,
    candidates.findIndex((collection) => collection.handle === activeHandle),
  );
  const fallback = candidates[activeIndex] ?? candidates[0]!;
  const activeQuery = queries[activeIndex];
  const result = activeQuery?.data;
  const collection = result?.collection ?? fallback;
  const products = result?.products ?? [];
  const leadImage = collection.image ?? products[0]?.node.images.edges[0]?.node ?? null;

  return (
    <section
      className="min-w-0"
      data-testid="collection-hero-tabs"
      aria-label="Featured collections"
    >
      <div
        className="scroll-rail flex gap-7 border-b px-1 sm:gap-10"
        role="tablist"
        aria-label="Featured collections"
      >
        {candidates.map((candidate) => {
          const active = candidate.handle === collection.handle;
          return (
            <button
              key={candidate.handle}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`home-hero-panel-${candidate.handle}`}
              onClick={() => setActiveHandle(candidate.handle)}
              className={cn(
                "relative min-h-12 shrink-0 whitespace-nowrap px-1 pb-3 pt-2 text-[0.95rem] font-bold text-muted-foreground transition-colors sm:text-lg",
                active &&
                  "text-primary after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-full after:bg-primary",
              )}
            >
              {cleanTabTitle(candidate)}
            </button>
          );
        })}
      </div>

      <div
        id={`home-hero-panel-${collection.handle}`}
        role="tabpanel"
        className="mt-5 min-w-0 sm:mt-6"
        aria-label={collection.title}
      >
        <Link
          to="/collections/$handle"
          params={{ handle: collection.handle }}
          className="group relative block aspect-[1.75/1] min-h-[12.5rem] overflow-hidden rounded-[1.6rem] border bg-surface shadow-card sm:aspect-[2.25/1] sm:min-h-[19rem]"
          data-testid="collection-hero-visual"
        >
          {leadImage ? (
            <img
              src={cdnImage(leadImage.url, 1400)}
              srcSet={cdnSrcSet(leadImage.url, 1400)}
              sizes="(min-width: 1280px) 1100px, 96vw"
              alt={leadImage.altText ?? collection.title}
              width={1400}
              height={800}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.015]"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
              {t("galleryEmpty")}
            </div>
          )}

          <div className="absolute inset-x-3 bottom-3 max-w-[78%] rounded-[1.15rem] border bg-background/88 p-3 shadow-card backdrop-blur-md sm:inset-x-auto sm:bottom-6 sm:start-6 sm:max-w-[46%] sm:p-5">
            <p className="line-clamp-1 text-base font-black tracking-tight sm:text-2xl">
              {collection.title}
            </p>
            {collection.description && (
              <p className="mt-1 line-clamp-2 text-[0.7rem] leading-relaxed text-muted-foreground sm:mt-2 sm:text-sm">
                {collection.description}
              </p>
            )}
            <span className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-foreground px-3.5 py-2 text-[0.68rem] font-bold text-background sm:mt-4 sm:min-h-11 sm:px-5 sm:text-sm">
              {t("viewAll")} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180 sm:h-4 sm:w-4" />
            </span>
          </div>
        </Link>

        <div className="mt-6 flex items-center justify-between gap-3 sm:mt-8">
          <h2 className="min-w-0 truncate text-xl font-black tracking-tight sm:text-2xl">
            {collection.title}
          </h2>
          <Link
            to="/collections/$handle"
            params={{ handle: collection.handle }}
            className="press inline-flex shrink-0 items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary sm:text-sm"
          >
            <span>{t("viewAll")}</span>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-foreground sm:h-10 sm:w-10">
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </span>
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-4 sm:gap-4">
            {products.slice(0, 3).map((product) => (
              <HeroProductCard key={product.node.id} product={product} />
            ))}
          </div>
        ) : activeQuery?.isPending ? (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-4 sm:gap-4" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-48 animate-pulse rounded-2xl bg-surface sm:h-64" />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
