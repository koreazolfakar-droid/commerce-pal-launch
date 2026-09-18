import { expect, test } from "@playwright/test";

test("combined native-catalog filters, sorting and reset keep URL state", async ({ page, isMobile }) => {
  await page.goto("/shop?brand=apple,samsung&category=smartphones&min=900&max=1300");
  const cards = page.locator("main article");

  await expect(cards).toHaveCount(3);
  await expect(cards.filter({ hasText: "iPhone 18 Pro" })).toHaveCount(1);
  await expect(cards.filter({ hasText: "iPhone 18" })).toHaveCount(1);
  await expect(cards.filter({ hasText: "Galaxy S26 Ultra" })).toHaveCount(1);

  await page.getByLabel("Sort", { exact: true }).selectOption("price-desc");
  await expect(cards.first()).toContainText("iPhone 18 Pro");
  await page.reload();
  await expect(page.getByLabel("Sort", { exact: true })).toHaveValue("price-desc");

  if (isMobile) {
    await page.getByRole("button", { name: /^Filters/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Clear all", exact: true }).click();
    await page.keyboard.press("Escape");
  } else {
    await page.getByRole("button", { name: "Clear all", exact: true }).click();
  }

  await expect(cards).toHaveCount(6);
});

test("native collections filter accurately and impossible combinations stay empty", async ({ page }) => {
  await page.goto("/collections/iphone?brand=apple");
  await expect(page.locator("main h1")).toHaveCount(1);
  await expect(page.locator("main article")).toHaveCount(2);
  await expect(page.locator("main article").filter({ hasText: "iPhone 18 Pro" })).toHaveCount(1);
  await expect(page.locator("main article").filter({ hasText: "Galaxy S26 Ultra" })).toHaveCount(0);

  await page.goto("/shop?category=cases&brand=apple");
  await expect(page.locator("main article")).toHaveCount(0);
  await expect(page.getByText("No products found", { exact: true })).toBeVisible();
});
