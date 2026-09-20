import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { CategoryGlyph } from "@/components/CategoryGlyph";
import { publicSupabase } from "@/integrations/supabase/publicClient";
import { findCategoryArtworkCollection } from "@/lib/categoryArtwork";
import { cdnImage } from "@/lib/image";
import { localizeSection } from "@/lib/cms";
import { cmsQueryOptions } from "@/lib/cmsQuery";
import { categoryLabel, useLanguage } from "@/lib/i18n";
import type { ShopifyCollection } from "@/lib/shopify";
import type { CatalogIndex } from "@/lib/taxonomy";

type ManagedHomeCategory = {
  name: string;
  name_ar: string | null;
  slug: string;
  image_url: string | null;
  sort_order: number;
};

type HomeCategoryItem = {
  slug: string;
  label: string;
  labelAr?: string | null;
  image?: string;
  glyphSlug: string;
  count: number;
};

async function fetchManagedHomeCategories(): Promise<ManagedHomeCategory[]> {
  const { data, error } = await publicSupabase
    .from("store_categories")
    .select("name,name_ar,slug,image_url,sort_order")
    .eq("is_active", true)
    .eq("is_featured", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error(`Loading storefront categories failed: ${error.message}`);
  return (data ?? []) as ManagedHomeCategory[];
}

function normalizeCategoryName(value: string | undefined) {
  return value?.trim().toLocaleLowerCase() ?? "";
}

/**
 * Critical homepage category rail kept in its own small module so the heavier
 * bundle/brand merchandising code can stay out of the initial homepage chunk.
 *
 * When the Dashboard category query succeeds, Active + Featured rows are the
 * source of truth for homepage visibility, naming, imagery and ordering.
 * Existing catalog categories remain a safe fallback only when that query is
 * unavailable.
 */
export function HomeCategorySection({
  catalog,
  collections,
}: {
  catalog: CatalogIndex;
  collections: ShopifyCollection[];
}) {
  const { t, language } = useLanguage();
  const { data: cms } = useQuery(cmsQueryOptions());
  const { data: managedCategories, isError: managedCategoriesFailed } = useQuery({
    queryKey: ["storefront", "home-categories"],
    queryFn: fetchManagedHomeCategories,
    staleTime: 30_000,
  });

  const facetsBySlug = new Map(catalog.categories.map((category) => [category.slug, category]));
  const facetsByName = new Map(
    catalog.categories.map((category) => [normalizeCategoryName(category.label), category]),
  );

  const managedItems: HomeCategoryItem[] =
    managedCategories?.map((category) => {
      const facet =
        facetsBySlug.get(category.slug) ??
        facetsByName.get(normalizeCategoryName(category.name));

      return {
        slug: category.slug,
        label: category.name,
        labelAr: category.name_ar,
        image: category.image_url || undefined,
        glyphSlug: facet?.slug ?? category.slug,
        count: facet?.count ?? 0,
      };
    }) ?? [];

  const fallbackItems: HomeCategoryItem[] = catalog.categories.map((category) => ({
    slug: category.slug,
    label: category.label,
    glyphSlug: category.slug,
    count: category.count,
  }));

  const categories =
    managedCategories !== undefined
      ? managedItems
      : managedCategoriesFailed
        ? fallbackItems
        : fallbackItems;

  if (!categories.length) return null;

  const cmsSection = cms?.sections.find(
    (section) => section.page_slug === "home" && section.section_key === "categories",
  );
  const title =
    (cmsSection ? localizeSection(cmsSection, language).title?.trim() : "") ||
    (language === "ar" ? "تسوّق حسب الفئة" : "Shop by Category");

  return (
    <section
      aria-labelledby="home-categories"
      data-testid="category-section"
      className="overflow-hidden"
    >
      <div className="home-section-header">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <h2 id="home-categories" className="break-words text-xl font-bold tracking-tight">
              {title}
            </h2>
            <Link
              to="/categories"
              className="inline-flex shrink-0 items-center gap-1 px-1 py-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80 hover:underline"
            >
              {t("viewAll")} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </div>

      <div className="relative -mx-4 sm:mx-0">
        <div
          className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-2 pe-14 scroll-smooth [scroll-padding-inline:1rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4 sm:px-0 sm:pe-0 lg:gap-5"
          role="list"
          aria-label={title}
        >
          {categories.map((category) => {
            const label =
              language === "ar" && category.labelAr?.trim()
                ? category.labelAr.trim()
                : managedCategories !== undefined
                  ? category.label
                  : categoryLabel(category, language);
            const artwork = findCategoryArtworkCollection(
              collections,
              category.glyphSlug,
              category.label,
            );
            const imageUrl = cdnImage(category.image || artwork?.image?.url, 128);

            return (
              <Link
                key={category.slug}
                to="/category/$slug"
                params={{ slug: category.slug }}
                role="listitem"
                aria-label={label}
                className="group flex w-[5.8rem] shrink-0 snap-start flex-col items-center gap-2 px-1 py-1.5 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-[6.6rem] sm:gap-2.5 lg:w-[7.1rem]"
              >
                <span
                  className="relative grid h-[4.65rem] w-[4.65rem] shrink-0 place-items-center overflow-hidden rounded-xl border border-border/70 bg-card transition-colors duration-200 group-hover:border-primary/30 sm:h-[5.2rem] sm:w-[5.2rem] lg:h-[5.6rem] lg:w-[5.6rem]"
                  aria-hidden="true"
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      width={128}
                      height={128}
                      className="relative h-full w-full object-contain p-1.5 transition-transform duration-300 ease-out group-hover:scale-[1.02]"
                    />
                  ) : (
                    <CategoryGlyph
                      slug={category.glyphSlug}
                      className="relative h-[4.15rem] w-[4.15rem] transition-transform duration-300 ease-out group-hover:scale-[1.02] sm:h-[4.65rem] sm:w-[4.65rem] lg:h-[5rem] lg:w-[5rem]"
                    />
                  )}
                </span>
                <h3 className="line-clamp-2 min-h-[2rem] max-w-full text-center text-[11px] font-semibold leading-[1.15] tracking-[-0.015em] text-foreground transition-colors group-hover:text-primary sm:min-h-[2.1rem] sm:text-xs">
                  {label}
                </h3>
              </Link>
            );
          })}
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 end-0 w-10 bg-gradient-to-l from-background via-background/90 to-transparent sm:hidden"
          aria-hidden="true"
        />
      </div>
    </section>
  );
}
