import { test, expect } from "@playwright/test";
import { addLocalProduct, openCart } from "./helpers";

test("cart drawer updates quantity and continues to the Space Call checkout", async ({ page }) => {
  await addLocalProduct(page);
  const drawer = await openCart(page);

  await drawer.getByRole("button", { name: "Increase quantity" }).click();
  await expect(drawer).toContainText("2 items in your bag");
  await expect(drawer.getByText("$2,598.00", { exact: true })).toBeVisible();

  await drawer.getByRole("button", { name: "Decrease quantity" }).click();
  await expect(drawer).toContainText("1 item in your bag");

  await drawer.getByRole("link", { name: "Order via WhatsApp", exact: true }).click();
  await expect(page).toHaveURL(/\/cart#whatsapp-checkout$/);
  await expect(page.locator("#whatsapp-checkout")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Complete your order on WhatsApp" })).toBeVisible();
});
