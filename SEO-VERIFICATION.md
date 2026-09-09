# Space Call — SEO update verification

## Source files changed (six)

- `src/routes/__root.tsx`: added English, Arabic and x-default alternate links from SITE_URL. Existing global OG/Twitter logo images retained without duplication.
- `src/routes/index.tsx`: positioned the existing OG/Twitter image entries after og:url.
- `src/lib/infoPages.ts`: added full page-specific OG/Twitter metadata for all nine info pages while preserving canonical links.
- `src/routes/sitemap[.]xml.ts`: added lastmod to static entries and product entries, using the requested current-date/createdAt rules and XML escaping.
- `src/lib/seo.ts`: added the configured seller organization and the requested rolling 30-day priceValidUntil to product offers.
- `src/components/HeroBanner.tsx`: added synchronous decoding for the primary product slide. Its high fetch priority and eager loading already existed; later slides retain auto/lazy/async.

Category, brand and individual collection success branches already had no robots meta. They were verified as indexable in production SSR and required no source changes. Their unavailable branches retain their existing noindex declarations.

## Required verification

- `pnpm exec tsc --noEmit`: pass, zero errors.
- `pnpm run build`: pass.
- `pnpm run test:unit`: 29 passed, zero failed.
- `pnpm run test:ssr`: all 11 routes passed.

Additional checks against the production SSR build and isolated Shopify fixtures confirmed:

- Indexable success routes and retained canonical URLs.
- English/Arabic/x-default alternate links and one OG/Twitter image per page.
- Full OG/Twitter tags on all nine info pages.
- Product seller metadata and the requested 30-day date calculation.
- Static/product sitemap dates, date ordering and the missing-createdAt fallback.
- Primary product hero high/eager/sync attributes, with later slides unchanged.
- SHA-256 comparison: only the six listed source files changed. Existing tests, Shopify queries, configuration, stores, CSP, other components and robots files remain unchanged.

## Scope and observations

- hreflang targets the same homepage URL for all three entries, exactly as requested; this does not create separate crawlable language URLs.
- Static lastmod uses the request date, product lastmod uses creation date, and priceValidUntil is a rolling calculation. These are the requested rules, not merchant-supplied modification or offer-expiry dates.
- Missing category/brand URLs return HTTP 404; TanStack omits the unavailable-branch head metadata when their loaders throw notFound(). Existing noindex declarations were preserved and no new noindex was added.
- The Shopify campaign image is rendered by FacetHero and already has high/eager loading. Its async decoding was retained because changes to that component were explicitly prohibited.
- Checks ran locally with fixtures; this archive has not been deployed to the live store. No browser or live search-engine indexing validation was performed in this update.
