import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Commerce Core canary is server-only and disabled by default", async () => {
  const env = await read(".env.example");

  assert.match(env, /^COMMERCE_CORE_PRODUCT_READ_MODE=off$/m);
  assert.match(env, /^COMMERCE_CORE_CANARY_PERCENT=0$/m);
  assert.match(env, /^COMMERCE_CORE_URL=$/m);
  assert.match(env, /^COMMERCE_CORE_TIMEOUT_MS=1200$/m);
  assert.doesNotMatch(env, /^VITE_COMMERCE_CORE_/m);
});

test("Commerce Core product gateway has bounded canary and automatic legacy fallback", async () => {
  const gateway = await read("src/lib/commerceCoreCanary.ts");

  assert.match(gateway, /PRODUCT_CONTRACT_VERSION = "product-detail-v1"/);
  assert.match(gateway, /type ProductReadMode = "off" \| "canary"/);
  assert.match(gateway, /commerceCoreCanaryBucket/);
  assert.match(gateway, /COMMERCE_CORE_CANARY_PERCENT/);
  assert.match(gateway, /Math\.min\(Math\.max\(parsed, min\), max\)/);
  assert.match(gateway, /url\.protocol !== "https:"/);
  assert.match(gateway, /new AbortController\(\)/);
  assert.match(gateway, /controller\.abort\(\)/);
  assert.match(gateway, /response\.headers\.get\("x-space-call-contract"\)/);
  assert.match(gateway, /if \(response\.status === 404\) return null/);
  assert.match(gateway, /const fallback = \(\) => fetchProductByHandle\(data\.handle\)/);
  assert.match(gateway, /catch \(error\)[\s\S]*return fallback\(\)/);
});

test("Step 4A does not route storefront product traffic through Rust yet", async () => {
  const [gateway, productRoute] = await Promise.all([
    read("src/lib/commerceCoreCanary.ts"),
    read("src/routes/product.$handle.tsx"),
  ]);

  assert.match(gateway, /intentionally not wired into the storefront route yet/);
  assert.match(productRoute, /fetchProductByHandle\(params\.handle\)/);
  assert.doesNotMatch(productRoute, /fetchProductByHandleCanary/);
});
