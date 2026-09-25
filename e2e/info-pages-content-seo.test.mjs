import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public info pages stay useful when detailed CMS policies are absent", async () => {
  const [infoPage, infoPages, i18n] = await Promise.all([
    read("src/components/InfoPage.tsx"),
    read("src/lib/infoPages.ts"),
    read("src/lib/i18n.tsx"),
  ]);

  assert.match(infoPage, /Policy details & support/);
  assert.match(infoPage, /A detailed policy has not been published from the Space Call dashboard/);
  assert.match(infoPage, /Explore more from Space Call/);
  assert.match(infoPage, /SHOP_DISCOVERY_LINKS/);
  assert.match(infoPage, /SUPPORT_DISCOVERY_LINKS/);
  assert.match(infoPage, /POLICY_DISCOVERY_LINKS/);
  assert.match(infoPage, /links\.filter\(\(link\) => link\.to !== currentPath\)\.slice\(0, 7\)/);
  assert.match(infoPage, /to=\{link\.to as never\}[\s\S]*?preload="intent"/);
  assert.match(infoPage, /to=\{\`\/\$\{name\}\`\}[\s\S]*?preload="intent"/);

  assert.match(infoPages, /Privacy Policy \| Customer Data & Store Privacy/);
  assert.match(infoPages, /Terms of Service \| Online Store Terms Lebanon/);
  assert.match(infoPages, /Shipping \| Delivery Information Lebanon/);
  assert.match(infoPages, /Returns \| Return Policy & Request Guide/);
  assert.match(infoPages, /Warranty \| Electronics Warranty Guide Lebanon/);

  assert.doesNotMatch(i18n, /100% genuine/);
  assert.doesNotMatch(i18n, /within 7 days of receipt/);
  assert.doesNotMatch(i18n, /reply within minutes/);
  assert.match(i18n, /Return eligibility depends on the item/);
  assert.match(i18n, /لا توجد سياسة تفصيلية منشورة هنا بعد/);
});
