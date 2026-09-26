import {
  Check,
  ChevronDown,
  Eye,
  Globe2,
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
import BrandAssignmentDialog from "@/dashboard/components/brands/BrandAssignmentDialog";
import BrandForm, { type BrandImageChange } from "@/dashboard/components/brands/BrandForm";
import BrandKpiCards from "@/dashboard/components/brands/BrandKpiCards";
import BrandList from "@/dashboard/components/brands/BrandList";
import BrandMark from "@/dashboard/components/brands/BrandMark";
import BrandPreview from "@/dashboard/components/brands/BrandPreview";
import BrandToolbar from "@/dashboard/components/brands/BrandToolbar";
import {
  assignProductsToDashboardBrand,
  countProductsAssignedToValidBrands,
  createDashboardBrand,
  createUniqueBrandSlug,
  deleteDashboardBrand,
  getBrandProductCount,
  getProductsForBrand,
  loadBrandsWorkspace,
  reorderDashboardBrands,
  updateDashboardBrand,
  uploadDashboardBrandImage,
  type CatalogBrand,
} from "@/dashboard/data/brands";
import type { DashboardProduct } from "@/dashboard/data/catalog";

type EditState = {
  mode: "create" | "edit";
  brand: CatalogBrand;
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

function Toggle({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
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

function Modal({
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
      className="fixed inset-0 z-[97] grid place-items-end bg-slate-950/45 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[18px] font-black tracking-[-.03em] text-[#14203a]">{title}</h2>
            <p className="mt-1 text-[10px] leading-4 text-slate-400">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-400"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function BrandsPage() {
  const [, navigate] = useLocation();
  const [brands, setBrands] = useState<CatalogBrand[]>([]);
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
  const [deleteTarget, setDeleteTarget] = useState<CatalogBrand | null>(null);
  const [deleteDestination, setDeleteDestination] = useState("unbranded");
  const [deleting, setDeleting] = useState(false);
  const [moveProduct, setMoveProduct] = useState<DashboardProduct | null>(null);
  const [moveDestination, setMoveDestination] = useState("");
  const [productMenuId, setProductMenuId] = useState<string | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderDraft, setReorderDraft] = useState<CatalogBrand[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadBrandsWorkspace()
      .then((workspace) => {
        if (cancelled) return;
        setBrands(workspace.brands);
        setProducts(workspace.products);
        setSelectedId((current) =>
          current && workspace.brands.some((brand) => brand.id === current)
            ? current
            : workspace.brands[0]?.id || "",
        );
        setError("");
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to load brands.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = brands.find((brand) => brand.id === selectedId) || brands[0];

  const patchProductBrandAssignments = (
    productIds: string[],
    destination: CatalogBrand | null,
  ) => {
    const ids = new Set(productIds);
    if (!ids.size) return;
    setProducts((current) =>
      current.map((product) =>
        ids.has(product.id)
          ? {
              ...product,
              brandId: destination?.id ?? null,
              brand: destination?.name ?? "",
            }
          : product,
      ),
    );
  };

  const reassignProductsFromBrand = (
    sourceBrandId: string,
    destination: CatalogBrand | null,
  ) => {
    setProducts((current) =>
      current.map((product) =>
        product.brandId === sourceBrandId
          ? {
              ...product,
              brandId: destination?.id ?? null,
              brand: destination?.name ?? "",
            }
          : product,
      ),
    );
  };

  const assignedProducts = useMemo(
    () => (selected ? getProductsForBrand(products, selected) : []),
    [products, selected],
  );

  const activeCount = useMemo(() => brands.filter((brand) => brand.active).length, [brands]);
  const featuredCount = useMemo(() => brands.filter((brand) => brand.featured).length, [brands]);
  const assignedValidCount = useMemo(
    () => countProductsAssignedToValidBrands(products, brands),
    [products, brands],
  );

  const filteredBrands = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const next = brands.filter((brand) => {
      const matchesSearch =
        !needle ||
        (brand.name + " " + brand.slug + " " + brand.description).toLowerCase().includes(needle);
      const matchesStatus =
        statusFilter === "all" || (statusFilter === "active" ? brand.active : !brand.active);
      const matchesHomepage =
        homepageFilter === "all" ||
        (homepageFilter === "featured" ? brand.featured : !brand.featured);
      return matchesSearch && matchesStatus && matchesHomepage;
    });

    return [...next].sort((a, b) => {
      if (sortMode === "name") return a.name.localeCompare(b.name);
      if (sortMode === "products") {
        return getBrandProductCount(products, b) - getBrandProductCount(products, a);
      }
      if (sortMode === "updated") {
        return (
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
        );
      }
      return a.order - b.order;
    });
  }, [brands, products, query, statusFilter, homepageFilter, sortMode]);

  const listBrands = reorderMode ? reorderDraft : filteredBrands;

  const openCreate = () => {
    const nextOrder = brands.reduce((max, brand) => Math.max(max, brand.order), 0) + 1;
    setEditing({
      mode: "create",
      brand: {
        id: "",
        name: "",
        slug: "",
        description: "",
        active: true,
        featured: false,
        order: nextOrder,
      },
    });
  };

  const openEdit = (brand: CatalogBrand) => {
    setSelectedId(brand.id);
    setEditing({ mode: "edit", brand: { ...brand } });
  };

  const saveBrand = async (
    nextBrand: CatalogBrand,
    imageChange: BrandImageChange,
  ) => {
    const duplicateSlug = brands.some(
      (brand) =>
        brand.id !== nextBrand.id && brand.slug.toLowerCase() === nextBrand.slug.toLowerCase(),
    );
    if (duplicateSlug) {
      toast.error("That brand slug is already in use.");
      return false;
    }

    try {
      let saved =
        editing?.mode === "create"
          ? await createDashboardBrand(nextBrand)
          : await updateDashboardBrand(nextBrand);

      const optimized: string[] = [];

      if (imageChange.logoFile) {
        const uploaded = await uploadDashboardBrandImage(
          imageChange.logoFile,
          "logo",
          imageChange.logoBackgroundRemoval,
        );
        saved = await updateDashboardBrand({ ...saved, logo: uploaded.url });
        optimized.push(
          `logo ${Math.round(uploaded.conversion.source.bytes / 1024)} KB → ${Math.round(uploaded.conversion.output.bytes / 1024)} KB`,
        );
      }

      if (imageChange.coverFile) {
        const uploaded = await uploadDashboardBrandImage(imageChange.coverFile, "cover");
        saved = await updateDashboardBrand({ ...saved, coverImage: uploaded.url });
        optimized.push(
          `cover ${Math.round(uploaded.conversion.source.bytes / 1024)} KB → ${Math.round(uploaded.conversion.output.bytes / 1024)} KB`,
        );
      }

      setBrands((current) => {
        const exists = current.some((brand) => brand.id === saved.id);
        const next = exists
          ? current.map((brand) => (brand.id === saved.id ? saved : brand))
          : [...current, saved];
        return next.sort((a, b) => a.order - b.order);
      });
      setProducts((current) =>
        current.map((product) =>
          product.brandId === saved.id ? { ...product, brand: saved.name } : product,
        ),
      );
      setSelectedId(saved.id);

      toast.success(
        optimized.length
          ? `Brand saved. WebP optimized: ${optimized.join(" · ")}.`
          : editing?.mode === "create"
            ? "Brand created successfully."
            : imageChange.removeLogo || imageChange.removeCover
              ? "Brand image removed and changes saved."
              : "Brand changes saved.",
      );
      return true;
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Brand save failed.");
      return false;
    }
  };

  const toggleBrand = async (brand: CatalogBrand, patch: Partial<CatalogBrand>) => {
    try {
      const saved = await updateDashboardBrand({ ...brand, ...patch });
      setBrands((current) =>
        current.map((item) => (item.id === saved.id ? saved : item)),
      );
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Brand update failed.");
    }
  };

  const duplicateBrand = async (brand: CatalogBrand) => {
    const now = new Date().toISOString();
    const duplicate: CatalogBrand = {
      ...brand,
      id: "",
      name: brand.name + " Copy",
      slug: createUniqueBrandSlug(brand.slug + "-copy", brands),
      active: false,
      featured: false,
      order: brands.reduce((max, item) => Math.max(max, item.order), 0) + 1,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const created = await createDashboardBrand(duplicate);
      setBrands((current) => [...current, created].sort((a, b) => a.order - b.order));
      setSelectedId(created.id);
      toast.success("Brand duplicated in Supabase without copying product assignments.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Brand duplication failed.");
    }
  };

  const requestDelete = (brand: CatalogBrand) => {
    if (brands.length <= 1) {
      toast.error("Keep at least one brand in the catalog.");
      return;
    }
    setDeleting(false);
    setDeleteTarget(brand);
    setDeleteDestination("unbranded");
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    const destinationId =
      deleteDestination === "unbranded" ? null : deleteDestination || null;

    setDeleting(true);
    try {
      const deletedBrandId = deleteTarget.id;
      const destination =
        destinationId === null
          ? null
          : brands.find((brand) => brand.id === destinationId) ?? null;
      const remainingBrands = brands.filter((brand) => brand.id !== deletedBrandId);

      await deleteDashboardBrand(deletedBrandId, destinationId);

      setBrands(remainingBrands);
      reassignProductsFromBrand(deletedBrandId, destination);
      setSelectedId((current) =>
        current === deletedBrandId || !remainingBrands.some((brand) => brand.id === current)
          ? remainingBrands[0]?.id || ""
          : current,
      );
      setDeleteTarget(null);
      toast.success("Brand deleted safely. Product assignments were preserved.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Brand deletion failed.");
    } finally {
      setDeleting(false);
    }
  };

  const assignProducts = async (productIds: string[]) => {
    if (!selected) return;
    try {
      await assignProductsToDashboardBrand(productIds, selected.id);
      patchProductBrandAssignments(productIds, selected);
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

  const removeProductFromBrand = async (product: DashboardProduct) => {
    try {
      await assignProductsToDashboardBrand([product.id], null);
      patchProductBrandAssignments([product.id], null);
      setProductMenuId(null);
      toast.success(product.name + " moved to Unbranded in Supabase.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Removing product from brand failed.");
    }
  };

  const confirmMoveProduct = async () => {
    if (!moveProduct || !moveDestination) return;
    const destinationId = moveDestination === "unbranded" ? null : moveDestination;
    const destination = brands.find((brand) => brand.id === moveDestination);
    const destinationName = destinationId === null ? "Unbranded" : destination?.name;

    if (!destinationName) {
      toast.error("Choose a destination brand.");
      return;
    }

    try {
      await assignProductsToDashboardBrand([moveProduct.id], destinationId);
      patchProductBrandAssignments([moveProduct.id], destination ?? null);
      toast.success(moveProduct.name + " moved to " + destinationName + " in Supabase.");
      setMoveProduct(null);
      setMoveDestination("");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Moving product failed.");
    }
  };

  const startReorder = () => {
    setReorderDraft([...brands].sort((a, b) => a.order - b.order));
    setReorderMode(true);
  };

  const moveReorderItem = (brandId: string, direction: -1 | 1) => {
    setReorderDraft((current) => {
      const index = current.findIndex((brand) => brand.id === brandId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;

      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const saveReorder = async () => {
    const normalized = reorderDraft.map((brand, index) => ({
      ...brand,
      order: index + 1,
      updatedAt: new Date().toISOString(),
    }));
    try {
      await reorderDashboardBrands(normalized);
      setBrands(normalized);
      setReorderMode(false);
      setReorderDraft([]);
      setSortMode("order");
      toast.success("Brand order saved to Supabase.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Saving brand order failed.");
    }
  };

  const scrollToProducts = (brand?: CatalogBrand) => {
    if (brand) setSelectedId(brand.id);
    window.setTimeout(() => {
      document
        .getElementById("brand-products")
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

  if (!brands.length) {
    return (
      <div>
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#6a70e7]">
            <span className="size-1.5 rounded-full bg-[#6a70e7]" />
            Commerce / Catalog
          </div>
          <h1 className="text-[24px] font-black tracking-[-.04em] text-[#14203a] sm:text-[30px] sm:tracking-[-.05em]">
            Brands Management
          </h1>
          <p className="mt-1.5 text-[12px] text-slate-500">
            Manage Space Call brands, identity, visibility, order, SEO, and product assignments.
          </p>
        </div>
        <div className="grid min-h-[320px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <div>
            <Globe2 className="mx-auto size-8 text-slate-300" />
            <h2 className="mt-4 text-[14px] font-black text-slate-700">No brands yet</h2>
            <p className="mt-1 text-[10px] text-slate-400">
              Create the first brand for the Space Call catalog.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white"
            >
              <Plus className="size-4" />
              Add Brand
            </button>
          </div>
        </div>
        {editing && (
          <BrandForm
            brand={editing.brand}
            brands={brands}
            mode={editing.mode}
            onClose={() => setEditing(null)}
            onSave={saveBrand}
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
            Brands Management
          </h1>
          <p className="mt-1.5 max-w-2xl text-[12px] leading-5 text-slate-500">
            Manage Space Call brands, identity, visibility, order, SEO, and product assignments.
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
                Add Brand
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

      <BrandKpiCards
        total={brands.length}
        active={activeCount}
        featured={featuredCount}
        assignedProducts={assignedValidCount}
      />

      {!reorderMode && (
        <BrandToolbar
          query={query}
          onQueryChange={setQuery}
          status={statusFilter}
          onStatusChange={setStatusFilter}
          homepage={homepageFilter}
          onHomepageChange={setHomepageFilter}
          sort={sortMode}
          onSortChange={setSortMode}
          onReset={resetFilters}
        />
      )}

      {reorderMode && (
        <div className="mb-3 flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3.5">
          <GripVertical className="mt-0.5 size-4 shrink-0 text-indigo-500" />
          <div>
            <div className="text-[11px] font-bold text-indigo-800">Reorder Brands</div>
            <div className="mt-0.5 text-[9px] leading-4 text-indigo-600">
              Use Up and Down controls on any screen size. Save Order normalizes positions.
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <section id="brand-list" className="scroll-mt-[6.5rem] rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-[0_8px_24px_rgba(33,47,82,.04)] sm:p-3">
          {listBrands.length ? (
            <BrandList
              brands={listBrands}
              selectedId={selected?.id || ""}
              getProductCount={(brand) => getBrandProductCount(products, brand)}
              reorderMode={reorderMode}
              onSelect={(brand) => {
                setSelectedId(brand.id);
                setProductMenuId(null);
                if (typeof window !== "undefined" && window.innerWidth < 1024) {
                  window.requestAnimationFrame(() => {
                    document.getElementById("brand-details")?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  });
                }
              }}
              onEdit={openEdit}
              onViewProducts={scrollToProducts}
              onAddProduct={(brand) => {
                setSelectedId(brand.id);
                setAssignmentOpen(true);
              }}
              onToggleFeatured={(brand) => toggleBrand(brand, { featured: !brand.featured })}
              onToggleActive={(brand) => toggleBrand(brand, { active: !brand.active })}
              onDuplicate={duplicateBrand}
              onDelete={requestDelete}
              onMove={moveReorderItem}
            />
          ) : (
            <div className="grid min-h-56 place-items-center p-5 text-center">
              <div>
                <SearchX className="mx-auto size-7 text-slate-300" />
                <div className="mt-3 text-[11px] font-bold text-slate-600">
                  No brands match these filters
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
          <div id="brand-details" className="min-w-0 scroll-mt-[6.5rem] space-y-4">
            <div className="lg:hidden">
              <button
                type="button"
                onClick={() =>
                  document.getElementById("brand-list")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
                }
                className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 shadow-sm"
              >
                <ChevronDown className="size-3.5 rotate-90" />
                Back to brands
              </button>
            </div>
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(33,47,82,.04)] sm:p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <BrandMark brand={selected} className="size-12" />
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
                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 transition hover:bg-slate-50 active:scale-[.98]"
                  >
                    <Pencil className="size-3.5" />
                    Edit Brand
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignmentOpen(true)}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 px-3 text-[10px] font-bold text-indigo-700 transition hover:bg-indigo-100 active:scale-[.98]"
                  >
                    <Plus className="size-3.5" />
                    Assign Products
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      document
                        .getElementById("brand-homepage-preview")
                        ?.scrollIntoView({ behavior: "smooth", block: "center" })
                    }
                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 transition hover:bg-slate-50 active:scale-[.98]"
                  >
                    <Eye className="size-3.5" />
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => requestDelete(selected)}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-[10px] font-bold text-rose-700 transition hover:bg-rose-100 active:scale-[.98]"
                  >
                    <Trash2 className="size-3.5" />
                    Delete Brand
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 xl:grid-cols-[1.4fr_.8fr]">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="text-[9px] font-black uppercase tracking-[.13em] text-slate-400">
                    Description
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-slate-600">
                    {selected.description || "No description has been added for this brand yet."}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                    <div>
                      <div className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
                        Website
                      </div>
                      <div className="mt-1 truncate text-[10px] font-bold text-slate-700">
                        {selected.website || "—"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <Toggle
                    checked={selected.active}
                    onChange={(active) => toggleBrand(selected, { active })}
                    title="Active"
                    description="Available for storefront brand browsing"
                  />
                  <Toggle
                    checked={selected.featured}
                    onChange={(featured) => toggleBrand(selected, { featured })}
                    title="Featured"
                    description="Show this brand in homepage sections"
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
              id="brand-products"
              className="scroll-mt-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(33,47,82,.04)]"
            >
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div>
                  <div className="text-[13px] font-black text-[#14203a]">
                    Products by {selected.name}
                  </div>
                  <div className="mt-1 text-[10px] text-slate-400">
                    Brand assignment uses store_products.brand_id in Supabase as the single source of truth.
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
                            {product.category || "Uncategorized"}
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
                          className="grid size-11 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 lg:size-8 lg:rounded-lg"
                        >
                          <MoreHorizontal className="size-4" />
                        </button>

                        {productMenuId === product.id && (
                          <>
                            <button
                              aria-label="Close product actions"
                              className="fixed inset-0 z-[70] cursor-default bg-slate-950/20 lg:bg-transparent"
                              onClick={() => setProductMenuId(null)}
                            />

                            <div
                              role="menu"
                              aria-label={"Actions for " + product.name}
                              className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[80] max-h-[70dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl lg:absolute lg:inset-x-auto lg:bottom-auto lg:end-12 lg:top-1/2 lg:z-50 lg:max-h-none lg:w-44 lg:-translate-y-1/2 lg:overflow-hidden lg:rounded-xl lg:p-1.5 lg:shadow-xl"
                            >
                              <div className="px-2.5 pb-2 pt-1 lg:hidden">
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
                                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-[11px] font-semibold text-slate-600 hover:bg-slate-50 lg:min-h-0 lg:gap-2 lg:rounded-lg lg:px-2.5 lg:py-2 lg:text-[10px]"
                              >
                                <Eye className="size-4 text-slate-400 lg:size-3.5" />
                                View Product
                              </button>

                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setProductMenuId(null);
                                  navigate("/dashboard/products/" + product.id);
                                }}
                                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-[11px] font-semibold text-slate-600 hover:bg-slate-50 lg:min-h-0 lg:gap-2 lg:rounded-lg lg:px-2.5 lg:py-2 lg:text-[10px]"
                              >
                                <Pencil className="size-4 text-slate-400 lg:size-3.5" />
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
                                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-[11px] font-semibold text-slate-600 hover:bg-slate-50 lg:min-h-0 lg:gap-2 lg:rounded-lg lg:px-2.5 lg:py-2 lg:text-[10px]"
                              >
                                <MoveRight className="size-4 text-slate-400 lg:size-3.5" />
                                Move to Brand
                              </button>

                              <div className="my-1 border-t border-slate-100" />

                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => removeProductFromBrand(product)}
                                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-[11px] font-semibold text-amber-700 hover:bg-amber-50 lg:min-h-0 lg:gap-2 lg:rounded-lg lg:px-2.5 lg:py-2 lg:text-[10px]"
                              >
                                <X className="size-4 lg:size-3.5" />
                                Remove from Brand
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
                    <BrandMark brand={selected} className="mx-auto size-12" />
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

            <BrandPreview brand={selected} products={assignedProducts} />
          </div>
        )}
      </div>

      {editing && (
        <BrandForm
          key={editing.brand.id}
          brand={editing.brand}
          brands={brands}
          mode={editing.mode}
          onClose={() => setEditing(null)}
          onSave={saveBrand}
        />
      )}

      {assignmentOpen && selected && (
        <BrandAssignmentDialog
          brand={selected}
          products={products}
          onClose={() => setAssignmentOpen(false)}
          onAssign={assignProducts}
        />
      )}

      {deleteTarget && (
        <Modal
          title={"Delete " + deleteTarget.name + "?"}
          subtitle="This permanently removes the brand record. Products are never deleted and can be reassigned first."
          onClose={() => {
            if (!deleting) setDeleteTarget(null);
          }}
        >
          {getBrandProductCount(products, deleteTarget) > 0 ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-amber-50 p-3 text-[10px] leading-5 text-amber-800">
                <b>{getBrandProductCount(products, deleteTarget)} products</b> currently use this
                brand. Choose where they should move before deletion.
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
                    <option value="unbranded">Unbranded</option>
                    {brands
                      .filter((brand) => brand.id !== deleteTarget.id)
                      .map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                </div>
              </label>
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 p-3 text-[10px] leading-5 text-slate-600">
              This brand has no assigned products, so no reassignment is required.
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="h-10 rounded-xl border border-slate-200 px-4 text-[11px] font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={deleting}
              aria-busy={deleting}
              className="flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-4 text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              {deleting ? "Deleting…" : "Delete Brand"}
            </button>
          </div>
        </Modal>
      )}

      {moveProduct && (
        <Modal
          title="Move Product"
          subtitle={moveProduct.name + " stays intact; only its Supabase brand assignment changes."}
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
                <option value="">Choose brand</option>
                {brands
                  .filter((brand) => brand.id !== selected?.id)
                  .map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                <option value="unbranded">Unbranded</option>
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
        </Modal>
      )}
    </div>
  );
}
