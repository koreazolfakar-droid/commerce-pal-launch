import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

const [config, createOrder] = await Promise.all([
  read("supabase/config.toml"),
  read("supabase/functions/create-order/index.ts"),
]);

test("guest checkout can reach create-order through the Supabase gateway", () => {
  assert.match(
    config,
    /\[functions\.create-order\][\s\S]*?verify_jwt\s*=\s*false/,
  );
});

test("create-order keeps its own public endpoint protections when gateway JWT is disabled", () => {
  assert.match(createOrder, /const ALLOWED_ORIGINS = new Set/);
  assert.match(createOrder, /origin_not_allowed/);
  assert.match(createOrder, /consume_edge_rate_limit/);
  assert.match(createOrder, /idempotency_key/);
  assert.match(createOrder, /validatePayload\(body\)/);
  assert.match(createOrder, /create_store_order_internal/);
  assert.match(createOrder, /authenticatedBearerToken/);
});
