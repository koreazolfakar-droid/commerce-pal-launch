/** Reconcile a confirmed save without discarding edits made after its snapshot. */
export function reconcileSavedFields<T extends Record<string, string>>(
  current: T,
  submitted: T,
  persisted: T,
): T {
  const next = { ...current };
  for (const key of Object.keys(submitted) as Array<keyof T>) {
    if (current[key] !== submitted[key]) continue;
    if (Object.prototype.hasOwnProperty.call(persisted, key)) next[key] = persisted[key];
    else delete next[key];
  }
  return next;
}
