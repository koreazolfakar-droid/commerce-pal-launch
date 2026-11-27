# Space Call — Cloudflare Workers migration

## Production hosting (2026-10-31)

The owner explicitly authorized the production cutover, conditional on the website continuing
to work. Cloudflare zone `spacecallapp.store` is active. All three existing hostnames are attached
to the `space-call-staging` Worker as enabled Custom Domains, with preview routing disabled:

- `spacecallapp.store`
- `www.spacecallapp.store`
- `app.spacecallapp.store`

The Worker name is retained to preserve the existing Git build integration; it now serves
production. `wrangler.jsonc` records the approved domains so subsequent main deployments
retain the routing configuration. Both `workers_dev` and `preview_urls` remain false.
The default Vite build uses the framework plugins directly; use `bun run build:cloudflare`
for the Cloudflare production artifact. The pre-independence Git tag/commit and existing Lovable
hosted snapshot remain available as historical rollback references. Cloudflare Builds deploys `main` with `npx wrangler deploy`.

Domain registration remains with the existing Lovable-managed registrar. Nameservers are
`alberto.ns.cloudflare.com` and `mona.ns.cloudflare.com`. Moving registration is unnecessary.
Existing Lovable and Google verification TXT records were preserved. No payment method or
paid plan was added. Supabase remains the existing database and authentication backend;
no production schema, records, Auth redirects or users were modified by the migration.

## Runtime configuration

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are installed as Cloudflare Worker secrets.
Never expose the privileged key in a `VITE_*` variable, source, logs or build artifacts.

Keep `src/server.ts` as the entrypoint. It enforces mutation limits, trusted origins,
security headers, dashboard no-store, SSR error handling and the app-host dashboard redirect.
The shared limiter fails closed when its Supabase connection is unavailable; do not bypass it.

## Validation and its limits

PR #447 passed Cloudflare staging/workerd, Storefront CI and Dashboard Commerce Acceptance.
The commerce suite uses an isolated local Supabase stack, not live production business writes.
The deployed main merge was `ae1b430495f0acb081ee8c3e47e747c921718486`.

A temporary private Workflow called the deployed Worker through a service binding. GET-only
checks covered home, shop, a product discovered from the catalog, anonymous dashboard shells,
app-host redirect and real JS/CSS assets. No public preview hostname was enabled.
Cloudflare Access was not used because its onboarding requested payment details.
This private API-triggered test is an alternative to exposing a public staging deployment.

After Custom Domain attachment, cloud-browser checks covered HTTPS, homepage hydration,
product image/details, product quantity interaction, and app-host dashboard sign-in redirect.
A transitional request mixed old Lovable HTML with new asset routing and failed a dynamic
import. A fresh request after routing settled loaded the Cloudflare bundle and product
interaction succeeded. Do not treat DNS activation or an SSR 200 alone as proof of hydration.

Authenticated customer/staff login, MFA, recovery, OAuth, passkeys, real order submission,
payment processing and Android APK verification have not been exercised against production.
They must not be reported as passing. Keep exact hostnames and the passkey RP ID
`spacecallapp.store`; no authentication-domain changes were needed.

## Local checks

1. `bun install --frozen-lockfile`
2. `bun run typecheck` and `bun run test:unit`
3. `bun run build:cloudflare`
4. `bun run preview:cloudflare`
5. Run `node --test e2e/cloudflare-worker-runtime.smoke.mjs` against its local loopback URL.

The runtime smoke refuses non-loopback targets and external redirects. It checks home,
shop, a linked product, dashboard shells, actual JS/CSS, an SSR 404, security headers,
per-request CSP nonces, no-store HTML and immutable assets. Catalog reads use the existing
public catalog, so this is not fixture isolation. Never point mutation/commerce tests at
the live database.

## Rollback

Keep the Lovable deployment and verification TXT records available.
To roll back, remove the three Worker Custom Domains, then restore DNS-only A records
for `@`, `www` and `app` to `185.158.133.1`, TTL 300. This is the exact pre-cutover origin.
DNS and open browser connections can retain either destination temporarily; validate fresh
navigation and asset loading after propagation. Do not delete the Worker, registrar account,
Lovable project or Supabase data as part of rollback.

An old Lovable rebuild requires checking out the pre-independence source and its original lockfile.
Before deploying a routing rollback from source, remove the three production Custom Domains from
Wrangler configuration as well, otherwise the next Cloudflare deploy will recreate them.

Official references:

- https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- https://developers.cloudflare.com/workers/configuration/secrets/
- https://developers.cloudflare.com/workflows/reference/pricing/
