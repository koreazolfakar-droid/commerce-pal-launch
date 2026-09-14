import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Retired on 2026-09-14. Space Call uses the no-API local catalogue assistant.
// Keep a non-billable tombstone so old clients cannot trigger provider spend.
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
