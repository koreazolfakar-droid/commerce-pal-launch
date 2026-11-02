# Space Call login hardening — provider follow-up (2026-11-02)

## Implemented in this change

- **Staff password login fails closed** if the pre-auth throttle Edge Function is unavailable or returns a malformed/ambiguous decision. A real `allowed: false` result is still honored with its retry interval. Successful sign-in is not revoked if the after-login throttle bucket cleanup is temporarily unavailable.
- **Customer phone OTP** now includes an optional Cloudflare Turnstile CAPTCHA token in Supabase `signInWithOtp`; it refreshes that token after every SMS request and before resend. When the public site key is deployed, the customer form requires a valid token before requesting SMS. Google OAuth and SMS code verification remain unchanged.
- All responses and UI messages avoid exposing credentials, tokens or the existence of particular staff accounts.

## Still required in the Supabase Auth control plane (NOT performed by this PR)

**Important:** the dashboard pre-auth throttle is called by browser JavaScript. Anyone can send password requests directly to `<project-ref>.supabase.co/auth/v1/token` without running JavaScript, so **client-side throttling is defense in depth, NOT enforcement at the identity provider**. An HTTP WAF rule on `spacecallapp.store` would not cover a separate Supabase hostname.

1. Confirm the Cloudflare Turnstile **public site key** is configured as `VITE_TURNSTILE_SITE_KEY` in the production build and permits the three Space Call origins. Do not put the Turnstile secret into a Vite variable, code, GitHub Actions logs or the frontend.
2. After this change has deployed and both staff sign-in and customer SMS resend display a working challenge, open **Supabase Dashboard → space-call → Authentication → Bot and Abuse Protection → Enable CAPTCHA protection**. Choose Cloudflare Turnstile and save the corresponding **secret key** in Supabase Auth (server-side only). This protects direct requests to Supabase Auth. **Do not enable it before testing both login flows:** the setting is global to Supabase Auth.
3. Verify with test accounts: valid staff password + Turnstile + MFA works, customer phone OTP with Turnstile works, unverified direct sign-in/OTP requests are rejected, expired or replayed CAPTCHA tokens are rejected, and account recovery still works. Avoid brute-force attempts on production accounts.
4. **Leaked Password Protection** is currently reported disabled by the Supabase Security Advisor. Supabase's built-in check is available on the **Pro plan or above**. If your Supabase subscription is eligible, enable it in **Authentication → Settings → Password security** and re-run Security Advisor. Current Space Call's protected dashboard password-change Edge Function checks HIBP server-side, but that is **not equivalent** to native provider-wide enforcement against direct Supabase Auth requests.
5. Check the Supabase Auth provider's **built-in rate limits** for password login, verification and SMS sending in **Authentication → Rate Limits**. Avoid disabling or raising them to compensate for the custom app throttle.

## Verification

- `node --test e2e/dashboard-auth-provider-gates.test.mjs` plus existing login, security, customer-auth and commerce tests.
- Run TypeScript, ESLint, full unit, SSR and Cloudflare builds in CI before merging.
- Re-run Supabase `get_advisors(type="security")` after enabling native leaked-password checks.
- Note that no production authentication settings, users, secrets, recovery policies or Cloudflare WAF rules were changed automatically by this PR.

### References

- Supabase CAPTCHA: https://supabase.com/docs/guides/auth/auth-captcha
- Supabase leaked-password security: https://supabase.com/docs/guides/auth/password-security
- Supabase phone OTP: https://supabase.com/docs/guides/auth/phone-login
- Cloudflare WAF rate limiting: https://developers.cloudflare.com/waf/rate-limiting-rules/
