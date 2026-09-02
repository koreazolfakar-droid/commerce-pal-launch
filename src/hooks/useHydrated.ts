import { useEffect, useState } from "react";

/** Keeps render-visible client data out of the SSR/first-client render. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
