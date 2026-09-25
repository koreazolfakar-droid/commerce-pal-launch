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
import type { StoreCollection } from "@/lib/storeTypes";
import type { CatalogFacet } from "@/lib/taxonomy";

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

/** Normalizes category names for fallback matching without changing their displayed labels. */
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
  categories: catalogCategories,
  collections,
}: {
  categories: CatalogFacet[];
  collections: StoreCollection[];
}) {
  const { t, language } = useLanguage();
  const { data: cms } = useQuery(cmsQueryOptions());
  const { data: managedCategories } = useQuery({
    queryKey: ["storefront", "home-categories"],
    queryFn: fetchManagedHomeCategories,
    staleTime: 30_000,
  });

  const facetsBySlug = new Map(catalogCategories.map((category) => [category.slug, category]));
  const facetsByName = new Map(
    catalogCategories.map((category) => [normalizeCategoryName(category.label), category]),
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

  const fallbackItems: HomeCategoryItem[] = catalogCategories.map((category) => ({
    slug: category.slug,
    label: category.label,
    glyphSlug: category.slug,
    count: category.count,
  }));

  const categories = managedCategories !== undefined ? managedItems : fallbackItems;

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
      <div className="home-section-header flex-nowrap items-end">
        <div className="min-w-0 flex-1">
          <h2 id="home-categories" className="break-words text-xl font-bold tracking-[-0.02em]">
            {title}
          </h2>
        </div>
        <Link
          to="/categories"
          preload="intent"
          className="inline-flex min-h-10 shrink-0 items-center gap-1 text-xs font-bold text-primary transition-colors hover:text-primary/80 hover:underline"
        >
          {t("viewAll")} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Link>
      </div>

      <div className="relative -mx-4 sm:mx-0">
        <div
          className="category-home-rail flex snap-x snap-proximity gap-3 overflow-x-auto px-4 pb-2 pe-10 scroll-smooth [scroll-padding-inline:1rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4 sm:px-0 sm:pe-0 lg:gap-5"
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
            const imageUrl = cdnImage(category.image || artwork?.image?.url, 192);

            return (
              <Link
                key={category.slug}
                to="/category/$slug"
                params={{ slug: category.slug }}
                role="listitem"
                aria-label={label}
                preload="intent"
                className="category-home-item group flex w-[5.9rem] shrink-0 snap-start flex-col items-center gap-2 px-0.5 py-1 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-[6.65rem] sm:gap-2.5 lg:w-[7.15rem]"
              >
                <span
                  className="category-home-media relative grid h-[5.25rem] w-[5.25rem] shrink-0 place-items-center overflow-hidden rounded-xl border border-border/45 bg-card shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition-[border-color,box-shadow,transform] duration-150 group-hover:-translate-y-px group-hover:scale-[1.035] group-hover:border-primary/25 group-hover:shadow-[0_6px_16px_-12px_rgba(15,23,42,0.28)] sm:h-[5.65rem] sm:w-[5.65rem] lg:h-[6rem] lg:w-[6rem]"
                  aria-hidden="true"
                >
                  <span className="pointer-events-none absolute inset-0 bg-card" />
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      width={128}
                      height={128}
                      className="relative h-full w-full object-contain p-1"
                    />
                  ) : (
                    <CategoryGlyph
                      slug={category.glyphSlug}
                      className="relative h-[4.7rem] w-[4.7rem] sm:h-[5.05rem] sm:w-[5.05rem] lg:h-[5.35rem] lg:w-[5.35rem]"
                    />
                  )}
                </span>
                <h3 className="category-home-label line-clamp-2 min-h-[2.1rem] w-full max-w-full text-center text-[11.5px] font-semibold leading-[1.25] tracking-[-0.01em] text-foreground transition-colors group-hover:text-primary sm:min-h-[2.2rem] sm:text-xs">
                  {label}
                </h3>
              </Link>
            );
          })}
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 end-0 w-7 bg-gradient-to-l from-background via-background/75 to-transparent sm:hidden"
          aria-hidden="true"
        />
      </div>
    </section>
  );
}
