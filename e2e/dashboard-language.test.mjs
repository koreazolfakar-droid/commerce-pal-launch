import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("dashboard has an independent persistent Arabic and English language provider", async () => {
  const source = await read("src/lib/dashboardI18n.tsx");

  assert.match(source, /DashboardLanguage = "ar" \| "en"/);
  assert.match(source, /space-call-dashboard-language/);
  assert.match(source, /localStorage\.setItem/);
  assert.match(source, /direction: language === "ar" \? "rtl" : "ltr"/);
  assert.match(source, /toggleLanguage/);
});

test("dashboard shell and login expose the language switch and directional UI", async () => {
  const [shell, login, route] = await Promise.all([
    read("src/components/admin/DashboardShell.tsx"),
    read("src/components/admin/AdminLogin.tsx"),
    read("src/routes/dashboard.tsx"),
  ]);

  assert.match(route, /DashboardLanguageProvider/);
  assert.match(shell, /LanguageToggle/);
  assert.match(shell, /useDashboardLanguage/);
  assert.match(shell, /dir=\{direction\}/);
  assert.match(shell, /Overview/);
  assert.match(shell, /الرئيسية/);
  assert.match(login, /useDashboardLanguage/);
  assert.match(login, /Change dashboard language/);
  assert.match(login, /تغيير لغة لوحة التحكم/);
});

test("all primary dashboard editors consume dashboard language context", async () => {
  const files = [
    "src/components/admin/CollectionEditor.tsx",
    "src/components/admin/SettingsEditor.tsx",
    "src/components/admin/OrdersEditor.tsx",
    "src/components/admin/CustomersEditor.tsx",
    "src/components/admin/InventoryEditor.tsx",
    "src/components/admin/ProductEditor.tsx",
    "src/routes/dashboard.index.tsx",
    "src/routes/dashboard.hero.tsx",
    "src/routes/dashboard.sections.tsx",
    "src/routes/dashboard.navigation.tsx",
    "src/routes/dashboard.brands.tsx",
    "src/routes/dashboard.seo.tsx",
    "src/routes/dashboard.categories.tsx",
    "src/routes/dashboard.collections.tsx",
  ];

  for (const file of files) {
    const source = await read(file);
    assert.match(source, /useDashboardLanguage/, `${file} must use dashboard localization`);
  }
});
