import { test, expect } from "@playwright/test";

test("homepage has one native catalog hero, one heading, benefits and catalog sections", async ({
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
  for (let index = 1; index < expected.length; index++) {
    expect(order.indexOf(expected[index]!)).toBeGreaterThan(order.indexOf(expected[index - 1]!));
  }

  await expect(page.getByTestId("deal-spotlight").locator("article")).toHaveCount(2);
  if (isMobile) await expect(page.getByTestId("bottom-nav")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();

  await expect(page.getByTestId("brand-showcases")).toContainText("iPhone Showcase");
});

test("hero uses provider-neutral catalog artwork without unsafe navigation", async ({ page }) => {
  await page.goto("/");
  const hero = page.getByTestId("home-hero");

  await expect(hero).toHaveAttribute("data-hero-source", "catalog-collection");
  await expect(hero).toHaveAttribute("data-hero-collection-handle", "homepage-hero");
  await expect(hero).toHaveAttribute("data-hero-handle", "homepage-hero");
  await expect(hero.locator("img")).toHaveAttribute("alt", "iPhone 18 Pro");
  await expect(hero.locator("a")).toHaveCount(0);

  const before = page.url();
  await page.getByTestId("home-hero-media").click({ position: { x: 8, y: 8 } });
  await page.waitForTimeout(100);
  expect(page.url()).toBe(before);
});

test("brand sections use the provider-neutral local catalog and exact destinations", async ({ page }) => {
  await page.goto("/");

  for (const [brand, included, excluded] of [
    ["apple", "iphone-18-pro", "galaxy-s26-ultra"],
    ["samsung", "galaxy-s26-ultra", "iphone-18"],
    ["xiaomi", "xiaomi-16-pro", "iphone-18"],
  ]) {
    const section = page.locator(
      `section[data-facet-kind="brand"][data-facet-slug="${brand}"]`,
    );
    await expect(section.locator(`a[href="/brand/${brand}"]`)).toHaveCount(1);
    await expect(section.locator(`a[href="/product/${included}"]`).first()).toBeAttached();
    await expect(section.locator(`a[href="/product/${excluded}"]`)).toHaveCount(0);
  }
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
