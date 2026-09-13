import { expect, test } from "@playwright/test";

const REQUIRED_WIDTHS = [320, 360, 375, 390, 412, 430, 768, 1024, 1440];

test("required responsive widths stay inside the viewport with stable mobile chrome", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Run the viewport matrix once.");

  await page.addInitScript(() => {
    localStorage.setItem("space-cell-language", "en");
    localStorage.setItem("space-cell:theme", "light");
  });

  for (const width of REQUIRED_WIDTHS) {
    await page.setViewportSize({ width, height: width < 640 ? 820 : 900 });
    await page.goto("/");
    await expect(page.getByTestId("home-hero")).toBeVisible();

    const layout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
    }));
    expect(layout.scrollWidth, `${width}px document overflow`).toBeLessThanOrEqual(layout.viewport);
    expect(layout.bodyScrollWidth, `${width}px body overflow`).toBeLessThanOrEqual(layout.viewport);

    const nav = page.getByTestId("bottom-nav");
    if (width < 1024) {
      await expect(nav).toBeVisible();
      const controls = nav.locator("a, button");
      await expect(controls).toHaveCount(5);
      for (const control of await controls.all()) {
        const box = await control.boundingBox();
        expect(box?.width ?? 0, `${width}px bottom-nav target width`).toBeGreaterThanOrEqual(44);
        expect(box?.height ?? 0, `${width}px bottom-nav target height`).toBeGreaterThanOrEqual(44);
      }

      const bottomSpacing = await page.locator(".store-layout").evaluate((element) => {
        const style = getComputedStyle(element);
        return Number.parseFloat(style.paddingBottom || "0");
      });
      const navBox = await nav.boundingBox();
      expect(bottomSpacing, `${width}px content bottom spacing`).toBeGreaterThanOrEqual(
        Math.max(64, (navBox?.height ?? 64) - 2),
      );
    } else {
      await expect(nav).toBeHidden();
    }

    const heroBefore = await page.getByTestId("home-hero").boundingBox();
    await page.waitForTimeout(250);
    const heroAfter = await page.getByTestId("home-hero").boundingBox();
    expect(Math.abs((heroAfter?.height ?? 0) - (heroBefore?.height ?? 0))).toBeLessThanOrEqual(1);
    expect(Math.abs((heroAfter?.width ?? 0) - (heroBefore?.width ?? 0))).toBeLessThanOrEqual(1);

    if (width === 390) {
      await page.screenshot({ path: "mobile-review.png", fullPage: true });
    }
    if (width === 1440) {
      await page.screenshot({ path: "desktop-review.png", fullPage: true });
    }
  }
});

test("mobile primary navigation is fast, predictable, and restores scroll position", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile navigation behavior only.");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem("space-cell-language", "en");
    localStorage.setItem("space-cell:theme", "light");
  });
  await page.goto("/");

  const nav = page.getByTestId("bottom-nav");
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link", { name: "Home", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.evaluate(() => window.scrollTo(0, Math.min(900, document.body.scrollHeight / 2)));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
  const homeScroll = await page.evaluate(() => window.scrollY);

  await nav.getByRole("link", { name: "Shop", exact: true }).click();
  await expect(page).toHaveURL(/\/shop(?:\?|$)/);
  await expect(
    page.getByTestId("bottom-nav").getByRole("link", { name: "Shop", exact: true }),
  ).toHaveAttribute("aria-current", "page");

  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(Math.max(150, homeScroll - 220));

  await page.getByTestId("bottom-nav").getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Search products" })).toBeVisible();
  await page.getByRole("button", { name: "Close search" }).click();

  await page.getByTestId("bottom-nav").getByRole("link", { name: "Bag", exact: true }).click();
  await expect(page).toHaveURL(/\/cart(?:\?|$)/);

  await page.getByTestId("bottom-nav").getByRole("link", { name: "Account", exact: true }).click();
  await expect(page).toHaveURL(/\/help(?:\?|#|$)/);
});

test("reduced-motion preference disables smooth scrolling and long transitions", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const motion = await page.evaluate(() => {
    const html = getComputedStyle(document.documentElement);
    const sample = document.querySelector<HTMLElement>("[data-testid='bottom-nav'] a");
    const sampleStyle = sample ? getComputedStyle(sample) : null;
    return {
      scrollBehavior: html.scrollBehavior,
      transitionDuration: sampleStyle?.transitionDuration ?? "0s",
    };
  });

  expect(motion.scrollBehavior).toBe("auto");
  expect(Number.parseFloat(motion.transitionDuration)).toBeLessThanOrEqual(0.01);
});
