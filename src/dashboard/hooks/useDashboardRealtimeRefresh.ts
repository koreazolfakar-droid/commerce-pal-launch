import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const REALTIME_DEBOUNCE_MS = 350;

export function useDashboardRealtimeRefresh(
  tables: readonly string[],
  onRefresh: () => void,
) {
  const callbackRef = useRef(onRefresh);
  callbackRef.current = onRefresh;

  const key = [...tables].sort().join(",");

  useEffect(() => {
    if (!key) return;

    let timer: number | null = null;
    const channelName = `dashboard-realtime:${key}:${Math.random().toString(36).slice(2)}`;
    let channel = supabase.channel(channelName);

    for (const table of key.split(",")) {
      if (!table) continue;
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          if (timer != null) window.clearTimeout(timer);
          timer = window.setTimeout(() => callbackRef.current(), REALTIME_DEBOUNCE_MS);
        },
      );
    }

    channel.subscribe();

    return () => {
      if (timer != null) window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [key]);
}
