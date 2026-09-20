import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { CategoryGlyph } from "@/components/CategoryGlyph";
import { StoreLayout } from "@/components/StoreLayout";
import { publicSupabase } from "@/integrations/supabase/publicClient";
import { findCategoryArtworkCollection } from "@/lib/categoryArtwork";
import { categoryLabel, useLanguage } from "@/lib/i18n";
import { cdnImage } from "@/lib/image";
import { catalogQueryOptions, collectionsQueryOptions } from "@/lib/queries";
import { absoluteUrl, canonicalLink } from "@/lib/seo";
import { STORE_NAME } from "@/lib/storeConfig";

type ManagedStoreCategory = {
  name: string;
  name_ar: string | null;
  slug: string;
  image_url: string | null;
  sort_order: number;
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
    const [catalog, collections, managedCategories] = await Promise.all([
      context.queryClient.ensureQueryData(catalogQueryOptions()),
      context.queryClient.ensureQueryData(collectionsQueryOptions()),
      fetchManagedStoreCategories(),
    ]);

    return { catalog, collections, managedCategories };
  },
  head: () => ({
    meta: [
      { title: `Categories — ${STORE_NAME}` },
      {
        name: "description",
        content: `Browse all product categories available at ${STORE_NAME}.`,
      },
      { property: "og:title", content: `Categories — ${STORE_NAME}` },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/categories") },
    ],
    links: [canonicalLink("/categories")],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions());
  const { data: collections = [] } = useSuspenseQuery(collectionsQueryOptions());
  const { managedCategories } = Route.useLoaderData();
  const { language } = useLanguage();

  const items =
    managedCategories !== null
      ? managedCategories.map((category: ManagedStoreCategory) => {
          const artwork = findCategoryArtworkCollection(
            collections,
            category.slug,
            category.name,
          );

          return {
            slug: category.slug,
            label:
              language === "ar" && category.name_ar?.trim()
                ? category.name_ar.trim()
                : category.name,
            imageUrl: cdnImage(category.image_url || artwork?.image?.url, 240),
            glyphSlug: category.slug,
          };
        })
      : catalog.categories.map((category) => {
          const artwork = findCategoryArtworkCollection(
            collections,
            category.slug,
            category.label,
          );

          return {
            slug: category.slug,
            label: categoryLabel(category, language),
            imageUrl: cdnImage(artwork?.image?.url, 240),
            glyphSlug: category.slug,
          };
        });

  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:py-9 lg:px-6">
        <header className="mb-6 max-w-2xl sm:mb-8">
          <h1 className="text-2xl font-black tracking-[-0.035em] sm:text-4xl">
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
          {items.map((category) => (
            <Link
              key={category.slug}
              to="/category/$slug"
              params={{ slug: category.slug }}
              role="listitem"
              aria-label={category.label}
              className="group flex min-w-0 flex-col items-center gap-2 rounded-2xl px-1.5 py-2 text-center transition duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:gap-2.5 sm:px-2"
            >
              <span
                className="relative grid h-[4.6rem] w-[4.6rem] shrink-0 place-items-center overflow-hidden rounded-[1.35rem] border border-border/70 bg-card shadow-card transition duration-300 group-hover:border-primary/25 group-hover:shadow-card-hover sm:h-[5.3rem] sm:w-[5.3rem] sm:rounded-[1.55rem]"
                aria-hidden="true"
              >
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white via-white to-slate-50 dark:from-card dark:via-card dark:to-surface" />
                <span className="pointer-events-none absolute inset-x-3 top-1 h-px bg-white/80 dark:bg-white/10" />
                {category.imageUrl ? (
                  <img
                    src={category.imageUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width={240}
                    height={240}
                    className="relative h-full w-full object-contain p-1.5 transition-transform duration-300 ease-out group-hover:scale-[1.06]"
                  />
                ) : (
                  <CategoryGlyph
                    slug={category.glyphSlug}
                    className="relative h-[4.1rem] w-[4.1rem] transition-transform duration-300 ease-out group-hover:scale-[1.06] sm:h-[4.75rem] sm:w-[4.75rem]"
                  />
                )}
              </span>

              <h2 className="line-clamp-2 min-h-[2rem] max-w-full text-[11px] font-extrabold leading-[1.15] tracking-[-0.015em] text-foreground transition-colors group-hover:text-primary sm:min-h-[2.15rem] sm:text-xs">
                {category.label}
              </h2>
            </Link>
          ))}
        </div>
      </div>
    </StoreLayout>
  );
}
