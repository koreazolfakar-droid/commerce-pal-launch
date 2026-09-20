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
const circleci = await readFile(new URL("../.circleci/config.yml", import.meta.url), "utf8");
const router = await readFile(new URL("../src/router.tsx", import.meta.url), "utf8");
const root = await readFile(new URL("../src/routes/__root.tsx", import.meta.url), "utf8");
const csp = await readFile(
  new URL("../src/lib/contentSecurityPolicy.ts", import.meta.url),
  "utf8",
);
const errorPage = await readFile(
  new URL("../src/lib/error-page.ts", import.meta.url),
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

test("CSP uses a per-request nonce and removes script unsafe-inline", () => {
  assert.match(router, /createIsomorphicFn\(\)\.server/);
  assert.match(router, /crypto\.getRandomValues\(bytes\)/);
  assert.match(router, /ssr: getSSROptions\(\)/);

  assert.match(root, /headers: \(\{ ssr \}\)/);
  assert.match(root, /buildContentSecurityPolicy\(nonce\)/);
  assert.match(root, /<ScriptOnce>\{THEME_INIT_SCRIPT\}<\/ScriptOnce>/);
  assert.match(root, /<ScriptOnce>\{LANGUAGE_INIT_SCRIPT\}<\/ScriptOnce>/);
  assert.match(root, /<ScriptOnce>\{FONT_LOAD_SCRIPT\}<\/ScriptOnce>/);
  assert.doesNotMatch(root, /dangerouslySetInnerHTML/);

  assert.match(csp, /'nonce-\$\{nonce\}'/);
  assert.match(csp, /script-src-attr 'none'/);
  assert.doesNotMatch(csp, /script-src[^\n]*unsafe-inline/);
  assert.match(csp, /style-src-attr 'unsafe-inline'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /base-uri 'self'/);
  assert.match(csp, /upgrade-insecure-requests/);

  assert.match(server, /!headers\.has\("Content-Security-Policy"\)/);
  assert.match(server, /buildContentSecurityPolicy\(\)/);
  assert.doesNotMatch(errorPage, /onclick=|javascript:/i);
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

test("CI keeps GitHub manual and validates important updates in CircleCI", () => {
  assert.match(workflow, /workflow_dispatch/);
  assert.doesNotMatch(workflow, /\npush:|\npull_request:/);
  assert.match(workflow, /Dashboard security regression tests/);
  assert.match(workflow, /node --test e2e\/dashboard-\*\.test\.mjs/);
  assert.match(workflow, /bun run typecheck/);
  assert.match(workflow, /bun run lint/);
  assert.match(workflow, /bun run build/);
  assert.match(workflow, /bun run test:ssr/);

  assert.match(circleci, /\/\^important\\\/\.\*\//);
  assert.match(circleci, /Dashboard security regression tests/);
  assert.match(circleci, /node --test e2e\/dashboard-\*\.test\.mjs/);
});
