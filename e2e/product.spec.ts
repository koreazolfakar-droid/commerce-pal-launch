import { test, expect } from "@playwright/test";
import { addFixtureProduct, openCart } from "./helpers";

test("product has title and price, adds to cart and shows same-brand products", async ({
  page,
}) => {
  await addFixtureProduct(page);
  await expect(page.getByText("$499.00", { exact: true }).first()).toBeVisible();
  const related = page.getByRole("region", { name: "More from Samsung" });
  await expect(related).toBeVisible();
  await expect(related.locator('a[href="/product/fixture-phone-1"]')).toHaveCount(0);
  await expect(await openCart(page)).toContainText("256GB");
});

test("quick view selects a variant and quantity and restores focus on Escape", async ({
  page,
  isMobile,
}) => {
  await page.goto("/shop");
  const trigger = page
    .getByRole("button", { name: /^Quick view Samsung Fixture Phone 512GB/ })
    .first();
  if (!isMobile) await trigger.locator("xpath=ancestor::article").hover();
  await trigger.click();
  let dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("group", { name: "Product images" }).getByRole("button"),
  ).toHaveCount(2);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "512GB", exact: true }).click();
  await expect(dialog.getByText("$599.00", { exact: true })).toBeVisible();
  await dialog.getByLabel("Quantity", { exact: true }).fill("0");
  await expect(dialog.getByRole("button", { name: "Add to cart", exact: true })).toBeDisabled();
  await dialog.getByLabel("Quantity", { exact: true }).fill("2");
  await dialog.getByRole("button", { name: "Add to cart", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page
      .getByRole("button", { name: /^(Open bag|Cart), 2 items/ })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await expect(await openCart(page)).toContainText("512GB");
});


test("mobile product purchase bar stays separate from navigation across narrow widths", async ({
  page,
}) => {
  for (const viewport of [
    { width: 320, height: 720 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/product/fixture-phone-1");

    const canvas = page.getByTestId("product-detail-canvas");
    const purchaseBar = page.getByTestId("product-purchase-bar");
    const bottomNav = page.getByTestId("bottom-nav");

    await expect(canvas).toBeVisible();
    await expect(purchaseBar).toBeVisible();
    await expect(bottomNav).toBeVisible();
    await expect(
      purchaseBar.getByRole("button", { name: "Add to cart", exact: true }),
    ).toBeVisible();
    await expect(purchaseBar.getByRole("button", { name: /wish|save/i })).toHaveCount(0);

    const [canvasBox, purchaseBox, navBox] = await Promise.all([
      canvas.boundingBox(),
      purchaseBar.boundingBox(),
      bottomNav.boundingBox(),
    ]);
    expect(canvasBox).not.toBeNull();
    expect(purchaseBox).not.toBeNull();
    expect(navBox).not.toBeNull();
    expect(canvasBox!.x).toBeGreaterThanOrEqual(0);
    expect(canvasBox!.x + canvasBox!.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(purchaseBox!.y + purchaseBox!.height).toBeLessThanOrEqual(navBox!.y + 1);
  }
});
