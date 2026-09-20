import {
  Check,
  ChevronDown,
  Eye,
  GripVertical,
  Loader2,
  MoreHorizontal,
  MoveRight,
  Pencil,
  Plus,
  RotateCcw,
  SearchX,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { CategoryGlyph } from "@/components/CategoryGlyph";
import CategoryForm, { type CategoryImageChange } from "@/dashboard/components/categories/CategoryForm";
import { CategoryIcon } from "@/dashboard/components/categories/CategoryIcon";
import CategoryKpiCards from "@/dashboard/components/categories/CategoryKpiCards";
import CategoryList from "@/dashboard/components/categories/CategoryList";
import CategoryPreview from "@/dashboard/components/categories/CategoryPreview";
import CategoryToolbar from "@/dashboard/components/categories/CategoryToolbar";
import ProductAssignmentDialog from "@/dashboard/components/categories/ProductAssignmentDialog";
import {
  assignProductsToDashboardCategory,
  countProductsAssignedToValidCategories,
  createDashboardCategory,
  createUniqueCategorySlug,
  deleteDashboardCategory,
  getCategoryProductCount,
  getProductsForCategory,
  loadCategoriesWorkspace,
  refreshDashboardCategoryProducts,
  reorderDashboardCategories,
  updateDashboardCategory,
  uploadDashboardCategoryImage,
  type CatalogCategory,
} from "@/dashboard/data/categories";
import type { DashboardProduct } from "@/dashboard/data/catalog";

type EditState = {
  mode: "create" | "edit";
  category: CatalogCategory;
};

function ProductStatus({ status }: { status: DashboardProduct["status"] }) {
  const classes =
    status === "Active"
      ? "bg-emerald-50 text-emerald-700"
      : status === "Draft"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-500";

  return (
    <span className={"rounded-full px-2 py-1 text-[8px] font-black " + classes}>{status}</span>
  );
}

function ToggleControl({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-start transition hover:border-indigo-200"
    >
      <span className="min-w-0">
        <span className="block text-[11px] font-bold text-slate-700">{title}</span>
        <span className="mt-0.5 block text-[9px] leading-4 text-slate-400">{description}</span>
      </span>
      <span
        className={
          "relative h-6 w-11 shrink-0 rounded-full transition " +
          (checked ? "bg-[#5968ea]" : "bg-slate-200")
        }
      >
        <span
          className={
            "absolute top-1 size-4 rounded-full bg-white shadow-sm transition-all " +
            (checked ? "end-1" : "start-1")
          }
        />
      </span>
    </button>
  );
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[96] grid place-items-end bg-slate-950/45 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-t-[28px] bg-white p-5 shadow-2xl sm:rounded-[28px] sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[18px] font-black tracking-[-.03em] text-[#14203a]">{title}</h2>
            <p className="mt-1 text-[10px] leading-4 text-slate-400">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-400"
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const [, navigate] = useLocation();
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [products, setProducts] = useState<DashboardProduct[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [homepageFilter, setHomepageFilter] = useState("all");
  const [sortMode, setSortMode] = useState("order");
  const [editing, setEditing] = useState<EditState | null>(null);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CatalogCategory | null>(null);
  const [deleteDestination, setDeleteDestination] = useState("uncategorized");
  const [moveProduct, setMoveProduct] = useState<DashboardProduct | null>(null);
  const [moveDestination, setMoveDestination] = useState("");
  const [productMenuId, setProductMenuId] = useState<string | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderDraft, setReorderDraft] = useState<CatalogCategory[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadCategoriesWorkspace()
      .then((workspace) => {
        if (cancelled) return;
        setCategories(workspace.categories);
        setProducts(workspace.products);
        setSelectedId((current) =>
          current && workspace.categories.some((category) => category.id === current)
            ? current
            : workspace.categories[0]?.id || "",
        );
        setError("");
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to load categories.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = categories.find((category) => category.id === selectedId) || categories[0];

  const assignedProducts = useMemo(
    () => (selected ? getProductsForCategory(products, selected) : []),
    [products, selected],
  );

  const activeCount = useMemo(
    () => categories.filter((category) => category.active).length,
    [categories],
  );

  const assignedValidCount = useMemo(
    () => countProductsAssignedToValidCategories(products, categories),
    [products, categories],
  );

  const filteredCategories = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const next = categories.filter((category) => {
      const matchesSearch =
        !needle ||
        (category.name + " " + category.slug + " " + category.description)
          .toLowerCase()
          .includes(needle);
      const matchesStatus =
        statusFilter === "all" || (statusFilter === "active" ? category.active : !category.active);
      const matchesHomepage =
        homepageFilter === "all" ||
        (homepageFilter === "featured" ? category.featured : !category.featured);
      return matchesSearch && matchesStatus && matchesHomepage;
    });

    return [...next].sort((a, b) => {
      if (sortMode === "name") return a.name.localeCompare(b.name);
      if (sortMode === "products") {
        return getCategoryProductCount(products, b) - getCategoryProductCount(products, a);
      }
      if (sortMode === "updated") {
        return (
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
        );
      }
      return a.order - b.order;
    });
  }, [categories, products, query, statusFilter, homepageFilter, sortMode]);

  const listCategories = reorderMode ? reorderDraft : filteredCategories;

  const openCreate = () => {
    const nextOrder = categories.reduce((max, category) => Math.max(max, category.order), 0) + 1;
    setEditing({
      mode: "create",
      category: {
        id: "",
        name: "",
        slug: "",
        icon: "LayoutGrid",
        description: "",
        active: true,
        order: nextOrder,
        featured: false,
      },
    });
  };

  const openEdit = (category: CatalogCategory) => {
    setSelectedId(category.id);
    setEditing({ mode: "edit", category: { ...category } });
  };

  const saveCategory = async (
    nextCategory: CatalogCategory,
    imageChange: CategoryImageChange,
  ) => {
    const duplicateSlug = categories.some(
      (category) =>
        category.id !== nextCategory.id &&
        category.slug.toLowerCase() === nextCategory.slug.toLowerCase(),
    );
    if (duplicateSlug) {
      const error = new Error("That category slug is already in use.");
      toast.error(error.message);
      throw error;
    }

    try {
      if (editing?.mode === "create") {
        let saved = await createDashboardCategory(
          imageChange.remove ? { ...nextCategory, image: undefined } : nextCategory,
        );

        if (imageChange.file) {
          const uploaded = await uploadDashboardCategoryImage(saved, imageChange.file);
          saved = uploaded.category;
          toast.success(
            `Category created. Image converted to WebP: ${Math.round(
              uploaded.conversion.source.bytes / 1024,
            )} KB → ${Math.round(uploaded.conversion.output.bytes / 1024)} KB.`,
          );
        } else {
          toast.success("Category created in Supabase.");
        }

        setCategories((current) =>
          [...current, saved].sort((a, b) => a.order - b.order),
        );
        setSelectedId(saved.id);
        setEditing(null);
        return;
      }

      let saved = await updateDashboardCategory(
        imageChange.remove ? { ...nextCategory, image: undefined } : nextCategory,
      );

      if (imageChange.file) {
        const uploaded = await uploadDashboardCategoryImage(saved, imageChange.file);
        saved = uploaded.category;
        toast.success(
          `Category saved. Image converted to WebP: ${Math.round(
            uploaded.conversion.source.bytes / 1024,
          )} KB → ${Math.round(uploaded.conversion.output.bytes / 1024)} KB.`,
        );
      } else {
        toast.success(
          imageChange.remove ? "Category image removed." : "Category saved to Supabase.",
        );
      }

      setCategories((current) =>
        current.map((category) => (category.id === saved.id ? saved : category)),
      );
      setProducts(await refreshDashboardCategoryProducts());
      setSelectedId(saved.id);
      setEditing(null);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Category save failed.";
      toast.error(message);
      throw cause;
    }
  };

  const toggleCategory = async (
    category: CatalogCategory,
    patch: Partial<CatalogCategory>,
  ) => {
    try {
      const saved = await updateDashboardCategory({ ...category, ...patch });
      setCategories((current) =>
        current.map((item) => (item.id === saved.id ? saved : item)),
      );
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Category update failed.");
    }
  };

  const duplicateCategory = async (category: CatalogCategory) => {
    const now = new Date().toISOString();
    const duplicate: CatalogCategory = {
      ...category,
      id: "",
      name: category.name + " Copy",
      slug: createUniqueCategorySlug(category.slug + "-copy", categories),
      active: false,
      featured: false,
      order: categories.reduce((max, item) => Math.max(max, item.order), 0) + 1,
      createdAt: now,
      updatedAt: now,
    };
    try {
      const created = await createDashboardCategory(duplicate);
      setCategories((current) =>
        [...current, created].sort((a, b) => a.order - b.order),
      );
      setSelectedId(created.id);
      toast.success("Category duplicated in Supabase without copying product assignments.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Category duplication failed.");
    }
  };

  const requestDelete = (category: CatalogCategory) => {
    if (categories.length <= 1) {
      toast.error("Keep at least one category in the catalog.");
      return;
    }
    setDeleteTarget(category);
    setDeleteDestination("uncategorized");
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const destinationId =
      deleteDestination === "uncategorized" ? null : deleteDestination || null;

    try {
      await deleteDashboardCategory(deleteTarget.id, destinationId);
      const workspace = await loadCategoriesWorkspace();
      setCategories(workspace.categories);
      setProducts(workspace.products);
      setSelectedId((current) =>
        current === deleteTarget.id ||
        !workspace.categories.some((category) => category.id === current)
          ? workspace.categories[0]?.id || ""
          : current,
      );
      setDeleteTarget(null);
      toast.success("Category deleted and product assignments updated in Supabase.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Category deletion failed.");
    }
  };

  const assignProducts = async (productIds: string[]) => {
    if (!selected) return;
    try {
      await assignProductsToDashboardCategory(productIds, selected);
      setProducts(await refreshDashboardCategoryProducts());
      setAssignmentOpen(false);
      toast.success(
        productIds.length === 1
          ? "Product assigned to " + selected.name + " in Supabase."
          : productIds.length + " products assigned to " + selected.name + " in Supabase.",
      );
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Product assignment failed.");
    }
  };

  const removeProductFromCategory = async (product: DashboardProduct) => {
    try {
      await assignProductsToDashboardCategory([product.id], null);
      setProducts(await refreshDashboardCategoryProducts());
      setProductMenuId(null);
      toast.success(product.name + " moved to Uncategorized in Supabase.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Removing product from category failed.");
    }
  };

  const confirmMoveProduct = async () => {
    if (!moveProduct || !moveDestination) return;
    const destination =
      moveDestination === "uncategorized"
        ? null
        : categories.find((category) => category.id === moveDestination) ?? null;
    const destinationName = destination?.name ?? "Uncategorized";

    try {
      await assignProductsToDashboardCategory([moveProduct.id], destination);
      setProducts(await refreshDashboardCategoryProducts());
      toast.success(moveProduct.name + " moved to " + destinationName + " in Supabase.");
      setMoveProduct(null);
      setMoveDestination("");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Moving product failed.");
    }
  };

  const startReorder = () => {
    setReorderDraft([...categories].sort((a, b) => a.order - b.order));
    setReorderMode(true);
  };

  const moveReorderItem = (categoryId: string, direction: -1 | 1) => {
    setReorderDraft((current) => {
      const index = current.findIndex((category) => category.id === categoryId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const saveReorder = async () => {
    const normalized = reorderDraft.map((category, index) => ({
      ...category,
      order: index + 1,
      updatedAt: new Date().toISOString(),
    }));
    try {
      await reorderDashboardCategories(normalized);
      setCategories(normalized);
      setReorderMode(false);
      setReorderDraft([]);
      setSortMode("order");
      toast.success("Category order saved to Supabase.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Saving category order failed.");
    }
  };

  const scrollToProducts = (category?: CatalogCategory) => {
    if (category) setSelectedId(category.id);
    window.setTimeout(() => {
      document
        .getElementById("category-products")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 20);
  };

  const resetFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setHomepageFilter("all");
    setSortMode("order");
  };

  if (loading) {
    return (
      <div className="grid min-h-[360px] place-items-center rounded-2xl border border-slate-200 bg-white">
        <Loader2 className="size-6 animate-spin text-[#5968ea]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-sm font-semibold text-rose-700">
        {error}
      </div>
    );
  }

  if (!categories.length) {
    return (
      <div>
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#6a70e7]">
            <span className="size-1.5 rounded-full bg-[#6a70e7]" />
            Commerce / Catalog
          </div>
          <h1 className="text-[24px] font-black tracking-[-.04em] text-[#14203a] sm:text-[30px] sm:tracking-[-.05em]">
            Categories Management
          </h1>
          <p className="mt-1.5 text-[12px] text-slate-500">
            Manage Space Call browsing categories, icons, visibility, order, and product
            assignments.
          </p>
        </div>
        <div className="grid min-h-[320px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <div>
            <CategoryIcon name="LayoutGrid" className="mx-auto size-8 text-slate-300" />
            <h2 className="mt-4 text-[14px] font-black text-slate-700">No categories yet</h2>
            <p className="mt-1 text-[10px] text-slate-400">
              Create the first browsing category for the Space Call catalog.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white"
            >
              <Plus className="size-4" />
              Add Category
            </button>
          </div>
        </div>
        {editing && (
          <CategoryForm
            key={editing.category.id}
            category={editing.category}
            categories={categories}
            mode={editing.mode}
            onClose={() => setEditing(null)}
            onSave={saveCategory}
          />
        )}
      </div>
    );
  }

  return (
    <div className="pb-4 sm:pb-8">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#6a70e7]">
            <span className="size-1.5 rounded-full bg-[#6a70e7]" />
            Commerce / Catalog
          </div>
          <h1 className="text-[30px] font-black tracking-[-.05em] text-[#14203a]">
            Categories Management
          </h1>
          <p className="mt-1.5 max-w-2xl text-[12px] leading-5 text-slate-500">
            Manage Space Call browsing categories, icons, visibility, order, and product
            assignments.
          </p>
        </div>

        <div className="grid w-full shrink-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          {!reorderMode ? (
            <>
              <button
                type="button"
                onClick={startReorder}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50 sm:w-auto"
              >
                <GripVertical className="size-4" />
                Reorder
              </button>
              <button
                type="button"
                onClick={openCreate}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white shadow-[0_8px_18px_rgba(89,104,234,.22)] sm:w-auto"
              >
                <Plus className="size-4" />
                Add Category
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setReorderMode(false);
                  setReorderDraft([]);
                }}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-600 sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveReorder}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white sm:w-auto"
              >
                <Check className="size-4" />
                Save Order
              </button>
            </>
          )}
        </div>
      </div>

      <CategoryKpiCards
        total={categories.length}
        active={activeCount}
        hidden={categories.length - activeCount}
        assignedProducts={assignedValidCount}
      />

      <section
        id="storefront-category-grid"
        className="mb-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(33,47,82,.04)] sm:p-5"
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[12px] font-black text-[#14203a]">Storefront Category Grid</div>
            <div className="mt-1 text-[10px] leading-4 text-slate-400">
              This mirrors the public Categories page. Tap any tile to edit its name, image,
              visibility, order, or assigned products.
            </div>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-[10px] font-bold text-indigo-700"
          >
            <Plus className="size-3.5" />
            Add Category
          </button>
        </div>

        <div className="grid grid-cols-3 gap-x-2 gap-y-4 min-[480px]:grid-cols-4 sm:grid-cols-5 lg:grid-cols-7">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => openEdit(category)}
              className={
                "group flex min-w-0 flex-col items-center gap-2 rounded-2xl px-1.5 py-2 text-center transition hover:-translate-y-0.5 hover:bg-slate-50 " +
                (!category.active ? "opacity-45" : "")
              }
              title={category.active ? "Visible in storefront" : "Hidden from storefront"}
            >
              <span className="relative grid h-[4.6rem] w-[4.6rem] shrink-0 place-items-center overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm sm:h-[5.1rem] sm:w-[5.1rem]">
                {category.image ? (
                  <img
                    src={category.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-[1.05]"
                  />
                ) : (
                  <CategoryGlyph slug={category.slug} className="h-[4.1rem] w-[4.1rem] sm:h-[4.55rem] sm:w-[4.55rem]" />
                )}
                {!category.active && (
                  <span className="absolute inset-x-1 bottom-1 rounded-md bg-slate-900/75 px-1 py-0.5 text-[7px] font-black uppercase tracking-wide text-white">
                    Hidden
                  </span>
                )}
              </span>
              <span className="line-clamp-2 min-h-[2rem] max-w-full text-[11px] font-extrabold leading-[1.15] text-slate-800">
                {category.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {!reorderMode && (
        <CategoryToolbar
          query={query}
          onQueryChange={setQuery}
          status={statusFilter}
          onStatusChange={setStatusFilter}
          homepage={homepageFilter}
          onHomepageChange={setHomepageFilter}
          sort={sortMode}
          onSortChange={setSortMode}
        />
      )}

      {reorderMode && (
        <div className="mb-3 flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3.5">
          <GripVertical className="mt-0.5 size-4 shrink-0 text-indigo-500" />
          <div>
            <div className="text-[11px] font-bold text-indigo-800">Reorder Categories</div>
            <div className="mt-0.5 text-[9px] leading-4 text-indigo-600">
              Use the Up and Down controls on any screen size. Save Order normalizes positions to 1,
              2, 3…
            </div>
          </div>
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
        <section id="category-list" className="self-start scroll-mt-[6.5rem] rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-[0_8px_24px_rgba(33,47,82,.04)] lg:sticky lg:top-[6.5rem]">
          {listCategories.length ? (
            <CategoryList
              categories={listCategories}
              selectedId={selected?.id || ""}
              getProductCount={(category) => getCategoryProductCount(products, category)}
              reorderMode={reorderMode}
              onSelect={(category) => {
                setSelectedId(category.id);
                setProductMenuId(null);
                if (typeof window !== "undefined" && window.innerWidth < 1024) {
                  window.requestAnimationFrame(() => {
                    document.getElementById("category-details")?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  });
                }
              }}
              onEdit={openEdit}
              onViewProducts={scrollToProducts}
              onAddProduct={(category) => {
                setSelectedId(category.id);
                navigate("/dashboard/products/new");
              }}
              onToggleFeatured={(category) =>
                toggleCategory(category, { featured: !category.featured })
              }
              onToggleActive={(category) => toggleCategory(category, { active: !category.active })}
              onDuplicate={duplicateCategory}
              onDelete={requestDelete}
              onMove={moveReorderItem}
            />
          ) : (
            <div className="grid min-h-56 place-items-center p-5 text-center">
              <div>
                <SearchX className="mx-auto size-7 text-slate-300" />
                <div className="mt-3 text-[11px] font-bold text-slate-600">
                  No categories match these filters
                </div>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold text-[#5968ea]"
                >
                  <RotateCcw className="size-3.5" />
                  Reset filters
                </button>
              </div>
            </div>
          )}
        </section>

        {selected && (
          <div id="category-details" className="min-w-0 scroll-mt-[6.5rem] space-y-4">
            <div className="lg:hidden">
              <button
                type="button"
                onClick={() =>
                  document.getElementById("category-list")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
                }
                className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 shadow-sm"
              >
                <ChevronDown className="size-3.5 rotate-90" />
                Back to categories
              </button>
            </div>
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(33,47,82,.04)] sm:p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-100 bg-white text-indigo-600 shadow-sm">
                    {selected.image ? (
                      <img src={selected.image} alt="" className="size-full object-contain p-1" />
                    ) : (
                      <CategoryGlyph slug={selected.slug} className="size-11" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-[18px] font-black tracking-[-.03em] text-[#14203a]">
                        {selected.name}
                      </h2>
                      <span
                        className={
                          "rounded-full px-2 py-1 text-[8px] font-black " +
                          (selected.active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500")
                        }
                      >
                        {selected.active ? "Active" : "Hidden"}
                      </span>
                      {selected.featured && (
                        <span className="rounded-full bg-violet-50 px-2 py-1 text-[8px] font-black text-violet-700">
                          Featured
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">
                      /{selected.slug} · {assignedProducts.length} assigned products
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => openEdit(selected)}
                    className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 text-[10px] font-bold text-slate-600"
                  >
                    <Pencil className="size-3.5" />
                    Edit Category
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      document
                        .getElementById("category-homepage-preview")
                        ?.scrollIntoView({ behavior: "smooth", block: "center" })
                    }
                    className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-[10px] font-bold text-slate-600"
                  >
                    <Eye className="size-3.5" />
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      scrollToProducts();
                      toast.info(
                        "Product assignment and movement are available below. Custom per-category product ordering is not stored in the current Product model.",
                      );
                    }}
                    className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-[10px] font-bold text-slate-600"
                  >
                    <MoveRight className="size-3.5" />
                    Reorder Products
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 xl:grid-cols-[1.4fr_.8fr]">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="text-[9px] font-black uppercase tracking-[.13em] text-slate-400">
                    Description
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-slate-600">
                    {selected.description || "No description has been added for this category yet."}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div>
                      <div className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
                        Status
                      </div>
                      <div className="mt-1 text-[10px] font-bold text-slate-700">
                        {selected.active ? "Active" : "Hidden"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
                        Homepage
                      </div>
                      <div className="mt-1 text-[10px] font-bold text-slate-700">
                        {selected.featured ? "Featured" : "Not Featured"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
                        Sort Order
                      </div>
                      <div className="mt-1 text-[10px] font-bold text-slate-700">
                        {selected.order}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <ToggleControl
                    checked={selected.active}
                    onChange={(active) => toggleCategory(selected, { active })}
                    title="Active"
                    description="Visible in the storefront"
                  />
                  <ToggleControl
                    checked={selected.featured}
                    onChange={(featured) => toggleCategory(selected, { featured })}
                    title="Featured"
                    description="Show this category in homepage sections"
                  />
                  {!selected.active && selected.featured && (
                    <div className="rounded-xl bg-amber-50 px-3 py-2 text-[9px] leading-4 text-amber-700">
                      Hidden status takes precedence. Featured remains saved but is not effectively
                      visible.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section
              id="category-products"
              className="scroll-mt-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(33,47,82,.04)]"
            >
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div>
                  <div className="text-[13px] font-black text-[#14203a]">
                    Products in {selected.name}
                  </div>
                  <div className="mt-1 text-[10px] text-slate-400">
                    Assignment uses store_products.category_id in Supabase as the source of truth.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAssignmentOpen(true)}
                  className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#5968ea] px-3 text-[10px] font-bold text-white"
                >
                  <Plus className="size-3.5" />
                  Assign Products
                </button>
              </div>

              {assignedProducts.length ? (
                <div className="divide-y divide-slate-100">
                  {assignedProducts.map((product) => (
                    <div
                      key={product.id}
                      className="relative grid gap-3 p-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(90px,.8fr)_80px_80px_82px_36px] xl:items-center xl:px-5"
                    >
                      <div className="flex min-w-0 items-center gap-3 pe-12 xl:pe-0">
                        <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-slate-50 xl:size-11 xl:rounded-xl">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt=""
                              className="h-full w-full object-contain p-1.5 xl:p-1"
                            />
                          ) : (
                            <div className="text-[9px] font-bold text-slate-300">No image</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-2 text-[13px] font-black leading-5 text-slate-700 xl:truncate xl:text-[11px] xl:leading-normal">
                            {product.name}
                          </div>
                          <div className="mt-1 truncate text-[10px] font-medium text-slate-400 xl:text-[9px]">
                            {product.brand || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl bg-slate-50/70 p-3 xl:contents">
                        <div className="min-w-0">
                          <div className="text-[8px] font-bold uppercase tracking-wide text-slate-400 xl:hidden">
                            SKU
                          </div>
                          <div className="mt-1 truncate font-mono text-[10px] font-semibold text-slate-600 xl:mt-0 xl:text-[9px] xl:font-normal xl:text-slate-500">
                            {product.sku || "—"}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="text-[8px] font-bold uppercase tracking-wide text-slate-400 xl:hidden">
                            Price
                          </div>
                          <div className="mt-1 text-[11px] font-black text-slate-700 xl:mt-0 xl:text-[10px] xl:font-bold">
                            {"$" + product.price.toLocaleString()}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="text-[8px] font-bold uppercase tracking-wide text-slate-400 xl:hidden">
                            Stock
                          </div>
                          <div
                            className={
                              "mt-1 text-[11px] font-black xl:mt-0 xl:text-[10px] xl:font-bold " +
                              (product.stock < 10 ? "text-rose-600" : "text-slate-700")
                            }
                          >
                            {product.stock}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="text-[8px] font-bold uppercase tracking-wide text-slate-400 xl:hidden">
                            Status
                          </div>
                          <div className="mt-1 xl:mt-0">
                            <ProductStatus status={product.status} />
                          </div>
                        </div>
                      </div>

                      <div className="absolute end-3 top-3 xl:static">
                        <button
                          type="button"
                          aria-label={"Actions for " + product.name}
                          onClick={() =>
                            setProductMenuId((current) =>
                              current === product.id ? null : product.id,
                            )
                          }
                          className="grid size-11 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 xl:size-8 xl:rounded-lg"
                        >
                          <MoreHorizontal className="size-4" />
                        </button>

                        {productMenuId === product.id && (
                          <>
                            <button
                              aria-label="Close product actions"
                              className="fixed inset-0 z-[70] cursor-default bg-slate-950/20 xl:bg-transparent"
                              onClick={() => setProductMenuId(null)}
                            />

                            <div
                              role="menu"
                              aria-label={"Actions for " + product.name}
                              className="fixed inset-x-3 bottom-[calc(.75rem+env(safe-area-inset-bottom))] z-[80] max-h-[70dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl xl:absolute xl:inset-x-auto xl:bottom-auto xl:end-12 xl:top-1/2 xl:z-50 xl:max-h-none xl:w-44 xl:-translate-y-1/2 xl:overflow-hidden xl:rounded-xl xl:p-1.5 xl:shadow-xl"
                            >
                              <div className="px-2.5 pb-2 pt-1 xl:hidden">
                                <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-slate-200" />
                                <div className="truncate text-[11px] font-black text-slate-700">
                                  {product.name}
                                </div>
                                <div className="mt-0.5 text-[9px] text-slate-400">Product actions</div>
                              </div>

                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setProductMenuId(null);
                                  navigate("/dashboard/products/" + product.id);
                                }}
                                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-[11px] font-semibold text-slate-600 hover:bg-slate-50 xl:min-h-0 xl:gap-2 xl:rounded-lg xl:px-2.5 xl:py-2 xl:text-[10px]"
                              >
                                <Eye className="size-4 text-slate-400 xl:size-3.5" />
                                View Product
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setProductMenuId(null);
                                  navigate("/dashboard/products/" + product.id);
                                }}
                                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-[11px] font-semibold text-slate-600 hover:bg-slate-50 xl:min-h-0 xl:gap-2 xl:rounded-lg xl:px-2.5 xl:py-2 xl:text-[10px]"
                              >
                                <Pencil className="size-4 text-slate-400 xl:size-3.5" />
                                Edit Product
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setProductMenuId(null);
                                  setMoveProduct(product);
                                  setMoveDestination("");
                                }}
                                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-[11px] font-semibold text-slate-600 hover:bg-slate-50 xl:min-h-0 xl:gap-2 xl:rounded-lg xl:px-2.5 xl:py-2 xl:text-[10px]"
                              >
                                <MoveRight className="size-4 text-slate-400 xl:size-3.5" />
                                Move to Category
                              </button>

                              <div className="my-1 border-t border-slate-100" />

                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => removeProductFromCategory(product)}
                                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-[11px] font-semibold text-amber-700 hover:bg-amber-50 xl:min-h-0 xl:gap-2 xl:rounded-lg xl:px-2.5 xl:py-2 xl:text-[10px]"
                              >
                                <X className="size-4 xl:size-3.5" />
                                Remove from Category
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid min-h-52 place-items-center p-6 text-center">
                  <div>
                    <CategoryIcon name={selected.icon} className="mx-auto size-7 text-slate-300" />
                    <div className="mt-3 text-[11px] font-bold text-slate-600">
                      No products are assigned to {selected.name} yet.
                    </div>
                    <button
                      type="button"
                      onClick={() => setAssignmentOpen(true)}
                      className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-[10px] font-bold text-indigo-700"
                    >
                      <Plus className="size-3.5" />
                      Assign Products
                    </button>
                  </div>
                </div>
              )}
            </section>

            <CategoryPreview category={selected} products={assignedProducts} />
          </div>
        )}
      </div>

      {editing && (
        <CategoryForm
          key={editing.category.id}
          category={editing.category}
          categories={categories}
          mode={editing.mode}
          onClose={() => setEditing(null)}
          onSave={saveCategory}
        />
      )}

      {assignmentOpen && selected && (
        <ProductAssignmentDialog
          category={selected}
          products={products}
          onClose={() => setAssignmentOpen(false)}
          onAssign={assignProducts}
        />
      )}

      {deleteTarget && (
        <ModalShell
          title={"Delete " + deleteTarget.name + "?"}
          subtitle="The category can be removed, but products are never deleted."
          onClose={() => setDeleteTarget(null)}
        >
          {getCategoryProductCount(products, deleteTarget) > 0 ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-amber-50 p-3 text-[10px] leading-5 text-amber-800">
                <b>{getCategoryProductCount(products, deleteTarget)} products</b> currently belong
                to this category. Choose where they should move before deletion.
              </div>
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold text-slate-600">
                  Move products to
                </span>
                <div className="relative">
                  <select
                    value={deleteDestination}
                    onChange={(event) => setDeleteDestination(event.target.value)}
                    className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white ps-3 pe-9 text-[11px] text-slate-700 outline-none"
                  >
                    <option value="uncategorized">Uncategorized</option>
                    {categories
                      .filter((category) => category.id !== deleteTarget.id)
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                </div>
              </label>
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 p-3 text-[10px] leading-5 text-slate-600">
              This category is empty, so no product reassignment is required.
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="h-10 rounded-xl border border-slate-200 px-4 text-[11px] font-bold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-4 text-[11px] font-bold text-white"
            >
              <Trash2 className="size-4" />
              Delete Category
            </button>
          </div>
        </ModalShell>
      )}

      {moveProduct && (
        <ModalShell
          title="Move Product"
          subtitle={moveProduct.name + " will stay intact; only its Supabase category assignment changes."}
          onClose={() => {
            setMoveProduct(null);
            setMoveDestination("");
          }}
        >
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold text-slate-600">Destination</span>
            <div className="relative">
              <select
                value={moveDestination}
                onChange={(event) => setMoveDestination(event.target.value)}
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white ps-3 pe-9 text-[11px] text-slate-700 outline-none"
              >
                <option value="">Choose category</option>
                {categories
                  .filter((category) => category.id !== selected?.id)
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                <option value="uncategorized">Uncategorized</option>
              </select>
              <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            </div>
          </label>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setMoveProduct(null);
                setMoveDestination("");
              }}
              className="h-10 rounded-xl border border-slate-200 px-4 text-[11px] font-bold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!moveDestination}
              onClick={confirmMoveProduct}
              className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MoveRight className="size-4" />
              Move Product
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
