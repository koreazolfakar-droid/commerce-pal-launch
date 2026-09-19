# Dashboard Security Hardening

## Implemented in code and Supabase

- Mandatory TOTP MFA / AAL2 for all dashboard staff/admin data access at the database authorization boundary.
- `user_roles` keeps a narrow self-read bootstrap path at AAL1 so a staff account can discover its role and complete TOTP enrollment; this does not grant dashboard data access.
- Cloudflare Turnstile client integration for dashboard sign-in and password recovery.
- Native Supabase Auth `captchaToken` forwarding.
- Pre-auth Edge Function throttling with opaque SHA-256 buckets:
  - IP + email pair: 5 failures / 10 minutes -> 15 minute block.
  - IP + email pair: 10 failures / 10 minutes -> 60 minute block.
  - Global source IP: 25 failures / 10 minutes -> 15 minute block.
  - Global source IP: 50 failures / 10 minutes -> 60 minute block.
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

The project-level Edge throttle is already deployed as `dashboard-auth-throttle`.
Keep Supabase Auth's native rate limits enabled as an independent defense layer.

The Edge throttle is intentionally fail-open if its infrastructure is unavailable so an Edge outage cannot lock the administrator out; TOTP MFA, Supabase Auth, RLS, and (when configured) Turnstile remain independent controls.

## Secret handling

Never store any of these in `VITE_*`, source files, GitHub commits, or browser storage:

- Turnstile Secret Key
- Supabase service-role key
- passwords
- MFA TOTP secret after enrollment
- refresh/access tokens outside the Supabase client session mechanism
