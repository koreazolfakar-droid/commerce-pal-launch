# Space Call production analytics and Shopify sync

This storefront emits the GA4 commerce events it can observe before the customer leaves for Shopify Checkout:

- `page_view`
- `view_item`
- `search`
- `view_item_list`
- `select_item`
- `add_to_cart`
- `remove_from_cart`
- `view_cart`
- `begin_checkout`
- `add_to_wishlist`
- `compare_product`

## GA4

Set `VITE_GA4_MEASUREMENT_ID` in the production environment. The Google tag is loaded lazily and `send_page_view` is disabled because TanStack Router page views are emitted explicitly.

When the variable is empty, commerce events are pushed to `window.dataLayer` instead so a consent-aware Google Tag Manager implementation can consume them.

Do not install a second GA4 page-view tag on top of this implementation unless it is configured not to duplicate the same events.

## Purchase event

Do **not** emit `purchase` from the storefront when the shopper clicks checkout. A checkout click is not a completed order.

The final purchase happens on Shopify Checkout, outside this app. Configure the purchase event in Shopify using Customer Events / a custom pixel or Shopify's Google & YouTube integration so the event fires only after the order is actually completed. Use the same GA4 property configured for the storefront.

Recommended funnel:

`page_view → view_item → add_to_cart → view_cart → begin_checkout → purchase`

## Google Search Console

Set `VITE_GOOGLE_SITE_VERIFICATION` to the verification token from Search Console. The root document renders the corresponding verification meta tag.

Submit:

`https://spacecallapp.store/sitemap.xml`

## Shopify cache invalidation webhooks

Set `SHOPIFY_WEBHOOK_SECRET` in the production environment and register these Shopify webhooks to:

`https://spacecallapp.store/api/shopify/invalidate`

Recommended topics:

- `products/create`
- `products/update`
- `products/delete`
- `inventory_levels/update`
- `collections/create`
- `collections/update`
- `collections/delete`

The endpoint verifies `X-Shopify-Hmac-Sha256` before clearing the Storefront caches. Requests with an invalid signature cannot mutate cache state.

The Storefront API remains the authoritative source. Products that Shopify no longer publishes to the Storefront sales channel are therefore removed from shop/category/brand/search/sitemap data once the webhook invalidates cached responses.

## Verification checklist

1. Make an ACTIVE, Storefront-published test product and confirm it is visible.
2. Change the test product to Draft or unpublish it from the Storefront sales channel.
3. Confirm `/shop`, search, its category and its brand stop returning it after invalidation.
4. Fetch `/sitemap.xml` and confirm its product URL is absent.
5. In GA4 DebugView, verify one `add_to_cart` before `begin_checkout`.
6. Complete one Shopify test order and confirm `purchase` comes from Shopify Customer Events / Google integration rather than the storefront checkout click.
