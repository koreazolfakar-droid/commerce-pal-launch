# Space Call

Latest homepage implementation and Shopify setup: [الدليل العربي](SHOPIFY-HOMEPAGE-AR.md).
It includes the section order, independent campaign images and brand logos, data rules, and exact verification status.

The storefront and Dashboard run on Cloudflare Workers. Source and deployment are managed directly through GitHub; Lovable is not required to develop, build or run the application. Supabase remains the database, storage and authentication backend.

See [hosting and rollback](docs/cloudflare-workers-migration.md) and [remaining registrar handover](docs/lovable-independence.md).

## Development

Prefer working locally? You need Node.js 22+ and Bun — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone https://github.com/koreazolfakar-droid/commerce-pal-launch.git
cd commerce-pal-launch
bun install --frozen-lockfile
bun run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Homepage merchandising controls

The `homepage-hero` collection image, title and description create the first campaign slide, followed by its selected products. Product slides retain these optional tags:

- `hero_eyebrow: Your label` — small campaign label
- `hero_subtitle: Your message` — hero supporting copy
- `hero_cta: Shop the collection` — primary CTA label
- `hero_badge: New` — premium badge

Use `hero-brand-<slug>` for an independent brand campaign and `hero-category-<slug>` for a category campaign. These images also appear on their corresponding pages. Brand products remain scoped to the real catalog brand, and category products to their category. Generic `showcase-*` campaigns remain available alongside all brand sections.

### Brand logos

Top Brands uses exact `logo-<slug>` or `brand-logo-<slug>` collection images, independently of campaign images. It preserves the real vendor name and does not match collection titles or partial brand names. Without an uploaded logo, bundled marks and mapped Simple Icons are used; unresolved marks show the brand name on white. Apple, Samsung, Xiaomi, Anker, POCO and Vention assets were verified and bundled. See [asset sources](BRAND-ASSET-SOURCES.md).

### Gemini Shopping Advisor

Set these server-side environment variables to enable Gemini-powered catalogue search and shopping recommendations:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.6-flash
```

Gemini uses Google Search grounding when external/official manufacturer information is needed. Store recommendations are constrained to live Shopify catalogue products; the assistant does not invent store products, prices, stock, or handles. If Gemini is unavailable, the existing OpenAI assistant remains the fallback.

## Homepage layout fixes

See `HOMEPAGE-FIXES-AR.md` for the repair summary, completed checks, and deployment notes. Shared product rows now use `src/components/ProductRail.tsx`; copy that new file along with the modified source.

## Project completion and verification

See `IMPLEMENTATION-AR.md` for the implemented features, Shopify setup, and test status.

```sh
bunx tsc --noEmit
bun run build
bun run test:unit
bun run test:ssr
SPACE_CELL_FIXTURE_FALLBACK=1 bun run test:ssr
SPACE_CELL_FIXTURE_BAD_CURSOR=1 bun run test:ssr
bunx playwright install chromium
bun run test:e2e
```

The Playwright server uses `dev:e2e` and an isolated Shopify fixture transport. It requires no real Shopify token and never submits a live checkout. Normal `bun run dev` and production builds use the real server configuration. Run browser tests with port 4173 free; the suite deliberately refuses to reuse an unrelated running server. Use `bun run test:e2e:ui` for interactive runs.

`showcase-` collections are discovered across every collection page, in batches of 20 sorted by title; 20 is a page size, not a total limit. Repeated cursors safely trigger the catalog fallback. Create an optional collection metafield definition `custom.sort_order` with type `number_integer`, enable storefront public read access, then assign an integer value on each collection. Lower numbers appear first; unnumbered collections follow alphabetically. Collection images, descriptions and products are managed in Shopify. Products are counted through paginated IDs because the Storefront Collection type does not expose a product count field.

Shipping, returns, privacy, terms and warranty bodies/links are read from public Space Call CMS settings in Supabase. Configure `<prefix>_title`, `<prefix>_body` and optional `<prefix>_url`, using `shipping_policy`, `refund_policy`, `privacy_policy`, `terms_of_service` or `warranty_policy`. Policy HTML is sanitized before rendering. Routes carry the policy snapshot into the first client render to avoid hydration mismatches. The merchant-authorized bilingual shipping/returns/warranty text published on 2026-11-10 is recorded in `docs/store-policies-2026-11-10.json`; live catalogue corrections and exact photo sources are recorded in `docs/storefront-data-remediation-2026-11-10.json`.

AI defaults: `OPENAI_MODEL=gpt-4o` and `GEMINI_MODEL=gemini-3.6-flash`. Gemini 2.0 Flash was shut down on June 1, 2026; 3.6 Flash is Google's listed replacement ([official deprecations](https://ai.google.dev/gemini-api/docs/deprecations)). Model access and API keys are deployment settings; no live AI request was made during these local checks.
