import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [panel, styles, client, edge] = await Promise.all([
  readFile(new URL("../src/dashboard/components/ai/AiAssistPanel.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/components/ai/AiAssistPanel.css", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/ai/client.ts", import.meta.url), "utf8"),
  readFile(new URL("../supabase/functions/dashboard-ai-assist/index.ts", import.meta.url), "utf8"),
]);

test("AI visual refresh is scoped to the assistant dialog, not global dashboard styles", () => {
  assert.match(panel, /import "\.\/AiAssistPanel\.css"/);
  for (const className of ["spacecall-ai-modal", "spacecall-ai-header", "spacecall-ai-body",
    "spacecall-ai-setup", "spacecall-ai-primary", "spacecall-ai-advanced",
    "spacecall-ai-results", "spacecall-ai-status-grid", "spacecall-ai-metrics",
    "spacecall-ai-suggestions", "spacecall-ai-selection", "spacecall-ai-footer"]) {
    assert.ok(panel.includes(className), className + " missing from dialog");
    assert.ok(styles.includes(className), className + " missing from stylesheet");
  }
  assert.match(styles, /\.dashboard-theme-scope\.dashboard-ai-dialog\.spacecall-ai-modal/);
  assert.match(styles, /--ai-accent: #535dcc/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});

test("small screens keep a scrollable body, selection controls, and accessible minimum targets", () => {
  assert.match(styles, /max-block-size: calc\(100dvh - 24px\)/);
  assert.match(styles, /overflow-y: auto/);
  assert.match(styles, /min-block-size: 44px/);
  assert.match(styles, /max-width: 639px/);
  assert.match(styles, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(styles, /outline: 2px solid var\(--ai-accent\)/);
  assert.match(panel, /aria-modal="true"/);
  assert.match(panel, /aria-labelledby=\{dialogTitleId\}/);
  assert.match(panel, /data-selected=\{checked\}/);
  assert.match(panel, /data-disabled=\{blocked\}/);
});

test("redesign does not alter AI actions, request auth, selection, save boundary, or backend", () => {
  assert.match(panel, /void run\("research_fill"\)/);
  assert.match(panel, /void run\("seo"\)/);
  assert.match(panel, /void run\("validate"\)/);
  assert.match(panel, /requestIdRef/);
  assert.match(panel, /requestController\.current\?\.abort\(\)/);
  assert.match(panel, /onApply\(patch\)/);
  assert.match(panel, /suggestion\.decision !== "block"/);
  assert.match(panel, /disabled=\{blocked\}/);
  assert.match(client, /requestDashboardAiAssist/);
  assert.match(edge, /dashboard_access_required/);
});
