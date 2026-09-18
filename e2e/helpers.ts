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

  const addButton = page
    .getByRole("button", { name: /^Add to cart/ })
    .filter({ visible: true })
    .first();

  // Product purchase controls intentionally stay disabled until persisted
  // browser state has hydrated. Wait for the real user-ready state instead
  // of racing the hydration gate in E2E.
  await expect(addButton).toBeEnabled();
  await addButton.click();

  await expect(cartButton(page, 1)).toBeVisible();
}

export async function openCart(page: Page) {
  const button = page
    .getByRole("button", {
      name: /^(Open bag, \d+|Cart, \d+ items)$/,
    })
    .filter({ visible: true })
    .first();

  await expect(button).toBeVisible();
  await button.click();

  const drawer = page.getByRole("dialog", { name: "Your bag" });
  await expect(drawer).toBeVisible();
  return drawer;
}

export { cartButton };
