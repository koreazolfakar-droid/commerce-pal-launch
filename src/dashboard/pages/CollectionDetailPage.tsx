import DashboardLoadError from "@/dashboard/components/DashboardLoadError";
import { dashboardListHref } from "@/dashboard/lib/listContext";
import ContentAiAssist from "@/dashboard/components/ai/ContentAiAssist";
import { useLanguage } from "@/dashboard/i18n";
import { useDashboardUnsavedChanges } from "@/dashboard/hooks/useDashboardUnsavedChanges";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Loader2,
  Package,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import DashboardConfirmDialog from "@/dashboard/components/DashboardConfirmDialog";
import {
  deleteDashboardCollection,
  getDashboardCollection,
  saveDashboardCollectionProducts,
  updateDashboardCollection,
  type DashboardCollectionDetail,
  type DashboardCollectionProduct,
  type DashboardCollectionInput,
} from "@/dashboard/data/collections";

function collectionForm(collection: DashboardCollectionInput): DashboardCollectionInput {
  return {
    title: collection.title,
    handle: collection.handle,
    titleAr: collection.titleAr,
    description: collection.description,
    imageUrl: collection.imageUrl,
    isActive: collection.isActive,
    isFeatured: collection.isFeatured,
    seoTitle: collection.seoTitle,
    seoDescription: collection.seoDescription,
  };
}

