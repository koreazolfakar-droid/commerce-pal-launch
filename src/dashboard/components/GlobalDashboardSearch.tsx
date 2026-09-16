import { Link } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { DASHBOARD_SEARCH_TARGETS } from "@/dashboard/config/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardLanguage } from "@/lib/dashboardI18n";

type EntityResult = {
  id: string;
  label: string;
  meta: string;
  to: "/dashboard/products" | "/dashboard/orders" | "/dashboard/customers";
};

export function GlobalDashboardSearch() {
  const { language, text } = useDashboardLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [entities, setEntities] = useState<EntityResult[]>([]);
  const [loading, setLoading] = useState(false);

  const navigationMatches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return DASHBOARD_SEARCH_TARGETS.filter((item) =>
      `${item.en} ${item.ar}`.toLowerCase().includes(normalized),
    ).slice(0, 5);
  }, [query]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) {
      setEntities([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      const pattern = `%${value.replaceAll("%", "").replaceAll(",", " ")}%`;
      const [products, customers, orders] = await Promise.all([
        supabase
          .from("store_products" as never)
          .select("id,title,handle")
          .ilike("title", pattern)
          .limit(3),
        supabase
          .from("store_customers" as never)
          .select("id,name,phone")
          .ilike("name", pattern)
          .limit(3),
        supabase
          .from("store_orders" as never)
          .select("id,order_number,customer_name")
          .ilike("customer_name", pattern)
          .limit(3),
      ]);

      const next: EntityResult[] = [];
      for (const row of (products.data ?? []) as Array<{
        id: string;
        title: string;
        handle: string;
      }>) {
        next.push({
          id: `product:${row.id}`,
          label: row.title,
          meta: `/${row.handle}`,
          to: "/dashboard/products",
        });
      }
      for (const row of (customers.data ?? []) as Array<{
        id: string;
        name: string;
        phone: string;
      }>) {
        next.push({
          id: `customer:${row.id}`,
          label: row.name,
          meta: row.phone,
          to: "/dashboard/customers",
        });
      }
      for (const row of (orders.data ?? []) as Array<{
        id: string;
        order_number: number;
        customer_name: string;
      }>) {
        next.push({
          id: `order:${row.id}`,
          label: `#SC${row.order_number}`,
          meta: row.customer_name,
          to: "/dashboard/orders",
        });
      }
      setEntities(next.slice(0, 7));
      setLoading(false);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [query]);

  const open = query.trim().length > 0;
  const clear = () => {
    setQuery("");
    setEntities([]);
  };

  return (
    <div className="relative w-full max-w-[430px]">
      <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={text(
          "ابحث في الطلبات والمنتجات والعملاء...",
          "Search orders, products, customers...",
        )}
        className="h-10 w-full rounded-xl border border-border/70 bg-muted/25 pe-16 ps-10 text-[12px] font-medium text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/35 focus:bg-card focus:ring-2 focus:ring-primary/10"
      />
      <div className="absolute end-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {query ? (
          <button
            type="button"
            onClick={clear}
            className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={text("مسح البحث", "Clear search")}
          >
            <X className="size-3.5" />
          </button>
        ) : null}
        <kbd className="hidden rounded-md border border-border/70 bg-background px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground sm:inline">
          ⌘ K
        </kbd>
      </div>

      {open ? (
        <div className="absolute start-0 top-[calc(100%+8px)] z-50 w-full overflow-hidden rounded-2xl border border-border/70 bg-popover p-1.5 text-popover-foreground shadow-2xl">
          {loading ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">
              {text("جارٍ البحث…", "Searching…")}
            </p>
          ) : null}
          {!loading && navigationMatches.length === 0 && entities.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">
              {text("لا توجد نتائج مطابقة.", "No matching results.")}
            </p>
          ) : null}
          {navigationMatches.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={clear}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              >
                <Icon className="size-4" />
                <span>{language === "ar" ? item.ar : item.en}</span>
                <span className="ms-auto text-[9px] font-medium text-muted-foreground/65">
                  {text("صفحة", "Page")}
                </span>
              </Link>
            );
          })}
          {entities.length ? <div className="my-1 border-t border-border/60" /> : null}
          {entities.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              onClick={clear}
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-xs hover:bg-muted/60"
            >
              <span className="min-w-0 truncate font-semibold">{item.label}</span>
              <span className="max-w-[45%] truncate text-[9px] text-muted-foreground">
                {item.meta}
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
