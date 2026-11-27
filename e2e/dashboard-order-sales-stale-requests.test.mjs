import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(new URL(`../src/dashboard/pages/${file}`, import.meta.url), "utf8");

test("sales list discards out-of-order search, paging and refresh results", async () => {
  const source = await read("SalesPage.tsx");
  assert.match(source, /const requestVersion = useRef\(0\)/);
  assert.match(source, /const request = \+\+requestVersion\.current/);
  assert.match(source, /if \(!manual\) setResult\(null\)/);
  assert.match(source, /if \(request !== requestVersion\.current\) return;\s*setResult\(next\)/);
  assert.match(source, /catch \(cause\) \{\s*if \(request !== requestVersion\.current\) return;/);
  assert.match(source, /if \(request === requestVersion\.current\) setLoading\(false\)/);
  assert.match(source, /return \(\) => \{[\s\S]*?requestVersion\.current \+= 1;/);
});

test("order detail cannot render or overwrite another order during navigation", async () => {
  const source = await read("OrderDetailPage.tsx");
  assert.match(source, /const currentOrderId = useRef\(id\)/);
  assert.match(source, /currentOrderId\.current = id/);
  assert.match(source, /setOrder\(\(current\) => \(current\?\.id === id \? current : null\)\)/);
  assert.match(source, /if \(request !== requestVersion\.current \|\| currentOrderId\.current !== id\) return;/);
  assert.match(source, /if \(loading && \(!order \|\| order\.id !== id\)\)/);
  assert.match(source, /if \(!order \|\| order\.id !== id\)/);
  assert.match(source, /return \(\) => \{[\s\S]*?requestVersion\.current \+= 1;/);
  const mutations = source.match(/if \(currentOrderId\.current !== order\.id\) return;/g) || [];
  assert.equal(mutations.length, 3, "status, payment and delivery updates must not replace a different order");
});
