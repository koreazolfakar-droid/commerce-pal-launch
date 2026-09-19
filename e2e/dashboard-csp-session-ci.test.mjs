import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const server = await readFile(new URL("../src/server.ts", import.meta.url), "utf8");
const storage = await readFile(
  new URL("../src/integrations/supabase/previewAuthStorage.ts", import.meta.url),
  "utf8",
);
const client = await readFile(
  new URL("../src/integrations/supabase/client.ts", import.meta.url),
  "utf8",
);
const auth0 = await readFile(
  new URL("../src/dashboard/security/Auth0DashboardSecurity.tsx", import.meta.url),
  "utf8",
);
const workflow = await readFile(
  new URL("../.github/workflows/storefront-ci.yml", import.meta.url),
  "utf8",
);

test("dashboard responses are explicitly non-cacheable", () => {
  assert.match(server, /function withDashboardNoStore/);
  assert.match(server, /pathname\.startsWith\("\/dashboard"\)/);
  assert.match(server, /Cache-Control", "no-store, max-age=0, must-revalidate"/);
  assert.match(server, /CDN-Cache-Control", "no-store"/);
  assert.match(server, /Surrogate-Control", "no-store"/);
  assert.match(server, /Pragma", "no-cache"/);

  const fetchReturn = server.indexOf("return withDashboardNoStore(");
  const securityHeaders = server.indexOf("withSecurityHeaders(await normalizeCatastrophicSsrResponse(response))");
  assert.ok(fetchReturn >= 0, "dashboard no-store wrapper must be applied");
  assert.ok(securityHeaders > fetchReturn, "security headers must remain in the response pipeline");
});

test("CSP blocks inline script attributes while preserving required script elements", () => {
  assert.match(server, /script-src 'self' 'unsafe-inline' https:\/\/challenges\.cloudflare\.com/);
  assert.match(server, /script-src-attr 'none'/);
  assert.match(server, /style-src-attr 'unsafe-inline'/);
  assert.match(server, /object-src 'none'/);
  assert.match(server, /base-uri 'self'/);
  assert.match(server, /upgrade-insecure-requests/);
});

test("production Supabase sessions do not persist in localStorage", () => {
  assert.match(storage, /if \(!projectId \|\| !framed\) return sessionStorage/);
  assert.doesNotMatch(storage, /if \(!projectId \|\| !framed\) return localStorage/);
  assert.match(client, /storage: brokeredPreviewStorage\(\)/);
  assert.match(client, /persistSession: true/);
  assert.match(client, /autoRefreshToken: true/);

  // Lovable's framed preview broker may keep its own local fallback for editor
  // interoperability. The production/non-preview path above must remain sessionStorage.
  assert.match(storage, /localStorage\.setItem/);
});

test("Auth0 dashboard tokens remain memory-only", () => {
  assert.match(auth0, /cacheLocation="memory"/);
  assert.doesNotMatch(auth0, /cacheLocation="localstorage"/i);
  assert.doesNotMatch(auth0, /clientSecret|CLIENT_SECRET/);
});

test("CI runs security regression tests on every PR update and main push", () => {
  assert.match(workflow, /push:\s*\n\s*branches:\s*\n\s*- main/);
  assert.match(workflow, /- opened/);
  assert.match(workflow, /- synchronize/);
  assert.match(workflow, /- reopened/);
  assert.match(workflow, /- ready_for_review/);
  assert.match(workflow, /Dashboard security regression tests/);
  assert.match(workflow, /node --test e2e\/dashboard-\*\.test\.mjs/);
  assert.match(workflow, /bun run typecheck/);
  assert.match(workflow, /bun run lint/);
  assert.match(workflow, /bun run build/);
  assert.match(workflow, /bun run test:ssr/);
});
