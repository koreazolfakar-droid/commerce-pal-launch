import { test, expect } from "@playwright/test";

test("homepage has one rebuilt catalog hero, one heading, one benefits strip and adaptive deals", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByTestId("home-hero")).toBeVisible();
  await expect(page.getByTestId("home-hero").locator("img")).toBeVisible();
  await expect(page.getByTestId("trust-benefits-rail")).toHaveCount(1);
  await expect(page.getByTestId("category-section")).toHaveCount(1);
  await expect(page.getByTestId("top-brands")).toBeVisible();
  await expect(page.getByTestId("best-sellers")).toHaveCount(1);
  await expect(page.getByTestId("new-items")).toHaveCount(1);
  await expect(page.getByTestId("why-shop")).toHaveCount(1);
  await expect(page.getByTestId("home-quick-actions")).toHaveCount(1);
  const order = await page
    .locator(".home-page [data-testid]")
    .evaluateAll((elements) => elements.map((element) => element.getAttribute("data-testid")));
  const expected = [
    "home-hero",
    "trust-benefits-rail",
    "category-section",
    "top-brands",
    "best-sellers",
    "new-items",
    "brand-showcases",
  ];
  for (let i = 1; i < expected.length; i++)
    expect(order.indexOf(expected[i]!)).toBeGreaterThan(order.indexOf(expected[i - 1]!));
  const productShelves = page.locator(
    '[data-testid="best-sellers"], [data-testid="deals-section"], [data-testid="new-items"]',
  );
  const shelfProducts = await productShelves.evaluateAll((sections) =>
    sections.flatMap((section) => {
      const shelf = section.getAttribute("data-testid") ?? "unknown";
      const hrefs = [
        ...new Set(
          Array.from(section.querySelectorAll<HTMLAnchorElement>('a[href^="/product/"]')).map(
            (link) => link.getAttribute("href") ?? "",
          ),
        ),
      ].filter(Boolean);
      return hrefs.map((href) => ({ shelf, href }));
    }),
  );
  const firstShelfByProduct = new Map<string, string>();
  for (const item of shelfProducts) {
    expect(firstShelfByProduct.get(item.href), `${item.href} repeats across homepage product shelves`).toBeUndefined();
    firstShelfByProduct.set(item.href, item.shelf);
  }
  if (isMobile) await expect(page.getByTestId("bottom-nav")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  const showcase = page.locator('section[aria-labelledby^="showcase-"]');
  await expect(showcase.first()).toContainText("Zeta showcase");
});

test("hero never falls back to Shopify artwork", async ({ page }) => {
  await page.goto("/");
  const hero = page.getByTestId("home-hero");
  await expect(hero).not.toHaveAttribute("data-hero-source", "shopify-collection");
  await expect(hero).not.toHaveAttribute("data-hero-source", "hero-product-fallback");
  await expect(hero).not.toHaveAttribute("data-hero-collection-handle", /.+/);
  await expect(hero).toHaveAttribute("data-hero-handle", /^(cms:.+|none)$/);
  await expect(hero.locator("img")).toBeVisible();
});

test("curated brand and category showcases avoid replaying primary shelf products", async ({
  page,
}) => {
  await page.goto("/");

  const primaryProductHrefs = new Set(
    await page
      .locator('[data-testid="best-sellers"], [data-testid="deals-section"], [data-testid="new-items"]')
      .evaluateAll((sections) =>
        sections.flatMap((section) =>
          Array.from(section.querySelectorAll<HTMLAnchorElement>('a[href^="/product/"]')).map(
            (link) => link.getAttribute("href") ?? "",
          ),
        ).filter(Boolean),
      ),
  );

  const facets = page.getByTestId("brand-showcases").locator("section[data-facet-kind]");
  const facetCount = await facets.count();
  for (let index = 0; index < facetCount; index++) {
    const section = facets.nth(index);
    const kind = await section.getAttribute("data-facet-kind");
    const slug = await section.getAttribute("data-facet-slug");
    expect(kind === "brand" || kind === "category").toBeTruthy();
    expect(slug).toBeTruthy();
    await expect(section.locator(`a[href="/${kind}/${slug}"]`)).toHaveCount(1);

    const productHrefs = await section
      .locator('a[href^="/product/"]')
      .evaluateAll((links) => [
        ...new Set(links.map((link) => link.getAttribute("href") ?? "").filter(Boolean)),
      ]);
    for (const href of productHrefs) {
      expect(primaryProductHrefs.has(href), `${href} repeats a primary homepage product`).toBeFalsy();
    }
  }

  await expect(
    page.getByTestId("brand-showcases").locator('img[alt^="Merchant artwork hero-"]'),
  ).toHaveCount(0);
});

test("mobile menu supports Arabic and closes after navigation", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile menu is only displayed below the desktop breakpoint");
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  const menu = page.getByRole("dialog");
  await expect(menu.getByRole("link", { name: "Samsung", exact: true }).first()).toBeVisible();
  await menu.getByRole("button", { name: "التبديل إلى العربية" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(menu).toHaveAttribute("dir", "rtl");
  await menu.getByRole("link", { name: "المساعدة والدعم", exact: true }).click();
  await expect(page).toHaveURL(/\/help$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("المساعدة والدعم");
});
