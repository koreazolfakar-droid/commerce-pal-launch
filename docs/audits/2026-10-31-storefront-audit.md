# Space Call review — 31 October 2026

## Evidence and scope

Reviewed main commit `5093d2e274c090cb91137d854675d0c51169c74c`, the public storefront in a browser, product/search/cart interactions, sitemap inventory, route metadata, and the existing dashboard/commerce regression suite. The sitemap lists 219 URLs, including 142 product pages. A read-only HTTP/SSR crawl checked all 219 sitemap URLs plus seven utility routes: 205 returned HTTP 200 and all 21 brand detail routes returned HTTP 500 before the fix. The raw results are in [the route audit](2026-10-31-curl-route-audit.json). Account/checkout/dashboard pages intentionally defer authenticated content and are noindex; their initial empty H1 counts are not public SEO defects.

Staff authentication is required to enter Dashboard. This browser has no staff session, so no claim is made that live admin edits, publishing, inventory receiving, payments, or production order placement were exercised. Isolated CI commerce tests cover these behaviors against test services. No production order, customer record, stock quantity, policy, or price was changed by this review.

## Findings and repairs

| Priority | Finding                                                                                                                  | Repair                                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P1       | Image-only hero artwork displays a printed shopping CTA without an actual link                                           | Make the artwork actionable with a validated configured destination, or the shop when no destination was configured; preserve editor and unsafe-target behavior    |
| P1       | Search is English-only and has no keyboard submit/full-results action; its overlay and result route use different caches | Accessible bilingual modal, Enter submission, full-results link, shared query cache, current primary-variant price, error/retry state, and bounded result previews |
| P1       | Search route loader returns before data completes                                                                        | Await catalog and requested search concurrently with query-dependent loader keys                                                                                   |
| P1       | A broken thumbnail hides product artwork even when the original is still available                                       | Try the original once and stop after both sources fail                                                                                                             |
| P1       | Desktop All returns to the homepage, account/tracking links lead to support, and the home deals action is unfiltered     | Route to shop, existing My orders, and sale-filtered shop respectively                                                                                             |
| P1       | Mobile All category chip looks selected but cannot clear category selection                                              | Make it an accessible pressed-state button that clears only categories                                                                                             |
| P2       | Footer/policy navigation disappears away from home                                                                       | Retain the lazy footer across store routes, with mobile purchase-bar clearance                                                                                     |
| P2       | Desktop navigation clips its final links                                                                                 | Allow navigation to wrap within the shared shell                                                                                                                   |
| P2       | Category/brand anchors override their native link semantics                                                              | Preserve native link roles inside labeled navigation                                                                                                               |
| P2       | Unloaded brand shelves expose productless headings and large blank space                                                 | Keep bounded lazy skeletons until real products are available                                                                                                      |
| P2       | Shop and Why Shop default headings remain English in Arabic mode                                                         | Localize fallback headings and descriptions while retaining merchant CMS overrides                                                                                 |
| P2       | Footer/trust copy exposes technical implementation details to shoppers                                                   | Use concise customer-facing copy                                                                                                                                   |
| P2       | Closing the search dialog loses keyboard focus                                                                           | Restore the invoking element after dismissal                                                                                                                       |
| P2       | Cloudflare branch preview builds succeed but fail at `wrangler preview`                                                  | Declare the required empty `previews` block; retain production routes and deployment settings                                                                      |

## Validation

- 622 unit, security, architecture, and behavioral checks pass locally.
- TypeScript passes; ESLint has zero errors and 27 existing Fast Refresh warnings.
- Repository and Android source security gates pass.
- Standalone production and Cloudflare SSR builds pass.
- SSR smoke checks pass using deterministic Supabase fixtures, including home, help, privacy, shop, categories, and sitemap. The fixture intentionally exercises backend fallback with simulated Rust 503 responses.
- A production SSR regression reproduced the brand failure before the repair. Standalone and workerd smoke suites now request a brand page and verify its H1/canonical metadata.
- Four behavioral regressions cover image-only hero targets, exhausted image fallbacks, search loader readiness, and unloaded brand headings.
- Mobile navigation checks also cover search focus restoration and Enter navigation to full results.
- Independent read-only review found no critical issue. Its focus-return and mobile footer-spacing findings were addressed.
- Local browser preview hydration was not verified; managed preview access was unavailable. GitHub CI supplies responsive LTR/RTL, light/dark, product and navigation browser checks.

## Content that needs verified merchant information

These are remaining content gaps, not permission to invent store promises:

- Confirmed warranty duration, exclusions, return eligibility/time limits, refund terms, delivery timing and service areas.
- Legal business/contact/address/hours details, if they should be public.
- Original source images for products whose originals and thumbnails are both unavailable. The product grid visibly reported missing media for several Mark Ryden backpacks.
- Product specifications not present in the merchant catalog, and consistent Arabic/English descriptions. A reviewed cable page used an Arabic description in English mode.

Stock, pricing, descriptions, policies and brand/category presentation remain controlled by the existing CMS. Live authenticated operations remain outside the verified scope.
