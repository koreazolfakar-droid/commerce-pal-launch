import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { CatalogView } from "@/components/CatalogView";
import { StoreLayout } from "@/components/StoreLayout";
import { applyFilters, parseProductSearch, type ProductFilters } from "@/lib/filters";
import { catalogQueryOptions } from "@/lib/queries";
import { absoluteUrl, canonicalLink } from "@/lib/seo";

export const Route = createFileRoute("/search")({
  validateSearch: parseProductSearch,
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(catalogQueryOptions());
  },
  head: () => ({
    meta: [
      { title: "Search products — Space Cell" },
      {
        name: "description",
        content:
          "Search the Space Cell catalogue of smartphones, tablets, audio, wearables and accessories with live Shopify pricing.",
      },
      { property: "og:title", content: "Search products — Space Cell" },
      { property: "og:description", content: "Search the live Space Cell technology catalogue." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/search") },
      { name: "robots", content: "noindex, follow" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [canonicalLink("/search")],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions());
  const filters = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const products = applyFilters(catalog.products, catalog, filters);

  return (
    <StoreLayout>
      <CatalogView
        title={filters.q ? `Results for “${filters.q}”` : "Search products"}
        description={`${products.length} matching product${products.length === 1 ? "" : "s"} from the live Shopify catalogue.`}
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
