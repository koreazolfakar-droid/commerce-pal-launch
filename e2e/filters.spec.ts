import { expect, test } from "@playwright/test";

test("combined filters, sorting and reset keep their URL state", async ({ page, isMobile }) => {
  await page.goto("/shop?brand=apple,samsung&category=smartphones&min=540&max=660");
  const cards = page.locator("main article");
  await expect(cards).toHaveCount(2);
  await expect(cards.filter({ hasText: "Apple Fixture Phone 2" })).toHaveCount(1);
  await expect(cards.filter({ hasText: "Samsung Fixture Phone 4" })).toHaveCount(1);
  await page.getByLabel("Sort", { exact: true }).selectOption("price-desc");
  await expect(cards.first()).toContainText("Samsung Fixture Phone 4");
  await page.reload();
  await expect(page.getByLabel("Sort", { exact: true })).toHaveValue("price-desc");
  if (isMobile) {
    await page.getByRole("button", { name: /^Filters/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Clear all", exact: true }).click();
    await page.keyboard.press("Escape");
  } else await page.getByRole("button", { name: "Clear all", exact: true }).click();
  await expect(cards).toHaveCount(9);
});

test("new categories and filtered collections render accurately", async ({ page }) => {
  await page.goto("/category/e-readers");
  await expect(page.locator("main h1")).toHaveCount(1);
  await expect(page.locator("main article")).toHaveCount(1);
  await expect(page.locator("main article")).toContainText("Kobo Clara Reader");
  await page.goto("/collections/mixed-collection?brand=apple");
  await expect(page.locator("main h1")).toHaveCount(1);
  await expect(page.locator("main article")).toHaveCount(2);
  await expect(page.locator("main article").filter({ hasText: "Samsung Fixture" })).toHaveCount(0);
  await page.goto("/shop?category=cases&brand=apple");
  await expect(page.locator("main article")).toHaveCount(0);
  await expect(page.getByText("No products found", { exact: true })).toBeVisible();
});
