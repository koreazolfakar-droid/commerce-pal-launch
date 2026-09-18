import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import {
  fetchCatalogProducts,
  fetchCollections,
  type StoreCollection,
  type StoreProduct,
} from "@/lib/storefrontFacade";
import { absoluteUrl } from "@/lib/seo";
import { buildCatalogIndex, displayCollections } from "@/lib/taxonomy";

interface SitemapEntry {
  path: string;
  lastmod?: string;
}

const PAGE_SIZE = 100;

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function fetchAllProductsForSitemap(): Promise<StoreProduct[]> {
  return fetchCatalogProducts(PAGE_SIZE);
}

async function fetchAllCollectionsForSitemap(): Promise<StoreCollection[]> {
  return fetchCollections(PAGE_SIZE);
}

function productLastmod(product: StoreProduct) {
  const node = product.node as StoreProduct["node"] & { updatedAt?: string };
  return (node.updatedAt || node.createdAt)?.slice(0, 10);
}

function collectionLastmod(collection: StoreCollection) {
  return (collection as StoreCollection & { updatedAt?: string }).updatedAt?.slice(0, 10);
}

function buildStaticEntries(): SitemapEntry[] {
  return [
    { path: "/" },
    { path: "/ar" },
    { path: "/shop" },
    { path: "/categories" },
    { path: "/brands" },
    { path: "/used-phones" },
    { path: "/collections" },
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
        const [productsResult, collectionsResult] = await Promise.allSettled([
          fetchAllProductsForSitemap(),
          fetchAllCollectionsForSitemap(),
        ]);

        const products = productsResult.status === "fulfilled" ? productsResult.value : [];
        const collections = collectionsResult.status === "fulfilled" ? collectionsResult.value : [];

        let dynamicEntries: SitemapEntry[] = [];

        try {
          const catalog = buildCatalogIndex(products);
          dynamicEntries = [
            ...catalog.categories
              .filter((category) => category.count > 0)
              .map((category) => ({
                path: `/category/${encodeURIComponent(category.slug)}`,
              })),
            ...catalog.brands
              .filter((brand) => brand.count > 0)
              .map((brand) => ({
                path: `/brand/${encodeURIComponent(brand.slug)}`,
              })),
            ...displayCollections(collections).map((collection) => ({
              path: `/collections/${encodeURIComponent(collection.handle)}`,
              lastmod: collectionLastmod(collection),
            })),
            ...products.map((product) => ({
              path: `/product/${encodeURIComponent(product.node.handle)}`,
              lastmod: productLastmod(product),
            })),
          ];
        } catch {
          dynamicEntries = [];
        }

        const entries: SitemapEntry[] = [...buildStaticEntries(), ...dynamicEntries];
        const seen = new Set<string>();
        const urls = entries
          .filter((entry) => !seen.has(entry.path) && seen.add(entry.path))
          .map((entry) =>
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
