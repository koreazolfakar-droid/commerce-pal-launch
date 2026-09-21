import { expect, test } from "@playwright/test";

test("mobile density modes use real stacked grids and keep product details visible", async ({ page }) => {
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

  const denseNames = denseCards.locator("h3");
  await expect(denseNames.first()).toBeVisible();
  expect(
    await denseNames.first().evaluate((element) => getComputedStyle(element).webkitLineClamp),
  ).toBe("none");

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

  await expect(denseCards.first().getByRole("button", { name: /Add .* to bag/ })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "3-column view", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByRole("button", { name: "2-column view", exact: true }).click();
  const gridCards = page.locator("main .market-product-card");
  await expect(gridCards).toHaveCount(9);
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
});

test("homepage brand section renders six products as 3 plus 3 without horizontal rail", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 850 });
  await page.goto("/");

  const section = page.locator('[data-home-brand-shell="samsung"]').first();
  await section.scrollIntoViewIfNeeded();

  const denseButton = section.getByRole("button", { name: "3-column view", exact: true });
  await denseButton.click();

  const layout = section.locator('[data-product-layout="dense"]');
  await expect(layout).toBeVisible();

  const cards = layout.locator(".market-product-card");
  await expect(cards).toHaveCount(6);

  const metrics = await layout.evaluate((element) => {
    const style = getComputedStyle(element);
    const children = Array.from(element.children).map((child) => child.getBoundingClientRect());
    return {
      columns: style.gridTemplateColumns.split(" ").length,
      overflowX: element.scrollWidth > element.clientWidth + 1,
      firstRowTop: children[0]?.top,
      fourthTop: children[3]?.top,
    };
  });

  expect(metrics.columns).toBe(3);
  expect(metrics.overflowX).toBeFalsy();
  expect(metrics.fourthTop).toBeGreaterThan(metrics.firstRowTop ?? 0);

  await expect(cards.first().locator("h3")).toBeVisible();
  await expect(cards.first().locator(".market-product-copy bdi").first()).toBeVisible();
  await expect(cards.first().getByRole("button", { name: /Add .* to bag/ })).toBeVisible();
});
