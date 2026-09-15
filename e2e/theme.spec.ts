import { expect, test, type Page } from "@playwright/test";

type Theme = "light" | "dark" | "system";

const THEME_KEY = "space-call:theme";
const LEGACY_THEME_KEY = "space-cell:theme";

async function seedTheme(page: Page, theme: Theme, language = "en") {
  await page.addInitScript(
    ({ themeValue, languageValue }) => {
      localStorage.setItem("space-cell-language", languageValue);
      localStorage.setItem("space-call:theme", themeValue);
    },
    { themeValue: theme, languageValue: language },
  );
}

async function expectRenderedTheme(page: Page, preference: Theme, resolved: "light" | "dark") {
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-theme", preference);
  if (resolved === "dark") {
    await expect(html).toHaveClass(/\bdark\b/);
  } else {
    await expect(html).not.toHaveClass(/\bdark\b/);
  }
  await expect
    .poll(() => page.evaluate(() => document.documentElement.style.colorScheme))
    .toBe(resolved);
}

for (const theme of ["dark", "light"] as const) {
  test(`${theme} preference persists across reload`, async ({ page }) => {
    await seedTheme(page, theme);
    await page.goto("/");
    await expectRenderedTheme(page, theme, theme);
    await page.reload();
    await expectRenderedTheme(page, theme, theme);
    expect(await page.evaluate((key) => localStorage.getItem(key), THEME_KEY)).toBe(theme);
  });
}

test("legacy theme key migrates before hydration without resetting preference", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("space-cell-language", "en");
    localStorage.removeItem("space-call:theme");
    localStorage.setItem("space-cell:theme", "dark");
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expectRenderedTheme(page, "dark", "dark");

  const storage = await page.evaluate(
    ({ currentKey, legacyKey }) => ({
      current: localStorage.getItem(currentKey),
      legacy: localStorage.getItem(legacyKey),
    }),
    { currentKey: THEME_KEY, legacyKey: LEGACY_THEME_KEY },
  );
  expect(storage).toEqual({ current: "dark", legacy: null });
});

test("system preference follows OS scheme live", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await seedTheme(page, "system");
  await page.goto("/");
  await expectRenderedTheme(page, "system", "dark");

  await page.emulateMedia({ colorScheme: "light" });
  await expectRenderedTheme(page, "system", "light");

  await page.emulateMedia({ colorScheme: "dark" });
  await expectRenderedTheme(page, "system", "dark");
});

test("mobile and menu theme toggles stay synchronized with no network refetch", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedTheme(page, "light");
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "fetch" || request.resourceType() === "xhr") {
      requests.push(request.url());
    }
  });

  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expectRenderedTheme(page, "dark", "dark");
  await expect(page.getByRole("button", { name: "Switch to light theme" })).toHaveCount(1);

  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("button", { name: "Switch to light theme" })).toHaveCount(2);

  await page.getByRole("button", { name: "Switch to light theme" }).last().click();
  await expectRenderedTheme(page, "light", "light");
  await expect(page.getByRole("button", { name: "Switch to dark theme" })).toHaveCount(2);

  expect(requests).toEqual([]);
});

test("desktop toggle reflects a theme changed on mobile after resize", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedTheme(page, "light");
  await page.goto("/");

  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expectRenderedTheme(page, "dark", "dark");

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeVisible();
});

test("dark theme is already correct at DOMContentLoaded and stays stable", async ({ page }) => {
  await seedTheme(page, "dark");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expectRenderedTheme(page, "dark", "dark");

  const initialBackground = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  await page.waitForLoadState("networkidle");
  await expectRenderedTheme(page, "dark", "dark");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
    initialBackground,
  );
});

test("dark theme survives navigation across store routes without flipping", async ({ page }) => {
  await seedTheme(page, "dark");

  for (const path of ["/", "/categories", "/product/fixture-phone-1", "/cart"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expectRenderedTheme(page, "dark", "dark");
  }

  await page.goto("/categories");
  const categoryHref = await page.locator('a[href^="/category/"]').first().getAttribute("href");
  if (categoryHref) {
    await page.goto(categoryHref, { waitUntil: "domcontentloaded" });
    await expectRenderedTheme(page, "dark", "dark");
  }
});

test("404 route receives the same canonical dark theme outside StoreLayout", async ({ page }) => {
  await seedTheme(page, "dark");
  await page.goto("/definitely-not-a-space-call-route", { waitUntil: "domcontentloaded" });
  await expectRenderedTheme(page, "dark", "dark");
  await expect(page.getByRole("heading", { level: 1, name: "404" })).toBeVisible();
});
