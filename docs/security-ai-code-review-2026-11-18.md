# Space Call — AI-generated application security review (2026-11-18)

## Method
Mapped the review to OWASP Top 10:2025 and the OWASP Secure Coding with AI Cheat Sheet. This is a targeted audit, **not** a full independent penetration-test certification.

High-priority classes: broken object/function authorization (BOLA/BFLA), service-role misuse, exposed RLS/SECURITY DEFINER, stored XSS, SSRF, unrestricted outbound downloads, oversized requests, secret leakage and build/dependency integrity.

## Live read-only verification

Supabase project `rtwyankpxtffqqrasyzw` was inspected without reading individual customer/order records or changing any production data:

- No unprotected `public` base tables or views were found using the examined `pg_class`/RLS predicate.
- No `public` `SECURITY DEFINER` routines with `anon` or `authenticated` EXECUTE privilege appeared in the examined catalog query.
- `cms_hero_slides` anon SELECT is denied. Its staff access policy uses `private.is_dashboard_staff()`, and `private.is_dashboard_staff()` requires AAL2 or session-bound passkey step-up plus an admin/editor `user_roles` row.
- Storage bucket `cms-media` rejects SVG uploads and allows raster image types, and `procurement-private` is private.
- Current hero image hosts in production were the Space Call Supabase origin only.
- Supabase Security Advisor still reports `auth_leaked_password_protection` disabled; this provider configuration was not changed.

## Confirmed repository finding — privileged SSRF / unbounded download

Before this PR, `supabase/functions/sync-current-hero/index.ts` accepted any HTTPS CMS URL, followed HTTP redirects and called `response.blob()` before checking its length. A forged or stalled response could consume excessive memory. A compromised editor with control over hero URLs could use a redirect toward internal networks.

**Fix:** only exact project-origin public CMS image objects, no redirects or URL tricks, actual streaming byte cap, fixed timeout, allowed raster MIME and magic bytes, caller JWT verification and server-enforced MFA/staff RPC before reading CMS or fetching sources, origin filtering, and an inert PNG fallback. Untrusted SVG uploads are disallowed consistently with storage's production MIME policy.

**Compatibility trade-off:** The critical hero image aliases intentionally accept only media from Space Call's public CMS storage. A manually entered external image URL may still appear as a normal CMS image but will not be copied to the first-paint aliases. Use Dashboard's hero media upload/library for those aliases.

## Regression coverage

- `e2e/hero-edge-ssrf-security.test.mjs`: trusted exact origin, internal metadata addresses, redirect to private host, spoofed host/path, malicious SVG/HTML, fake MIME, fake Content-Length, oversized open stream cancellation, genuine image signature.
- `e2e/hero-edge-auth-security.test.mjs`: disallowed Origin, missing/invalid token, missing staff MFA/step-up, DB outage fail-closed, staff positive path, PNG inactive placeholder.
- Added both to the isolated `Security Pentest` job; it also Deno-checks `sync-current-hero`. Full `test:unit` includes all e2e *.test.mjs.

## Release safety

The PR must remain draft/unmerged while GitHub Actions cannot start jobs. On 2026-11-18 all five workflows failed before executing any steps, and rerun attempts reproduced the runner failure. It is **not** a code test result. Merge only when Storefront CI, Dashboard Workflows, Dashboard Commerce Acceptance, Security Pentest and Cloudflare Staging Build all **actually execute and pass** on the exact head SHA.

Merging GitHub changes does not deploy Supabase Edge Functions. Deploy `sync-current-hero` separately after testing, then verify valid MFA staff sync, inactive PNG, 403 on unauthorized, 413 on declared oversized payload, and refusal of external URLs/redirects; watch 4xx/5xx counts.
