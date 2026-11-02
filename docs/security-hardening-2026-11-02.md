# Space Call security hardening — 2026-11-02

## Change scope

These are additive protections around the existing production request and storefront CMS boundaries. They do **not** change product, order, inventory, dashboard-role or authentication contracts. No database migrations, new secrets, or new Cloudflare firewall rules are required.

### 1. Streamed request size validation

The SSR Worker previously rejected mutation requests above 128 KiB only when the client provided a trustworthy `Content-Length` header. A chunked request with a missing or misleading length could bypass that check. The server now checks the *actual* stream bytes with a bounded clone before the TanStack handler receives the request. The original request body is left available for normal parsing.

The server continues to reject cross-site mutations and enforce the shared Supabase per-IP rate limiter first. Oversize payloads return HTTP 413. Malformed request bodies fail closed with HTTP 400.

### 2. Client-controlled CMS links

The existing URL validator already rejected credentials, dangerous URI schemes, and conventional protocol-relative URLs. It now also rejects backslash authority tricks and encoded backslashes / control characters that can make a leading-slash path resolve to another origin. Valid `/product/...` paths, `#anchors` and existing http(s) partner links remain supported. The same validator is used both when CMS content is saved and when it is displayed.

### 3. Sensitive HTTP caching

The SSR Worker now overrides caching for mutating requests, bearer-authenticated responses, and responses issuing `Set-Cookie`: `private, no-store` for browsers and `no-store` for intermediary caches. Anonymous storefront reads and static immutable assets keep their existing performance behavior. Redirects from the Android app host to the canonical dashboard host also receive the standard security headers, and only the dashboard path and its descendants are redirected.

## Verification and limitations

- New executable URL / streaming-body regression tests run as part of `bun run test:unit`.
- Existing SSR / CSP / dashboard / commerce CI and Cloudflare Workers smoke tests must pass before merging.
- These controls reduce specific risks; they do **not** constitute a complete penetration test, and they do not replace Cloudflare WAF, Supabase RLS/MFA, provider-side API throttling or ongoing dependency patching.
- The limit is intentionally unchanged at 128 KiB, so upload size policy and product editing behavior should remain consistent with the existing configuration.
