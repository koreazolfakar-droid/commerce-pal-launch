import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Retired legacy CMS admin bridge.
 *
 * Dashboard administration now uses Supabase Auth + RLS directly. Keep this
 * endpoint inert so an old privileged control-plane path cannot be revived by
 * a future deployment.
 */
Deno.serve(() =>
  new Response(JSON.stringify({ error: "endpoint_retired" }), {
    status: 410,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  }),
);
