import { useQueries } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { TrustBenefitsRail } from "@/components/TrustBenefitsRail";
import { useHydrated } from "@/hooks/useHydrated";
import { cdnImage, cdnSrcSet } from "@/lib/image";
import { homeHeroCollections } from "@/lib/homeMerchandising";
import { collectionQueryOptions } from "@/lib/queries";
import type { ShopifyCollection, ShopifyProduct } from "@/lib/shopify";

const HERO_AUTOPLAY_MS = 6000;
const GENERIC_HERO_WORDS = new Set([
  "picks",
  "highlights",
  "featured",
  "offers",
  "offer",
  "collection",
  "home",
  "page",
  "tech",
]);

function cleanHeroTitle(collection: ShopifyCollection) {
  return collection.title.replace(/^hero\s*[-:|]\s*/i, "").trim() || collection.title;
}

function promotedProductForHero(collection: ShopifyCollection, products: ShopifyProduct[]) {
  if (!products.length) return null;
  if (products.length === 1) return products[0]!;

  const tokens = cleanHeroTitle(collection)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 1 && !GENERIC_HERO_WORDS.has(token));

  if (tokens.length < 2) return null;

  return (
    products.find((product) => {
      const searchable = `${product.node.vendor ?? ""} ${product.node.title}`.toLowerCase();
      return tokens.every((token) => searchable.includes(token));
    }) ?? null
  );
}

export function ShopifyHeroCollections({ collections }: { collections: ShopifyCollection[] }) {
  const candidates = useMemo(
    () => homeHeroCollections(collections).filter((collection) => Boolean(collection.image?.url)),
    [collections],
  );
  const hydrated = useHydrated();
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const sliderRef = useRef<HTMLDivElement | null>(null);

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
    if (candidates.length <= 1 || paused) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const timer = window.setTimeout(() => {
      const slider = sliderRef.current;
      if (!slider) return;

      const nextIndex = (activeIndex + 1) % candidates.length;
      slider.scrollTo({ left: nextIndex * slider.clientWidth, behavior: "smooth" });
      setActiveIndex(nextIndex);
    }, HERO_AUTOPLAY_MS);

    return () => window.clearTimeout(timer);
  }, [activeIndex, candidates.length, paused]);

  if (!candidates.length) return <TrustBenefitsRail />;

  const safeActiveIndex = Math.min(activeIndex, candidates.length - 1);

  const scrollToIndex = (index: number) => {
    const slider = sliderRef.current;
    if (!slider) return;

    const reducedMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    slider.scrollTo({
      left: index * slider.clientWidth,
      behavior: reducedMotion ? "auto" : "smooth",
    });
    setActiveIndex(index);
  };

  const handleScroll = () => {
    const slider = sliderRef.current;
    if (!slider || slider.clientWidth === 0) return;

    const nextIndex = Math.max(
      0,
      Math.min(candidates.length - 1, Math.round(slider.scrollLeft / slider.clientWidth)),
    );
    if (nextIndex !== activeIndex) setActiveIndex(nextIndex);
  };

  return (
    <>
      <section className="min-w-0" aria-label="Featured offers">
        <div className="relative -mx-3 sm:mx-0">
          <div
            ref={sliderRef}
            dir="ltr"
            onScroll={handleScroll}
            onPointerDown={() => setPaused(true)}
            onPointerUp={() => setPaused(false)}
            onPointerCancel={() => setPaused(false)}
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") setPaused(true);
            }}
            onPointerLeave={(event) => {
              if (event.pointerType === "mouse") setPaused(false);
            }}
            className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            data-testid="collection-hero-slider"
          >
            {candidates.map((candidate, index) => {
              const query = queries[index];
              const resolvedCollection = query?.data?.collection ?? candidate;
              const slideProducts = query?.data?.products ?? [];
              const promotedProduct = promotedProductForHero(resolvedCollection, slideProducts);
              const heroImage = resolvedCollection.image ?? candidate.image;
              const slideTitle = cleanHeroTitle(resolvedCollection);

              if (!heroImage?.url) return null;

              const visual = (
                <span className="relative block w-full overflow-hidden rounded-[clamp(0.9rem,3.4vw,2rem)] border border-border/70 bg-transparent leading-none shadow-card">
                  <img
                    src={cdnImage(heroImage.url, 1800)}
                    srcSet={cdnSrcSet(heroImage.url, 1800)}
                    sizes="(max-width: 639px) 100vw, (min-width: 1280px) 1280px, 100vw"
                    alt={heroImage.altText ?? resolvedCollection.title}
                    width={1672}
                    height={941}
                    loading={index === 0 ? "eager" : "lazy"}
                    fetchPriority={index === 0 ? "high" : "auto"}
                    decoding="async"
                    draggable={false}
                    className="m-0 block h-auto w-full max-w-none select-none align-top"
                  />

                  {query?.isFetching && !query?.isPending && (
                    <span className="absolute end-4 top-4 z-20 hidden h-9 w-9 place-items-center rounded-full border border-border/70 bg-background/80 shadow-sm backdrop-blur sm:grid sm:end-6 sm:top-6">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                    </span>
                  )}
                </span>
              );

              return (
                <div key={candidate.id} className="w-full shrink-0 snap-center px-3 sm:px-0">
                  {promotedProduct ? (
                    <Link
                      to="/product/$handle"
                      params={{ handle: promotedProduct.node.handle }}
                      className="block w-full"
                      aria-label={`${slideTitle}: ${promotedProduct.node.title}`}
                    >
                      {visual}
                    </Link>
                  ) : (
                    <Link
                      to="/collections/$handle"
                      params={{ handle: resolvedCollection.handle }}
                      className="block w-full"
                      aria-label={slideTitle}
                    >
                      {visual}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {candidates.length > 1 && (
          <div className="mx-auto mt-2.5 h-[3px] w-20 overflow-hidden rounded-full bg-border/70" aria-hidden="true">
            <span
              className="block h-full rounded-full bg-primary transition-transform duration-300"
              style={{
                width: `${100 / candidates.length}%`,
                transform: `translateX(${safeActiveIndex * 100}%)`,
              }}
            />
          </div>
        )}

        {candidates.length > 1 && (
          <div className="sr-only" role="tablist" aria-label="Featured offers">
            {candidates.map((candidate, index) => (
              <button
                key={candidate.id}
                type="button"
                role="tab"
                aria-selected={index === safeActiveIndex}
                onClick={() => scrollToIndex(index)}
              >
                {cleanHeroTitle(candidate)}
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="mt-3 sm:mt-4">
        <TrustBenefitsRail />
      </div>
    </>
  );
}
