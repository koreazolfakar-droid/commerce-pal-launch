import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";

import { CatalogView } from "@/components/CatalogView";
import { StoreLayout } from "@/components/StoreLayout";
import { applyFilters, parseProductSearch, type ProductFilters } from "@/lib/filters";
import { catalogQueryOptions, collectionsQueryOptions } from "@/lib/queries";
import { displayCollections } from "@/lib/taxonomy";
import { absoluteUrl, canonicalLink, itemListJsonLd, jsonLd } from "@/lib/seo";

export const Route = createFileRoute("/shop")({
  validateSearch: parseProductSearch,
  loader: async ({ context }) => {
    const catalog = await context.queryClient.ensureQueryData(catalogQueryOptions());
    context.queryClient.prefetchQuery(collectionsQueryOptions());
    return { products: catalog.products };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: "Shop All Tech — Space Cell" },
      {
        name: "description",
        content:
          "Browse the full Space Cell catalogue: smartphones, tablets, audio, wearables, chargers and accessories with filters, sorting and live stock.",
      },
      { property: "og:title", content: "Shop All Tech — Space Cell" },
      {
        property: "og:description",
        content: "Filter and sort the full Space Cell technology catalogue.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/shop") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Shop All Tech — Space Cell" },
      { name: "twitter:description", content: "Filter and sort the full Space Cell technology catalogue." },
    ],
    links: [canonicalLink("/shop")],
    scripts: loaderData ? [jsonLd(itemListJsonLd("Shop all products", loaderData.products))] : [],
  }),
  component: ShopPage,
});

function ShopPage() {
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions());
  const { data: collections } = useQuery(collectionsQueryOptions());
  const filters = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const products = applyFilters(catalog.products, catalog, filters);

  const update = (patch: Partial<ProductFilters>) =>
    navigate({ search: (prev: ProductFilters) => ({ ...prev, ...patch }) });

  return (
    <StoreLayout>
      <CatalogView
        title="Shop all products"
        description="Every product published in the store, straight from Shopify — filter by category, brand, collection, price and availability."
        products={products}
        total={catalog.products.length}
        filters={filters}
        facets={{
          categories: catalog.categories,
          brands: catalog.brands,
          collections: displayCollections(collections ?? []),
        }}
        priceMin={catalog.priceMin}
        priceMax={catalog.priceMax}
        currency={catalog.currency}
        onChange={update}
        onReset={() => navigate({ search: {} })}
      />
    </StoreLayout>
  );
}
