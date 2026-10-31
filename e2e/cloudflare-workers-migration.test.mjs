import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Cloudflare builds remain separate from the current Lovable production build", async () => {
  const [packageText, legacyVite, cloudflareVite] = await Promise.all([
    read("package.json"),
    read("vite.config.ts"),
    read("vite.cloudflare.config.ts"),
  ]);
  const manifest = JSON.parse(packageText);
  assert.equal(manifest.scripts.build, "vite build");
  assert.equal(manifest.scripts["build:cloudflare"], "vite build --config vite.cloudflare.config.ts");
  assert.match(legacyVite, /@lovable\.dev\/vite-tanstack-config/);
  assert.match(cloudflareVite, /cloudflare\(\{ configPath: "\.\/wrangler\.jsonc", viteEnvironment: \{ name: "ssr" \} \}\)/);
  assert.match(cloudflareVite, /server: \{ entry: "server" \}/);
});

test("production Worker exposes only the approved domains and keeps public previews disabled", async () => {
  const config = JSON.parse(await read("wrangler.jsonc"));
  assert.equal(config.name, "space-call-staging");
  assert.equal(config.main, "src/server.ts");
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
  assert.ok(config.compatibility_flags.includes("nodejs_compat"));
  assert.deepEqual(config.routes, [
    { pattern: "spacecallapp.store", custom_domain: true },
    { pattern: "www.spacecallapp.store", custom_domain: true },
    { pattern: "app.spacecallapp.store", custom_domain: true },
  ]);
  assert.ok(!("vars" in config));
  const server = await read("src/server.ts");
  assert.match(server, /guardIncomingRequest\(request, env\)/);
  assert.match(server, /redirectAppHostDashboard\(request\)/);
  assert.match(server, /withSecurityHeaders\(await normalizeCatastrophicSsrResponse/);
});
