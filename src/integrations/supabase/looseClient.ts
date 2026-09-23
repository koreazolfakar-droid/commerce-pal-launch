/**
 * Loosely typed view over the generated Supabase client.
 *
 * The generated `types.ts` is refreshed by the platform and can lag behind the
 * live schema (newer tables such as `store_sales`, `store_customer_profiles`
 * and `store_customer_addresses`, or newer RPCs). Use this view only for those
 * tables/functions; everything else should keep using the typed client so the
 * generated types stay useful.
 */
import { supabase } from "./client";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type LooseSupabase = {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => any;
};

export const looseSupabase = supabase as unknown as LooseSupabase;
