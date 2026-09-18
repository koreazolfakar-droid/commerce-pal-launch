import { expect, type Page } from "@playwright/test";

function cartButton(page: Page, count: number) {
  return page
    .getByRole("button", {
      name: new RegExp(`^(Open bag, ${count}|Cart, ${count} items)import { expect, type Page } from "@playwright/test";

),
    })
    .filter({ visible: true })
    .first();
}

async function logCartDiagnostics(page: Page) {
  const [persistedCart, buttons] = await Promise.all([
    page.evaluate(() => window.localStorage.getItem("space-call-cart")),
    page.getByRole("button").evaluateAll((nodes) =>
      nodes
        .map((node) => ({
          ariaLabel: node.getAttribute("aria-label"),
          text: node.textContent?.trim() ?? "",
          disabled: node instanceof HTMLButtonElement ? node.disabled : false,
        }))
        .filter(
          (item) =>
            /cart|bag/i.test(item.ariaLabel ?? "") ||
            /cart|bag/i.test(item.text),
        ),
    ),
  ]);

  console.log(
    "[cart-e2e-diagnostics]",
    JSON.stringify({ persistedCart, buttons }),
  );
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

  try {
    await expect(cartButton(page, 1)).toBeVisible();
  } catch (error) {
    await logCartDiagnostics(page);
    throw error;
  }
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
