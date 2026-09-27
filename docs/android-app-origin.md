# Android app origin deployment

The Android TWA uses the dedicated `https://app.spacecallapp.store` origin. The public and
canonical website remains `https://www.spacecallapp.store`.

## Production configuration

- Point `app.spacecallapp.store` at the same storefront deployment and provision HTTPS.
- Ensure requests for the app hostname reach the SSR worker before static-file routing so the
  app-only `robots.txt`, Dashboard redirect, noindex header, canonical header, and Digital Asset
  Links response are enforced.
- In Supabase Auth URL Configuration, keep the Site URL on the public `www` origin and add the
  exact app callback URLs used by customer authentication (at minimum
  `https://app.spacecallapp.store/`). Do not use wildcard redirects.
- Keep Google OAuth's provider callback pointed at Supabase. The customer `redirectTo` is the
  exact browser origin and therefore returns app users to the app origin.
- Deploy `create-order`, `customer-orders`, and `public-cms` after their exact CORS allowlists are
  updated. Do not add the app origin to dashboard/admin functions or WebAuthn origins.
- Replace `public/.well-known/assetlinks.json` only after obtaining and independently verifying
  the real release or Play App Signing SHA-256 fingerprint. Never publish the debug fingerprint.

The service worker registers only on the exact app origin. It does not register on `www`, so the
normal website retains its existing browser behavior.
