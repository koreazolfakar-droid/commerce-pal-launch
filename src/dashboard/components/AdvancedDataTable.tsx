import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type AdvancedTableColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  searchValue?: (row: T) => string | number;
  exportValue?: (row: T) => string | number;
  className?: string;
};

type SortState = {
  id: string;
  direction: "asc" | "desc";
};

function compareValues(left: string | number, right: string | number) {
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function csvCell(value: string | number) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function AdvancedDataTable<T>({
  rows,
  columns,
  getRowId,
  searchPlaceholder,
  emptyLabel,
  exportFileName,
  pageSizeOptions = [10, 25, 50],
}: {
  rows: T[];
  columns: AdvancedTableColumn<T>[];
  getRowId: (row: T) => string;
  searchPlaceholder: string;
  emptyLabel: string;
  exportFileName: string;
  pageSizeOptions?: number[];
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeOptions[0] ?? 10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      columns.some((column) => {
        const getter = column.searchValue ?? column.exportValue ?? column.sortValue;
        if (!getter) return false;
        return String(getter(row)).toLowerCase().includes(query);
      }),
    );
  }, [columns, rows, search]);

  const sortedRows = useMemo(() => {
    if (!sort) return filteredRows;
    const column = columns.find((item) => item.id === sort.id);
    if (!column?.sortValue) return filteredRows;
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...filteredRows].sort(
      (left, right) => compareValues(column.sortValue!(left), column.sortValue!(right)) * direction,
    );
  }, [columns, filteredRows, sort]);

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = useMemo(
    () => sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, pageSize, sortedRows],
  );

  useEffect(() => {
    setPage(1);
  }, [pageSize, search]);

  useEffect(() => {
    setSelectedIds((current) => {
      const validIds = new Set(rows.map(getRowId));
      const next = new Set([...current].filter((id) => validIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [getRowId, rows]);

  const pageIds = pageRows.map(getRowId);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  const togglePage = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleRow = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const changeSort = (column: AdvancedTableColumn<T>) => {
    if (!column.sortValue) return;
    setSort((current) => {
      if (!current || current.id !== column.id) return { id: column.id, direction: "asc" };
      if (current.direction === "asc") return { id: column.id, direction: "desc" };
      return null;
    });
  };

  const exportRows = () => {
    const selectedRows = selectedIds.size
      ? sortedRows.filter((row) => selectedIds.has(getRowId(row)))
      : sortedRows;
    const exportColumns = columns.filter((column) => column.exportValue || column.sortValue || column.searchValue);
    const lines = [
      exportColumns.map((column) => csvCell(column.header)).join(","),
      ...selectedRows.map((row) =>
        exportColumns
          .map((column) => {
            const getter = column.exportValue ?? column.sortValue ?? column.searchValue;
            return csvCell(getter ? getter(row) : "");
          })
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = exportFileName.endsWith(".csv") ? exportFileName : `${exportFileName}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_3px_rgba(15,23,42,0.035)]">
      <div className="flex flex-col gap-3 border-b border-border/60 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 rounded-xl ps-9 text-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.size ? (
            <span className="rounded-lg bg-primary/10 px-2.5 py-1.5 text-[10px] font-bold text-primary">
              {selectedIds.size} selected
            </span>
          ) : null}
          <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={exportRows}>
            <Download className="me-1.5 size-3.5" /> CSV
          </Button>
          <select
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
            className="h-9 rounded-xl border border-border/70 bg-background px-2.5 text-[11px] font-semibold text-foreground outline-none"
            aria-label="Rows per page"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-start text-xs">
          <thead className="border-b border-border/60 bg-muted/20 text-[10px] uppercase tracking-[0.05em] text-muted-foreground">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={togglePage}
                  aria-label="Select visible rows"
                  className="size-4 rounded border-border accent-primary"
                />
              </th>
              {columns.map((column) => {
                const sorted = sort?.id === column.id;
                const Icon = !sorted ? ArrowUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;
                return (
                  <th key={column.id} className={cn("px-3 py-3 text-start font-bold", column.className)}>
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => changeSort(column)}
                        className="inline-flex items-center gap-1.5 transition hover:text-foreground"
                      >
                        {column.header}
                        <Icon className="size-3" />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {pageRows.length ? (
              pageRows.map((row) => {
                const id = getRowId(row);
                const selected = selectedIds.has(id);
                return (
                  <tr key={id} className={cn("transition hover:bg-muted/20", selected && "bg-primary/[0.035]")}> 
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleRow(id)}
                        aria-label="Select row"
                        className="size-4 rounded border-border accent-primary"
                      />
                    </td>
                    {columns.map((column) => (
                      <td key={column.id} className={cn("px-3 py-3 align-middle", column.className)}>
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-14 text-center text-xs text-muted-foreground">
                  {emptyLabel}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[10px] text-muted-foreground">
          {sortedRows.length
            ? `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, sortedRows.length)} of ${sortedRows.length}`
            : "0 rows"}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 rounded-lg"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={currentPage <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4 rtl:rotate-180" />
          </Button>
          <span className="min-w-16 text-center text-[10px] font-bold text-muted-foreground">
            {currentPage} / {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 rounded-lg"
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
            disabled={currentPage >= pageCount}
            aria-label="Next page"
          >
            <ChevronRight className="size-4 rtl:rotate-180" />
          </Button>
        </div>
      </div>
    </div>
  );
}
