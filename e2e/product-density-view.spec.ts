import { expect, test } from "@playwright/test";

test("mobile product density modes render like compact market cards and persist", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 });
  await page.goto("/shop");

  const denseButton = page.getByRole("button", { name: "3-column view", exact: true });
  const gridButton = page.getByRole("button", { name: "2-column view", exact: true });
  const listButton = page.getByRole("button", { name: "List view", exact: true });

  await expect(denseButton).toBeVisible();
  await expect(gridButton).toBeVisible();
  await expect(listButton).toBeVisible();

  await denseButton.click();
  await expect(denseButton).toHaveAttribute("aria-pressed", "true");

  const denseCards = page.locator("main .market-product-card");
  await expect(denseCards).toHaveCount(9);
  const denseLayout = denseCards.first().locator("..");
  await expect
    .poll(async () =>
      denseLayout.evaluate(
        (element) => getComputedStyle(element).gridTemplateColumns.split(" ").length,
      ),
    )
    .toBe(3);

  const densePrices = denseCards.locator(".market-product-copy bdi").filter({ hasText: "$" });
  const priceMetrics = await densePrices.evaluateAll((prices) =>
    prices.slice(0, 6).map((price) => {
      const box = price.getBoundingClientRect();
      const style = getComputedStyle(price);
      return {
        width: box.width,
        height: box.height,
        whiteSpace: style.whiteSpace,
        lineHeight: Number.parseFloat(style.lineHeight),
      };
    }),
  );
  for (const price of priceMetrics) {
    expect(price.whiteSpace).toBe("nowrap");
    expect(price.height).toBeLessThanOrEqual(price.lineHeight * 1.4);
    expect(price.width).toBeGreaterThan(24);
  }

  await page.reload();
  await expect(page.getByRole("button", { name: "3-column view", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByRole("button", { name: "2-column view", exact: true }).click();
  const gridCards = page.locator("main .market-product-card");
  await expect(gridCards).toHaveCount(9);
  await expect(page.locator("main .catalog-dense-product-card")).toHaveCount(0);
  await expect
    .poll(async () =>
      gridCards
        .first()
        .locator("..")
        .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length),
    )
    .toBe(2);

  await page.reload();
  await expect(page.getByRole("button", { name: "2-column view", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByRole("button", { name: "List view", exact: true }).click();
  await expect(page.locator("main .product-list-card")).toHaveCount(9);

  await page.reload();
  await expect(page.getByRole("button", { name: "List view", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("main .product-list-card")).toHaveCount(9);
});
