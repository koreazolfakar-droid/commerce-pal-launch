import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";

import { CatalogView } from "@/components/CatalogView";
import { StoreLayout } from "@/components/StoreLayout";
import { applyFilters, parseProductSearch, type ProductFilters } from "@/lib/filters";
import { catalogQueryOptions, collectionsQueryOptions } from "@/lib/queries";
import { displayCollections } from "@/lib/taxonomy";
import { absoluteUrl, canonicalLink, itemListJsonLd, jsonLd } from "@/lib/seo";
import { STORE_NAME } from "@/lib/storeConfig";

export const Route = createFileRoute("/shop")({
  validateSearch: parseProductSearch,
  loader: async ({ context }) => {
    const catalog = await context.queryClient.ensureQueryData(catalogQueryOptions());
    context.queryClient.prefetchQuery(collectionsQueryOptions());
    return { products: catalog.products };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `Phones & Tech in Lebanon | ${STORE_NAME}` },
      {
        name: "description",
        content: `Shop smartphones, tablets, audio, wearables, chargers and accessories in Lebanon from ${STORE_NAME}, with live pricing and stock from Shopify.`,
      },
      { property: "og:title", content: `Phones & Tech in Lebanon | ${STORE_NAME}` },
      {
        property: "og:description",
        content: `Browse ${STORE_NAME} phones, tablets and accessories in Lebanon with live pricing and stock.`,
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/shop") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `Phones & Tech in Lebanon | ${STORE_NAME}` },
      {
        name: "twitter:description",
        content: `Browse ${STORE_NAME} phones, tablets and accessories in Lebanon with live pricing and stock.`,
      },
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
        description="Browse Space Call phones, tablets, audio, wearables and accessories available for shoppers in Lebanon."
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
