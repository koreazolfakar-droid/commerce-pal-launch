import { expect, test, type Page } from "@playwright/test";

async function heroMetrics(page: Page) {
  const hero = page.getByTestId("home-hero");
  await expect(hero).toBeVisible();
  return hero.evaluate((element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      left: rect.left,
      right: rect.right,
      viewportWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
}

for (const viewport of [
  { width: 320, height: 568, name: "320px phone" },
  { width: 390, height: 844, name: "390px phone" },
  { width: 430, height: 932, name: "430px phone" },
]) {
  test(`mobile hero fits exactly on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");

    const metrics = await heroMetrics(page);
    const ratio = metrics.height / metrics.width;

    expect(metrics.left).toBeGreaterThanOrEqual(-1);
    expect(metrics.right).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
    expect(ratio).toBeGreaterThan(0.55);
    expect(ratio).toBeLessThan(0.575);

    const media = page.getByTestId("home-hero-media");
    const mediaBox = await media.boundingBox();
    const heroBox = await page.getByTestId("home-hero").boundingBox();
    expect(mediaBox).not.toBeNull();
    expect(heroBox).not.toBeNull();
    expect(Math.abs((mediaBox?.width ?? 0) - (heroBox?.width ?? 0))).toBeLessThanOrEqual(2);
    expect(Math.abs((mediaBox?.height ?? 0) - (heroBox?.height ?? 0))).toBeLessThanOrEqual(2);

    await expect(page.getByTestId("home-hero-mobile-controls")).toBeVisible();
    await expect(page.getByTestId("home-hero-dots")).toBeVisible();
    await expect(page.getByTestId("home-hero-content")).toBeHidden();
  });
}

test("desktop hero keeps the full merchandising layout", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const hero = page.getByTestId("home-hero");
  const box = await hero.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(400);
  await expect(page.getByTestId("home-hero-content")).toBeVisible();
  await expect(page.getByTestId("home-hero-mobile-controls")).toBeHidden();
  await expect(hero.locator("img")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});
