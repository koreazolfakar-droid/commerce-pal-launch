import { expect, test, type Page } from "@playwright/test";

type Theme = "light" | "dark";
type Language = "en" | "ar";

async function seedPreferences(page: Page, language: Language, theme: Theme) {
  await page.addInitScript(
    ({ languageValue, themeValue }) => {
      localStorage.setItem("space-cell-language", languageValue);
      localStorage.setItem("space-call:theme", themeValue);
    },
    { languageValue: language, themeValue: theme },
  );
}

async function assertHomeLayout(page: Page, language: Language, theme: Theme) {
  await expect(page.locator("html")).toHaveAttribute("dir", language === "ar" ? "rtl" : "ltr");
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^(?!.*\bdark\b)/);
  await expect(page.locator("h1")).toHaveCount(1);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();

  const categoryRail = page.locator(".category-icon-rail");
  expect((await categoryRail.boundingBox())!.height).toBeLessThan(130);
}

for (const width of [320, 360, 390, 412, 768, 1024, 1440]) {
  for (const theme of ["light", "dark"] as const) {
    test(`homepage responsive ${width}px en ${theme}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await seedPreferences(page, "en", theme);
      await page.goto("/");
      await assertHomeLayout(page, "en", theme);
      await page.screenshot({ path: testInfo.outputPath("homepage.png"), fullPage: true });
    });
  }
}

for (const width of [390, 768, 1440]) {
  for (const theme of ["light", "dark"] as const) {
    test(`homepage responsive ${width}px ar ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await seedPreferences(page, "ar", theme);
      await page.goto("/");
      await assertHomeLayout(page, "ar", theme);
    });
  }
}

test("brand and product media stages stay intentionally white in dark mode", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await seedPreferences(page, "en", "dark");
  await page.goto("/");

  await page.getByTestId("top-brands").scrollIntoViewIfNeeded();
  const tiles = page.getByTestId("top-brands").locator(".brand-logo-tile");
  for (const tile of await tiles.all()) {
    expect(await tile.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
      "rgb(255, 255, 255)",
    );
  }

  const apple = page.getByTestId("top-brands").getByRole("link", { name: "Apple", exact: true });
  await expect(apple.locator("img")).toBeVisible();
  await expect
    .poll(() => apple.locator("img").evaluate((image) => (image as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);

  await page.getByTestId("best-sellers").scrollIntoViewIfNeeded();
  const productImage = page
    .getByTestId("best-sellers")
    .locator("article")
    .first()
    .locator("a > div > img")
    .first();
  expect(await productImage.evaluate((image) => getComputedStyle(image).objectFit)).toBe("contain");
  expect(
    await productImage.evaluate((image) => getComputedStyle(image.parentElement!).backgroundColor),
  ).toBe("rgb(255, 255, 255)");
});
