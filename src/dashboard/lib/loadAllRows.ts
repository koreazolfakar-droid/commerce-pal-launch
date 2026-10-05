type PageResult<T> = { data: T[] | null; error: { message: string } | null };
type PagedQuery<T> = {
  order(
    column: string,
    options?: { ascending?: boolean },
  ): {
    range(from: number, to: number): PromiseLike<PageResult<T>>;
  };
};

/** Read every page, including when the API caps a response below our page size. */
export async function loadAllRows<T>(query: PagedQuery<T>): Promise<PageResult<T>> {
  const ordered = query.order("id", { ascending: true });
  const data: T[] = [];
  while (true) {
    const page = await ordered.range(data.length, data.length + 99);
    if (page.error) return { data: null, error: page.error };
    const rows = page.data ?? [];
    if (!rows.length) return { data, error: null };
    data.push(...rows);
  }
}

/** Keep IN filters within a bounded URL size, and paginate each batch. */
export async function loadRowsByIds<T>(
  ids: string[],
  query: (ids: string[]) => PagedQuery<T>,
): Promise<PageResult<T>> {
  const data: T[] = [];
  const unique = [...new Set(ids)];
  for (let start = 0; start < unique.length; start += 100) {
    const result = await loadAllRows(query(unique.slice(start, start + 100)));
    if (result.error) return { data: null, error: result.error };
    data.push(...(result.data ?? []));
  }
  return { data, error: null };
}
