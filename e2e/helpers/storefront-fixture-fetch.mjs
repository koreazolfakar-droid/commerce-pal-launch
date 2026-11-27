// Deterministic read transport for visual tests. Business writes are tested
// separately against the real local Supabase stack; this is never app code.
import { products } from "../catalog-fixture.mjs";

const slug = (value) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-");
const brands = [...new Set(products.map(({ node }) => node.vendor))].map((name, i) => ({
  id: `brand-${i}`,
  name,
  slug: slug(name),
  is_visible: true,
  sort_order: i,
}));
const categories = [...new Set(products.map(({ node }) => node.productType))].map((name, i) => ({
  id: `category-${i}`,
  name,
  slug: slug(name),
  is_active: true,
  sort_order: i,
}));
const collections = [
  { id: "collection-1", handle: "mixed-collection", title: "Mixed collection", is_active: true },
];
const tables = {
  cms_brands: brands,
  store_categories: categories,
  store_collections: collections,
  store_products: products.map(({ node }, i) => ({
    id: node.id,
    title: node.title,
    handle: node.handle,
    description: node.description,
    brand_id: brands.find((b) => b.name === node.vendor).id,
    category_id: categories.find((c) => c.name === node.productType).id,
    product_type: node.productType,
    base_price: Number(node.priceRange.minVariantPrice.amount),
    currency: "USD",
    status: "active",
    stock_quantity: 40,
    sku: `FIXTURE-${i}`,
    tags: node.tags,
    created_at: node.createdAt,
    updated_at: node.createdAt,
    sort_order: i,
  })),
  store_product_variants: products.flatMap(({ node }) =>
    node.variants.edges.map(({ node: variant }, i) => ({
      id: variant.id,
      product_id: node.id,
      title: variant.title,
      price: Number(variant.price.amount),
      compare_at_price: variant.compareAtPrice ? Number(variant.compareAtPrice.amount) : null,
      currency: "USD",
      stock_quantity: 20,
      track_inventory: true,
      allow_backorder: false,
      options: Object.fromEntries(variant.selectedOptions.map((o) => [o.name, o.value])),
      is_active: true,
      sort_order: i,
      sku: variant.sku,
      image_url: variant.image?.url,
    })),
  ),
  store_product_images: products.flatMap(({ node }) =>
    node.images.edges.map(({ node: picture }, i) => ({
      id: `${node.id}-image-${i}`,
      product_id: node.id,
      url: picture.url,
      thumbnail_url: picture.thumbnailUrl ?? null,
      alt_text: picture.altText,
      sort_order: i,
      is_primary: i === 0,
    })),
  ),
  store_collection_products: products.map(({ node }, i) => ({
    collection_id: "collection-1",
    product_id: node.id,
    sort_order: i,
  })),
};
export function fixtureResponse(input, init = {}) {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  const method = init.method || input.method || "GET";
  const headers = {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-expose-headers": "content-range",
  };
  const json = (body, status = 200) =>
    new Response(method === "HEAD" ? null : JSON.stringify(body), { status, headers });
  if (url.hostname.includes("space-call-rust-backend") && url.pathname.startsWith("/api/catalog/"))
    return json({ error: "fixture uses the Supabase fallback" }, 503);
  if (!url.hostname.endsWith(".supabase.co")) return null;
  if (method === "OPTIONS")
    return new Response(null, {
      status: 204,
      headers: {
        ...headers,
        "access-control-allow-headers": "*",
        "access-control-allow-methods": "GET,HEAD,POST,OPTIONS",
      },
    });
  if (url.pathname.endsWith("/functions/v1/public-cms"))
    return json({
      settings: {},
      heroSlides: [],
      sections: [],
      navigation: [],
      brands,
      seoPages: [],
    });
  if (!url.pathname.startsWith("/rest/v1/")) return null;
  if (!["GET", "HEAD"].includes(method)) return json({ error: "Read-only visual fixture" }, 403);
  const table = url.pathname.split("/").at(-1);
  const detail = table === "store_products" &&
    url.searchParams.get("select")?.includes("variants:store_product_variants(");
  let rows = [...(tables[table] || [])];
  for (const [key, value] of url.searchParams) {
    if (detail && key.includes(".")) continue;
    if (value.startsWith("eq.")) rows = rows.filter((r) => String(r[key]) === value.slice(3));
    if (value.startsWith("in.(")) {
      const values = value
        .slice(4, -1)
        .split(",")
        .map((v) => v.replace(/^"|"$/g, ""));
      rows = rows.filter((r) => values.includes(String(r[key])));
    }
  }
  const total = rows.length,
    offset = Number(url.searchParams.get("offset") || 0),
    limit = Number(url.searchParams.get("limit") || rows.length);
  rows = rows.slice(offset, offset + limit);
  if (detail) {
    rows = rows.map((row) => ({
      ...row,
      variants: tables.store_product_variants.filter((v) => v.product_id === row.id && v.is_active),
      images: tables.store_product_images.filter((i) => i.product_id === row.id),
      links: tables.store_collection_products
        .filter((link) => link.product_id === row.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .flatMap((link) => {
          const collection = collections.find((c) => c.id === link.collection_id && c.is_active);
          return collection ? [{ collection }] : [];
        }),
      brand: brands.find((brand) => brand.id === row.brand_id && brand.is_visible) ?? null,
      category: categories.find((category) => category.id === row.category_id) ?? null,
    }));
  }
  headers["content-range"] = rows.length
    ? `${offset}-${offset + rows.length - 1}/${total}`
    : `*/${total}`;
  const accept = new Headers(init.headers || input.headers).get("accept") || "";
  return json(accept.includes("vnd.pgrst.object") ? rows[0] || null : rows);
}
export async function installStorefrontFixture(page) {
  await page.route("**/*", async (route) => {
    const response = fixtureResponse(route.request().url(), {
      method: route.request().method(),
      headers: route.request().headers(),
    });
    if (!response) return route.continue();
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: await response.text(),
    });
  });
}
export async function createStorefrontPage(browser, options) {
  const page = await browser.newPage(options);
  if (process.env.SPACE_CALL_VISUAL_FIXTURES !== "0") await installStorefrontFixture(page);
  return page;
}
if (process.env.SPACE_CALL_VISUAL_FIXTURES === "1") {
  const original = globalThis.fetch;
  globalThis.fetch = (input, init) =>
    Promise.resolve(fixtureResponse(input, init) || original(input, init));
}
