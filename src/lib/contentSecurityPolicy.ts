export function buildContentSecurityPolicy(nonce?: string) {
  const backendHttpOrigins = new Set(["https://rtwyankpxtffqqrasyzw.supabase.co"]);
  const backendWebSocketOrigins = new Set(["wss://rtwyankpxtffqqrasyzw.supabase.co"]);
  const configuredBackendUrl = import.meta.env.VITE_SUPABASE_URL;
  if (configuredBackendUrl) {
    try {
      const backendUrl = new URL(configuredBackendUrl);
      if (backendUrl.protocol === "https:") {
        backendHttpOrigins.add(backendUrl.origin);
        backendUrl.protocol = "wss:";
        backendWebSocketOrigins.add(backendUrl.origin);
      }
    } catch {
      // Ignore malformed build-time configuration and retain the safe fallback.
    }
  }

  const scriptSources = [
    "'self'",
    ...(nonce ? [`'nonce-${nonce}'`] : []),
    "https://challenges.cloudflare.com",
    "https://maps.googleapis.com",
    "https://maps.gstatic.com",
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
    `img-src 'self' data: blob: ${[...backendHttpOrigins].join(" ")} https://images.unsplash.com https://maps.gstatic.com https://maps.googleapis.com https://*.googleapis.com https://*.ggpht.com https://*.googleusercontent.com`,
    `media-src 'self' ${[...backendHttpOrigins].join(" ")}`,
    `connect-src 'self' ${[...backendHttpOrigins].join(" ")} ${[...backendWebSocketOrigins].join(" ")} https://challenges.cloudflare.com https://api.pwnedpasswords.com https://maps.googleapis.com https://*.googleapis.com`,
    "frame-src 'self' https://maps.google.com https://www.google.com https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}
