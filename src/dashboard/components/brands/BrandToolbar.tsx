import { ChevronDown, Search } from "lucide-react";

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="relative min-w-0">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white ps-3 pe-8 text-[10px] font-semibold text-slate-600 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
    </label>
  );
}

export default function BrandToolbar({
  query,
  onQueryChange,
  status,
  onStatusChange,
  homepage,
  onHomepageChange,
  sort,
  onSortChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  homepage: string;
  onHomepageChange: (value: string) => void;
  sort: string;
  onSortChange: (value: string) => void;
}) {
  return (
    <div className="mb-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_8px_24px_rgba(33,47,82,.04)]">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_150px_160px_170px]">
        <label className="relative sm:col-span-2 xl:col-span-1">
          <span className="sr-only">Search Brands</span>
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search brands"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white ps-9 pe-3 text-[11px] outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <Select
          label="Status"
          value={status}
          onChange={onStatusChange}
          options={[
            { value: "all", label: "All Status" },
            { value: "active", label: "Active" },
            { value: "hidden", label: "Hidden" },
          ]}
        />
        <Select
          label="Homepage"
          value={homepage}
          onChange={onHomepageChange}
          options={[
            { value: "all", label: "Homepage: All" },
            { value: "featured", label: "Featured" },
            { value: "not-featured", label: "Not Featured" },
          ]}
        />
        <Select
          label="Sort"
          value={sort}
          onChange={onSortChange}
          options={[
            { value: "order", label: "Custom Order" },
            { value: "name", label: "Name A–Z" },
            { value: "products", label: "Product Count" },
            { value: "updated", label: "Last Updated" },
          ]}
        />
      </div>
    </div>
  );
}
