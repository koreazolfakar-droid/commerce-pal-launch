import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";

import { CatalogView } from "@/components/CatalogView";
import { StoreLayout } from "@/components/StoreLayout";
import { applyFilters, parseProductSearch, type ProductFilters } from "@/lib/filters";
import { catalogQueryOptions, collectionsQueryOptions } from "@/lib/queries";
import { displayCollections } from "@/lib/taxonomy";
import {
  breadcrumbJsonLd,
  canonicalLink,
  itemListJsonLd,
  jsonLd,
  socialMeta,
} from "@/lib/seo";
import { STORE_NAME } from "@/lib/storeConfig";

export const Route = createFileRoute("/shop")({
  validateSearch: parseProductSearch,
  loader: async ({ context }) => {
    const catalog = await context.queryClient.ensureQueryData(catalogQueryOptions());
    void context.queryClient.prefetchQuery(collectionsQueryOptions());
    return { products: catalog.products };
  },
  head: ({ loaderData }) => {
    const title = `Phones & Tech in Lebanon | ${STORE_NAME}`;
    const description = `Shop smartphones, tablets, laptops, audio, wearables, chargers and accessories in Lebanon at ${STORE_NAME} with live pricing and stock.`;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        {
          name: "robots",
          content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
        },
        ...socialMeta({ title, description, path: "/shop" }),
      ],
      links: [canonicalLink("/shop")],
      scripts: [
        jsonLd(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Shop", path: "/shop" },
          ]),
        ),
        ...(loaderData ? [jsonLd(itemListJsonLd("Shop all products", loaderData.products))] : []),
      ],
    };
  },
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
