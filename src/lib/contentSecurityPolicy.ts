export function buildContentSecurityPolicy(nonce?: string) {
  const scriptSources = [
    "'self'",
    ...(nonce ? [`'nonce-${nonce}'`] : []),
    "https://challenges.cloudflare.com",
  ];
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "style-src-attr 'unsafe-inline'",
    "font-src 'self' data: https://fonts.gstatic.com",
    // Legacy product media is still being migrated from Shopify CDN to Supabase Storage.
    // These hosts are image/media-only and cannot be used for API connections or forms.
    "img-src 'self' data: blob: https://cdn.shopify.com https://*.shopifycdn.com https://rtwyankpxtffqqrasyzw.supabase.co https://images.unsplash.com",
    "media-src 'self' https://cdn.shopify.com https://*.shopifycdn.com https://rtwyankpxtffqqrasyzw.supabase.co",
    "connect-src 'self' https://rtwyankpxtffqqrasyzw.supabase.co wss://rtwyankpxtffqqrasyzw.supabase.co https://challenges.cloudflare.com https://api.pwnedpasswords.com",
    "frame-src 'self' https://maps.google.com https://www.google.com https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}
