import DashboardLoadError from "@/dashboard/components/DashboardLoadError";
import { useDashboardFormGuard } from "@/dashboard/hooks/useDashboardFormGuard";
import { useDashboardModal } from "@/dashboard/hooks/useDashboardModal";
import { useDashboardQueryState } from "@/dashboard/hooks/useDashboardQueryState";
import ContentAiAssist from "@/dashboard/components/ai/ContentAiAssist";
import { PageTitle } from "@/dashboard/components/layout/PageTitle";
import { useLanguage } from "@/dashboard/i18n";
import {
  ArrowDown,
  ArrowUp,
  FolderPlus,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import DashboardConfirmDialog from "@/dashboard/components/DashboardConfirmDialog";
import {
  createDashboardCollection,
  deleteDashboardCollection,
  listDashboardCollections,
  reorderDashboardCollections,
  type DashboardCollectionListItem,
} from "@/dashboard/data/collections";

const emptyDraft = {
  title: "",
  handle: "",
  titleAr: "",
  description: "",
  imageUrl: "",
  isActive: true,
  isFeatured: false,
  seoTitle: "",
  seoDescription: "",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CollectionsPage() {
  const { t, lang } = useLanguage();
  const [, navigate] = useLocation();
  const [collections, setCollections] = useState<DashboardCollectionListItem[]>([]);
  const [search, setSearch] = useDashboardQueryState<string>("search", "");
  const [filter, setFilter] = useDashboardQueryState<"all" | "active" | "draft" | "featured">(
    "filter",
    "all",
    ["all", "active", "draft", "featured"],
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DashboardCollectionListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [reordering, setReordering] = useState(false);
  const mutationLock = useRef(false);
  const loadRequest = useRef(0);

  const formGuard = useDashboardFormGuard(showCreate, draft, saving, () => setShowCreate(false));
  const modalRef = useDashboardModal(formGuard.close, showCreate);

  const load = useCallback(async () => {
    if (mutationLock.current) return;
    const request = ++loadRequest.current;
    setLoading(true);
    setLoadError("");
    try {
      const next = await listDashboardCollections();
      if (request === loadRequest.current) setCollections(next);
    } catch (cause) {
      if (request === loadRequest.current) {
        setLoadError(cause instanceof Error ? cause.message : "Unable to load collections.");
      }
    } finally {
      if (request === loadRequest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => { loadRequest.current += 1; };
  }, [load]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return collections.filter((item) => {
      if (filter === "active" && !item.isActive) return false;
      if (filter === "draft" && item.isActive) return false;
      if (filter === "featured" && !item.isFeatured) return false;
      if (!term) return true;
      return `${item.title} ${item.handle} ${item.titleAr}`.toLowerCase().includes(term);
    });
  }, [collections, filter, search]);

  const hasFilters = Boolean(search.trim()) || filter !== "all";
  const busy = saving || deleting || reordering;

  const move = async (id: string, direction: -1 | 1) => {
    if (mutationLock.current || loading || hasFilters) return;
    const ordered = [...collections].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title),
    );
    const index = ordered.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    const previous = collections;
    const next = ordered.map((item, sortOrder) => ({ ...item, sortOrder }));
    mutationLock.current = true;
    setReordering(true);
    setCollections(next);
    try {
      await reorderDashboardCollections(
        next.map((item) => ({ id: item.id, sortOrder: item.sortOrder })),
      );
      toast.success("Collection order saved.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Reorder failed.");
      setCollections(previous);
    } finally {
      mutationLock.current = false;
      setReordering(false);
    }
  };

  const create = async () => {
    if (mutationLock.current) return;
    if (draft.title.trim().length < 2) {
      toast.error("Collection title is required.");
      return;
    }
    const handle = slugify(draft.handle || draft.title);
    if (!handle) {
      toast.error(lang === "ar" ? "أدخل رابطاً مختصراً بحروف إنجليزية، مثل summer-offers." : "Enter a handle using English letters, such as summer-offers.");
      return;
    }
    mutationLock.current = true;
    setSaving(true);
    try {
      const created = await createDashboardCollection({
        ...draft,
        title: draft.title.trim(),
        handle,
      });
      toast.success("Collection created.");
      formGuard.markSaved();
      setShowCreate(false);
      setDraft(emptyDraft);
      navigate(`/dashboard/collections/${created.id}`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Collection creation failed.");
    } finally {
      mutationLock.current = false;
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget || mutationLock.current || loading) return;
    const item = deleteTarget;
    mutationLock.current = true;
    setDeleting(true);
    try {
      await deleteDashboardCollection(item.id);
      setCollections((current) => current.filter((collection) => collection.id !== item.id));
      setDeleteTarget(null);
      toast.success("Collection deleted.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Collection deletion failed.");
    } finally {
      mutationLock.current = false;
      setDeleting(false);
    }
  };

  return (
    <div>
      {loadError && (
        <DashboardLoadError message={loadError} busy={loading} onRetry={() => void load()} />
      )}
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <PageTitle
            eyebrow="Catalog / Collections"
            title="Collections"
            description={lang === "ar" ? "نظّم مجموعات المنتجات وترتيب ظهورها في المتجر." : "Organize product collections and their storefront order."}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void load()}
            disabled={loading || busy}
            className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-600"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> {t("Refresh")}
          </button>
          <button
            onClick={() => setShowCreate(true)}
            disabled={busy || loading}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white"
          >
            <FolderPlus className="size-4" /> {t("New collection")}
          </button>
        </div>
      </div>

      <div className="dashboard-summary-grid mb-4 grid gap-4 sm:grid-cols-4">
        {[
          ["Total", collections.length],
          ["Active", collections.filter((item) => item.isActive).length],
          ["Draft", collections.filter((item) => !item.isActive).length],
          ["Featured", collections.filter((item) => item.isFeatured).length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-[11px] text-slate-400">{t(String(label))}</div>
            <div className="mt-2 text-2xl font-bold text-[#14203a]">{value}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t("Search collections")}
              placeholder={t("Search collections")}
              className="h-10 w-full rounded-xl border border-slate-200 ps-9 pe-3 text-[11px] outline-none focus:border-indigo-400"
            />
          </div>
          <select
            value={filter}
            aria-label={t("All collections")}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600"
          >
            <option value="all">{t("All collections")}</option>
            <option value="active">{t("Active")}</option>
            <option value="draft">{t("Draft")}</option>
            <option value="featured">{t("Featured")}</option>
          </select>
        </div>

        {hasFilters ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 text-[11px] text-slate-500" role="status">
            <span>{visible.length} / {collections.length} · {lang === "ar" ? "امسح الفلاتر لتغيير ترتيب المجموعات." : "Clear filters to change collection order."}</span>
            <button type="button" onClick={() => { setSearch(""); setFilter("all"); }} className="font-semibold text-indigo-600 hover:underline">
              {lang === "ar" ? "مسح الفلاتر" : "Clear filters"}
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="grid min-h-[300px] place-items-center">
            <Loader2 className="size-6 animate-spin text-[#5968ea]" />
          </div>
        ) : visible.length ? (
          <div className="divide-y divide-slate-100">
            {visible.map((item, index) => (
              <div
                key={item.id}
                className="grid gap-4 px-5 py-4 lg:grid-cols-[64px_minmax(0,1fr)_120px_60px_auto] lg:items-center"
              >
                <div className="grid size-14 place-items-center overflow-hidden rounded-xl bg-slate-100">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="size-full object-contain p-1" />
                  ) : (
                    <FolderPlus className="size-5 text-slate-400" />
                  )}
                </div>
                <button
                  onClick={() => navigate(`/dashboard/collections/${item.id}`)}
                  className="min-w-0 text-start"
                >
                  <div className="truncate text-[13px] font-bold text-slate-700">{item.title}</div>
                  <div className="mt-1 break-all text-[10px] text-slate-400">
                    /{item.handle} · {item.productCount} {t("products")}
                  </div>
                </button>
                <div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${item.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                  >
                    {item.isActive ? t("Active") : t("Draft")}
                  </span>
                  {item.isFeatured ? (
                    <span className="ms-1 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700">
                      {t("Featured")}
                    </span>
                  ) : null}
                </div>
                <div className="text-[11px] text-slate-500">
                  {t("Order")} {item.sortOrder + 1}
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  <button
                    onClick={() => navigate(`/dashboard/collections/${item.id}#add-products`)}
                    title={t("Add products to this collection")}
                    className="flex h-8 items-center gap-1.5 rounded-lg bg-[#5968ea] px-2.5 text-[10px] font-bold text-white"
                  >
                    <Plus className="size-3.5" />
                    {t("Add products")}
                  </button>
                  <button
                    onClick={() => void move(item.id, -1)}
                    aria-label={`${t("Move up")}: ${item.title}`}
                    disabled={busy || hasFilters || index === 0}
                    className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button
                    onClick={() => void move(item.id, 1)}
                    aria-label={`${t("Move down")}: ${item.title}`}
                    disabled={busy || hasFilters || index === collections.length - 1}
                    className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ArrowDown className="size-3.5" />
                  </button>
                  <button
                    onClick={() => navigate(`/dashboard/collections/${item.id}`)}
                    className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <Pencil aria-label={t("Edit collection")} className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(item)}
                    aria-label={`${t("Delete")}: ${item.title}`}
                    disabled={busy}
                    className="grid size-8 place-items-center rounded-lg border border-rose-100 text-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-14 text-center text-sm text-slate-400">
            {t("No collections match this view.")}
          </div>
        )}
      </div>

      {showCreate ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("Create collection")}
            tabIndex={-1}
            className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[.16em] text-indigo-500">
                  {t("Collections")}
                </div>
                <div className="mt-1 text-xl font-bold text-[#14203a]">
                  {t("Create collection")}
                </div>
              </div>
              <button
                onClick={formGuard.close}
                disabled={saving}
                aria-label={t("Close")}
                className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-500"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="border-b border-slate-100 px-6 py-3">
              <ContentAiAssist
                disabled={saving}
                entity="collection"
                query={draft.title}
                values={draft}
                onApply={(patch) => setDraft((current) => ({ ...current, ...patch }))}
              />
            </div>
            <fieldset disabled={saving} className="min-w-0 grid gap-4 p-6 sm:grid-cols-2">
              <label>
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
                  {t("Title")}
                </span>
                <input
                  value={draft.title}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      title: e.target.value,
                      handle: !d.handle || d.handle === slugify(d.title) ? slugify(e.target.value) : d.handle,
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px]"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
                  {t("Handle")}
                </span>
                <input
                  value={draft.handle}
                  placeholder="summer-offers"
                  dir="ltr"
                  onChange={(e) => setDraft((d) => ({ ...d, handle: slugify(e.target.value) }))}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px]"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
                  {t("Image URL")}
                </span>
                <input
                  value={draft.imageUrl}
                  onChange={(e) => setDraft((d) => ({ ...d, imageUrl: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px]"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
                  {t("Description")}
                </span>
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  className="min-h-24 w-full rounded-xl border border-slate-200 p-3 text-[12px]"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
                  {t("SEO title")}
                </span>
                <input
                  value={draft.seoTitle}
                  onChange={(e) => setDraft((d) => ({ ...d, seoTitle: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px]"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
                  {t("SEO description")}
                </span>
                <input
                  value={draft.seoDescription}
                  onChange={(e) => setDraft((d) => ({ ...d, seoDescription: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px]"
                />
              </label>
              <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
                />{" "}
                {t("Active")}
              </label>
              <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={draft.isFeatured}
                  onChange={(e) => setDraft((d) => ({ ...d, isFeatured: e.target.checked }))}
                />{" "}
                {t("Featured")}
              </label>
            </fieldset>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                onClick={formGuard.close}
                disabled={saving}
                className="h-10 rounded-xl border border-slate-200 px-4 text-[11px] font-bold text-slate-600"
              >
                {t("Cancel")}
              </button>
              <button
                onClick={() => void create()}
                disabled={saving}
                className="h-10 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white disabled:opacity-50"
              >
                {saving ? t("Creating…") : t("Create collection")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <DashboardConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget ? `Delete "${deleteTarget.title}"?` : t("Delete collection?")}
        description="The collection will be removed, but its products stay in the catalog unchanged."
        confirmLabel="Delete collection"
        pendingLabel="Deleting..."
        pending={deleting}
        destructive
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={() => void remove()}
      />
    </div>
  );
}
