# Space Call — Cloudflare Workers staging migration

## Scope and safety

This is an **isolated alternative build**, not a production cutover.
The existing `vite.config.ts`, Lovable deployment, `main` branch, DNS, Supabase schema/data,
and public store origins stay unchanged. Nothing in CI publishes a Worker or writes production data.

- Canonical site: `https://www.spacecallapp.store`
- Android TWA origin: `https://app.spacecallapp.store`
- Supabase remains the data source; no database migration is required for this build-only step.
- `workers_dev` is intentionally **false**. Do not expose a public staging endpoint connected
  to production customer/order data.
- Keep `src/server.ts` as the Worker entrypoint: it enforces mutation limits, trusted origins,
  security headers, dashboard no-store, SSR error handling, and Android app-host redirects.
  Do not switch to the default TanStack entrypoint without equivalent protections.

## Build without changing the current website

1. Install from the committed lockfile: `bun install --frozen-lockfile`.
2. Run `bun run typecheck` and `bun run test:unit`.
3. Build Cloudflare's alternative artifact with `bun run build:cloudflare`.
4. Run `bun run preview:cloudflare` locally and verify routes, CSP nonce, HTML cache policy,
   mobile RTL, storefront and dashboard in a read-only fixture environment.
5. Check the generated Worker bundle and security gate (`bun audit --audit-level=high`).
6. **Do not deploy or map a custom domain** until isolated staging Auth/DB, Cloudflare Access
   protection, and real navigation/commerce acceptance tests are ready.

## Required production-cutover validation (not completed by this step)

- Verify static assets, SSR status/SEO/canonicals, per-response CSP nonces and no-store headers.
- Verify same-origin mutation guard and shared-rate-limit RPC in Workers; fail closed on outage.
- Verify staff AAL2/MFA, customer logins, password recovery, OAuth redirects, passkeys.
  Passkey RP ID `spacecallapp.store` cannot authenticate on an unrelated `workers.dev` hostname.
- Verify payments and order transitions, stock reservation and receiving without test writes
  to live production records; use isolated staging data.
- Verify Supabase redirect URLs, Edge Function CORS allowlists, Turnstile domains and CSP.
- Verify the Android TWA `assetlinks.json`, signed certificate, canonical, app-host dashboard
  redirect, robots rules, caching and exact two custom domains before DNS cutover.
- Prepare a rollback with old hosting intact, TTL planning and a low-traffic cutover window.

## Cloudflare account setup (later)

Cloudflare account access is **not yet connected**. Keep API tokens and Supabase secrets out of
GitHub source and `VITE_*` variables. Cloudflare Workers settings → Variables and Secrets stores
server-only values. Connect the Worker to a nonpublic, Access-protected staging hostname only
after test data isolation. No automated `wrangler deploy` command is in the CI configuration.

Official references:
- https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/
- https://developers.cloudflare.com/workers/vite-plugin/reference/api/
- https://developers.cloudflare.com/workers/configuration/secrets/

## Runtime smoke

The staging-only CI also launches the bundled Worker in Cloudflare's local workerd runtime,
checks a real SSR 404 route for security headers, and requests the public logo asset.
This uses **read-only requests** and never deploys or modifies Supabase records.
