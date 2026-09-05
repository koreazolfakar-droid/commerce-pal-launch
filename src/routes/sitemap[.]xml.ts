import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { fetchAllProducts, fetchCollections } from "@/lib/shopify";
import { absoluteUrl } from "@/lib/seo";
import { buildCatalogIndex } from "@/lib/taxonomy";

interface SitemapEntry {
  path: string;
  changefreq?: "daily" | "weekly" | "monthly";
  priority?: string;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const [products, collections] = await Promise.all([
          fetchAllProducts(),
          fetchCollections(100),
        ]);
        const catalog = buildCatalogIndex(products);
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/shop", changefreq: "daily", priority: "0.9" },
          { path: "/collections", changefreq: "weekly", priority: "0.8" },
          ...catalog.categories
            .filter((category) => category.count > 0)
            .map((category) => ({ path: `/category/${encodeURIComponent(category.slug)}`, changefreq: "daily" as const, priority: "0.8" })),
          ...catalog.brands
            .filter((brand) => brand.count > 0)
            .map((brand) => ({ path: `/brand/${encodeURIComponent(brand.slug)}`, changefreq: "daily" as const, priority: "0.8" })),
          ...collections.map((collection) => ({ path: `/collections/${encodeURIComponent(collection.handle)}`, changefreq: "daily" as const, priority: "0.8" })),
          ...products.map((product) => ({ path: `/product/${encodeURIComponent(product.node.handle)}`, changefreq: "weekly" as const, priority: "0.9" })),
        ];

        const seen = new Set<string>();
        const urls = entries
          .filter((entry) => !seen.has(entry.path) && seen.add(entry.path))
          .map((entry) => [
            "  <url>",
            `    <loc>${escapeXml(absoluteUrl(entry.path))}</loc>`,
            entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : null,
            entry.priority ? `    <priority>${entry.priority}</priority>` : null,
            "  </url>",
          ].filter(Boolean).join("\n"));

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...urls,
          "</urlset>",
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        });
      },
    },
  },
});