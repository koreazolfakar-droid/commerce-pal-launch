import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { publicSupabase } from "@/integrations/supabase/publicClient";
import type { Tables } from "@/integrations/supabase/types";
import { isCanonicalCategorySlug } from "@/lib/categoryCanonical";
import { absoluteUrl } from "@/lib/seo";
import type { StoreCollection, StoreProduct } from "@/lib/storeTypes";
import { buildCatalogIndex, displayCollections } from "@/lib/taxonomy";
import { isUsedPhone } from "@/lib/usedPhones";

interface SitemapEntry {
  path: string;
  lastmod?: string;
}

type SitemapProductRow = Pick<
  Tables<"store_products">,
  "id" | "title" | "handle" | "brand_id" | "product_type" | "tags" | "created_at" | "updated_at"
>;
type SitemapBrandRow = Pick<Tables<"cms_brands">, "id" | "name">;
type SitemapCategoryRow = Pick<Tables<"store_categories">, "name" | "slug">;
type SitemapCollectionRow = Pick<
  Tables<"store_collections">,
  "id" | "handle" | "title" | "description" | "image_url"
>;
type SitemapCollectionLinkRow = Pick<
  Tables<"store_collection_products">,
  "collection_id" | "product_id"
>;

const QUERY_PAGE_SIZE = 1000;
const MAX_SITEMAP_URLS = 50_000;

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rowLastmod(row: Pick<SitemapProductRow, "updated_at" | "created_at">) {
  return (row.updated_at || row.created_at)?.slice(0, 10);
}

async function fetchAllActiveProducts(): Promise<SitemapProductRow[]> {
  const rows: SitemapProductRow[] = [];
  for (let offset = 0; ; offset += QUERY_PAGE_SIZE) {
    const { data, error } = await publicSupabase
      .from("store_products")
      .select("id,title,handle,brand_id,product_type,tags,created_at,updated_at")
      .eq("status", "active")
      .order("id", { ascending: true })
      .range(offset, offset + QUERY_PAGE_SIZE - 1);
    if (error) throw new Error(`Loading sitemap products failed: ${error.message}`);
    const page = (data ?? []) as SitemapProductRow[];
    rows.push(...page);
    if (page.length < QUERY_PAGE_SIZE) break;
  }
  return rows;
}

async function fetchAllCollectionLinks(): Promise<SitemapCollectionLinkRow[]> {
  const rows: SitemapCollectionLinkRow[] = [];
  for (let offset = 0; ; offset += QUERY_PAGE_SIZE) {
    const { data, error } = await publicSupabase
      .from("store_collection_products")
      .select("collection_id,product_id")
      .order("collection_id", { ascending: true })
      .order("product_id", { ascending: true })
      .range(offset, offset + QUERY_PAGE_SIZE - 1);
    if (error) throw new Error(`Loading sitemap collection links failed: ${error.message}`);
    const page = (data ?? []) as SitemapCollectionLinkRow[];
    rows.push(...page);
    if (page.length < QUERY_PAGE_SIZE) break;
  }
  return rows;
}

async function fetchSitemapSupportData() {
  const [brandResult, categoryResult, collectionResult, links] = await Promise.all([
    publicSupabase
      .from("cms_brands")
      .select("id,name")
      .eq("is_visible", true)
      .order("name", { ascending: true }),
    publicSupabase
      .from("store_categories")
      .select("name,slug")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    publicSupabase
      .from("store_collections")
      .select("id,handle,title,description,image_url")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true }),
    fetchAllCollectionLinks(),
  ]);

  if (brandResult.error) throw new Error(`Loading sitemap brands failed: ${brandResult.error.message}`);
  if (categoryResult.error) {
    throw new Error(`Loading sitemap categories failed: ${categoryResult.error.message}`);
  }
  if (collectionResult.error) {
    throw new Error(`Loading sitemap collections failed: ${collectionResult.error.message}`);
  }

  return {
    brands: (brandResult.data ?? []) as SitemapBrandRow[],
    categories: (categoryResult.data ?? []) as SitemapCategoryRow[],
    collections: (collectionResult.data ?? []) as SitemapCollectionRow[],
    links,
  };
}

function toSeoProduct(row: SitemapProductRow, brandName?: string): StoreProduct {
  return {
    node: {
      id: row.id,
      title: row.title,
      description: "",
      handle: row.handle,
      vendor: brandName,
      productType: row.product_type ?? undefined,
      availableForSale: true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tags: row.tags,
      priceRange: { minVariantPrice: { amount: "0", currencyCode: "USD" } },
      images: { edges: [] },
      collections: { edges: [] },
      variants: { edges: [] },
      options: [],
    },
  };
}

