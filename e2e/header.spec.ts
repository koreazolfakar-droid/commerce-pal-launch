import { test, expect } from "@playwright/test";

for (const name of ["Brands", "All categories"]) {
  test(`${name} menu exposes state, handles arrows and restores focus after Escape`, async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "The desktop dropdowns are replaced by the mobile sheet");
    await page.goto("/");
    const trigger = page.getByRole("button", { name, exact: true });
    await expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.focus();
    await trigger.press("ArrowDown");
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    const items = menu.getByRole("menuitem");
    await expect(items.first()).toBeFocused();
    if ((await items.count()) > 1) {
      await page.keyboard.press("ArrowDown");
      await expect(items.nth(1)).toBeFocused();
      await page.keyboard.press("ArrowUp");
      await expect(items.first()).toBeFocused();
    }
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();
    await trigger.press("Enter");
    await expect(page.getByRole("menu")).toBeVisible();
  });
}
