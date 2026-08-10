import { Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";

import { CompactProductCard } from "@/components/CompactProductCard";
import {
  discountPercent,
  fetchCollectionByHandle,
  type ShopifyCollection,
  type ShopifyProduct,
} from "@/lib/shopify";

function maxDiscount(products: ShopifyProduct[]) {
  const values = products
    .map((product) => {
      const variant = product.node.variants.edges[0]?.node;
      return discountPercent(
        variant?.price.amount ?? product.node.priceRange.minVariantPrice.amount,
        variant?.compareAtPrice?.amount ??
          product.node.compareAtPriceRange?.minVariantPrice.amount,
      );
    })
    .filter((value): value is number => value !== null);
  return values.length ? Math.max(...values) : null;
}

/**
 * One promo section per real Shopify collection: collection header panel plus a
 * horizontal rail of that collection's products.
 */
export function CollectionSections({ collections }: { collections: ShopifyCollection[] }) {
  const results = useQueries({
    queries: collections.map((collection) => ({
      queryKey: ["shopify-collection", collection.handle],
      queryFn: () => fetchCollectionByHandle(collection.handle, 12),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const sections = collections
    .map((collection, index) => ({
      collection,
      products: results[index]?.data?.products ?? [],
      isLoading: results[index]?.isLoading ?? false,
    }))
    .filter((section) => section.isLoading || section.products.length > 0);

  if (sections.length === 0) return null;

  return (
    <div className="space-y-6 px-4">
      {sections.map(({ collection, products, isLoading }) => {
        const discount = maxDiscount(products);
        const heroImage = collection.image?.url ?? products[0]?.node.images.edges[0]?.node.url;

        return (
          <section
            key={collection.id}
            className="overflow-hidden rounded-2xl border bg-card shadow-card"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_38%] items-center gap-2 bg-accent p-5">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-accent-foreground">
                  {collection.title}
                </h2>
                {collection.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {collection.description}
                  </p>
                )}
                {discount !== null && (
                  <p className="mt-2 text-sm font-semibold text-primary">
                    Up to {discount}% OFF
                  </p>
                )}
                <Link
                  to="/collections/$handle"
                  params={{ handle: collection.handle }}
                  className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  Shop {collection.title}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {heroImage && (
                <img
                  src={heroImage}
                  alt={collection.title}
                  loading="lazy"
                  width={360}
                  height={360}
                  className="aspect-square w-full object-contain"
                />
              )}
            </div>

            {isLoading ? (
              <div className="flex gap-4 p-4">
                {[0, 1, 2].map((key) => (
                  <div key={key} className="h-40 w-28 animate-pulse rounded-lg bg-surface" />
                ))}
              </div>
            ) : (
              <div className="scroll-rail flex divide-x">
                {products.map((product) => (
                  <div key={product.node.id} className="w-[9.5rem] shrink-0 p-4 lg:w-44">
                    <CompactProductCard product={product} />
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
