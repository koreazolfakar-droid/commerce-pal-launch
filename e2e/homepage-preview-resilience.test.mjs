import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const indexRoute = await readFile(new URL("../src/routes/index.tsx", import.meta.url), "utf8");

test("homepage loader survives missing preview storefront and CMS configuration", () => {
  assert.match(indexRoute, /ensureQueryData\(collectionQueryOptions\(HOME_HERO_COLLECTION_HANDLE, 4\)\)[\s\S]*?\.catch\(/);
  assert.match(indexRoute, /fetchCmsSnapshot\(\)\.catch\(/);
  assert.match(indexRoute, /return EMPTY_CMS;/);
  assert.match(indexRoute, /return null;/);
});
