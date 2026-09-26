# Dashboard Security Hardening

## Implemented in code and Supabase

- Mandatory TOTP MFA / AAL2 for all dashboard staff/admin data access at the database authorization boundary.
- `user_roles` keeps a narrow self-read bootstrap path at AAL1 so a staff account can discover its role and complete TOTP enrollment; this does not grant dashboard data access.
- Cloudflare Turnstile client integration for dashboard sign-in and password recovery.
- Native Supabase Auth `captchaToken` forwarding.
- Pre-auth Edge Function throttling with opaque SHA-256 buckets. Every login attempt is consumed before Supabase Auth is called, so the throttle does not query whether the submitted email belongs to dashboard staff:
  - IP + email pair: 5 attempts / 10 minutes -> 15 minute block for subsequent attempts.
  - IP + email pair: 10 attempts / 10 minutes -> 60 minute block for subsequent attempts.
  - Global source IP: 25 attempts / 10 minutes -> 15 minute block for subsequent attempts.
  - Global source IP: 50 attempts / 10 minutes -> 60 minute block for subsequent attempts.
- No raw email address or IP is stored in the throttle table.
- Security event audit trail with sensitive metadata stripping.
- Explicit Supabase session revocation:
  - local session only
  - all other sessions
  - all sessions
- Dashboard password changes require AAL2 and are routed through the protected `dashboard-update-password` Edge Function.
- HIBP screening runs twice for dashboard password changes: browser-side k-anonymity for fast UX and server-side k-anonymity before the trusted Auth Admin mutation.
- Password changes revoke all refresh sessions.
- Security Center at `/dashboard/security`.
- CSP allowlisting for Cloudflare Turnstile.
- CSP uses a cryptographically random per-request SSR nonce. TanStack `ScriptOnce`, `HeadContent`, and `Scripts` bind executable SSR scripts to that nonce; `script-src` no longer contains `'unsafe-inline'`.
- `script-src-attr 'none'` blocks HTML inline event handlers such as `onclick=`. `style-src` still allows inline styles because the current component library emits dynamic `<style>`/style attributes; tightening style CSP is a separate refactor.
- Production/non-preview Supabase sessions use `sessionStorage` rather than `localStorage`, so dashboard tokens do not survive closing the browser tab/window. Legacy persistent auth is migrated once into the current tab and deleted from `localStorage`; if browser storage is blocked, auth falls back to memory only.
- Dashboard responses are explicitly marked `no-store` for browser/CDN/proxy caches.
- CI runs dashboard security regression tests on every PR open/update and on pushes to `main`.

## Production activation: Cloudflare Turnstile

Do not commit the Turnstile Secret Key.

1. Create a Cloudflare Turnstile widget for the production storefront/dashboard domains.
2. Put the **Site Key** in the deployment/build environment:
   `VITE_TURNSTILE_SITE_KEY=<public site key>`
3. In Supabase Dashboard, open Authentication -> Bot and Abuse Protection / CAPTCHA.
4. Select Cloudflare Turnstile, paste the **Secret Key**, and enable CAPTCHA protection.
5. Redeploy/rebuild the app so the public Site Key is present in the browser bundle.
6. Test both:
   - `/dashboard/login`
   - Forgot password

The client intentionally does not claim Turnstile is fully enabled merely because the Site Key exists. Supabase must also have the matching provider Secret configured.

## Leaked-password protection

The dashboard's supported password-change/recovery path is protected by the `dashboard-update-password` Edge Function. The function requires a validated dashboard user, AAL2, an admin/editor role, and server-side HIBP screening before calling the Supabase Auth Admin password mutation.

The browser also performs the same HIBP k-anonymity screening for fast feedback. The new password is sent over TLS to the protected Space Call Edge Function because that trusted service performs the actual password mutation; it is not logged by application code. HIBP receives only the first five SHA-1 hex characters in both checks; the complete digest and plaintext password are never sent to HIBP.

Supabase's native **Leaked Password Protection** is still recommended if the project is upgraded to a plan that supports it. On hosted Supabase Free, there is no Auth hook that intercepts every new-password assignment, so the native Auth endpoint remains a platform-level bypass of application-specific HIBP policy for a caller that deliberately avoids the dashboard flow. The application never uses that direct mutation path.

## Rate limiting

The project-level dashboard auth throttle is deployed as `dashboard-auth-throttle`.
Keep Supabase Auth's native rate limits enabled as an independent defense layer.

Dashboard login throttling remains fail-open at the browser integration boundary if the Edge Function is unavailable, while TOTP MFA, Supabase Auth, RLS, and (when configured) Turnstile remain independent controls.

The application server's global mutation limiter no longer uses process-local memory. It consumes the shared `consume_edge_rate_limit` database RPC through the server-only Supabase admin client, with the source address stored only as a SHA-256-derived bucket key. Mutating requests fail closed with HTTP 503 if that shared protection cannot be reached, avoiding per-instance bypasses during production scaling.

## Privileged database RPC boundary

Privileged dashboard RPC implementations are stored in the non-exposed `private` schema as `SECURITY DEFINER` functions. The existing `public` RPC names are preserved as `SECURITY INVOKER` wrappers, so the dashboard API contract remains stable without exposing definer functions directly through the Data API.

The retired `ci_debug_logs` table has been removed. The old `ci-debug-log` Edge Function remains a 410 Gone tombstone and cannot write data.

## Secret handling

Never store any of these in `VITE_*`, source files, GitHub commits, or browser storage:

- Turnstile Secret Key
- Supabase service-role key
- passwords
- MFA TOTP secret after enrollment
- refresh/access tokens outside the Supabase client session mechanism


## Session storage boundary

The dashboard is still a browser-managed Supabase SPA session because MFA, refresh, and authenticated Edge Function calls currently run through the browser Supabase client. The production session is therefore intentionally stored in `sessionStorage`, not `localStorage`: this reduces persistence but does **not** make tokens inaccessible to JavaScript.

Moving the Supabase session to a fully HttpOnly cookie would require a server-brokered auth architecture for MFA, token refresh, and every authenticated dashboard/Edge request. Supabase's current SSR guidance uses cookie-backed sessions for rich client applications, but those browser auth cookies remain JavaScript-readable when client-side Supabase needs them. A truly HttpOnly dashboard therefore requires moving authenticated dashboard operations behind a server/BFF boundary; it should not be represented as completed by merely changing a cookie flag, wrapping storage, or encrypting browser storage.

Auth0's additional dashboard token cache remains memory-only.


## Final hardening follow-up — 2026-09-26

- Corrected an implementation drift where production auth storage had regressed to `localStorage` despite tests/documentation requiring tab-scoped sessions.
- Restored automatic `main` + pull-request CI triggers and the explicit dashboard security regression test.
- Added a shared storefront URL allowlist and revalidation at CMS navigation / brand render boundaries.
- Dashboard saves now reject executable, protocol-relative, credential-bearing, or otherwise invalid managed links.
- Current CMS URL data was checked before this change and contained no unsafe navigation, brand, or canonical destinations.
- Production Supabase logs for `dashboard-auth-throttle` showed successful requests and no observed function errors during the inspected window.