export default function CollectionDetailPage({ id }: { id: string }) {
  const { t, lang } = useLanguage();
  const [, navigate] = useLocation();
  const [collection, setCollection] = useState<DashboardCollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const loadRequest = useRef(0);
  const activeId = useRef(id);
  const mutationLock = useRef(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingProducts, setSavingProducts] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [form, setForm] = useState({
    title: "",
    handle: "",
    titleAr: "",
    description: "",
    imageUrl: "",
    isActive: true,
    isFeatured: false,
    seoTitle: "",
    seoDescription: "",
  });

  const load = useCallback(async () => {
    const request = ++loadRequest.current;
    setLoading(true);
    setLoadError("");
    setCollection((current) => current?.id === id ? current : null);
    try {
      const next = await getDashboardCollection(id);
      if (request !== loadRequest.current || activeId.current !== id) return;
      setCollection(next);
      if (next) setForm(collectionForm(next));
    } catch (cause) {
      if (request === loadRequest.current && activeId.current === id) {
        setLoadError(cause instanceof Error ? cause.message : "Unable to load collection.");
      }
    } finally {
      if (request === loadRequest.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    activeId.current = id;
    setProductSearch("");
    setDeleteOpen(false);
    void load();
    return () => { loadRequest.current += 1; activeId.current = ""; };
  }, [id, load]);

  useEffect(() => {
    if (loading || !collection) return;
    if (typeof window === "undefined" || window.location.hash !== "#add-products") return;
    window.requestAnimationFrame(() => {
      document.getElementById("add-products")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [loading, collection]);

  const dirty = useMemo(() => {
    if (!collection || collection.id !== id) return false;
    return (
      form.title !== collection.title ||
      form.handle !== collection.handle ||
      form.titleAr !== collection.titleAr ||
      form.description !== collection.description ||
      form.imageUrl !== collection.imageUrl ||
      form.isActive !== collection.isActive ||
      form.isFeatured !== collection.isFeatured ||
      form.seoTitle !== collection.seoTitle ||
      form.seoDescription !== collection.seoDescription
    );
  }, [collection, form, id]);
  const busy = savingProfile || savingProducts || deleting;
  const validProfile = form.title.trim().length >= 2 && Boolean(form.handle.trim());
  const markSaved = useDashboardUnsavedChanges(dirty || savingProfile || savingProducts);

  const saveProfile = async () => {
    if (!collection || collection.id !== id || mutationLock.current || !validProfile) {
      return;
    }

    const targetId = collection.id;
    mutationLock.current = true;
    setSavingProfile(true);
    try {
      const next = await updateDashboardCollection(targetId, form);
      if (activeId.current !== targetId) return;
      setForm(collectionForm(next));
      setCollection((current) =>
        current?.id === targetId
          ? {
              ...current,
              ...next,
              productCount: current.products.length,
              products: current.products,
              availableProducts: current.availableProducts,
            }
          : current,
      );
      toast.success("Collection saved.");
    } catch (cause) {
      if (activeId.current === targetId) toast.error(cause instanceof Error ? cause.message : "Save failed.");
    } finally {
      mutationLock.current = false;
      setSavingProfile(false);
    }
  };

  const saveProducts = async (products: DashboardCollectionProduct[]) => {
    if (!collection || collection.id !== id || mutationLock.current) return;
    const targetId = collection.id;

    const normalized = products.map((product, index) => ({
      ...product,
      sortOrder: index,
    }));
    const productById = new Map(
      [...collection.products, ...collection.availableProducts].map((product) => [
        product.id,
        product,
      ]),
    );
    const memberIds = new Set(normalized.map((product) => product.id));
    const nextAvailableProducts = [...productById.values()]
      .filter((product) => !memberIds.has(product.id))
      .map((product) => ({ ...product, sortOrder: 0 }));

    mutationLock.current = true;
    setSavingProducts(true);
    try {
      await saveDashboardCollectionProducts(
        targetId,
        normalized.map((product) => product.id),
      );
      if (activeId.current !== targetId) return;
      setCollection((current) =>
        current?.id === targetId
          ? {
              ...current,
              products: normalized,
              availableProducts: nextAvailableProducts,
              productCount: normalized.length,
            }
          : current,
      );
      toast.success("Collection products saved.");
    } catch (cause) {
      if (activeId.current === targetId) toast.error(cause instanceof Error ? cause.message : "Products update failed.");
    } finally {
      mutationLock.current = false;
      setSavingProducts(false);
    }
  };

  const addProduct = (product: DashboardCollectionProduct) => {
    if (!collection) return;
    void saveProducts([
      ...collection.products,
      { ...product, sortOrder: collection.products.length },
    ]);
  };

  const removeProduct = (productId: string) => {
    if (!collection) return;
    void saveProducts(collection.products.filter((product) => product.id !== productId));
  };

  const moveProduct = (productId: string, direction: -1 | 1) => {
    if (!collection) return;
    const next = [...collection.products];
    const index = next.findIndex((product) => product.id === productId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    void saveProducts(next);
  };

  const matchingAvailable = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!collection) return [];
    return collection.availableProducts.filter(
      (product) => !term || product.title.toLowerCase().includes(term),
    );
  }, [collection, productSearch]);
  const available = matchingAvailable.slice(0, 40);

  const removeCollection = async () => {
    if (!collection || collection.id !== id || mutationLock.current) return;
    const targetId = collection.id;
    mutationLock.current = true;
    setDeleting(true);
    try {
      await deleteDashboardCollection(targetId);
      if (activeId.current !== targetId) return;
      markSaved();
      setDeleteOpen(false);
      toast.success("Collection deleted.");
      navigate(dashboardListHref("/dashboard/collections"));
    } catch (cause) {
      if (activeId.current === targetId) toast.error(cause instanceof Error ? cause.message : "Delete failed.");
    } finally {
      mutationLock.current = false;
      setDeleting(false);
    }
  };

  if (loading && (!collection || collection.id !== id))
    return (
      <div className="grid min-h-[420px] place-items-center">
        <Loader2 className="size-6 animate-spin text-[#5968ea]" />
      </div>
    );
  if (loadError)
    return (
      <div className="space-y-4">
        <DashboardLoadError message={loadError} busy={loading} onRetry={() => void load()} />
        <button type="button" onClick={() => navigate(dashboardListHref("/dashboard/collections"))} className="text-sm font-semibold text-indigo-600 hover:underline">
          {t("Back to collections")}
        </button>
      </div>
    );
  if (!collection || collection.id !== id)
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        {t("Collection not found.")}
      </div>
    );

  return (
    <div>
      <button
        onClick={() => navigate(dashboardListHref("/dashboard/collections"))}
        className="mb-6 flex items-center gap-2 text-[12px] font-semibold text-slate-500 hover:text-[#5968ea]"
      >
        <ArrowLeft className="size-4" /> {t("Back to collections")}
      </button>
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#6a70e7]">
            {t("Collection /")} {collection.handle}
          </div>
          <h1 className="text-[30px] font-bold tracking-[-.05em] text-[#14203a]">
            {collection.title}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            {collection.products.length} {t("products ·")}{" "}
            {collection.isActive ? t("Active") : t("Draft")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ContentAiAssist
            disabled={busy}
            entity="collection"
            query={form.title}
            values={form}
            entityId={id}
            onApply={(patch) => setForm((current) => ({ ...current, ...patch }))}
          />
          <button
            onClick={() =>
              document
                .getElementById("add-products")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white"
          >
            <Plus className="size-3.5" /> {t("Add products")}
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            disabled={busy}
            className="flex h-10 items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 text-[11px] font-bold text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="size-3.5" /> {t("Delete")}
          </button>
          <button
            onClick={() => void saveProfile()}
            disabled={!dirty || !validProfile || busy}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white disabled:opacity-40"
          >
            {savingProfile ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}{" "}
            {savingProfile ? t("Saving...") : t("Save")}
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="text-[13px] font-bold text-[#14203a]">{t("Collection details")}</div>
            </div>
            <fieldset disabled={busy} className="grid min-w-0 gap-4 p-5 sm:grid-cols-2">
              {[
                ["Title", "title"],
                ["Handle", "handle"],
                ["Arabic title", "titleAr"],
                ["Image URL", "imageUrl"],
                ["SEO title", "seoTitle"],
                ["SEO description", "seoDescription"],
              ].map(([label, key]) => (
                <label
                  key={key}
                  className={key === "imageUrl" || key === "seoDescription" ? "sm:col-span-2" : ""}
                >
                  <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
                    {t(label)}
                  </span>
                  <input
                    value={form[key as keyof typeof form] as string}
                    onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none focus:border-indigo-400"
                  />
                </label>
              ))}
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
                  {t("Description")}
                </span>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, description: e.target.value }))
                  }
                  className="min-h-28 w-full rounded-xl border border-slate-200 p-3 text-[12px]"
                />
              </label>
              <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, isActive: e.target.checked }))
                  }
                />{" "}
                {t("Active")}
              </label>
              <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, isFeatured: e.target.checked }))
                  }
                />{" "}
                {t("Featured")}
              </label>
              {!validProfile ? (
                <p role="status" className="text-[11px] text-amber-700 sm:col-span-2">
                  {lang === "ar" ? "أدخل اسماً من حرفين على الأقل ورابطاً مختصراً قبل الحفظ." : "Enter a title with at least two characters and a handle before saving."}
                </p>
              ) : null}
            </fieldset>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="text-[13px] font-bold text-[#14203a]">
                {t("Products in collection")}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-400">
                {t("Order here controls storefront order.")}
              </div>
            </div>
            {collection.products.length ? (
              <div className="divide-y divide-slate-100">
                {collection.products.map((product, index) => (
                  <div
                    key={product.id}
                    className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3"
                  >
                    <div className="grid size-12 place-items-center overflow-hidden rounded-xl bg-slate-100">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt=""
                          className="size-full object-contain p-1"
                        />
                      ) : (
                        <Package className="size-4 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-bold text-slate-700">
                        <Link
                          href={`/dashboard/products/${product.id}`}
                          className="hover:text-indigo-600 hover:underline"
                        >
                          {product.title}
                        </Link>
                      </div>
                      <div className="mt-1 text-[10px] text-slate-400">
                        {product.status} {t("· Stock")} {product.stockQuantity} · #{index + 1}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveProduct(product.id, -1)}
                        aria-label={`${t("Move up")}: ${product.title}`}
                        disabled={busy || index === 0}
                        className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button
                        onClick={() => moveProduct(product.id, 1)}
                        aria-label={`${t("Move down")}: ${product.title}`}
                        disabled={busy || index === collection.products.length - 1}
                        className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                      <button
                        onClick={() => removeProduct(product.id)}
                        aria-label={`${t("Remove")}: ${product.title}`}
                        disabled={busy}
                        className="grid size-8 place-items-center rounded-lg border border-rose-100 text-rose-500 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-10 text-center text-[11px] text-slate-400">
                {t("No products in this collection.")}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div
            id="add-products"
            className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white"
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="text-[13px] font-bold text-[#14203a]">{t("Add products")}</div>
            </div>
            <div className="p-4">
              <div className="relative mb-3">
                <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  aria-label={t("Search catalog products")}
                  placeholder={t("Search catalog products")}
                  className="h-10 w-full rounded-xl border border-slate-200 ps-9 pe-3 text-[11px]"
                />
              </div>
              {matchingAvailable.length > available.length ? (
                <p role="status" className="mb-3 text-[11px] text-slate-500">
                  {available.length} / {matchingAvailable.length} · {lang === "ar" ? "ابحث لتضييق النتائج والعثور على بقية المنتجات." : "Search to narrow the results and find more products."}
                </p>
              ) : null}
              <div className="max-h-[620px] divide-y divide-slate-100 overflow-y-auto">
                {available.map((product) => (
                  <div key={product.id} className="flex items-center gap-3 py-3">
                    <div className="grid size-10 place-items-center overflow-hidden rounded-lg bg-slate-100">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt=""
                          className="size-full object-contain p-1"
                        />
                      ) : (
                        <Package className="size-4 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-bold text-slate-700">
                        <Link
                          href={`/dashboard/products/${product.id}`}
                          className="hover:text-indigo-600 hover:underline"
                        >
                          {product.title}
                        </Link>
                      </div>
                      <div className="mt-0.5 text-[9px] text-slate-400">
                        {product.status} · {product.stockQuantity} {t("stock")}
                      </div>
                    </div>
                    <button
                      onClick={() => addProduct(product)}
                      aria-label={`${t("Add products")}: ${product.title}`}
                      disabled={busy}
                      className="grid size-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600 disabled:opacity-40"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                ))}
                {!available.length ? (
                  <div className="py-10 text-center text-[11px] text-slate-400">
                    {t("No available products match.")}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {form.imageUrl ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-3 text-[11px] font-bold text-slate-600">
                {t("Collection image preview")}
              </div>
              <div className="grid aspect-[16/9] place-items-center overflow-hidden rounded-xl bg-slate-50">
                <img
                  src={form.imageUrl}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {dirty ? (
        <div className="dashboard-save-bar fixed left-1/2 z-40 flex w-max max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
          <span className="text-[11px] font-semibold text-slate-600">
            {t("Unsaved collection changes")}
          </span>
          <button
            onClick={() => void saveProfile()}
            disabled={!validProfile || busy}
            className="rounded-lg bg-[#5968ea] px-3 py-1.5 text-[10px] font-bold text-white disabled:opacity-50"
          >
            {savingProfile ? t("Saving...") : t("Save")}
          </button>
        </div>
      ) : null}

      <DashboardConfirmDialog
        open={deleteOpen}
        title={`Delete "${collection.title}"?`}
        description="The collection will be permanently removed, but all products remain in the catalog unchanged."
        confirmLabel="Delete collection"
        pendingLabel="Deleting..."
        pending={deleting}
        destructive
        onClose={() => {
          if (!deleting) setDeleteOpen(false);
        }}
        onConfirm={() => void removeCollection()}
      />
    </div>
  );
}
