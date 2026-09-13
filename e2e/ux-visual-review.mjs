import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4173";
const cases = [
  { width: 390, height: 844, name: "mobile-390" },
  { width: 1440, height: 900, name: "desktop-1440" },
];

await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  for (const testCase of cases) {
    const context = await browser.newContext({
      viewport: { width: testCase.width, height: testCase.height },
      hasTouch: testCase.width < 1024,
      isMobile: testCase.width < 768,
    });
    const page = await context.newPage();
    await page.goto(baseURL, { waitUntil: "load", timeout: 30_000 });
    await page.getByTestId("home-hero").waitFor({ state: "visible" });
    await page.getByTestId("home-quick-access").waitFor({ state: "visible" });
    await page.waitForTimeout(900);
    await page.screenshot({
      path: `artifacts/${testCase.name}.png`,
      fullPage: true,
      animations: "disabled",
    });
    console.log(`CAPTURED ${testCase.name}`);
    await context.close();
  }
} finally {
  await browser.close();
}