function toStoreCollection(row: SitemapCollectionRow): StoreCollection {
  return {
    id: row.id,
    handle: row.handle,
    title: row.title,
    description: row.description,
    image: row.image_url ? { url: row.image_url, altText: row.title } : null,
  };
}

function buildStaticEntries(hasUsedPhones: boolean): SitemapEntry[] {
  return [
    { path: "/" },
    { path: "/ar" },
    { path: "/shop" },
    { path: "/categories" },
    { path: "/brands" },
    { path: "/collections" },
    ...(hasUsedPhones ? [{ path: "/used-phones" }] : []),
    ...[
      "help",
      "contact",
      "shipping",
      "returns",
      "warranty",
      "faq",
      "about",
      "privacy",
      "terms",
    ].map((path) => ({ path: `/${path}` })),
  ];
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const [productResult, supportResult] = await Promise.allSettled([
          fetchAllActiveProducts(),
          fetchSitemapSupportData(),
        ]);

        if (productResult.status === "rejected" || supportResult.status === "rejected") {
          console.error(
            "Sitemap generation failed.",
            productResult.status === "rejected" ? productResult.reason : supportResult.reason,
          );
          return new Response("Sitemap data is temporarily unavailable.", {
            status: 503,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-store",
              "Retry-After": "300",
              "X-Robots-Tag": "noindex",
            },
          });
        }

        const productRows = productResult.value;
        const support = supportResult.value;

        const brandsById = new Map(support.brands.map((brand) => [brand.id, brand.name]));
        const products = productRows.map((row) =>
          toSeoProduct(row, row.brand_id ? brandsById.get(row.brand_id) : undefined),
        );
        const catalog = buildCatalogIndex(products);
        const activeProductIds = new Set(productRows.map((row) => row.id));
        const nonEmptyCollectionIds = new Set(
          support.links
            .filter((link) => activeProductIds.has(link.product_id))
            .map((link) => link.collection_id),
        );
        const productTypes = new Set(
          productRows
            .map((row) => row.product_type?.trim().toLocaleLowerCase())
            .filter((value): value is string => Boolean(value)),
        );
        const managedCategories = support.categories.filter((category) =>
          productTypes.has(category.name.trim().toLocaleLowerCase()),
        );
        const collections = displayCollections(
          support.collections
            .filter((collection) => nonEmptyCollectionIds.has(collection.id))
            .map(toStoreCollection),
        );

        const dynamicEntries: SitemapEntry[] = [
          ...catalog.categories
            .filter((category) => category.count > 0 && isCanonicalCategorySlug(category.slug))
            .map((category) => ({ path: `/category/${encodeURIComponent(category.slug)}` })),
          ...managedCategories.map((category) => ({
            path: `/category/${encodeURIComponent(category.slug)}`,
          })),
          ...catalog.brands
            .filter((brand) => brand.count > 0)
            .map((brand) => ({ path: `/brand/${encodeURIComponent(brand.slug)}` })),
          ...collections.map((collection) => ({
            path: `/collections/${encodeURIComponent(collection.handle)}`,
          })),
          ...productRows.map((product) => ({
            path: `/product/${encodeURIComponent(product.handle)}`,
            lastmod: rowLastmod(product),
          })),
        ];

        const entries: SitemapEntry[] = [
          ...buildStaticEntries(products.some(isUsedPhone)),
          ...dynamicEntries,
        ];
        const seen = new Set<string>();
        const canonicalEntries = entries.filter(
          (entry) => !seen.has(entry.path) && seen.add(entry.path),
        );

        if (canonicalEntries.length > MAX_SITEMAP_URLS) {
          return new Response("Sitemap exceeds the 50,000 URL protocol limit.", {
            status: 503,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-store",
              "X-Robots-Tag": "noindex",
            },
          });
        }

        const urls = canonicalEntries.map((entry) =>
          [
            "  <url>",
            `    <loc>${escapeXml(absoluteUrl(entry.path))}</loc>`,
            entry.lastmod ? `    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : null,
            "  </url>",
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...urls,
          "</urlset>",
        ].join("\n");

        return new Response(xml, {
          status: 200,
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
            "X-Robots-Tag": "noindex, follow",
          },
        });
      },
    },
  },
});
