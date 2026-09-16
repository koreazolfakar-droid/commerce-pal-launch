import { test, expect } from "@playwright/test";
import { addFixtureProduct, openCart } from "./helpers";

test("cart drawer updates quantity and opens a Shopify checkout URL", async ({ page, context }) => {
  await addFixtureProduct(page);
  const drawer = await openCart(page);
  await drawer.getByRole("button", { name: "Increase quantity" }).click();
  await expect(drawer.getByText("2 products", { exact: true })).toBeVisible();
  await expect(drawer.getByText("$998.00", { exact: true })).toBeVisible();
  await drawer.getByRole("button", { name: "Decrease quantity" }).click();
  await expect(drawer.getByText("1 product", { exact: true })).toBeVisible();
  // Fulfill the popup locally: never open or submit a real checkout during a test.
  await context.route("https://*.myshopify.com/checkouts/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<p>Fixture checkout</p>" }),
  );
  const popupPromise = context.waitForEvent("page");
  await drawer.getByRole("button", { name: "Checkout with Shopify" }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(/^https:\/\/dj6qeq-j9\.myshopify\.com\/checkouts\/fixture-/);
});
