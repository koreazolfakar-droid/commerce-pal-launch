import { expect, type Page } from "@playwright/test";

export async function addFixtureProduct(page: Page) {
  await page.goto("/product/fixture-phone-1");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Samsung Fixture Phone");
  // :visible selects the desktop action or the mobile sticky buy action.
  await page
    .getByRole("button", { name: /^Add to cart/ })
    .filter({ visible: true })
    .first()
    .click();
  await expect(
    page
      .getByRole("button", { name: /^(Open bag|Cart), 1 items/ })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
}

export async function openCart(page: Page) {
  await page
    .getByRole("button", { name: /^(Open bag|Cart), \d+ items/ })
    .filter({ visible: true })
    .first()
    .click();
  const drawer = page.getByRole("dialog", { name: "Your bag" });
  await expect(drawer).toBeVisible();
  return drawer;
}
