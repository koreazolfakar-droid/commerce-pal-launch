import { expect, test } from "@playwright/test";
import { openCart } from "./helpers";

for (const width of [360, 390, 430]) {
  for (const language of ["en", "ar"] as const) {
    test(`compact list cards at ${width}px in ${language}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 850 });
      await page.addInitScript((value) => {
        localStorage.setItem("space-cell-language", value);
        localStorage.setItem("space-cell-product-view-mode", "list");
        localStorage.setItem("space-cell-home-best-sellers-view", "list");
      }, language);
      await page.goto("/shop");
      const cards = page.locator("main .product-list-card");
      await expect(cards).toHaveCount(9);
      await expect(page.locator("html")).toHaveAttribute("dir", language === "ar" ? "rtl" : "ltr");

      // Isolated test images with different source ratios. No product/store data is changed.
      await cards.locator(".product-list-image img").evaluateAll((images) => {
        const dimensions = [
          [400, 900],
          [900, 400],
          [600, 600],
          [1100, 700],
        ];
        images.forEach((element, index) => {
          const image = element as HTMLImageElement;
          const [w, h] = dimensions[index % dimensions.length]!;
          image.removeAttribute("srcset");
          image.src = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect x="8" y="8" width="${w! - 16}" height="${h! - 16}" rx="24" fill="black"/></svg>`)}`;
        });
      });

      const measurements = await cards.evaluateAll((elements) =>
        elements.map((card) => {
          const media = card.querySelector<HTMLElement>(".product-list-image")!;
          const info = card.querySelector<HTMLElement>(".product-list-info")!;
          const button = card.querySelector<HTMLElement>(".product-list-add")!;
          const stock = button.previousElementSibling!;
          const image = media.querySelector("img")!;
          const box = card.getBoundingClientRect();
          const mediaBox = media.getBoundingClientRect();
          const infoBox = info.getBoundingClientRect();
          const buttonBox = button.getBoundingClientRect();
          return {
            height: box.height,
            width: box.width,
            scrollWidth: card.scrollWidth,
            mediaWidth: mediaBox.width,
            mediaHeight: mediaBox.height,
            infoWidth: infoBox.width,
            infoHeight: infoBox.height,
            buttonWidth: buttonBox.width,
            buttonHeight: buttonBox.height,
            afterStock: buttonBox.top - stock.getBoundingClientRect().bottom,
            fit: getComputedStyle(image).objectFit,
            ltrAligned: mediaBox.right <= infoBox.left,
            rtlAligned: infoBox.right <= mediaBox.left,
          };
        }),
      );
      for (const row of measurements) {
        expect(row.scrollWidth).toBeLessThanOrEqual(row.width + 1);
        expect(row.height).toBeLessThan(260); // Mixed titles, variants and sale badges fit naturally.
        expect(row.mediaWidth).toBeCloseTo(measurements[0]!.mediaWidth, 1);
        expect(row.mediaHeight).toBeCloseTo(measurements[0]!.mediaHeight, 1);
        expect(row.mediaWidth / row.mediaHeight).toBeCloseTo(1, 2);
        expect(row.height - Math.max(row.infoHeight, row.mediaHeight)).toBeCloseTo(26, 0);
        expect(row.buttonWidth).toBeCloseTo(row.infoWidth, 1);
        expect(row.buttonHeight).toBeCloseTo(40, 1);
        expect(row.afterStock).toBeLessThanOrEqual(10);
        expect(row.fit).toBe("contain");
        expect(language === "ar" ? row.rtlAligned : row.ltrAligned).toBeTruthy();
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBeTruthy();
      await page.screenshot({
        path: testInfo.outputPath("mobile-product-list.png"),
        fullPage: true,
      });

      // The homepage uses the same component and therefore the same bounded image frame.
      await page.goto("/");
      const best = page.getByTestId("best-sellers");
      await expect(best.locator(".product-list-card")).toHaveCount(9);
      await expect(best.locator(".product-list-media .product-list-image")).toHaveCount(9);
    });
  }
}

test("list card preserves wishlist, comparison and cart interactions", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 });
  await page.addInitScript(() => localStorage.setItem("space-cell-product-view-mode", "list"));
  await page.goto("/shop");
  const card = page
    .locator(".product-list-card")
    .filter({ hasText: "Samsung Fixture Phone 512GB" });
  const wish = card.getByRole("button", { name: /^Save / });
  await wish.click();
  await expect(card.getByRole("button", { name: /^Remove .* from wishlist$/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await card.getByRole("button", { name: "Add to comparison", exact: true }).click();
  await expect(
    card.getByRole("button", { name: "Remove from comparison", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await card.getByRole("button", { name: "Add to cart", exact: true }).click();
  await expect(await openCart(page)).toContainText("Samsung Fixture Phone 512GB");
});
