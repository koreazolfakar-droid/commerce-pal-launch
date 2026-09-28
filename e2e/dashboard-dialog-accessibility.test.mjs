import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const confirmDialog = await readFile(
  new URL("../src/dashboard/components/DashboardConfirmDialog.tsx", import.meta.url),
  "utf8",
);
const dialogHelpers = await readFile(
  new URL("../src/dashboard/lib/dashboardDialogs.tsx", import.meta.url),
  "utf8",
);

const migratedDialogSources = await Promise.all(
  [
    "../src/dashboard/pages/SeoPage.tsx",
    "../src/dashboard/pages/SecurityPage.tsx",
    "../src/dashboard/pages/NavigationPage.tsx",
    "../src/dashboard/pages/MediaLibraryPage.tsx",
    "../src/dashboard/pages/HeroBannersPage.tsx",
    "../src/dashboard/pages/ReceivingPage.tsx",
    "../src/dashboard/pages/ReceivingDetailPage.tsx",
    "../src/dashboard/pages/PurchaseOrderEditPage.tsx",
    "../src/dashboard/pages/PurchaseOrderDetailPage.tsx",
    "../src/dashboard/components/BulkMediaOptimizer.tsx",
    "../src/dashboard/components/GlobalLegacyImageOptimizer.tsx",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
);

test("dashboard destructive workflows no longer use native confirm or prompt dialogs", () => {
  for (const source of migratedDialogSources) {
    assert.doesNotMatch(source, /window\.confirm|window\.prompt/);
    assert.match(source, /@\/dashboard\/lib\/dashboardDialogs/);
  }
});

test("dashboard confirmations trap focus and restore the invoking control", () => {
  assert.match(confirmDialog, /role="dialog"/);
  assert.match(confirmDialog, /aria-modal="true"/);
  assert.match(confirmDialog, /cancelRef\.current\?\.focus\(\)/);
  assert.match(confirmDialog, /event\.key !== "Tab"/);
  assert.match(confirmDialog, /previousFocus\?\.focus\(\)/);
  assert.match(confirmDialog, /document\.body\.style\.overflow = "hidden"/);
});

test("dashboard prompt helper has equivalent keyboard and focus behavior", () => {
  assert.match(dialogHelpers, /function DashboardPromptDialog/);
  assert.match(dialogHelpers, /role="dialog"/);
  assert.match(dialogHelpers, /aria-modal="true"/);
  assert.match(dialogHelpers, /inputRef\.current\?\.focus\(\)/);
  assert.match(dialogHelpers, /event\.key === "Escape"/);
  assert.match(dialogHelpers, /event\.key !== "Tab"/);
  assert.match(dialogHelpers, /previousFocus\?\.focus\(\)/);
});

test("async dialog helpers fail closed during SSR", () => {
  assert.match(dialogHelpers, /if \(typeof document === "undefined"\) return null/);
  assert.match(dialogHelpers, /if \(!host\) return Promise\.resolve\(false\)/);
  assert.match(dialogHelpers, /if \(!host\) return Promise\.resolve\(null\)/);
});
