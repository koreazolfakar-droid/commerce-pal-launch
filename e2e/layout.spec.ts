import { expect, test } from "@playwright/test";

for (const width of [320, 375, 768, 1440]) {
  for (const language of ["en", "ar"] as const) {
    test(`homepage layout ${width}px ${language}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((value) => {
        localStorage.setItem("space-cell-language", value);
        localStorage.setItem("space-cell:theme", value === "ar" ? "dark" : "light");
      }, language);
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("dir", language === "ar" ? "rtl" : "ltr");
      await expect(page.locator("html")).toHaveAttribute(
        "data-theme",
        language === "ar" ? "dark" : "light",
      );
      await expect(page.locator("h1")).toHaveCount(1);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBeTruthy();
      const categoryRail = page.getByTestId("category-section").getByRole("list");
      await expect(categoryRail).toBeVisible();
      const categoryRailBox = await categoryRail.boundingBox();
      expect(categoryRailBox).not.toBeNull();
      expect(categoryRailBox!.height).toBeLessThan(130);
      await page.getByTestId("top-brands").scrollIntoViewIfNeeded();
      const tiles = page.getByTestId("top-brands").locator(".brand-logo-tile");
      for (const tile of await tiles.all()) {
        expect(await tile.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
          "rgb(255, 255, 255)",
        );
      }
      const apple = page
        .getByTestId("top-brands")
        .getByRole("link", { name: "Apple", exact: true });
      await expect(apple.locator("img")).toBeVisible();
      await expect
        .poll(() =>
          apple.locator("img").evaluate((image) => (image as HTMLImageElement).naturalWidth),
        )
        .toBeGreaterThan(0);
      await page.getByTestId("best-sellers").scrollIntoViewIfNeeded();
      const productImage = page
        .getByTestId("best-sellers")
        .locator("article")
        .first()
        .locator("a > div > img")
        .first();
      expect(await productImage.evaluate((image) => getComputedStyle(image).objectFit)).toBe(
        "contain",
      );
      await page.screenshot({ path: testInfo.outputPath("homepage.png"), fullPage: true });
    });
  }
}
