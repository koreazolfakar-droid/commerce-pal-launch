export function buildContentSecurityPolicy(nonce?: string) {
  const scriptSources = [
    "'self'",
    ...(nonce ? [`'nonce-${nonce}'`] : []),
    "https://challenges.cloudflare.com",
  ];
  const styleSources = [
    "'self'",
    ...(nonce ? [`'nonce-${nonce}'`] : ["'unsafe-inline'"]),
    "https://fonts.googleapis.com",
  ];

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self' https://*.myshopify.com https://checkout.shopify.com",
    `script-src ${scriptSources.join(" ")}`,
    "script-src-attr 'none'",
    `style-src ${styleSources.join(" ")}`,
    "style-src-attr 'unsafe-inline'",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://cdn.shopify.com https://*.shopifycdn.com https://rtwyankpxtffqqrasyzw.supabase.co https://images.unsplash.com",
    "media-src 'self' https://cdn.shopify.com https://*.shopifycdn.com",
    "connect-src 'self' https://*.myshopify.com https://cdn.shopify.com https://rtwyankpxtffqqrasyzw.supabase.co wss://rtwyankpxtffqqrasyzw.supabase.co https://challenges.cloudflare.com https://api.pwnedpasswords.com",
    "frame-src 'self' https://*.myshopify.com https://checkout.shopify.com https://maps.google.com https://www.google.com https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}
