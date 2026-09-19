import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

import { CatalogView } from "@/components/CatalogView";
import { StoreLayout } from "@/components/StoreLayout";
import { applyFilters, parseProductSearch, type ProductFilters } from "@/lib/filters";
import { catalogQueryOptions, storefrontSearchQueryOptions } from "@/lib/queries";
import { absoluteUrl, canonicalLink } from "@/lib/seo";
import { STORE_NAME } from "@/lib/storeConfig";

export const Route = createFileRoute("/search")({
  validateSearch: parseProductSearch,
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(catalogQueryOptions());
  },
  head: () => ({
    meta: [
      { title: `Search products — ${STORE_NAME}` },
      {
        name: "description",
        content: `Search the ${STORE_NAME} catalogue of smartphones, tablets, audio, wearables and accessories with live pricing and availability.`,
      },
      { property: "og:title", content: `Search products — ${STORE_NAME}` },
      {
        property: "og:description",
        content: `Search the live ${STORE_NAME} technology catalogue.`,
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/search") },
      { name: "robots", content: "noindex, follow" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `Search products — ${STORE_NAME}` },
      {
        name: "twitter:description",
        content: `Search the live ${STORE_NAME} technology catalogue.`,
      },
    ],
    links: [canonicalLink("/search")],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions());
  const filters = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: nativeSearch } = useQuery(storefrontSearchQueryOptions(filters.q ?? ""));
  const sourceProducts = filters.q?.trim() ? (nativeSearch?.products ?? []) : catalog.products;
  const products = applyFilters(sourceProducts, catalog, { ...filters, q: undefined });

  return (
    <StoreLayout>
      <CatalogView
        title={filters.q ? `Results for “${filters.q}”` : "Search products"}
        description={`${products.length} matching product${products.length === 1 ? "" : "s"} from the live Space Call catalogue.`}
        products={products}
        total={catalog.products.length}
        filters={filters}
        facets={{ categories: catalog.categories, brands: catalog.brands }}
        priceMin={catalog.priceMin}
        priceMax={catalog.priceMax}
        currency={catalog.currency}
        onChange={(patch: Partial<ProductFilters>) =>
          navigate({ search: (prev: ProductFilters) => ({ ...prev, ...patch }) })
        }
        onReset={() => navigate({ search: {} })}
      />
    </StoreLayout>
  );
}
