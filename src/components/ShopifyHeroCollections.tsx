import { useQueries } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";

import { TrustBenefitsRail } from "@/components/TrustBenefitsRail";
import { useHydrated } from "@/hooks/useHydrated";
import { cdnImage, cdnSrcSet } from "@/lib/image";
import { homeHeroCollections } from "@/lib/homeMerchandising";
import { collectionQueryOptions } from "@/lib/queries";
import type { ShopifyCollection, ShopifyProduct } from "@/lib/shopify";

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

type HeroImage = {
  url: string;
  altText: string | null;
  width?: number | null;
  height?: number | null;
};

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
  const candidates = useMemo(() => homeHeroCollections(collections), [collections]);
  const hydrated = useHydrated();
  const candidate = candidates[0] ?? null;

  const queries = useQueries({
    queries: candidate
      ? [
          {
            ...collectionQueryOptions(candidate.handle, 3),
            enabled: hydrated,
          },
        ]
      : [],
  });

  if (!candidate) return <TrustBenefitsRail />;

  const activeQuery = queries[0];
  const resolvedCollection = activeQuery?.data?.collection ?? candidate;
  const products = activeQuery?.data?.products ?? [];
  const promotedProduct = promotedProductForHero(resolvedCollection, products);
  const heroImage = (
    resolvedCollection.image ??
    candidate.image ??
    products[0]?.node.images.edges[0]?.node ??
    null
  ) as HeroImage | null;
  const heroTitle = cleanHeroTitle(resolvedCollection);

  const visual = heroImage?.url ? (
    <span
      className="relative block w-full overflow-hidden rounded-[clamp(0.9rem,3.4vw,2rem)] border border-border/70 bg-surface leading-none shadow-card"
      data-testid="collection-hero-visual"
    >
      <img
        src={cdnImage(heroImage.url, 1800)}
        srcSet={cdnSrcSet(heroImage.url, 1800)}
        sizes="(max-width: 639px) calc(100vw - 1.5rem), (min-width: 1280px) 1280px, 100vw"
        alt={heroImage.altText ?? resolvedCollection.title}
        width={heroImage.width ?? 1672}
        height={heroImage.height ?? 941}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        draggable={false}
        className="m-0 block h-auto w-full max-w-none select-none object-contain object-center align-top"
      />

      {activeQuery?.isFetching && !activeQuery?.isPending && (
        <span className="absolute end-4 top-4 z-20 hidden h-9 w-9 place-items-center rounded-full border border-border/70 bg-background/80 shadow-sm backdrop-blur sm:grid sm:end-6 sm:top-6">
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
        </span>
      )}
    </span>
  ) : null;

  return (
    <>
      {visual && (
        <section className="min-w-0 w-full" aria-label="Featured offer" data-testid="collection-hero-single">
          {promotedProduct ? (
            <Link
              to="/product/$handle"
              params={{ handle: promotedProduct.node.handle }}
              className="block w-full"
              aria-label={`${heroTitle}: ${promotedProduct.node.title}`}
            >
              {visual}
            </Link>
          ) : (
            <Link
              to="/collections/$handle"
              params={{ handle: resolvedCollection.handle }}
              className="block w-full"
              aria-label={heroTitle}
            >
              {visual}
            </Link>
          )}
        </section>
      )}

      <div className={visual ? "mt-3 sm:mt-4" : undefined}>
        <TrustBenefitsRail />
      </div>
    </>
  );
}
