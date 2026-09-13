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
  await expect(page.getByTestId("deal-spotlight").locator("article")).toHaveCount(2);
  if (isMobile) await expect(page.getByTestId("bottom-nav")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  const showcase = page.locator('section[aria-labelledby^="showcase-"]');
  await expect(showcase.first()).toContainText("Zeta showcase");
});

test("rebuilt hero is controlled by Shopify homepage-hero collection and links its first product", async ({ page }) => {
  await page.goto("/");
  const hero = page.getByTestId("home-hero");
  await expect(hero).toHaveAttribute("data-hero-source", "shopify-homepage-hero");
  await expect(hero).toHaveAttribute("data-hero-collection-handle", "homepage-hero");
  await expect(hero).toHaveAttribute("data-hero-handle", "fixture-phone-1");
  await expect(hero.getByRole("heading", { level: 2 })).toContainText(
    "Samsung Fixture Phone 512GB with a long product title",
  );
  await expect(hero.locator("img")).toHaveAttribute("alt", "Merchant artwork homepage-hero");
  const productHrefs = await hero.locator('a[href^="/product/"]').evaluateAll((links) =>
    [...new Set(links.map((link) => link.getAttribute("href")))],
  );
  expect(productHrefs).toEqual(["/product/fixture-phone-1"]);
  await expect(hero.getByRole("link", { name: "View all" })).toHaveAttribute("href", "/shop");
});

test("each brand keeps its compact showcase, products and exact destination without duplicate hero artwork", async ({
  page,
}) => {
  await page.goto("/");
  for (const [brand, included, excluded] of [
    ["apple", "2", "1"],
    ["samsung", "1", "2"],
    ["xiaomi", "3", "1"],
    ["kobo", "8", "1"],
  ]) {
    const section = page.locator(`section[data-facet-kind="brand"][data-facet-slug="${brand}"]`);
    await expect(section.locator(`a[href="/brand/${brand}"]`)).toHaveCount(1);
    await expect(
      section.locator(`a[href="/product/fixture-phone-${included}"]`).first(),
    ).toBeAttached();
    await expect(section.locator(`a[href="/product/fixture-phone-${excluded}"]`)).toHaveCount(0);
  }
  await expect(
    page.getByTestId("brand-showcases").locator('img[alt^="Merchant artwork hero-"]'),
  ).toHaveCount(0);
  await expect(
    page.locator('[data-facet-kind="category"][data-facet-slug="e-readers"]'),
  ).toBeAttached();
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
