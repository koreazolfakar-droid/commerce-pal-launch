import { useCallback, useEffect, type SetStateAction } from "react";
import { rememberDashboardList } from "@/dashboard/lib/listContext";
import { useLocation, useSearch } from "wouter";
import { readQueryValue, writeQueryValue, type QueryValue } from "@/dashboard/lib/queryState";

/** Keep list context in the URL so details → Back, refresh and shared links retain it. */
export function useDashboardQueryState<T extends QueryValue>(
  key: string,
  fallback: T,
  allowed?: readonly T[],
) {
  const search = useSearch();
  const [path, navigate] = useLocation();
  useEffect(() => {
    rememberDashboardList(path, search);
  }, [path, search]);
  const value = readQueryValue(new URLSearchParams(search), key, fallback, allowed);
  const setValue = useCallback(
    (action: SetStateAction<T>) => {
      const params = new URLSearchParams(window.location.search);
      const current = readQueryValue(params, key, fallback, allowed);
      const next = typeof action === "function" ? action(current) : action;
      if (next === current) return;
      const updated = writeQueryValue(params, key, next, fallback).toString();
      navigate(`${path}${updated ? `?${updated}` : ""}${window.location.hash}`, {
        replace: key !== "page",
      });
    },
    [allowed, fallback, key, navigate, path],
  );
  return [value, setValue] as const;
}
