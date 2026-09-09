# Space Call brand and localization update — September 2026

## Changed files

- `public/logo.png`: exact PNG conversion of the supplied official logo, preserving its pixels and black background.
- `src/components/SiteHeader.tsx`, `SiteFooter.tsx`, `MobileTopBar.tsx`: official image at 32px height, with configurable store-name text retained.
- `src/components/HomeSections.tsx`: translated benefit/service titles, details, actions, accessible labels and recently viewed copy.
- `src/lib/i18n.tsx`: matching English/Arabic translation keys, including root error and 404 messages.
- `src/routes/__root.tsx`: translated fallback pages, language provider moved to the shared shell so fallback routes receive it, PNG favicon and absolute OG/Twitter image fallback.
- `src/routes/index.tsx`: homepage OG/Twitter image.
- `src/lib/storeConfig.ts`, `.env.example`: optional Instagram, Facebook, X and YouTube profile settings. Footer icons remain hidden until configured.
- `src/server.ts`: Shopify hosts allowed in connect-src; comment documents server-only AI calls.
- `roadmap.md`: requested completion checkboxes and hardening summary.

## Verification

- `pnpm exec tsc --noEmit`: passed, zero TypeScript errors.
- `pnpm run build`: passed.
- `pnpm run test:unit`: 29 passed, zero failed.
- `pnpm run test:ssr`: all 11 routes passed using isolated Shopify fixtures.
- `pnpm run lint`: zero errors, nine existing Fast Refresh warnings.
- Additional production SSR checks: homepage and unknown-route status, favicon, OG/Twitter image, all three logo placements and exact CSP connect-src passed.
- Pixel comparison: PNG exactly matches the decoded uploaded JPEG at 1536 × 1536.

No Shopify query/integration changes, cart-store changes, dependency changes, new any types or existing test modifications. The documented CSP unsafe-inline allowance is retained. Browser visual tests were not run in this update; the SSR checks use fixtures, not live Shopify transactions.
