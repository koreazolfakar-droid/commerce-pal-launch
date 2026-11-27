import { unavailableDashboardRoutes } from "@/dashboard/config/capabilities";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { ArrowUpRight, Command, CornerDownLeft, Loader2, Search, X } from "lucide-react";
import { useLanguage } from "@/dashboard/i18n";
import { useDashboardIdentity } from "@/dashboard/contexts/DashboardIdentityContext";
import { useDashboardModal } from "@/dashboard/hooks/useDashboardModal";
import { navSections } from "@/dashboard/config/navigation";
import { preloadDashboardRoute } from "@/dashboard/config/routes";
import { readPreference, writePreference } from "@/dashboard/lib/preferenceStorage";
import {
  searchDashboardWorkspace,
  type WorkspaceSearchResult,
} from "@/dashboard/data/workspaceSearch";

type Result = Omit<WorkspaceSearchResult, "group"> & { group: string; translate?: boolean };
const recentKey = "spacecall-recent-sections";

export default function DashboardCommandCenter() {
  const { t, lang } = useLanguage();
  const { role } = useDashboardIdentity();
  const [path, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const [remote, setRemote] = useState({
    query: "",
    items: [] as WorkspaceSearchResult[],
    failed: [] as string[],
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useDashboardModal(() => setOpen(false), open);
  const id = useId();
  const sections = useMemo(
    () =>
      navSections
        .flatMap((section) => section.items)
        .filter(
          (item) =>
            !unavailableDashboardRoutes.has(item.href) &&
            (item.href !== "/dashboard/users" || role === "admin"),
        ),
    [role],
  );
  useEffect(() => {
    let stored: unknown;
    try {
      stored = JSON.parse(readPreference(recentKey) || "[]");
    } catch {
      stored = [];
    }
    const valid = Array.isArray(stored)
      ? stored.filter(
          (value): value is string =>
            typeof value === "string" && sections.some((item) => item.href === value),
        )
      : [];
    const next = sections.some((item) => item.href === path)
      ? [path, ...valid.filter((value) => value !== path)].slice(0, 5)
      : valid;
    setRecent(next);
    writePreference(recentKey, JSON.stringify(next));
  }, [path, sections]);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (!document.querySelector('[role="dialog"]')) {
          setQuery("");
          setOpen(true);
        }
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, []);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);
  useEffect(() => {
    setActive(0);
    if (!open || query.trim().length < 2) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      void searchDashboardWorkspace(query)
        .then((result) => {
          if (!cancelled) setRemote({ query, ...result });
        })
        .catch(() => {
          if (!cancelled)
            setRemote({ query, items: [], failed: ["Products", "Orders", "Customers"] });
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, query, retry]);
  const local: Result[] = (
    query.trim()
      ? sections.filter((item) =>
          `${item.label} ${t(item.label)}`
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase()),
        )
      : sections
          .filter((item) => recent.includes(item.href))
          .sort((a, b) => recent.indexOf(a.href) - recent.indexOf(b.href))
  )
    .slice(0, query.trim() ? 7 : 5)
    .map((item) => ({
      key: item.href,
      title: item.label,
      detail: "",
      href: item.href,
      group: query.trim() ? "Sections" : "Recent sections",
      translate: true,
    }));
  const quick: Result[] = !query.trim()
    ? [
        {
          key: "create-product",
          title: "Add New Product",
          detail: "",
          href: "/dashboard/products/new",
          group: "Quick actions",
          translate: true,
        },
        {
          key: "create-po",
          title: "New purchase order",
          detail: "",
          href: "/dashboard/purchase-orders/new",
          group: "Quick actions",
          translate: true,
        },
      ]
    : [];
  const items: Result[] = [
    ...quick,
    ...local,
    ...(open && remote.query === query && query.trim().length >= 2 ? remote.items : []),
  ];
  const failed = remote.query === query ? remote.failed : [];
  const choose = (item: Result) => {
    void preloadDashboardRoute(item.href);
    navigate(item.href);
    setOpen(false);
  };
  useEffect(() => {
    if (open)
      document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, id, open]);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setQuery("");
          setOpen(true);
        }}
        className="dashboard-command-trigger"
        aria-label={t("Search workspace")}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Search className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-start text-xs sm:text-sm">
          {t("Search sections, products, orders…")}
        </span>
        <kbd className="hidden items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[10px] sm:flex">
          <Command className="size-3" />K
        </kbd>
      </button>
      {open &&
        createPortal(
          <div
            className="dashboard-command-overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <section
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${id}-title`}
              tabIndex={-1}
              dir={lang === "ar" ? "rtl" : "ltr"}
              className="dashboard-theme-scope dashboard-command-dialog"
            >
              <div className="flex items-center justify-between gap-3 border-b border-border p-4 sm:px-5">
                <div>
                  <h2 id={`${id}-title`} className="text-base font-bold">
                    {t("Workspace command center")}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("Find a record or move directly to your next task.")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="dashboard-button"
                  aria-label={t("Close search")}
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="relative m-4">
                <Search className="absolute start-3.5 top-4 size-4 text-muted-foreground" />
                <input
                  ref={inputRef}
                  role="combobox"
                  aria-label={t("Search workspace")}
                  aria-autocomplete="list"
                  aria-expanded={true}
                  aria-controls={`${id}-results`}
                  aria-activedescendant={
                    items.length ? `${id}-option-${Math.min(active, items.length - 1)}` : undefined
                  }
                  value={query}
                  maxLength={120}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("Search by name, order number, or section")}
                  className="h-12 w-full rounded-xl border border-border bg-card pe-10 ps-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                      event.preventDefault();
                      if (items.length)
                        setActive(
                          (value) =>
                            (value + (event.key === "ArrowDown" ? 1 : items.length - 1)) %
                            items.length,
                        );
                    }
                    if (event.key === "Enter" && items.length) {
                      event.preventDefault();
                      choose(items[Math.min(active, items.length - 1)]);
                    }
                  }}
                />
                {loading && (
                  <Loader2 className="absolute end-3.5 top-4 size-4 animate-spin text-primary" />
                )}
              </div>
              <div
                id={`${id}-results`}
                role="listbox"
                aria-label={t("Search results")}
                className="min-h-32 flex-1 overflow-y-auto overscroll-contain px-3 pb-3"
              >
                {items.map((item, index) => (
                  <div key={item.key}>
                    {index === 0 || items[index - 1].group !== item.group ? (
                      <p className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        {t(item.group)}
                      </p>
                    ) : null}
                    <button
                      id={`${id}-option-${index}`}
                      role="option"
                      aria-selected={index === active}
                      tabIndex={-1}
                      type="button"
                      className={`dashboard-command-result ${index === active ? "is-active" : ""}`}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => choose(item)}
                    >
                      <div className="min-w-0 flex-1 text-start">
                        <span className="block truncate text-sm font-semibold">
                          {item.translate ? t(item.title) : item.title}
                        </span>
                        {item.detail && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {item.detail}
                          </span>
                        )}
                      </div>
                      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  </div>
                ))}
                {!items.length && !loading && (
                  <p role="status" className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {t("No matches. Try a different name or number.")}
                  </p>
                )}
                {loading && (
                  <p role="status" className="p-3 text-xs text-muted-foreground">
                    {t("Searching workspace…")}
                  </p>
                )}
              </div>
              {failed.length > 0 && (
                <div
                  role="alert"
                  className="mx-4 mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
                >
                  {t("Some results could not be loaded:")} {failed.map(t).join(", ")}{" "}
                  <button
                    className="ms-2 underline"
                    type="button"
                    onClick={() => setRetry((value) => value + 1)}
                  >
                    {t("Try again")}
                  </button>
                </div>
              )}
              <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-4 text-xs text-muted-foreground">
                <span>{t("Use ↑ ↓ to navigate · Enter to open · Esc to close")}</span>
                <CornerDownLeft className="size-3.5" />
              </footer>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}
