/**
 * Model identity is checked independently from a language model.
 * This does not prove that a device exists or verify any specifications.
 */
export function modelIdentifiers(value: string): string[] {
  const raw = value.normalize("NFKC").toLowerCase();
  const tokens = raw.match(/\b[a-z]{1,10}[\s-]?\d{1,5}[a-z]{0,4}\b/gu) ?? [];
  return [...new Set(tokens.map((token) => token.replace(/[\s-]/g, "")))];
}

/** Fail closed when AI proposes a different model (e.g. A55 for requested A57). */
export function modelMismatch(requested: string, proposed: string): boolean {
  const expected = modelIdentifiers(requested);
  const actual = modelIdentifiers(proposed);
  return expected.length > 0 &&
    actual.length > 0 &&
    expected.some((token) => !actual.includes(token));
}
