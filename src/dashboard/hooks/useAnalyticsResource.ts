import { useEffect, useState } from "react";

/** Clear old results immediately when the query changes; cancel superseded requests. */
export function useAnalyticsResource<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
  enabled = true,
) {
  const [state, setState] = useState<{
    key: string;
    data: T | null;
    loading: boolean;
    error: string;
    updatedAt: Date | null;
  }>({ key: "", data: null, loading: true, error: "", updatedAt: null });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setState({ key, data: null, loading: true, error: "", updatedAt: null });
    void load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ key, data, loading: false, error: "", updatedAt: new Date() });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setState({
            key,
            data: null,
            loading: false,
            error: cause instanceof Error ? cause.message : "Unable to load analytics.",
            updatedAt: null,
          });
      });
    return () => controller.abort();
  }, [key, load, enabled]);
  return !enabled
    ? { data: null, loading: false, error: "", updatedAt: null }
    : state.key === key
      ? state
      : { data: null, loading: true, error: "", updatedAt: null };
}
