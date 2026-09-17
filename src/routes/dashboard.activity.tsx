import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, CirclePlus, Pencil, RefreshCw, Trash2 } from "lucide-react";

import {
  AdvancedDataTable,
  type AdvancedTableColumn,
} from "@/dashboard/components/AdvancedDataTable";
import { DashboardCard } from "@/dashboard/components/DashboardCard";
import { DashboardErrorState, DashboardSkeleton } from "@/dashboard/components/DashboardStates";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardLanguage } from "@/lib/dashboardI18n";

export const Route = createFileRoute("/dashboard/activity")({ component: DashboardActivityPage });

type AuditAction = "insert" | "update" | "delete";
type AuditEntity = "product" | "variant";

type AuditRow = {
  id: number;
  product_id: string | null;
  variant_id: string | null;
  entity_type: AuditEntity;
  action: AuditAction;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  changed_by: string | null;
  created_at: string;
};

function titleFromAudit(row: AuditRow) {
  const source = row.after_data ?? row.before_data ?? {};
  const title = source.title;
  if (typeof title === "string" && title.trim()) return title;
  const sku = source.sku;
  if (typeof sku === "string" && sku.trim()) return `SKU ${sku}`;
  return row.entity_type === "product" ? row.product_id ?? "Product" : row.variant_id ?? "Variant";
}

function changedFields(row: AuditRow) {
  if (row.action !== "update" || !row.before_data || !row.after_data) return [];
  const keys = new Set([...Object.keys(row.before_data), ...Object.keys(row.after_data)]);
  return [...keys].filter(
    (key) => JSON.stringify(row.before_data?.[key]) !== JSON.stringify(row.after_data?.[key]),
  );
}

function actionClass(action: AuditAction) {
  if (action === "insert") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (action === "delete") return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
  return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
}

function ActionIcon({ action }: { action: AuditAction }) {
  if (action === "insert") return <CirclePlus className="size-3.5" />;
  if (action === "delete") return <Trash2 className="size-3.5" />;
  return <Pencil className="size-3.5" />;
}

