# Space Call Dashboard — DESIGN.md

Status: implementation specification (not a claim that UI changes are deployed)
Scope: existing authenticated dashboard only. Preserve all routes, data, permissions, integrations, and workflows.

## Direction
An original Space Call administration interface informed by Shopify's transactional clarity and Linear's restrained density. Do not reproduce either company's branding. Prioritize speed, legibility, accessibility, and task completion over decorative effects.

## Design tokens
- 4px spacing unit; spacing scale: 4, 8, 12, 16, 20, 24, 32, 40.
- Radius: 6px chips, 8px inputs/buttons, 12px cards, 16px dialogs.
- Light canvas #F7F8FA, surface #FFFFFF, text #171A21, secondary #626A78, border #E4E7EC.
- Dark canvas #101216, surface #191C22, text #F4F5F7, secondary #A7ADB8, border #30343C.
- Space Call accent: retain current brand accent from app theme; never hardcode a competing accent into individual pages.
- Semantic colors reserved for confirmed success, warning, destructive actions, and status; never convey status through color alone.
- Typography: existing project font, 14px body minimum, 12px secondary labels only, 20–24px page headings, 16–18px section headings.
- Focus: visible 2px keyboard focus ring; 44x44px minimum touch target on mobile.

## Dashboard shell
- One consistent responsive sidebar/navigation, page title, breadcrumbs, contextual primary action, and content container.
- Desktop: persistent sidebar with collapsible groups; tablet: compact sidebar; mobile: accessible drawer and sticky page actions where needed.
- Avoid horizontal page overflow at 320, 360, 390, 768, 1024, 1440px. Tables may scroll inside their own containers with visible affordances.
- Standardize loading skeletons, no-results states, error messages, retry, permission-denied and save feedback.
- Animations 120–180ms for subtle transitions; respect prefers-reduced-motion; no content-blocking entrance animations.

## Existing section coverage
1. Overview: consistent metric cards, clear time windows, responsive chart/list layout, readable status indicators.
2. Products: compact searchable/filterable table, legible image/title/variant/stock/price, accessible row actions, bulk actions only if already supported.
3. Add/Edit product: desktop two-column form, mobile single-column; sticky save/publish actions; clear draft/published states; explicit required-field errors; variants/colors represented by accessible swatches plus text labels; prevent duplicate submits; preserve image upload/compression and autosync behavior where implemented.
4. Orders: clear order identifier, status, payment/delivery information where already available, customer details and address with graceful missing-data states; safe status changes.
5. Inventory/receiving: quantity, movement and supplier data readable without truncating identifiers; destructive changes require confirmation; never alter accounting calculations.
6. Categories/brands/collections: consistent item editor, image/logo previews, ordering controls only where existing.
7. Media: predictable thumbnails, aspect ratios, upload progress, retry, and selection feedback.
8. Homepage/content: shared section editor patterns for hero, menus, banners, featured blocks and SEO settings.
9. Customers: responsive identity/contact/address display, privacy-aware actions.
10. Settings, staff and security: grouped forms, explicit save status, no secret leakage, no weakening of RLS or authentication.

## Shared components
PageHeader, SectionCard, FormField, StatusLabel, DataTable, EmptyState, ErrorState, Skeleton, ConfirmDialog, StickyFormActions. Reuse existing shadcn/ui primitives rather than creating redundant controls.

## Implementation sequence
A. Inventory actual dashboard routes/components and screenshot each viewport before changes.
B. Introduce theme tokens and shared shell without altering data logic.
C. Migrate existing section layouts incrementally; product form first, then orders, inventory, content, settings.
D. Check accessibility, RTL/LTR, keyboard navigation, screen readers, contrast, long Arabic/English strings.
E. Run existing scripts: typecheck, lint, unit, build, test:ssr, test:dashboard:browser, test:dashboard:professional and relevant commerce acceptance tests in a configured test environment.
F. Compare before/after screenshots and interaction flows. Publish only after successful verification.

## Non-negotiable acceptance criteria
- All existing dashboard routes and buttons still work.
- No regressions to storefront, SSR, SEO, cart, authentication, Supabase RLS, order logic, or stock movements.
- No unapproved feature removal, database migration, DNS change, or production deploy.
- No fake success state: saving, publishing, and loading must reflect real backend responses.
- Each UI implementation PR lists changed routes, before/after evidence, tests run, and any limitations.


## Space Call Command navigation — implemented 2026-10-31
Design inspiration: Linear's restrained focus and Shopify's transactional information density. This is an original Space Call dashboard execution, not a clone.

### Shell and information architecture
- Five intentional groups: Overview, Commerce, Catalog, Storefront & marketing, Administration. No routes or staff permissions removed; existing admin-only user management remains admin-only.
- Desktop sidebar: 272px full / 80px collapsed; 336px maximum mobile drawer; physical divider and lightweight scroll region with keyboard-accessible expandable groups.
- Sidebar has a compact original SC lettermark, contextual active route, and a footer with two existing workflows: create a product and view the store.
- Desktop commandbar: current section label, preserved global command search, activity, theme, language and staff profile/security controls.
- Mobile: five preserved actions (Dashboard, Orders, Products, Add, More), with a clear active marker, comfortable targets and a secured focus-managed drawer.
- Collapsed navigation and expanded group preferences remain persistent. Route preloading and unsaved-change navigation protections remain intact.

### Visual identity and semantics
- Day mode: clean mineral-gray canvas, crisp neutral text and blue focus/selection; Night mode: blue-black matte sidebar, light typography and a reserved cool-blue active highlight.
- One clear active-route indicator, low-noise 1px separators, 10px icon/control corners, 44px minimum sidebar actions, 68px mobile dock.
- Variable-safe spacing and RTL logical properties (`inset-inline-start`, `border-inline-end`); no hardcoded left-only active indicators.
- Short 150–180ms interaction states. Respect `prefers-reduced-motion`, logical navigation order, `aria-current`, accessible drawer focus, and keyboard shortcuts/search.
- Do not add fake metrics, invented notification counts, unauthorized quick actions, or new data operations.

### Validation
- CI on navigation PR: TypeScript, ESLint, security/unit suites, desktop/mobile/Arabic responsive browser suites, commerce acceptance, Cloudflare non-deploying build.
- Production publish depends on successful PR merge and separate Cloudflare build verification. Do not claim visual review or published status without evidence.
