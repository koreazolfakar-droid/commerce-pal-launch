import {
  Archive,
  Check,
  Copy,
  Loader2,
  Save,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

import AiAssistPanel from "@/dashboard/components/ai/AiAssistPanel";
import DashboardConfirmDialog from "@/dashboard/components/DashboardConfirmDialog";
import ProductMediaManager from "@/dashboard/components/products/ProductMediaManager";
import ProductVariantManager from "@/dashboard/components/products/ProductVariantManager";
import {
  getDashboardProduct,
  getDashboardRole,
  listDashboardBrands,
  listDashboardCategories,
  listDashboardCollections,
  saveDashboardProduct,
  type DashboardProduct,
} from "@/dashboard/data/catalog";
import {
  deleteDashboardProductSafe,
  duplicateDashboardProduct,
  loadDashboardProductCollectionIds,
  setDashboardProductCollections,
  setDashboardProductsStatus,
  type DashboardProductVariant,
} from "@/dashboard/data/productManagement";
import { validateProductDraft } from "@/dashboard/lib/validation";

type ProductStatus = "Active" | "Draft" | "Archived";

type ProductDraft = {
  title: string;
  description: string;
  brandId: string;
  categoryId: string;
  status: ProductStatus;
  price: string;
  compareAt: string;
  sku: string;
  barcode: string;
  stock: string;
  imageUrl: string;
  seoTitle: string;
  seoDescription: string;
};

const EMPTY: ProductDraft = {
  title: "",
  description: "",
  brandId: "",
  categoryId: "",
  status: "Draft",
  price: "",
  compareAt: "",
  sku: "",
  barcode: "",
  stock: "0",
  imageUrl: "",
  seoTitle: "",
  seoDescription: "",
};

export default function ProductFormPage({ id }: { id?: string }) {
  const [, navigate] = useLocation();
  const [existing, setExisting] = useState<DashboardProduct | null>(null);
  const [brands, setBrands] = useState<Awaited<ReturnType<typeof listDashboardBrands>>>([]);
  const [categories, setCategories] = useState<Awaited<ReturnType<typeof listDashboardCategories>>>([]);
  const [collections, setCollections] = useState<Awaited<ReturnType<typeof listDashboardCollections>>>([]);
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [persistedCollectionIds, setPersistedCollectionIds] = useState<string[]>([]);
  const [variantCount, setVariantCount] = useState(0);
  const [variantRevision, setVariantRevision] = useState(0);
  const [role, setRole] = useState<"admin" | "editor" | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<"duplicate" | "archive" | "delete" | null>(null);
  const [confirmAction, setConfirmAction] = useState<"archive" | "delete" | null>(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<ProductDraft>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      id ? getDashboardProduct(id) : Promise.resolve(null),
      listDashboardBrands(),
      listDashboardCategories(),
      listDashboardCollections(),
      id ? loadDashboardProductCollectionIds(id) : Promise.resolve([]),
      getDashboardRole(),
    ])
      .then(([product, brandRows, categoryRows, collectionRows, productCollectionIds, dashboardRole]) => {
        if (cancelled) return;
        setExisting(product);
        setBrands(brandRows);
        setCategories(categoryRows);
        setCollections(collectionRows);
        setCollectionIds(productCollectionIds);
        setPersistedCollectionIds(productCollectionIds);
        setRole(dashboardRole);
        setVariantCount(product?.variantCount ?? 0);
        setSaved(false);
        if (product) {
          setForm({
            title: product.name,
            description: product.description,
            brandId: product.brandId ?? "",
            categoryId: product.categoryId ?? "",
            status: product.status,
            price: String(product.price),
            compareAt: product.compareAt == null ? "" : String(product.compareAt),
            sku: product.sku,
            barcode: product.barcode,
            stock: String(product.stock),
            imageUrl: product.image,
            seoTitle: product.seoTitle,
            seoDescription: product.seoDescription,
          });
        } else {
          setForm(EMPTY);
        }
      })
      .catch((cause) => {
        toast.error(cause instanceof Error ? cause.message : "Unable to load product.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const update = (key: keyof ProductDraft, value: string) => {
    setSaved(false);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const applyAiPatch = useCallback(
    (values: Record<string, string>) => {
      const brandName = values.brandName?.trim();
      const categoryName = values.categoryName?.trim();
      const normalizedBrand = brandName?.toLocaleLowerCase();
      const normalizedCategory = categoryName?.toLocaleLowerCase();
      const brandMatch = normalizedBrand
        ? brands.find((brand) => brand.name.trim().toLocaleLowerCase() === normalizedBrand)
        : undefined;
      const categoryMatch = normalizedCategory
        ? categories.find(
            (category) => category.name.trim().toLocaleLowerCase() === normalizedCategory,
          )
        : undefined;

      setSaved(false);
      setForm((current) => ({
        ...current,
        ...(values.title !== undefined ? { title: values.title } : {}),
        ...(values.description !== undefined ? { description: values.description } : {}),
        ...(values.seoTitle !== undefined ? { seoTitle: values.seoTitle } : {}),
        ...(values.seoDescription !== undefined ? { seoDescription: values.seoDescription } : {}),
        ...(values.barcode !== undefined && variantCount <= 1 ? { barcode: values.barcode } : {}),
        ...(brandMatch ? { brandId: brandMatch.id } : {}),
        ...(categoryMatch ? { categoryId: categoryMatch.id } : {}),
      }));

      if (brandName && !brandMatch) {
        toast.info(`AI suggested brand "${brandName}". Create or select that brand before saving.`);
      }
      if (categoryName && !categoryMatch) {
        toast.info(
          `AI suggested category "${categoryName}". Create or select that category before saving.`,
        );
      }
    },
    [brands, categories, variantCount],
  );

  const variantLocked = variantCount > 1;

  const handleSingleVariantChange = useCallback((variant: DashboardProductVariant | null) => {
    if (!variant) return;
    setForm((current) => {
      const next = {
        price: String(variant.price),
        compareAt: variant.compareAt == null ? "" : String(variant.compareAt),
        sku: variant.sku,
        barcode: variant.barcode,
        stock: String(variant.stock),
      };

      if (
        current.price === next.price &&
        current.compareAt === next.compareAt &&
        current.sku === next.sku &&
        current.barcode === next.barcode &&
        current.stock === next.stock
      ) {
        return current;
      }

      return { ...current, ...next };
    });
  }, []);

  const handleSave = async () => {
    const validation = validateProductDraft({
      title: form.title,
      price: form.price,
      sku: form.sku,
      stock: form.stock,
    });
    if (!validation.valid) {
      toast.error(Object.values(validation.errors)[0]);
      return;
    }

    const nextPrice = Number(form.price) || 0;
    const nextCompareAt = form.compareAt.trim() ? Number(form.compareAt) : null;
    const nextStock = Number(form.stock) || 0;
    const nextCollectionIds = [...new Set(collectionIds)].sort();
    const previousCollectionIds = [...new Set(persistedCollectionIds)].sort();
    const collectionsChanged =
      nextCollectionIds.length !== previousCollectionIds.length ||
      nextCollectionIds.some((collectionId, index) => collectionId !== previousCollectionIds[index]);
    const variantFieldsChanged = Boolean(
      id &&
        existing &&
        variantCount <= 1 &&
        (
          existing.price !== nextPrice ||
          existing.compareAt !== nextCompareAt ||
          existing.sku !== form.sku.trim() ||
          existing.barcode !== form.barcode.trim() ||
          existing.stock !== nextStock
        ),
    );
    const shouldRefreshVariantManager = Boolean(
      id && variantCount <= 1 && (variantCount === 0 || variantFieldsChanged),
    );

    setSaving(true);
    try {
      const savedProduct = await saveDashboardProduct({
        id,
        title: form.title,
        description: form.description,
        brandId: form.brandId || null,
        categoryId: form.categoryId || null,
        status: form.status,
        price: nextPrice,
        compareAt: nextCompareAt,
        sku: form.sku,
        barcode: form.barcode,
        stock: nextStock,
        imageUrl: form.imageUrl,
        seoTitle: form.seoTitle,
        seoDescription: form.seoDescription,
        collectionId: null,
      });
      if (collectionsChanged) {
        await setDashboardProductCollections(savedProduct.id, nextCollectionIds);
        setPersistedCollectionIds(nextCollectionIds);
      }

      if (id) {
        const selectedBrand = brands.find((brand) => brand.id === form.brandId);
        const selectedCategory = categories.find((category) => category.id === form.categoryId);
        setExisting((current) =>
          current
            ? {
                ...current,
                name: form.title.trim(),
                description: form.description.trim(),
                brandId: form.brandId || null,
                brand: selectedBrand?.name ?? "",
                categoryId: form.categoryId || null,
                category: selectedCategory?.name ?? "",
                status: form.status,
                price: savedProduct.variantManagedSeparately ? current.price : nextPrice,
                compareAt: savedProduct.variantManagedSeparately ? current.compareAt : nextCompareAt,
                stock: savedProduct.variantManagedSeparately ? current.stock : nextStock,
                sku: savedProduct.variantManagedSeparately ? current.sku : form.sku.trim(),
                barcode: savedProduct.variantManagedSeparately ? current.barcode : form.barcode.trim(),
                image: form.imageUrl.trim(),
                seoTitle: form.seoTitle.trim(),
                seoDescription: form.seoDescription.trim(),
              }
            : current,
        );
      }

      setSaved(true);
      if (shouldRefreshVariantManager) {
        setVariantRevision((value) => value + 1);
      }
      toast.success(
        savedProduct.variantManagedSeparately
          ? collectionsChanged
            ? "Product details and collections saved. Variant pricing and inventory stayed independent."
            : "Product details saved. Variant pricing and inventory stayed independent."
          : collectionsChanged
            ? "Product and collections saved to Supabase."
            : "Product saved to Supabase.",
      );
      if (!id) navigate(`/dashboard/products/${savedProduct.id}`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Product save failed.");
    } finally {
      setSaving(false);
    }
  };

  const duplicate = async () => {
    if (!id || pendingAction || saving) return;
    setPendingAction("duplicate");
    try {
      const newId = await duplicateDashboardProduct(id);
      toast.success("Draft copy created with zero stock and blank SKU/barcode.");
      navigate(`/dashboard/products/${newId}`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Product duplicate failed.");
    } finally {
      setPendingAction(null);
    }
  };

  const archive = async () => {
    if (!id || pendingAction || saving) return;
    setPendingAction("archive");
    try {
      await setDashboardProductsStatus([id], "Archived");
      setForm((current) => ({ ...current, status: "Archived" }));
      setExisting((current) => current ? { ...current, status: "Archived" } : current);
      setSaved(true);
      setConfirmAction(null);
      toast.success("Product archived safely.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Product archive failed.");
    } finally {
      setPendingAction(null);
    }
  };

  const remove = async () => {
    if (!id || pendingAction || saving || role !== "admin") return;
    setPendingAction("delete");
    try {
      await deleteDashboardProductSafe(id);
      setConfirmAction(null);
      toast.success("Product permanently deleted.");
      navigate("/dashboard/products");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Product delete failed.");
    } finally {
      setPendingAction(null);
    }
  };

  const collectionSummary = useMemo(() => {
    if (!collectionIds.length) return "No collections";
    if (collectionIds.length === 1) {
      return collections.find((collection) => collection.id === collectionIds[0])?.title ?? "1 collection";
    }
    return `${collectionIds.length} collections selected`;
  }, [collectionIds, collections]);

  if (loading) {
    return (
      <div className="grid min-h-[420px] place-items-center">
        <Loader2 className="size-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (id && !existing) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-sm font-semibold text-rose-700">
        Product not found.
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate("/dashboard/products")}
        className="mb-5 text-[11px] font-bold text-slate-500 hover:text-indigo-600"
      >
        ← Back to products
      </button>

      <div className="mb-7 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-indigo-500">
            Catalog / {id ? "Edit product" : "New product"}
          </div>
          <h1 className="text-[30px] font-bold tracking-[-.05em] text-[#14203a]">
            {id ? form.title || "Edit product" : "Add a product"}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
            Product details, multi-collection membership, gallery and variants are connected to the live Supabase catalog.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {id ? (
            <>
              <button
                onClick={() => void duplicate()}
                disabled={saving || pendingAction !== null}
                className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[10px] font-bold text-slate-600 disabled:opacity-50"
              >
                {pendingAction === "duplicate" ? <Loader2 className="size-3.5 animate-spin" /> : <Copy className="size-3.5" />}
                {pendingAction === "duplicate" ? "Duplicating..." : "Duplicate"}
              </button>
              <button
                onClick={() => setConfirmAction("archive")}
                disabled={saving || pendingAction !== null || form.status === "Archived"}
                className="flex h-10 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 text-[10px] font-bold text-amber-700 disabled:opacity-40"
              >
                <Archive className="size-3.5" /> Archive
              </button>
              {role === "admin" ? (
                <button
                  onClick={() => setConfirmAction("delete")}
                  disabled={saving || pendingAction !== null}
                  className="flex h-10 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 text-[10px] font-bold text-rose-700 disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" /> Delete
                </button>
              ) : null}
            </>
          ) : null}
          <AiAssistPanel
            entity="product"
            query={form.title}
            currentData={{
              title: form.title,
              description: form.description,
              brandName: brands.find((brand) => brand.id === form.brandId)?.name ?? "",
              categoryName:
                categories.find((category) => category.id === form.categoryId)?.name ?? "",
              barcode: form.barcode,
              seoTitle: form.seoTitle,
              seoDescription: form.seoDescription,
            }}
            fields={[
              {
                key: "title",
                label: "Product title",
                description: "Exact clean product name including model when supported.",
                maxLength: 180,
              },
              {
                key: "description",
                label: "Description",
                description:
                  "Original factual ecommerce description based on verified product information.",
                maxLength: 5000,
              },
              {
                key: "brandName",
                label: "Brand",
                description:
                  "Exact official brand name. It must map to an existing dashboard brand.",
                review: true,
                maxLength: 120,
              },
              {
                key: "categoryName",
                label: "Category",
                description: "Best matching existing Space Call category.",
                review: true,
                maxLength: 120,
              },
              {
                key: "barcode",
                label: "Barcode / GTIN",
                description: "Only an official exact GTIN/EAN/UPC for this exact product model.",
                review: true,
                maxLength: 80,
              },
              {
                key: "seoTitle",
                label: "SEO title",
                description: "Natural search title for Space Call. Keep product identity accurate.",
                maxLength: 70,
              },
              {
                key: "seoDescription",
                label: "Meta description",
                description: "Useful natural search description without keyword stuffing.",
                maxLength: 180,
              },
            ]}
            context={{
              market: "Lebanon",
              store: "Space Call",
              entityId: id ?? existing?.id ?? "",
              officialDomains: [
                brands.find((brand) => brand.id === form.brandId)?.website ?? "",
              ].filter(Boolean),
              availableBrands: brands.map((brand) => ({
                name: brand.name,
                slug: brand.slug,
                website: brand.website ?? "",
              })),
              availableCategories: categories.map((category) => ({
                name: category.name,
                slug: category.slug,
              })),
            }}
            onApply={applyAiPatch}
          />
          <button
            onClick={() => void handleSave()}
            disabled={saving || pendingAction !== null}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white shadow-[0_8px_18px_rgba(89,104,234,.22)] disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : <Save className="size-4" />}
            {saved ? "Saved" : "Save product"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <div className="space-y-4">
          <Panel title="Product information" subtitle="Live catalog fields">
            <div className="space-y-4 p-5">
              <Field label="Title" value={form.title} onChange={(value) => update("title", value)} />
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Description</span>
                <textarea
                  value={form.description}
                  onChange={(event) => update("description", event.target.value)}
                  rows={6}
                  className="w-full resize-none rounded-xl border border-slate-200 p-3 text-[12px] outline-none focus:border-indigo-400"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField label="Brand" value={form.brandId} onChange={(value) => update("brandId", value)}>
                  <option value="">No brand</option>
                  {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}{brand.active ? "" : " (Hidden)"}</option>)}
                </SelectField>
                <SelectField label="Category" value={form.categoryId} onChange={(value) => update("categoryId", value)}>
                  <option value="">No category</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}{category.active ? "" : " (Hidden)"}</option>)}
                </SelectField>
                <SelectField label="Status" value={form.status} onChange={(value) => update("status", value as ProductStatus)}>
                  <option>Active</option><option>Draft</option><option>Archived</option>
                </SelectField>
              </div>
            </div>
          </Panel>

          <Panel title="Collections" subtitle={collectionSummary}>
            <div className="p-5">
              <div className="mb-3 text-[10px] leading-4 text-slate-400">
                A product can now belong to multiple collections. Saving synchronizes the complete membership list.
              </div>
              <div className="grid max-h-72 gap-2 overflow-y-auto rounded-xl border border-slate-100 p-2 sm:grid-cols-2">
                {collections.map((collection) => {
                  const checked = collectionIds.includes(collection.id);
                  return (
                    <label key={collection.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-[11px] font-semibold transition ${checked ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-slate-100 text-slate-600 hover:bg-slate-50"}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSaved(false);
                          setCollectionIds((current) =>
                            checked ? current.filter((id) => id !== collection.id) : [...current, collection.id],
                          );
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate">{collection.title}</span>
                      {!collection.active ? <span className="text-[9px] text-slate-400">Hidden</span> : null}
                    </label>
                  );
                })}
              </div>
            </div>
          </Panel>

          <Panel title="Pricing & inventory" subtitle={variantLocked ? "Managed per variant" : "Default / single variant"}>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Price" type="number" value={form.price} onChange={(value) => update("price", value)} disabled={variantLocked} />
              <Field label="Compare-at price" type="number" value={form.compareAt} onChange={(value) => update("compareAt", value)} disabled={variantLocked} />
              <Field label="SKU" value={form.sku} onChange={(value) => update("sku", value)} disabled={variantLocked} />
              <Field label="Barcode" value={form.barcode} onChange={(value) => update("barcode", value)} disabled={variantLocked} />
              <Field label="Stock" type="number" value={form.stock} onChange={(value) => update("stock", value)} disabled={variantLocked} />
            </div>
            {variantLocked ? (
              <div className="mx-5 mb-5 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-[10px] leading-5 text-indigo-700">
                This product has {variantCount} variants. Price, SKU, barcode and stock are controlled from Variant Manager below so one product-level save cannot overwrite them.
              </div>
            ) : null}
          </Panel>

          <Panel title="Variant Manager" subtitle="Color · storage · identifiers · price · stock · image">
            {id ? (
              <ProductVariantManager
                key={variantRevision}
                productId={id}
                onCountChange={setVariantCount}
                onSingleVariantChange={handleSingleVariantChange}
              />
            ) : (
              <div className="p-8 text-center text-[11px] text-slate-400">
                Save the product first, then add or edit variants.
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Media" subtitle={id ? "Live Supabase product gallery" : "Save first to upload"}>
            {id ? (
              <ProductMediaManager
                productId={id}
                productTitle={form.title}
                onPrimaryChange={(url) => update("imageUrl", url)}
              />
            ) : (
              <div className="m-5 grid min-h-44 place-items-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-center">
                <div>
                  <UploadCloud className="mx-auto size-5 text-indigo-400" />
                  <div className="mt-2 text-[11px] font-bold text-slate-600">Save the product first</div>
                  <div className="mt-1 text-[9px] text-slate-400">Then manage the real product gallery.</div>
                </div>
              </div>
            )}
          </Panel>

          <Panel title="SEO" subtitle="Product search metadata">
            <div className="space-y-4 p-5">
              <Field label="SEO title" value={form.seoTitle} onChange={(value) => update("seoTitle", value)} />
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">SEO description</span>
                <textarea
                  value={form.seoDescription}
                  onChange={(event) => update("seoDescription", event.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-slate-200 p-3 text-[12px] outline-none focus:border-indigo-400"
                />
              </label>
            </div>
          </Panel>

          {existing ? (
            <Panel title="Product record">
              <div className="space-y-2 p-5 text-[10px] text-slate-500">
                <div className="flex justify-between gap-4"><span>Handle</span><span className="truncate font-mono text-slate-700">{existing.handle}</span></div>
                <div className="flex justify-between gap-4"><span>Variants</span><span className="font-bold text-slate-700">{variantCount}</span></div>
                <div className="flex justify-between gap-4"><span>Collections</span><span className="font-bold text-slate-700">{collectionIds.length}</span></div>
                <div className="flex justify-between gap-4"><span>Current stock</span><span className="font-bold text-slate-700">{existing.stock}</span></div>
              </div>
            </Panel>
          ) : null}
        </div>
      </div>

      <DashboardConfirmDialog
        open={confirmAction === "archive"}
        title="Archive this product?"
        description="The product will be removed from the live storefront but kept in the dashboard, including its variants, media, inventory history and order references."
        confirmLabel="Archive product"
        pendingLabel="Archiving..."
        pending={pendingAction === "archive"}
        onClose={() => {
          if (!pendingAction) setConfirmAction(null);
        }}
        onConfirm={() => void archive()}
      />

      <DashboardConfirmDialog
        open={confirmAction === "delete"}
        title="Permanently delete this product?"
        description="Safe deletion is allowed only when the product has no protected stock, order references or inventory history. Otherwise the server will reject the deletion and the product will remain unchanged."
        confirmLabel="Delete permanently"
        pendingLabel="Deleting..."
        pending={pendingAction === "delete"}
        destructive
        onClose={() => {
          if (!pendingAction) setConfirmAction(null);
        }}
        onConfirm={() => void remove()}
      />
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(33,47,82,.04)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="text-[12px] font-bold text-[#14203a]">{title}</div>
        {subtitle ? <div className="mt-0.5 text-[10px] text-slate-400">{subtitle}</div> : null}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold text-slate-600">{label}</span>
      <input
        value={value}
        type={type}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-indigo-400"
      >
        {children}
      </select>
    </label>
  );
}
