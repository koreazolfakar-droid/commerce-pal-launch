import { useQueries } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Loader2, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useHydrated } from "@/hooks/useHydrated";
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
import { useCartStore } from "@/stores/cartStore";

const HERO_AUTOPLAY_MS = 5500;
const HERO_SWIPE_THRESHOLD_PX = 45;
const HERO_MATCH_NOISE = new Set([
  "hero",
  "collection",
  "collections",
  "clean",
  "background",
  "image",
  "img",
  "webp",
  "png",
  "jpg",
  "jpeg",
]);

function cleanTabTitle(collection: ShopifyCollection) {
  return collection.title.replace(/^hero\s*[-:|]\s*/i, "").trim() || collection.title;
}

function heroMatchTokens(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(
      (token) =>
        token.length > 1 &&
        !HERO_MATCH_NOISE.has(token) &&
        !/^\d+x\d+$/.test(token),
    );
}

function selectPromotedHeroProduct(collection: ShopifyCollection, products: ShopifyProduct[]) {
  if (!products.length) return null;

  const imageFile = collection.image?.url.split("/").pop()?.split("?")[0] ?? "";
  const tokens = heroMatchTokens(`${imageFile} ${cleanTabTitle(collection)}`);
  if (!tokens.length) return products[0]!;

  let bestProduct = products[0]!;
  let bestScore = -1;

  for (const product of products) {
    const node = product.node;
    const searchable = `${node.title} ${node.handle} ${node.vendor ?? ""}`.toLowerCase();
    const score = tokens.reduce(
      (total, token) => total + (searchable.includes(token) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      bestProduct = product;
      bestScore = score;
    }
  }

  return bestProduct;
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
  const hydrated = useHydrated();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPaused, setIsAutoPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const suppressNextClick = useRef(false);

  const queries = useQueries({
    queries: candidates.map((collection) => ({
      ...collectionQueryOptions(collection.handle, 3),
      enabled: hydrated,
    })),
  });

  useEffect(() => {
    if (activeIndex >= candidates.length) setActiveIndex(0);
  }, [activeIndex, candidates.length]);

  useEffect(() => {
    if (candidates.length <= 1 || isAutoPaused) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % candidates.length);
    }, HERO_AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [activeIndex, candidates.length, isAutoPaused]);

  if (!candidates.length) return null;

  const safeActiveIndex = Math.min(activeIndex, candidates.length - 1);
  const fallback = candidates[safeActiveIndex]!;
  const activeQuery = queries[safeActiveIndex];
  const result = activeQuery?.data;
  const collection = result?.collection ?? fallback;
  const products = result?.products ?? [];
  const promotedProduct = selectPromotedHeroProduct(collection, products);
  const leadImage = collection.image ?? promotedProduct?.node.images.edges[0]?.node ?? null;
  const displayTitle = cleanTabTitle(collection);
  const isGenericHomeTitle = /^home\s*page$/i.test(displayTitle);

  const goToIndex = (index: number) => {
    const next = (index + candidates.length) % candidates.length;
    setActiveIndex(next);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    setIsAutoPaused(true);
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    const startX = touchStartX.current;
    const endX = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    setIsAutoPaused(false);

    if (startX === null || endX === undefined) return;
    const distance = endX - startX;
    if (Math.abs(distance) < HERO_SWIPE_THRESHOLD_PX) return;

    suppressNextClick.current = true;
    goToIndex(safeActiveIndex + (distance < 0 ? 1 : -1));
    window.setTimeout(() => {
      suppressNextClick.current = false;
    }, 350);
  };

  const handleTouchCancel = () => {
    touchStartX.current = null;
    setIsAutoPaused(false);
  };

  const handleHeroClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!suppressNextClick.current) return;
    event.preventDefault();
    suppressNextClick.current = false;
  };

  const heroVisual = (
    <span
      key={collection.id}
      className="relative block w-full overflow-hidden rounded-[clamp(0.9rem,3.4vw,2rem)] border border-border/70 bg-transparent leading-none shadow-card animate-in fade-in duration-500"
    >
      {leadImage ? (
        <img
          key={`${collection.id}-${leadImage.url}`}
          src={cdnImage(leadImage.url, 1800)}
          srcSet={cdnSrcSet(leadImage.url, 1800)}
          sizes="(max-width: 639px) 100vw, (min-width: 1280px) 1280px, 100vw"
          alt={leadImage.altText ?? collection.title}
          width={1672}
          height={941}
          loading={safeActiveIndex === 0 ? "eager" : "lazy"}
          fetchPriority={safeActiveIndex === 0 ? "high" : "auto"}
          decoding="async"
          draggable={false}
          className="m-0 block h-auto w-full max-w-none select-none align-top"
        />
      ) : (
        <span className="grid aspect-video w-full place-items-center text-sm leading-normal text-muted-foreground">
          {t("galleryEmpty")}
        </span>
      )}

      {activeQuery?.isFetching && !activeQuery?.isPending && (
        <span className="absolute end-4 top-4 z-20 hidden h-9 w-9 place-items-center rounded-full border border-border/70 bg-background/80 shadow-sm backdrop-blur sm:grid sm:end-6 sm:top-6">
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
        </span>
      )}
    </span>
  );

  const heroLinkClass =
    "group relative -mx-3 block w-[calc(100%+1.5rem)] max-w-none touch-pan-y bg-transparent sm:mx-0 sm:w-full";

  return (
    <section
      className="min-w-0"
      data-testid="collection-hero-tabs"
      aria-label="Featured collection"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setIsAutoPaused(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setIsAutoPaused(false);
      }}
    >
      <div
        id="featured-hero-panel"
        role="tabpanel"
        className="min-w-0"
        aria-label={collection.title}
      >
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        >
          {promotedProduct ? (
            <Link
              to="/product/$handle"
              params={{ handle: promotedProduct.node.handle }}
              className={heroLinkClass}
              data-testid="collection-hero-visual"
              aria-label={`${displayTitle}: ${promotedProduct.node.title}`}
              onClick={handleHeroClick}
            >
              {heroVisual}
            </Link>
          ) : (
            <Link
              to="/collections/$handle"
              params={{ handle: collection.handle }}
              className={heroLinkClass}
              data-testid="collection-hero-visual"
              aria-label={displayTitle}
              onClick={handleHeroClick}
            >
              {heroVisual}
            </Link>
          )}
        </div>

        {candidates.length > 1 && (
          <div
            role="tablist"
            aria-label="Featured offers"
            className="mt-2 flex items-center justify-center gap-1.5"
          >
            {candidates.map((candidate, index) => {
              const selected = index === safeActiveIndex;
              return (
                <button
                  key={candidate.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls="featured-hero-panel"
                  aria-label={`Show ${cleanTabTitle(candidate)}`}
                  title={cleanTabTitle(candidate)}
                  onClick={() => goToIndex(index)}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    selected
                      ? "w-8 bg-primary"
                      : "w-3 bg-border hover:bg-muted-foreground/50"
                  }`}
                />
              );
            })}
          </div>
        )}

        {!isGenericHomeTitle && (
          <div className="mt-5 flex items-end justify-between gap-3 sm:mt-9">
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
          </div>
        )}

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
