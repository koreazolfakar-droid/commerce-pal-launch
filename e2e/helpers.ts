import { expect, type Page } from "@playwright/test";

function cartButton(page: Page, count: number) {
  return page
    .getByRole("button", {
      name: new RegExp(`^(Open bag, ${count}|Cart, ${count} items)$`),
    })
    .filter({ visible: true })
    .first();
}

export async function addLocalProduct(page: Page) {
  await page.goto("/product/iphone-18-pro");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("iPhone 18 Pro");
  await page
    .getByRole("button", { name: /^Add to cart/ })
    .filter({ visible: true })
    .first()
    .click();

  await expect(cartButton(page, 1)).toBeVisible();
}

export async function openCart(page: Page) {
  const button = page
    .getByRole("button", {
      name: /^(Open bag, \d+|Cart, \d+ items)$/,
    })
    .filter({ visible: true })
    .first();

  await button.click();

  const drawer = page.getByRole("dialog", { name: "Your bag" });
  await expect(drawer).toBeVisible();
  return drawer;
}

export { cartButton };
