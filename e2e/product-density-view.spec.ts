import { expect, test } from "@playwright/test";

test("mobile product density modes render and persist", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 });
  await page.goto("/shop");

  const denseButton = page.getByRole("button", { name: "3-column view", exact: true });
  const gridButton = page.getByRole("button", { name: "2-column view", exact: true });
  const listButton = page.getByRole("button", { name: "List view", exact: true });

  await expect(denseButton).toBeVisible();
  await expect(gridButton).toBeVisible();
  await expect(listButton).toBeVisible();

  const productLayout = page.locator("main .catalog-dense-product-card").first().locator("..");

  await denseButton.click();
  await expect(denseButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("main .catalog-dense-product-card")).toHaveCount(9);
  await expect
    .poll(async () =>
      productLayout.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length),
    )
    .toBe(3);

  await page.reload();
  await expect(page.getByRole("button", { name: "3-column view", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByRole("button", { name: "2-column view", exact: true }).click();
  await expect(page.locator("main .sc-product-card")).toHaveCount(9);
  await expect(page.locator("main .catalog-dense-product-card")).toHaveCount(0);

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
