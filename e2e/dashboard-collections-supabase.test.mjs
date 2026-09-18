import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/dashboard/App.tsx", import.meta.url), "utf8");
const listPage = await readFile(
  new URL("../src/dashboard/pages/CollectionsPage.tsx", import.meta.url),
  "utf8",
);
const detailPage = await readFile(
  new URL("../src/dashboard/pages/CollectionDetailPage.tsx", import.meta.url),
  "utf8",
);
const data = await readFile(
  new URL("../src/dashboard/data/collections.ts", import.meta.url),
  "utf8",
);
const migration = await readFile(
  new URL("../supabase/migrations/20260918221000_dashboard_collection_management.sql", import.meta.url),
  "utf8",
);

test("collections routes use real Supabase pages", () => {
  assert.match(app, /CollectionsPageLive/);
  assert.match(app, /CollectionDetailPageLive/);
  assert.match(app, /route === "\/dashboard\/collections"[\s\S]+<CollectionsPageLive \/>/);
  assert.match(app, /collectionDetail[\s\S]+<CollectionDetailPageLive id=\{collectionDetail\[1\]\} \/>/);
});

test("collections pages contain no mock data source", () => {
  for (const source of [listPage, detailPage, data]) {
    assert.doesNotMatch(source, /@\/dashboard\/mock\//);
  }
});

test("collections data layer uses Supabase CRUD and membership RPCs", () => {
  assert.match(data, /from\("store_collections"\)/);
  assert.match(data, /from\("store_collection_products"\)/);
  assert.match(data, /rpc\("create_store_collection"/);
  assert.match(data, /rpc\("update_store_collection"/);
  assert.match(data, /rpc\("delete_store_collection"/);
  assert.match(data, /rpc\("set_store_collection_products"/);
  assert.match(data, /rpc\("reorder_store_collections"/);
});

test("collection management stores SEO and protects writes", () => {
  assert.match(migration, /add column if not exists seo_title/);
  assert.match(migration, /add column if not exists seo_description/);
  assert.match(migration, /dashboard staff required/);
  assert.match(migration, /revoke all on function public\.create_store_collection/);
  assert.match(migration, /grant execute on function public\.create_store_collection/);
});

test("collection UI exposes real Shopify-style controls", () => {
  assert.match(listPage, /New collection/);
  assert.match(listPage, /Featured/);
  assert.match(detailPage, /Products in collection/);
  assert.match(detailPage, /Add products/);
  assert.match(detailPage, /SEO title/);
  assert.match(detailPage, /SEO description/);
  assert.match(detailPage, /Unsaved collection changes/);
});
