import { createFileRoute, notFound, redirect, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";

import { CatalogView } from "@/components/CatalogView";
import { StoreLayout } from "@/components/StoreLayout";
import { publicSupabase } from "@/integrations/supabase/publicClient";
import { canonicalCategorySlug } from "@/lib/categoryCanonical";
import { categoryLabel, useLanguage } from "@/lib/i18n";
import { applyFilters, parseProductSearch, type ProductFilters } from "@/lib/filters";
import { catalogQueryOptions, collectionsQueryOptions } from "@/lib/queries";
import { categoryDefinition, displayCollections, productsInCategory } from "@/lib/taxonomy";
import { breadcrumbJsonLd, canonicalLink, cleanMetaDescription, itemListJsonLd, jsonLd, socialMeta } from "@/lib/seo";
import { STORE_NAME } from "@/lib/storeConfig";
import type { CatalogIndex } from "@/lib/taxonomy";

type ManagedStoreCategory = {
  name: string;
  name_ar: string | null;
  slug: string;
  description: string | null;
  image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
};

function normalizeCategoryName(value: string | undefined) {
  return value?.trim().toLocaleLowerCase() ?? "";
}

function productsInManagedCategory(catalog: CatalogIndex, categoryName: string) {
  const normalized = normalizeCategoryName(categoryName);
  return catalog.products.filter(
    (product) => normalizeCategoryName(product.node.productType) === normalized,
  );
}

async function fetchManagedCategory(slug: string): Promise<ManagedStoreCategory | null> {
  const { data, error } = await publicSupabase
    .from("store_categories")
    .select("name,name_ar,slug,description,image_url,seo_title,seo_description")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(`Loading storefront category failed: ${error.message}`);
  return (data as ManagedStoreCategory | null) ?? null;
}


export const Route = createFileRoute("/category/$slug")({
  validateSearch: parseProductSearch,
  beforeLoad: ({ params }) => {
    const canonicalSlug = canonicalCategorySlug(params.slug);
    if (canonicalSlug === "used-phone") {
      throw redirect({ to: "/used-phones", replace: true, statusCode: 308 });
    }
    if (canonicalSlug !== params.slug) {
      throw redirect({
        to: "/category/$slug",
        params: { slug: canonicalSlug },
        replace: true,
        statusCode: 308,
      });
    }
  },
  loader: async ({ context, params }) => {
    const [catalog, managedCategory] = await Promise.all([
      context.queryClient.ensureQueryData(catalogQueryOptions()),
      fetchManagedCategory(params.slug),
    ]);

    if (managedCategory) {
      const products = productsInManagedCategory(catalog, managedCategory.name);

      void context.queryClient.prefetchQuery(collectionsQueryOptions());
      return {
        label: managedCategory.name,
        labelAr: managedCategory.name_ar,
        managedCategoryName: managedCategory.name,
        description: managedCategory.description,
        imageUrl: managedCategory.image_url,
        seoTitle: managedCategory.seo_title,
        seoDescription: managedCategory.seo_description,
        products,
      };
    }

    const definition =
      catalog.categories.find((item) => item.slug === params.slug) ??
      categoryDefinition(params.slug);
    if (!definition) throw notFound();

    // Collections power optional filters only. Do not block the server response on
    // this secondary request: faster category HTML gives crawlers useful content sooner.
    void context.queryClient.prefetchQuery(collectionsQueryOptions());

    return {
      label: definition.label,
      labelAr: null,
      managedCategoryName: null,
      description: null,
      imageUrl: null,
      seoTitle: null,
      seoDescription: null,
      products: productsInCategory(catalog, params.slug),
    };
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
    const title =
      loaderData.seoTitle?.trim() || `${label} in Lebanon | ${STORE_NAME}`;
    const fallbackDescription = `Shop ${label.toLowerCase()} in Lebanon at ${STORE_NAME} with live stock, clear pricing and direct Space Call checkout.`;
    const description = cleanMetaDescription(
      loaderData.seoDescription || loaderData.description,
      fallbackDescription,
    );
    const path = `/category/${params.slug}`;
    const hasProducts = loaderData.products.length > 0;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        {
          name: "robots",
          content: hasProducts
            ? "index, follow, max-image-preview:large, max-snippet:-1"
            : "noindex, follow",
        },
        ...socialMeta({
          title,
          description,
          path,
          ...(loaderData.imageUrl ? { image: loaderData.imageUrl } : {}),
        }),
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
  const loaderData = Route.useLoaderData();
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions());
  const { data: collections } = useQuery(collectionsQueryOptions());
  const filters = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const definition =
    catalog.categories.find((item) => item.slug === slug) ?? categoryDefinition(slug);
  const label = loaderData.managedCategoryName
    ? language === "ar" && loaderData.labelAr?.trim()
      ? loaderData.labelAr.trim()
      : loaderData.label
    : definition
      ? categoryLabel(definition, language)
      : loaderData.label;
  const inCategory = loaderData.managedCategoryName
    ? productsInManagedCategory(catalog, loaderData.managedCategoryName)
    : productsInCategory(catalog, slug);
  const products = applyFilters(inCategory, catalog, filters);

  const update = (patch: Partial<ProductFilters>) =>
    navigate({ search: (prev: ProductFilters) => ({ ...prev, ...patch }) });

  const brands = catalog.brands.filter((brand) =>
    inCategory.some((product) => catalog.brandOf.get(product.node.handle)?.slug === brand.slug),
  );

  return (
    <StoreLayout>
      <CatalogView
        title={label}
        description={loaderData.description?.trim() || undefined}
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
        onChange={update}
        onReset={() => navigate({ search: {} })}
      />
    </StoreLayout>
  );
}
