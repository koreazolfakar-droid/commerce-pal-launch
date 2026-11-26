import { test, expect, type Page } from "@playwright/test";
import { addFixtureProduct, expectCartCount, openCart } from "./helpers";
import { installStorefrontFixture } from "./helpers/storefront-fixture-fetch.mjs";

test("product has title and price, adds to cart and shows same-brand products", async ({
  page,
}) => {
  await addFixtureProduct(page);
  await expect(page.getByText("$499.00", { exact: true }).first()).toBeVisible();
  const related = page.getByRole("region", { name: "More from Samsung" });
  await page.getByTestId("product-information").scrollIntoViewIfNeeded();
  await page.locator("#main-content").press("End");
  await expect(related).toBeVisible();
  await expect(related.locator('a[href="/product/fixture-phone-1"]')).toHaveCount(0);
  await expectSelectedStorage(page, "256GB");
});

test("quick view selects a variant and quantity and restores focus on Escape", async ({
  page,
  isMobile,
}) => {
  await installStorefrontFixture(page);
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
  ).toHaveCount(3);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Storage: 512GB", exact: true }).click();
  await expect(dialog.getByText("$599.00", { exact: true })).toBeVisible();
  await dialog.getByLabel("Quantity", { exact: true }).fill("0");
  await expect(dialog.getByRole("button", { name: "Add to cart", exact: true })).toBeDisabled();
  await dialog.getByLabel("Quantity", { exact: true }).fill("2");
  await dialog.getByRole("button", { name: "Add to cart", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expectCartCount(page, 2);
  await expectSelectedStorage(page, "512GB");
});

async function expectSelectedStorage(page: Page, storage: string) {
  const bottomNav = page.getByTestId("bottom-nav");
  if (await bottomNav.isVisible()) {
    await bottomNav.locator('a[href="/cart"]').click();
    await expect(
      page.getByRole("list", { name: "Shopping bag" }).getByText(storage, { exact: true }),
    ).toBeVisible();
  } else {
    await expect(await openCart(page)).toContainText(storage);
  }
}

test("mobile purchase actions sit side by side and keep normal navigation", async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 720 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/product/fixture-phone-1");

    const canvas = page.getByTestId("product-detail-canvas");
    const actions = page.getByTestId("product-purchase-actions");
    const bottomNav = page.getByTestId("bottom-nav");
    const add = actions.getByRole("button", { name: "Add to cart", exact: true });
    const buy = actions.getByRole("button", { name: "Buy now", exact: true });

    await expect(canvas).toBeVisible();
    await expect(bottomNav.locator('a[href="/cart"]')).toBeVisible();
    await expect(page.getByTestId("product-purchase-bar")).toHaveCount(0);
    await expect(add).toBeVisible();
    await expect(buy).toBeVisible();

    const [canvasBox, addBox, buyBox] = await Promise.all([
      canvas.boundingBox(),
      add.boundingBox(),
      buy.boundingBox(),
    ]);
    expect(canvasBox).not.toBeNull();
    expect(addBox).not.toBeNull();
    expect(buyBox).not.toBeNull();
    expect(canvasBox!.x).toBeGreaterThanOrEqual(0);
    expect(canvasBox!.x + canvasBox!.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(addBox!.y).toBe(buyBox!.y);
    expect(addBox!.x + addBox!.width).toBeLessThanOrEqual(buyBox!.x);
    expect(addBox!.height).toBeGreaterThanOrEqual(44);
  }
});
