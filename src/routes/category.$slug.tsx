import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";

import { CatalogView } from "@/components/CatalogView";
import { CategoryGlyph } from "@/components/CategoryGlyph";
import { StoreLayout } from "@/components/StoreLayout";
import { publicSupabase } from "@/integrations/supabase/publicClient";
import { categoryLabel, useLanguage } from "@/lib/i18n";
import { cdnImage } from "@/lib/image";
import { applyFilters, parseProductSearch, type ProductFilters } from "@/lib/filters";
import { catalogQueryOptions, collectionsQueryOptions } from "@/lib/queries";
import { categoryDefinition, displayCollections, productsInCategory } from "@/lib/taxonomy";
import { breadcrumbJsonLd, canonicalLink, itemListJsonLd, jsonLd, socialMeta } from "@/lib/seo";
import { STORE_NAME } from "@/lib/storeConfig";
import type { CatalogIndex } from "@/lib/taxonomy";
import { BadgeCheck, Boxes } from "lucide-react";

type ManagedStoreCategory = {
  name: string;
  name_ar: string | null;
  slug: string;
  description: string | null;
  image_url: string | null;
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
    .select("name,name_ar,slug,description,image_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(`Loading storefront category failed: ${error.message}`);
  return (data as ManagedStoreCategory | null) ?? null;
}

export const Route = createFileRoute("/category/$slug")({
  validateSearch: parseProductSearch,
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
    const title = `${label} in Lebanon | ${STORE_NAME}`;
    const description = `Shop ${label.toLowerCase()} in Lebanon at ${STORE_NAME} with live stock, clear pricing and direct Space Call checkout.`;
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

  const heroImage = cdnImage(loaderData.imageUrl || undefined, 520);
  const seoDescription =
    loaderData.description?.trim() ||
    (language === "ar"
      ? `تصفح ${label} المتوفرة لدى Space Call مع أسعار واضحة، توفر مباشر وخيارات من علامات تجارية متعددة، وإتمام الطلب مباشرة عبر Space Call.`
      : `Browse ${label.toLowerCase()} available at Space Call with clear pricing, live availability, multiple brands and direct Space Call checkout.`);

  const topContent = (
    <section className="mb-4 overflow-hidden rounded-[1.35rem] border bg-gradient-to-br from-card via-card to-primary/[0.045] shadow-card sm:mb-5 sm:rounded-[1.5rem]">
      <div className="grid gap-4 p-3.5 min-[390px]:p-4 sm:grid-cols-[minmax(0,1fr)_10.5rem] sm:items-center sm:gap-5 sm:p-5 lg:grid-cols-[minmax(0,1fr)_12rem] lg:p-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/[0.08] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-primary">
              <Boxes className="h-3.5 w-3.5" />
              {language === "ar" ? "تصنيف" : "Category"}
            </span>
          </div>

          <h1 className="mt-3 text-[1.65rem] font-black leading-tight tracking-[-0.035em] sm:text-3xl lg:text-[2.15rem]">
            {label}
          </h1>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">
            {seoDescription}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-success/[0.08] px-2.5 py-1.5 text-[10px] font-bold text-success sm:text-[11px]">
              <BadgeCheck className="h-3.5 w-3.5" />
              {language === "ar" ? "توفر مباشر" : "Live availability"}
            </span>
            <span className="inline-flex items-center rounded-lg bg-surface px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground sm:text-[11px]">
              {brands.length} {language === "ar" ? "علامات تجارية" : "brands"}
            </span>
          </div>
        </div>

        <div className="mx-auto grid h-28 w-28 place-items-center overflow-hidden rounded-[1.4rem] border border-border/70 bg-image-stage shadow-card sm:h-36 sm:w-36 lg:h-40 lg:w-40">
          {heroImage ? (
            <img
              src={heroImage}
              alt=""
              width={520}
              height={520}
              decoding="async"
              className="h-full w-full object-contain p-2.5 sm:p-3"
            />
          ) : (
            <CategoryGlyph slug={slug} className="h-24 w-24 sm:h-32 sm:w-32 lg:h-36 lg:w-36" />
          )}
        </div>
      </div>
    </section>
  );

  return (
    <StoreLayout>
      <CatalogView
        title={label}
        topContent={topContent}
        hideHeading
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
