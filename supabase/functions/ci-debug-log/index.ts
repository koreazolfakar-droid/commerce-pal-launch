import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Retired CI debug sink.
 *
 * This endpoint previously accepted unauthenticated log writes through a
 * service-role client. It is intentionally kept as an inert tombstone so old
 * CI callers fail closed instead of recreating a privileged public write path.
 */
Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response("ci_debug_log_retired", {
    status: 410,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
});
