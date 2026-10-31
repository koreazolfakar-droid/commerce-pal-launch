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

Cloudflare API access is connected. The `space-call-staging` Worker has a successful deployment
from `main`, with both public Workers Dev and Preview URLs disabled. The public store still runs
on Lovable; this is not a production cutover. Keep API tokens and Supabase secrets out of
GitHub source and `VITE_*` variables. Cloudflare Workers settings → Variables and Secrets stores
server-only values. Connect the Worker to a nonpublic, Access-protected staging hostname only
after test data isolation. No automated `wrangler deploy` command is in the CI configuration.

Official references:
- https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/
- https://developers.cloudflare.com/workers/vite-plugin/reference/api/
- https://developers.cloudflare.com/workers/configuration/secrets/

## Runtime smoke

The staging-only CI also launches the bundled Worker in Cloudflare's local workerd runtime,
checks the homepage, shop, one product discovered from the SSR catalog, dashboard entry and
nested dashboard route, real JS/CSS assets, a real SSR 404, security headers, CSP nonce
uniqueness, no-store HTML and immutable asset caching.
This uses **GET requests only**, refuses non-loopback targets and external redirects, and never
deploys or modifies Supabase records. Catalog checks read the existing public catalog; they
are not fixture-isolated. An unavailable or empty catalog fails the product check rather than
silently passing a fallback. Dashboard checks verify only anonymous HTML shells, not login
or authenticated business operations.

Runtime smoke is intentionally named `*.smoke.mjs` (not `*.test.mjs`), so the generic
unit suite never starts a network-dependent test without a local Worker preview.

## Runtime configuration blocker

The inspected Worker has no runtime bindings. The public storefront has its own public
Supabase fallback, but private server operations and the shared mutation limiter require:

- `SUPABASE_URL`: server-side URL of the intended Supabase project.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only privileged credential, stored as a Worker secret.
  Never set this as a `VITE_*` variable, put it in Wrangler source, print it in logs or include
  it in a build artifact.

The mutation limiter fails closed when its Supabase connection is unavailable. Uploading a
successful Worker bundle does not prove that POST/save/order operations work. Do not remove
or bypass the limiter to make the migration appear ready.

The connected Supabase tools expose publishable keys only; they cannot retrieve this
privileged credential. Provision it through Cloudflare Variables and Secrets in an
authorized secure session before production cutover. Do not connect a publicly accessible
staging endpoint or run write tests against the live database.

## Remaining cutover gates

- Configure and verify required runtime secrets without revealing their values.
- Verify authenticated staff/customer flows and business writes using an isolated test stack.
- Review existing Supabase Auth redirects, passkey RP ID, Turnstile and any Auth0 settings.
  Keeping the exact production hostnames avoids changing the passkey RP domain.
- Review the domains and TLS configuration; change production routes/DNS only after explicit
  user approval. Keep Lovable available for rollback.
- A Cloudflare Access preview is not configured. Zero Trust onboarding currently asks for
  payment details even on its Free plan, so it is not an accepted no-payment path here.
  Use local workerd/CI validation until a protected remote preview is explicitly arranged.

The connected Cloudflare account currently returns no DNS Zone named
`spacecallapp.store`. DNS onboarding/ownership and the existing record inventory must be
verified before a domain cutover; do not add or change DNS as part of this validation PR.
