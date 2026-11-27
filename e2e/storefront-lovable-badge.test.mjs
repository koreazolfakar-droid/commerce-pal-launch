import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("storefront stylesheet scopes Lovable badge hiding to its host element", async () => {
  const [css, root] = await Promise.all([
    read("src/styles.css"),
    read("src/routes/__root.tsx"),
  ]);

  assert.match(css, /#lovable-badge\s*\{\s*display:\s*none\s*!important;\s*\}/);
  assert.equal((css.match(/#lovable-badge/g) ?? []).length, 1);
  assert.match(root, /import appCss from "\.\.\/styles\.css\?url"/);
  assert.match(root, /href: appCss/);
  assert.doesNotMatch(css, /#lovable-badge\s*,/);
});
