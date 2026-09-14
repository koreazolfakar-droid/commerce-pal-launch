import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Retired on 2026-09-14. Space Call now uses the local catalogue-based shopping
// assistant, so this endpoint must never spend provider credits from public traffic.
Deno.serve(
  () =>
    new Response(JSON.stringify({ ok: false, code: "PAID_AI_ENDPOINT_RETIRED" }), {
      status: 410,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    }),
);
