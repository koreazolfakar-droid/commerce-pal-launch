import { test, expect } from "@playwright/test";
import { addLocalProduct, openCart } from "./helpers";

test("product has native price, adds to cart and shows same-brand products", async ({ page }) => {
  await addLocalProduct(page);
  await expect(page.getByText("$1,299.00", { exact: true }).first()).toBeVisible();

  const related = page.getByRole("region", { name: "More from Apple" });
  await expect(related).toBeVisible();
  await expect(related.locator('a[href="/product/iphone-18-pro"]')).toHaveCount(0);
  await expect(related.locator('a[href="/product/iphone-18"]')).toBeAttached();

  await expect(await openCart(page)).toContainText("iPhone 18 Pro");
});

test("Buy now uses the Space Call checkout instead of a remote commerce checkout", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "The mobile product bar intentionally exposes Add to cart only.");
  await page.goto("/product/iphone-18-pro");
  await page.getByRole("button", { name: "Buy now", exact: true }).click();
  await expect(page).toHaveURL(/\/cart#whatsapp-checkout$/);
  await expect(page.locator("#whatsapp-checkout")).toBeVisible();
});

test("quick view validates quantity, adds local catalog products and restores focus", async ({
  page,
  isMobile,
}) => {
  await page.goto("/shop");
  const trigger = page.getByRole("button", { name: /^Quick view iPhone 18 Pro/ }).first();
  if (!isMobile) await trigger.locator("xpath=ancestor::article").hover();

  await trigger.click();
  let dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("group", { name: "Product images" }).getByRole("button"),
  ).toHaveCount(1);

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  dialog = page.getByRole("dialog");
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
  await expect(await openCart(page)).toContainText("iPhone 18 Pro");
});
