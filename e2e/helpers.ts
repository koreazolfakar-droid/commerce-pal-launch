import { expect, type Page } from "@playwright/test";

export async function addFixtureProduct(page: Page) {
  await page.goto("/product/fixture-phone-1");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Samsung Fixture Phone");
  await page
    .getByTestId("product-purchase-actions")
    .getByRole("button", { name: "Add to cart", exact: true })
    .click();
  await expectCartCount(page, 1);
}

export async function expectCartCount(page: Page, count: number) {
  await expect(
    page
      .getByRole("button", { name: new RegExp(`^Open bag, ${count}$`) })
      .or(page.getByTestId("bottom-nav-cart-badge").filter({ hasText: new RegExp(`^${count}$`) }))
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
}

export async function openCart(page: Page) {
  await page
    .getByRole("button", { name: /^Open bag, \d+$/ })
    .filter({ visible: true })
    .first()
    .click();
  const drawer = page.getByRole("dialog", { name: "Your bag" });
  await expect(drawer).toBeVisible();
  return drawer;
}
