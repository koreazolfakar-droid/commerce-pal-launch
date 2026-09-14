import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";

import { CatalogView } from "@/components/CatalogView";
import { StoreLayout } from "@/components/StoreLayout";
import { categoryLabel, useLanguage } from "@/lib/i18n";
import { applyFilters, parseProductSearch, type ProductFilters } from "@/lib/filters";
import { catalogQueryOptions, collectionsQueryOptions } from "@/lib/queries";
import { categoryDefinition, displayCollections, productsInCategory } from "@/lib/taxonomy";
import { breadcrumbJsonLd, canonicalLink, itemListJsonLd, jsonLd, socialMeta } from "@/lib/seo";
import { STORE_NAME } from "@/lib/storeConfig";

export const Route = createFileRoute("/category/$slug")({
  validateSearch: parseProductSearch,
  loader: async ({ context, params }) => {
    const catalog = await context.queryClient.ensureQueryData(catalogQueryOptions());
    const definition =
      catalog.categories.find((item) => item.slug === params.slug) ??
      categoryDefinition(params.slug);
    if (!definition) throw notFound();

    // Collections power optional filters only. Do not block the server response on
    // this secondary request: faster category HTML gives crawlers useful content sooner.
    void context.queryClient.prefetchQuery(collectionsQueryOptions());

    return { label: definition.label, products: productsInCategory(catalog, params.slug) };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: `Category unavailable — ${STORE_NAME}` },
          { name: "robots", content: "noindex, follow" },
        ],
      };
    }
    const label = loaderData.label ?? categoryDefinition(params.slug)?.label ?? "Category";
    const title = `${label} in Lebanon | ${STORE_NAME}`;
    const description = `Shop ${label.toLowerCase()} in Lebanon at ${STORE_NAME} with live stock, clear pricing and secure Shopify checkout.`;
    const path = `/category/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "index, follow, max-image-preview:large" },
        ...socialMeta({ title, description, path }),
      ],
      links: [canonicalLink(path)],
      scripts: [
        jsonLd(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Categories", path: "/categories" },
            { name: label, path },
          ]),
        ),
        jsonLd(itemListJsonLd(label, loaderData.products)),
      ],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { t, language } = useLanguage();
  const { slug } = Route.useParams();
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions());
  const { data: collections } = useQuery(collectionsQueryOptions());
  const filters = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const definition =
    catalog.categories.find((item) => item.slug === slug) ?? categoryDefinition(slug);
  const label = definition ? categoryLabel(definition, language) : slug;
  const inCategory = productsInCategory(catalog, slug);
  const products = applyFilters(inCategory, catalog, filters);

  const update = (patch: Partial<ProductFilters>) =>
    navigate({ search: (prev: ProductFilters) => ({ ...prev, ...patch }) });

  const brands = catalog.brands.filter((brand) =>
    inCategory.some((product) => catalog.brandOf.get(product.node.handle)?.slug === brand.slug),
  );

  const header = (
    <div className="mb-6 rounded-2xl border bg-card p-4 sm:p-5">
      <h2 className="text-base font-extrabold tracking-tight sm:text-lg">
        {language === "ar" ? `${label} في لبنان` : `${label} in Lebanon`}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
        {language === "ar"
          ? `تصفح ${label} المتوفرة لدى Space Call مع أسعار واضحة، توفر مباشر وخيارات من علامات تجارية متعددة، وإتمام شراء آمن عبر Shopify.`
          : `Browse ${label.toLowerCase()} available at Space Call with clear pricing, live availability, multiple brands and secure Shopify checkout.`}
      </p>
    </div>
  );

  return (
    <StoreLayout>
      <CatalogView
        title={label}
        description={`${inCategory.length} ${t(inCategory.length === 1 ? "product" : "products")}`}
        products={products}
        total={inCategory.length}
        filters={filters}
        facets={{
          brands,
          collections: displayCollections(collections ?? []),
        }}
        priceMin={catalog.priceMin}
        priceMax={catalog.priceMax}
        currency={catalog.currency}
        header={header}
        onChange={update}
        onReset={() => navigate({ search: {} })}
      />
    </StoreLayout>
  );
}
