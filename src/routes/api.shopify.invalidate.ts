import { createHmac, timingSafeEqual } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";

import { invalidateStorefrontCache } from "@/lib/shopify";

function validShopifyHmac(body: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(body, "utf8").digest("base64");
  const providedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

/**
 * Register Shopify product, inventory and collection webhooks against this URL.
 * A valid Shopify signature is mandatory; no cache state can be mutated by an
 * unauthenticated request.
 */
export const Route = createFileRoute("/api/shopify/invalidate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["SHOPIFY_WEBHOOK_SECRET"]?.trim();
        if (!secret) {
          return new Response("Webhook secret is not configured", { status: 503 });
        }

        const signature = request.headers.get("x-shopify-hmac-sha256") ?? "";
        const body = await request.text();
        if (!signature || !validShopifyHmac(body, signature, secret)) {
          return new Response("Invalid Shopify signature", { status: 401 });
        }

        await invalidateStorefrontCache();
        return new Response(null, {
          status: 204,
          headers: { "Cache-Control": "no-store" },
        });
      },
    },
  },
});
