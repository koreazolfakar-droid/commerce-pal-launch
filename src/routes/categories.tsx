import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { CategoryGlyph } from "@/components/CategoryGlyph";
import { StoreLayout } from "@/components/StoreLayout";
import { publicSupabase } from "@/integrations/supabase/publicClient";
import { categoryLabel, useLanguage } from "@/lib/i18n";
import { cdnImage } from "@/lib/image";
import { catalogQueryOptions } from "@/lib/queries";
import { absoluteUrl, breadcrumbJsonLd, canonicalLink, jsonLd, socialMeta } from "@/lib/seo";
import { STORE_NAME } from "@/lib/storeConfig";
import type { CatalogFacet } from "@/lib/taxonomy";

type ManagedStoreCategory = {
  name: string;
  name_ar: string | null;
  slug: string;
  image_url: string | null;
  sort_order: number;
};

type CategoryDisplayItem = {
  slug: string;
  label: string;
  imageUrl: string | undefined;
  glyphSlug: string;
};

async function fetchManagedStoreCategories(): Promise<ManagedStoreCategory[] | null> {
  const { data, error } = await publicSupabase
    .from("store_categories")
    .select("name,name_ar,slug,image_url,sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) return null;
  return (data ?? []) as ManagedStoreCategory[];
}

export const Route = createFileRoute("/categories")({
  loader: async ({ context }) => {
    const [catalog, managedCategories] = await Promise.all([
      context.queryClient.ensureQueryData(catalogQueryOptions()),
      fetchManagedStoreCategories(),
    ]);

    return { catalog, managedCategories };
  },
  head: ({ loaderData }) => {
    const title = `Electronics Categories in Lebanon | ${STORE_NAME}`;
    const description = `Browse smartphones, tablets, laptops, audio, gaming, chargers and electronics categories available from ${STORE_NAME} in Lebanon.`;
    const categories = loaderData
      ? loaderData.managedCategories !== null
        ? loaderData.managedCategories.map((category) => ({
            name: category.name,
            slug: category.slug,
          }))
        : loaderData.catalog.categories.map((category) => ({
            name: category.label,
            slug: category.slug,
          }))
      : [];

    return {
      meta: [
        { title },
        { name: "description", content: description },
        {
          name: "robots",
          content: categories.length
            ? "index, follow, max-image-preview:large, max-snippet:-1"
            : "noindex, follow",
        },
        ...socialMeta({ title, description, path: "/categories" }),
      ],
      links: [canonicalLink("/categories")],
      scripts: [
        jsonLd(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Categories", path: "/categories" },
          ]),
        ),
        ...(categories.length
          ? [
              jsonLd({
                "@context": "https://schema.org",
                "@type": "ItemList",
                name: `${STORE_NAME} product categories`,
                numberOfItems: categories.length,
                itemListElement: categories.map((category, index) => ({
                  "@type": "ListItem",
                  position: index + 1,
                  name: category.name,
                  url: absoluteUrl(`/category/${encodeURIComponent(category.slug)}`),
                })),
              }),
            ]
          : []),
      ],
    };
  },
  component: CategoriesPage,
});

function CategoriesPage() {
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions());
  const { managedCategories } = Route.useLoaderData();
  const { language } = useLanguage();

  const items: CategoryDisplayItem[] =
    managedCategories !== null
      ? managedCategories.map((category: ManagedStoreCategory) => ({
          slug: category.slug,
          label:
            language === "ar" && category.name_ar?.trim()
              ? category.name_ar.trim()
              : category.name,
          imageUrl: cdnImage(category.image_url || undefined, 240),
          glyphSlug: category.slug,
        }))
      : catalog.categories.map((category: CatalogFacet) => ({
          slug: category.slug,
          label: categoryLabel(category, language),
          imageUrl: undefined,
          glyphSlug: category.slug,
        }));

  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:py-9 lg:px-6">
        <header className="mb-6 max-w-2xl sm:mb-8">
          <h1 className="text-2xl font-bold tracking-[-0.025em] sm:text-4xl">
            {language === "ar" ? "كل التصنيفات" : "All Categories"}
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground sm:mt-2 sm:text-base">
            {language === "ar"
              ? "اختر الفئة للوصول إلى المنتجات بسرعة."
              : "Choose a category and jump straight to the products you need."}
          </p>
        </header>

        <div
          className="grid grid-cols-3 gap-x-2 gap-y-4 min-[480px]:grid-cols-4 sm:grid-cols-5 sm:gap-x-3 sm:gap-y-5 lg:grid-cols-7 xl:grid-cols-8"
          role="list"
          aria-label={language === "ar" ? "تصنيفات المتجر" : "Store categories"}
        >
          {items.map((category: CategoryDisplayItem) => (
            <Link
              key={category.slug}
              to="/category/$slug"
              params={{ slug: category.slug }}
              role="listitem"
              aria-label={category.label}
              className="group flex min-w-0 flex-col items-center gap-2 rounded-lg px-1.5 py-2 text-center transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:gap-2.5 sm:px-2"
            >
              <span
                className="relative grid h-[4.6rem] w-[4.6rem] shrink-0 place-items-center overflow-hidden rounded-lg border border-border/70 bg-card shadow-card transition-colors duration-150 group-hover:border-primary/25 sm:h-[5.3rem] sm:w-[5.3rem]"
                aria-hidden="true"
              >
                <span className="pointer-events-none absolute inset-0 bg-card" />
                {category.imageUrl ? (
                  <img
                    src={category.imageUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width={240}
                    height={240}
                    className="relative h-full w-full object-contain p-1.5"
                  />
                ) : (
                  <CategoryGlyph
                    slug={category.glyphSlug}
                    className="relative h-[4.1rem] w-[4.1rem] sm:h-[4.75rem] sm:w-[4.75rem]"
                  />
                )}
              </span>

              <h2 className="line-clamp-2 min-h-[2rem] max-w-full text-[11px] font-semibold leading-[1.3] tracking-[-0.01em] text-foreground transition-colors group-hover:text-primary sm:min-h-[2.15rem] sm:text-xs">
                {category.label}
              </h2>
            </Link>
          ))}
        </div>
      </div>
    </StoreLayout>
  );
}
