import { test, expect } from "@playwright/test";
import { addFixtureProduct, openCart } from "./helpers";

test("desktop cart drawer updates quantity and opens the cart page", async ({ page, isMobile }) => {
  test.skip(isMobile, "Mobile navigation links directly to the cart page.");
  await addFixtureProduct(page);
  const drawer = await openCart(page);
  await drawer.getByRole("button", { name: "Increase quantity" }).click();
  await expect(drawer).toContainText("2 products");
  await expect(drawer.getByText("$998.00", { exact: true })).toBeVisible();
  await drawer.getByRole("button", { name: "Decrease quantity" }).click();
  await expect(drawer).toContainText("1 product");
  await drawer.getByRole("link", { name: "Continue checkout" }).click();
  await expect(page).toHaveURL(/\/cart$/);
});
