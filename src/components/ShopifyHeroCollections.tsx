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
    <article className="group min-w-0 overflow-hidden rounded-[1.15rem] border border-border/70 bg-card shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-card-hover sm:rounded-[1.4rem]">
      <div className="relative aspect-[0.96/1] overflow-hidden bg-surface/70 sm:aspect-square">
        <Link
          to="/product/$handle"
          params={{ handle: node.handle }}
          aria-label={node.title}
          className="block h-full"
        >
          <ProductImage
            url={image?.url}
            alt={image?.altText ?? node.title}
            size={360}
            sizes="(max-width: 639px) 31vw, 220px"
            className="h-full border-0 bg-transparent"
            imageClassName="p-[8%] transition-transform duration-500 group-hover:scale-[1.035]"
          />
        </Link>
        <button
          type="button"
          onClick={handleAdd}
          disabled={isLoading || !variant || !inStock}
          aria-label={`Add ${node.title} to bag`}
          className="press absolute bottom-2 end-2 grid h-9 w-9 place-items-center rounded-full border border-border/70 bg-background/95 text-primary shadow-card backdrop-blur transition hover:scale-105 disabled:opacity-40 sm:bottom-3 sm:end-3 sm:h-10 sm:w-10"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-5 w-5" />}
        </button>
      </div>

      <div className="min-w-0 p-2.5 sm:p-4">
        <bdi className="block truncate text-sm font-black tracking-tight sm:text-base">
          {formatPrice(price.amount, price.currencyCode)}
        </bdi>
        <Link to="/product/$handle" params={{ handle: node.handle }} className="mt-1 block min-w-0">
          <h3 className="line-clamp-2 min-h-[2.35rem] break-words text-[0.72rem] font-semibold leading-[1.4] sm:min-h-[2.7rem] sm:text-sm">
            {node.title}
          </h3>
        </Link>
        {summary && (
          <p className="mt-1 truncate text-[0.62rem] text-muted-foreground sm:text-xs">{summary}</p>
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
  const displayTitle = cleanTabTitle(collection);

  return (
    <section
      className="min-w-0"
      data-testid="collection-hero-tabs"
      aria-label="Featured collections"
    >
      <div
        className="scroll-rail flex gap-7 border-b border-border/70 px-1 sm:gap-10"
        role="tablist"
        aria-label="Featured collections"
      >
        {candidates.map((candidate) => {
          const active = candidate.handle === activeHandle;
          return (
            <button
              key={candidate.handle}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`home-hero-panel-${candidate.handle}`}
              onClick={() => setActiveHandle(candidate.handle)}
              className={cn(
                "relative min-h-12 shrink-0 whitespace-nowrap px-1 pb-3 pt-2 text-[0.95rem] font-semibold text-muted-foreground transition-colors hover:text-foreground sm:min-h-14 sm:text-lg",
                active &&
                  "font-extrabold text-primary after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-full after:bg-primary",
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
        className="mt-4 min-w-0 sm:mt-6"
        aria-label={collection.title}
      >
        <Link
          to="/collections/$handle"
          params={{ handle: collection.handle }}
          className="group relative block min-h-[13.5rem] overflow-hidden rounded-[1.5rem] border border-border/70 bg-surface shadow-card sm:min-h-[21rem] sm:rounded-[2rem] lg:min-h-[25rem]"
          data-testid="collection-hero-visual"
        >
          {leadImage ? (
            <img
              src={cdnImage(leadImage.url, 1600)}
              srcSet={cdnSrcSet(leadImage.url, 1600)}
              sizes="(min-width: 1280px) 1100px, 96vw"
              alt={leadImage.altText ?? collection.title}
              width={1600}
              height={900}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.015]"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
              {t("galleryEmpty")}
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/88 to-background/10 rtl:bg-gradient-to-l sm:via-background/76 sm:to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/30 via-transparent to-background/5" />

          <div className="relative z-10 flex min-h-[13.5rem] max-w-[72%] flex-col justify-center p-5 sm:min-h-[21rem] sm:max-w-[55%] sm:p-8 lg:min-h-[25rem] lg:max-w-[48%] lg:p-10">
            <span className="mb-3 w-fit rounded-full border border-border/70 bg-background/82 px-3 py-1.5 text-[0.62rem] font-bold text-muted-foreground shadow-sm backdrop-blur sm:mb-4 sm:px-4 sm:text-xs">
              {displayTitle}
            </span>
            <h2 className="text-balance text-2xl font-black leading-[0.98] tracking-[-0.045em] text-foreground sm:text-4xl lg:text-5xl">
              {displayTitle}
            </h2>
            {collection.description && (
              <p className="mt-2 line-clamp-3 max-w-md text-[0.75rem] font-medium leading-relaxed text-muted-foreground sm:mt-4 sm:text-base">
                {collection.description}
              </p>
            )}
            <span className="mt-4 inline-flex min-h-10 w-fit items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-[0.72rem] font-bold text-background shadow-sm transition-transform group-hover:translate-x-0.5 sm:mt-6 sm:min-h-12 sm:px-6 sm:text-sm rtl:group-hover:-translate-x-0.5">
              {t("viewAll")}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </span>
          </div>

          {activeQuery?.isFetching && !activeQuery?.isPending && (
            <span className="absolute end-4 top-4 z-20 grid h-9 w-9 place-items-center rounded-full border border-border/70 bg-background/80 shadow-sm backdrop-blur sm:end-6 sm:top-6">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
            </span>
          )}
        </Link>

        <div className="mt-7 flex items-end justify-between gap-3 sm:mt-9">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black tracking-[-0.025em] sm:text-2xl">
              {displayTitle}
            </h2>
            {collection.description && (
              <p className="mt-1 hidden max-w-xl truncate text-sm text-muted-foreground sm:block">
                {collection.description}
              </p>
            )}
          </div>
          <Link
            to="/collections/$handle"
            params={{ handle: collection.handle }}
            className="press inline-flex shrink-0 items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary sm:text-sm"
          >
            <span>{t("viewAll")}</span>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-foreground transition-transform group-hover:translate-x-0.5 sm:h-10 sm:w-10">
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
