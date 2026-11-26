import type { Browser, BrowserContextOptions, Page } from "@playwright/test";

export function installStorefrontFixture(page: Page): Promise<void>;
export function createStorefrontPage(browser: Browser, options?: BrowserContextOptions): Promise<Page>;
