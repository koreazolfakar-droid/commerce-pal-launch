/**
 * Supabase's generated RPC argument types mark parameters with SQL defaults as
 * optional (`string | undefined`), while this dashboard intentionally sends
 * explicit `null` values to clear fields. Both are valid over the wire, so this
 * helper keeps the runtime payload untouched and only relaxes the static type.
 */
export function rpcArgs<T extends Record<string, unknown>>(args: T): never {
  return args as unknown as never;
}
