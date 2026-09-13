# Space Call Admin

This directory contains the isolated AdminJS service used to manage Space Call content stored in Supabase Postgres.

## Managed content

- Site settings and homepage ticker text
- Hero slides, scheduling, links, and publish state
- Homepage section visibility and ordering
- Navigation items, links, labels, ordering, and icons

The storefront remains a separate TanStack Start application. If this admin service is unavailable, the public storefront can continue using its existing fallbacks.

## Local setup

1. Copy `.env.example` to `.env` inside this directory.
2. Set a server-only `DATABASE_URL` from the Space Call Supabase project.
3. Set `ADMIN_EMAIL`.
4. Set `ADMIN_PASSWORD_HASH` to a bcrypt hash of the owner password.
5. Set `ADMIN_COOKIE_SECRET` to a unique random value of at least 32 characters.
6. Run `npm install` inside `admin/`.
7. Run `npm run dev`.

The panel is available at `/admin` on the configured port. The default local port is `3001`.

## Production rules

- Deploy this folder as a separate Node service from the storefront.
- Never expose `DATABASE_URL` in browser code or a `VITE_` variable.
- Do not place a Supabase service-role key in the dashboard frontend.
- Keep HTTPS enabled in production so the admin session cookie is secure.
- The session table is stored in the private `admin_private` Postgres schema.
- Only the four CMS resources are registered with AdminJS; the rest of the Space Call database is not exposed in the panel.

## Icon values

For bottom navigation, `icon_type=lucide` currently supports these `icon_value` names:

`House`, `LayoutGrid`, `Grid2X2`, `Search`, `ShoppingBag`, `Heart`, `Menu`, `Smartphone`, `User`.

For a custom icon, use `icon_type=image` or `icon_type=svg` and set `icon_value` to an HTTPS asset URL.

## Next CMS expansion

The same pattern can be extended to Header, Footer, Trust Benefits, category presentation, banners, SEO fields, and image uploads through Supabase Storage without changing the storefront architecture.
