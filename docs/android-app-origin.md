# Android app origin deployment

The Android TWA uses the dedicated `https://app.spacecallapp.store` origin. The public and
canonical website remains `https://www.spacecallapp.store`.

## Production configuration

- Point `app.spacecallapp.store` at the same storefront deployment and provision HTTPS.
- Ensure requests for the app hostname reach the SSR worker before static-file routing so the
  app-only `robots.txt`, Dashboard redirect, noindex header, canonical header, and Digital Asset
  Links response are enforced.
- In Supabase Auth URL Configuration, keep the Site URL on the public `www` origin and add the
  exact app callback URL emitted by customer authentication:
  `https://app.spacecallapp.store/`. Retain `https://www.spacecallapp.store/` as an exact
  redirect URL. Do not use wildcard redirects.
- Keep Google OAuth's provider callback pointed at
  `https://rtwyankpxtffqqrasyzw.supabase.co/auth/v1/callback`. The customer `redirectTo` is
  selected from the exact app and public origins, never copied from an arbitrary host.
- Deploy `create-order`, `customer-orders`, and `public-cms` after their exact CORS allowlists are
  updated. Do not add the app origin to dashboard/admin functions or WebAuthn origins.
- Populate `public/.well-known/assetlinks.json` only with the independently verified SHA-256
  fingerprint extracted from the signed APK users will install. The current direct-distribution
  build uses the persistent local release certificate; never publish the debug fingerprint.

The service worker registers only on the exact app origin. It does not register on `www`, so the
normal website retains its existing browser behavior.

## App-only media cache

The app service worker caches only the enumerated public `cms-media` image-object shapes from
Supabase Storage. Its versioned image cache holds at most 120 entries for seven days and removes
older versions on activation. Unique object filenames (and a single numeric `v` parameter for
variants) prevent merchant replacements from silently reusing stale URLs. The worker fetches
those objects through the app-host `/android-media/` route with credentials omitted. That route
fixes the upstream origin and bucket, rejects unexpected paths, queries, cookies and bearer
tokens, checks image MIME and a 10 MiB size cap, and constructs a new response without the
Storage CDN's `Set-Cookie`. If it fails, the original image is fetched without credentials but
is not added to Cache Storage.

Un-sanitized first-party assets and `public-cms` responses are deliberately not put in Cache
Storage: browser Fetch can hide upstream `Set-Cookie`, so the worker cannot prove they meet the
no-cookie requirement. Their existing HTTP/browser caching remains unaffected. No HTML,
Dashboard, account, order, cart, checkout, payment, or private API response enters the app cache.
