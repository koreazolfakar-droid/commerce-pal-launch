import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("brand actions use a mobile bottom sheet instead of covering list rows", async () => {
  const list = await read("src/dashboard/components/brands/BrandList.tsx");

  assert.match(list, /role="menu"/);
  assert.match(list, /Brand actions/);
  assert.match(list, /fixed inset-x-3 bottom-\[calc\(4\.75rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(list, /z-\[60\]/);
  assert.match(list, /bg-slate-950\/20/);
  assert.match(list, /sm:absolute/);
  assert.match(list, /sm:top-11/);
  assert.match(list, /sm:w-48/);
  assert.match(list, /role="menuitem"/);
});
