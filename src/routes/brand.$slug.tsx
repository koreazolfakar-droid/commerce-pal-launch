import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { CatalogView } from "@/components/CatalogView";
import { StoreLayout } from "@/components/StoreLayout";
import { applyFilters, parseProductSearch, type ProductFilters } from "@/lib/filters";
import { catalogQueryOptions } from "@/lib/queries";
import { absoluteUrl, breadcrumbJsonLd, canonicalLink, itemListJsonLd, jsonLd } from "@/lib/seo";

export const Route = createFileRoute("/brand/$slug")({
  validateSearch: parseProductSearch,
  loader: async ({ context, params }) => {
    const catalog = await context.queryClient.ensureQueryData(catalogQueryOptions());
    const brand = catalog.brands.find((entry) => entry.slug === params.slug);
    if (!brand) throw notFound();
    return {
      label: brand.label,
      products: catalog.products.filter(
        (product) => catalog.brandOf.get(product.node.handle)?.slug === params.slug,
      ),
    };
  },
  head: ({ params, loaderData }) => {
    const label = loaderData?.label ?? params.slug.replace(/-/g, " ");
    const description = `Shop ${label} devices and accessories at Space Cell with live Shopify pricing and stock.`;
    const path = `/brand/${params.slug}`;
    return {
      meta: [
        { title: `${label} products — Space Cell` },
        { name: "description", content: description },
        { property: "og:title", content: `${label} products — Space Cell` },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: absoluteUrl(path) },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [canonicalLink(path)],
      scripts: loaderData
        ? [
            jsonLd(breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: label, path }])),
            jsonLd(itemListJsonLd(`${label} products`, loaderData.products)),
          ]
        : [],
    };
  },
  component: BrandPage,
});

function BrandPage() {
  const { slug } = Route.useParams();
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions());
  const filters = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const brand = catalog.brands.find((entry) => entry.slug === slug);
  const inBrand = catalog.products.filter(
    (product) => catalog.brandOf.get(product.node.handle)?.slug === slug,
  );
  const products = applyFilters(inBrand, catalog, filters);

  const categories = catalog.categories.filter((category) =>
    inBrand.some((product) =>
      (catalog.categoryOf.get(product.node.handle) ?? []).includes(category.slug),
    ),
  );

  return (
    <StoreLayout>
      <CatalogView
        title={brand?.label ?? slug}
        description={`${inBrand.length} product${inBrand.length === 1 ? "" : "s"} from this brand, resolved automatically from Shopify vendor and product data.`}
        products={products}
        total={inBrand.length}
        filters={filters}
        facets={{ categories }}
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