function DashboardActivityPage() {
  const { language, text } = useDashboardLanguage();
  const [actionFilter, setActionFilter] = useState<"all" | AuditAction>("all");
  const [entityFilter, setEntityFilter] = useState<"all" | AuditEntity>("all");

  const query = useQuery({
    queryKey: ["dashboard", "catalog-audit-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_catalog_audit_log" as never)
        .select(
          "id,product_id,variant_id,entity_type,action,before_data,after_data,changed_by,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
    staleTime: 20_000,
    retry: 1,
  });

  const rows = useMemo(() => {
    const source = query.data ?? [];
    return source.filter(
      (row) =>
        (actionFilter === "all" || row.action === actionFilter) &&
        (entityFilter === "all" || row.entity_type === entityFilter),
    );
  }, [actionFilter, entityFilter, query.data]);

  const summary = useMemo(() => {
    const source = query.data ?? [];
    return {
      total: source.length,
      inserts: source.filter((row) => row.action === "insert").length,
      updates: source.filter((row) => row.action === "update").length,
      deletes: source.filter((row) => row.action === "delete").length,
    };
  }, [query.data]);

  const columns = useMemo<AdvancedTableColumn<AuditRow>[]>(
    () => [
      {
        id: "time",
        header: text("الوقت", "Time"),
        sortValue: (row) => new Date(row.created_at).getTime(),
        searchValue: (row) => row.created_at,
        exportValue: (row) => row.created_at,
        cell: (row) => (
          <div className="whitespace-nowrap">
            <p className="font-bold text-foreground">
              {new Intl.DateTimeFormat(language === "ar" ? "ar-LB" : "en", {
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(row.created_at))}
            </p>
            <p className="mt-0.5 text-[9px] text-muted-foreground">
              {new Intl.DateTimeFormat(language === "ar" ? "ar-LB" : "en", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }).format(new Date(row.created_at))}
            </p>
          </div>
        ),
      },
      {
        id: "action",
        header: text("الإجراء", "Action"),
        sortValue: (row) => row.action,
        searchValue: (row) => row.action,
        exportValue: (row) => row.action,
        cell: (row) => (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black ${actionClass(row.action)}`}
          >
            <ActionIcon action={row.action} />
            {row.action === "insert"
              ? text("إضافة", "Created")
              : row.action === "delete"
                ? text("حذف", "Deleted")
                : text("تعديل", "Updated")}
          </span>
        ),
      },
      {
        id: "entity",
        header: text("النوع", "Entity"),
        sortValue: (row) => row.entity_type,
        searchValue: (row) => row.entity_type,
        exportValue: (row) => row.entity_type,
        cell: (row) => (
          <div>
            <p className="font-bold text-foreground">
              {row.entity_type === "product" ? text("منتج", "Product") : text("نسخة", "Variant")}
            </p>
            <p className="mt-0.5 max-w-40 truncate text-[9px] text-muted-foreground">
              {row.entity_type === "product" ? row.product_id : row.variant_id}
            </p>
          </div>
        ),
      },
      {
        id: "item",
        header: text("العنصر", "Item"),
        sortValue: titleFromAudit,
        searchValue: titleFromAudit,
        exportValue: titleFromAudit,
        cell: (row) => <span className="font-semibold text-foreground">{titleFromAudit(row)}</span>,
      },
      {
        id: "changes",
        header: text("التغييرات", "Changes"),
        searchValue: (row) => changedFields(row).join(" "),
        exportValue: (row) => changedFields(row).join(" | "),
        cell: (row) => {
          const fields = changedFields(row);
          if (row.action !== "update") {
            return (
              <span className="text-[10px] text-muted-foreground">
                {row.action === "insert"
                  ? text("تم إنشاء سجل جديد", "New record created")
                  : text("تم حذف السجل", "Record removed")}
              </span>
            );
          }
          if (!fields.length) return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex max-w-72 flex-wrap gap-1">
              {fields.slice(0, 4).map((field) => (
                <span key={field} className="rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-semibold">
                  {field}
                </span>
              ))}
              {fields.length > 4 ? (
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-semibold">
                  +{fields.length - 4}
                </span>
              ) : null}
            </div>
          );
        },
      },
    ],
    [language, text],
  );

  if (query.isLoading) return <DashboardSkeleton />;
  if (query.isError) {
    return (
      <DashboardErrorState
        message={text("تعذّر تحميل سجل النشاط.", "Unable to load activity history.")}
        onRetry={() => void query.refetch()}
      />
    );
  }

  return (
    <section className="admin-page space-y-5">
      <header className="admin-page-header flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground">Tabler Operations</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground">
            {text("سجل النشاط", "Activity & Audit Log")}
          </h1>
          <p className="mt-1.5 max-w-2xl text-xs leading-5 text-muted-foreground">
            {text(
              "سجل حقيقي لتغييرات المنتجات والنسخ في Space Call، مع البحث والفرز والتصفية والتصدير.",
              "A live history of Space Call product and variant changes with search, sorting, filtering and export.",
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border/70 bg-card px-3.5 text-xs font-bold text-foreground transition hover:bg-muted"
        >
          <RefreshCw className={`size-4 ${query.isFetching ? "animate-spin" : ""}`} />
          {text("تحديث", "Refresh")}
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label={text("كل النشاط", "All activity")} value={summary.total} icon={<Activity className="size-4" />} />
        <SummaryCard label={text("إضافات", "Created")} value={summary.inserts} icon={<CirclePlus className="size-4" />} />
        <SummaryCard label={text("تعديلات", "Updated")} value={summary.updates} icon={<Pencil className="size-4" />} />
        <SummaryCard label={text("حذف", "Deleted")} value={summary.deletes} icon={<Trash2 className="size-4" />} />
      </div>

      <DashboardCard className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          {text("تصفية السجل", "Filter log")}
        </p>
        <div className="flex flex-wrap gap-2 sm:ms-auto">
          <select
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value as "all" | AuditAction)}
            className="h-9 rounded-xl border border-border/70 bg-background px-3 text-[11px] font-semibold outline-none"
          >
            <option value="all">{text("كل الإجراءات", "All actions")}</option>
            <option value="insert">{text("إضافة", "Created")}</option>
            <option value="update">{text("تعديل", "Updated")}</option>
            <option value="delete">{text("حذف", "Deleted")}</option>
          </select>
          <select
            value={entityFilter}
            onChange={(event) => setEntityFilter(event.target.value as "all" | AuditEntity)}
            className="h-9 rounded-xl border border-border/70 bg-background px-3 text-[11px] font-semibold outline-none"
          >
            <option value="all">{text("كل الأنواع", "All entities")}</option>
            <option value="product">{text("المنتجات", "Products")}</option>
            <option value="variant">{text("النسخ", "Variants")}</option>
          </select>
        </div>
      </DashboardCard>

      <AdvancedDataTable
        rows={rows}
        columns={columns}
        getRowId={(row) => String(row.id)}
        searchPlaceholder={text("ابحث في السجل…", "Search activity…")}
        emptyLabel={text("لا يوجد نشاط مطابق.", "No matching activity.")}
        exportFileName="space-call-activity-log.csv"
        pageSizeOptions={[10, 25, 50, 100]}
      />
    </section>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <DashboardCard className="flex items-center gap-3 p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</span>
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-xl font-black text-foreground">{value.toLocaleString()}</p>
      </div>
    </DashboardCard>
  );
}
