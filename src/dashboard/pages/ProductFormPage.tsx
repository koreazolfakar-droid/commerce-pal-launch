import { useLanguage } from "@/dashboard/i18n";
import { useDashboardUnsavedChanges } from "@/dashboard/hooks/useDashboardUnsavedChanges";
import { Archive, Check, Copy, Loader2, Save, Trash2, UploadCloud } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ProductCreatePreview from "@/dashboard/components/products/ProductCreatePreview";
import { toast } from "sonner";
import { useLocation } from "wouter";

import AiAssistPanel from "@/dashboard/components/ai/AiAssistPanel";
import DashboardConfirmDialog from "@/dashboard/components/DashboardConfirmDialog";
import ProductMediaManager from "@/dashboard/components/products/ProductMediaManager";
import ProductVariantManager from "@/dashboard/components/products/ProductVariantManager";
import ProductSpecificationEditor, {
  extractSpecificationAiPatch,
} from "@/dashboard/components/products/ProductSpecificationEditor";
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
  setDashboardProductsStatus,
  type DashboardProductVariant,
} from "@/dashboard/data/productManagement";
import { validateProductDraft } from "@/dashboard/lib/validation";
import {
  aiSpecificationFieldKey,
  normalizeProductSpecifications,
  specificationKeys,
  validateSpecificationValue,
  type ProductSpecificationValues,
} from "@/lib/productSpecifications";

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
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const [existing, setExisting] = useState<DashboardProduct | null>(null);
  const [brands, setBrands] = useState<Awaited<ReturnType<typeof listDashboardBrands>>>([]);
  const [categories, setCategories] = useState<Awaited<ReturnType<typeof listDashboardCategories>>>(
    [],
  );
  const [collections, setCollections] = useState<
    Awaited<ReturnType<typeof listDashboardCollections>>
  >([]);
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [brandSearch, setBrandSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [collectionSearch, setCollectionSearch] = useState("");
  const [persistedCollectionIds, setPersistedCollectionIds] = useState<string[]>([]);
  const [variantCount, setVariantCount] = useState(0);
  const [variantRevision, setVariantRevision] = useState(0);
  const [role, setRole] = useState<"admin" | "editor" | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<"duplicate" | "archive" | "delete" | null>(
    null,
  );
  const [confirmAction, setConfirmAction] = useState<"archive" | "delete" | null>(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<ProductDraft>(EMPTY);
  const [stockBaseline, setStockBaseline] = useState(0);
  const [specifications, setSpecifications] = useState<ProductSpecificationValues>({});
  const [aiSpecificationKeys, setAiSpecificationKeys] = useState<Set<string>>(new Set());

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
      .then(
        ([
          product,
          brandRows,
          categoryRows,
          collectionRows,
          productCollectionIds,
          dashboardRole,
        ]) => {
          if (cancelled) return;
          setExisting(product);
          setStockBaseline(product?.stock ?? 0);
          setBrands(brandRows);
          setCategories(categoryRows);
          setCollections(collectionRows);
          setCollectionIds(productCollectionIds);
          setPersistedCollectionIds(productCollectionIds);
          setRole(dashboardRole);
          setVariantCount(product?.variantCount ?? 0);
          setSaved(false);
          setSpecifications(product?.specifications ?? {});
          setAiSpecificationKeys(new Set());
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
        },
      )
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

  const visibleBrands = useMemo(
    () =>
      brands.filter(
        (brand) =>
          brand.id === form.brandId ||
          brand.name.toLocaleLowerCase().includes(brandSearch.trim().toLocaleLowerCase()),
      ),
    [brands, brandSearch, form.brandId],
  );
  const visibleCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.id === form.categoryId ||
          category.name.toLocaleLowerCase().includes(categorySearch.trim().toLocaleLowerCase()),
      ),
    [categories, categorySearch, form.categoryId],
  );
  const visibleCollections = useMemo(
    () =>
      collections.filter(
        (collection) =>
          collectionIds.includes(collection.id) ||
          collection.title.toLocaleLowerCase().includes(collectionSearch.trim().toLocaleLowerCase()),
      ),
    [collections, collectionIds, collectionSearch],
  );

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === form.categoryId) ?? null,
    [categories, form.categoryId],
  );
  const specificationTemplate = useMemo(
    () => selectedCategory?.specTemplate ?? { sections: [] },
    [selectedCategory],
  );
  const allowedSpecificationKeys = useMemo(
    () => new Set(specificationKeys(specificationTemplate)),
    [specificationTemplate],
  );

  const changeCategory = (categoryId: string) => {
    setSaved(false);
    setForm((current) => ({ ...current, categoryId }));
    const nextCategory = categories.find((category) => category.id === categoryId);
    const nextTemplate = nextCategory?.specTemplate ?? { sections: [] };
    setSpecifications((current) => normalizeProductSpecifications(current, nextTemplate));
    const nextKeys = new Set(specificationKeys(nextTemplate));
    setAiSpecificationKeys((current) => new Set([...current].filter((key) => nextKeys.has(key))));
  };

  const changeSpecification = (key: string, value: string) => {
    if (!allowedSpecificationKeys.has(key)) return;
    setSaved(false);
    setSpecifications((current) => ({ ...current, [key]: value }));
    setAiSpecificationKeys((current) => {
      if (!current.has(key)) return current;
      const next = new Set(current);
      next.delete(key);
      return next;
    });
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

      const specPatch = extractSpecificationAiPatch(values);
      const effectiveTemplate = categoryMatch?.specTemplate ?? specificationTemplate;
      const normalizedSpecPatch = normalizeProductSpecifications(specPatch, effectiveTemplate);
      const effectiveKeys = new Set(specificationKeys(effectiveTemplate));

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
      setSpecifications((current) => ({
        ...normalizeProductSpecifications(current, effectiveTemplate),
        ...normalizedSpecPatch,
      }));
      setAiSpecificationKeys((current) => {
        const next = new Set([...current].filter((key) => effectiveKeys.has(key)));
        Object.keys(normalizedSpecPatch).forEach((key) => next.add(key));
        return next;
      });

      if (brandName && !brandMatch) {
        toast.info(`AI suggested brand "${brandName}". Create or select that brand before saving.`);
      }
      if (categoryName && !categoryMatch) {
        toast.info(
          `AI suggested category "${categoryName}". Create or select that category before saving.`,
        );
      }
    },
    [brands, categories, specificationTemplate, variantCount],
  );

  const variantLocked = variantCount > 1;
  const dirty = existing
    ? form.title.trim() !== existing.name ||
      form.description.trim() !== existing.description ||
      form.brandId !== (existing.brandId ?? "") ||
      form.categoryId !== (existing.categoryId ?? "") ||
      form.status !== existing.status ||
      form.imageUrl.trim() !== existing.image ||
      form.seoTitle.trim() !== existing.seoTitle ||
      form.seoDescription.trim() !== existing.seoDescription ||
      (!variantLocked &&
        (Number(form.price) !== existing.price ||
          (form.compareAt.trim() ? Number(form.compareAt) : null) !== existing.compareAt ||
          form.sku.trim() !== existing.sku ||
          form.barcode.trim() !== existing.barcode ||
          Number(form.stock) !== stockBaseline)) ||
      JSON.stringify(specifications) !== JSON.stringify(existing.specifications) ||
      JSON.stringify([...collectionIds].sort()) !==
        JSON.stringify([...persistedCollectionIds].sort())
    : JSON.stringify(form) !== JSON.stringify(EMPTY) ||
      Object.keys(specifications).length > 0 ||
      collectionIds.length > 0;
  const markDraftSaved = useDashboardUnsavedChanges(!loading && dirty);

  const handleSingleVariantChange = useCallback((variant: DashboardProductVariant | null) => {
    if (!variant) return;
    setStockBaseline(variant.stock);
    setExisting((current) =>
      current
        ? {
            ...current,
            price: variant.price,
            compareAt: variant.compareAt,
            sku: variant.sku,
            barcode: variant.barcode,
            stock: variant.stock,
          }
        : current,
    );
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

  const saveLockRef = useRef(false);
  const submitProduct = (statusOverride?: ProductStatus) => {
    if (saveLockRef.current) return;
    saveLockRef.current = true;
    void handleSave(statusOverride).finally(() => {
      saveLockRef.current = false;
    });
  };
  const handleSave = async (statusOverride?: ProductStatus) => {
    const status = statusOverride ?? form.status;
    const validation = validateProductDraft({
      title: form.title,
      price: form.price,
      compareAt: form.compareAt,
      sku: form.sku,
      stock: form.stock,
    });
    if (!validation.valid) {
      toast.error(Object.values(validation.errors)[0]);
      return;
    }

    for (const section of specificationTemplate.sections) {
      for (const field of section.fields) {
        const issue = validateSpecificationValue(field, specifications[field.key] ?? "");
        if (issue) {
          toast.error(issue);
          return;
        }
      }
    }

    const cleanSpecifications = normalizeProductSpecifications(
      specifications,
      specificationTemplate,
    );
    const nextPrice = Number(form.price) || 0;
    const nextCompareAt = form.compareAt.trim() ? Number(form.compareAt) : null;
    const nextStock = Number(form.stock) || 0;
    const nextCollectionIds = [...new Set(collectionIds)].sort();
    const previousCollectionIds = [...new Set(persistedCollectionIds)].sort();
    const collectionsChanged =
      nextCollectionIds.length !== previousCollectionIds.length ||
      nextCollectionIds.some(
        (collectionId, index) => collectionId !== previousCollectionIds[index],
      );
    const variantFieldsChanged = Boolean(
      id &&
      existing &&
      variantCount <= 1 &&
      (existing.price !== nextPrice ||
        existing.compareAt !== nextCompareAt ||
        existing.sku !== form.sku.trim() ||
        existing.barcode !== form.barcode.trim() ||
        existing.stock !== nextStock),
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
        status,
        price: nextPrice,
        compareAt: nextCompareAt,
        sku: form.sku,
        barcode: form.barcode,
        stock: nextStock,
        expectedStock: id && !variantLocked && nextStock !== stockBaseline ? stockBaseline : null,
        imageUrl: form.imageUrl,
        seoTitle: form.seoTitle,
        seoDescription: form.seoDescription,
        specifications: cleanSpecifications,
        collectionIds: nextCollectionIds,
      });
      setPersistedCollectionIds(nextCollectionIds);
      if (!savedProduct.variantManagedSeparately) {
        setStockBaseline(savedProduct.stock);
        setForm((current) => ({
          ...current,
          stock: current.stock === form.stock ? String(savedProduct.stock) : current.stock,
        }));
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
                status,
                price: savedProduct.variantManagedSeparately ? current.price : nextPrice,
                compareAt: savedProduct.variantManagedSeparately
                  ? current.compareAt
                  : nextCompareAt,
                stock: savedProduct.variantManagedSeparately ? current.stock : savedProduct.stock,
                sku: savedProduct.variantManagedSeparately ? current.sku : form.sku.trim(),
                barcode: savedProduct.variantManagedSeparately
                  ? current.barcode
                  : form.barcode.trim(),
                image: form.imageUrl.trim(),
                seoTitle: form.seoTitle.trim(),
                seoDescription: form.seoDescription.trim(),
                specifications: cleanSpecifications,
              }
            : current,
        );
      }

      setSpecifications(cleanSpecifications);
      setAiSpecificationKeys(new Set());
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
      if (!id) {
        markDraftSaved();
        navigate(`/dashboard/products/${savedProduct.id}`);
      }
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
      setExisting((current) => (current ? { ...current, status: "Archived" } : current));
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
      return (
        collections.find((collection) => collection.id === collectionIds[0])?.title ??
        "1 collection"
      );
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
        {t("Product not found.")}
      </div>
    );
  }

  return (
    <div className={id ? undefined : "pb-24 lg:pb-0"}>
      <button
        onClick={() => navigate("/dashboard/products")}
        className="mb-5 text-[11px] font-bold text-slate-500 hover:text-indigo-600"
      >
        {t("← Back to products")}
      </button>

      <div className="mb-7 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-indigo-500">
            {t("Catalog /")} {id ? t("Edit product") : t("New product")}
          </div>
          <h1 className="text-[30px] font-bold tracking-[-.05em] text-[#14203a]">
            {id ? form.title || t("Edit product") : t("Add a product")}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
            {t(
              "Product details, multi-collection membership, gallery and variants are connected to the live Supabase catalog.",
            )}
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
                {pendingAction === "duplicate" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                {pendingAction === "duplicate" ? t("Duplicating...") : t("Duplicate")}
              </button>
              <button
                onClick={() => setConfirmAction("archive")}
                disabled={saving || pendingAction !== null || form.status === "Archived"}
                className="flex h-10 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 text-[10px] font-bold text-amber-700 disabled:opacity-40"
              >
                <Archive className="size-3.5" /> {t("Archive")}
              </button>
              {role === "admin" ? (
                <button
                  onClick={() => setConfirmAction("delete")}
                  disabled={saving || pendingAction !== null}
                  className="flex h-10 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 text-[10px] font-bold text-rose-700 disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" /> {t("Delete")}
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
              ...Object.fromEntries(
                specificationTemplate.sections.flatMap((section) =>
                  section.fields.map((field) => [
                    aiSpecificationFieldKey(field.key),
                    specifications[field.key] ?? "",
                  ]),
                ),
              ),
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
              ...specificationTemplate.sections.flatMap((section) =>
                section.fields.map((field) => ({
                  key: aiSpecificationFieldKey(field.key),
                  label: field.label,
                  description: `Exact factual specification. ${field.unit ? `Expected unit: ${field.unit}. ` : ""}Do not infer uncertain values.`,
                  review: true,
                  maxLength: 500,
                })),
              ),
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
              specKeys: specificationKeys(specificationTemplate),
            }}
            onApply={applyAiPatch}
          />
          {!id ? (
            <>
              <span className="inline-flex h-10 items-center rounded-xl border border-amber-200 bg-amber-50 px-3 text-[11px] font-bold text-amber-700">
                {t("Draft")}
              </span>
              <button
                onClick={() => submitProduct("Draft")}
                disabled={saving || pendingAction !== null}
                className="hidden h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-700 disabled:opacity-60 lg:flex"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {t("Save as Draft")}
              </button>
              <button
                onClick={() => submitProduct("Active")}
                disabled={saving || pendingAction !== null}
                className="hidden h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white disabled:opacity-60 lg:flex"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                {t("Publish Product")}
              </button>
              <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-slate-200 bg-white/95 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
                <button
                  onClick={() => submitProduct("Draft")}
                  disabled={saving || pendingAction !== null}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 text-[12px] font-bold text-slate-700 disabled:opacity-60"
                >
                  {t("Save as Draft")}
                </button>
                <button
                  onClick={() => submitProduct("Active")}
                  disabled={saving || pendingAction !== null}
                  aria-busy={saving}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#5968ea] text-[12px] font-bold text-white disabled:opacity-60"
                >
                  {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                  {t("Publish Product")}
                </button>
              </div>
            </>
          ) : null}
          <button
            onClick={() => submitProduct()}
            disabled={saving || pendingAction !== null}
            hidden={!id}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white shadow-[0_8px_18px_rgba(89,104,234,.22)] disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : saved ? (
              <Check className="size-4" />
            ) : (
              <Save className="size-4" />
            )}
            {saved ? t("Saved") : t("Save product")}
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <div className="space-y-4">
          <Panel title={t("Product information")} subtitle={t("Live catalog fields")}>
            <div className="space-y-4 p-5">
              <Field
                label={t("Title")}
                value={form.title}
                onChange={(value) => update("title", value)}
              />
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
                  {t("Description")}
                </span>
                <textarea
                  value={form.description}
                  onChange={(event) => update("description", event.target.value)}
                  rows={6}
                  className="w-full resize-none rounded-xl border border-slate-200 p-3 text-[12px] outline-none focus:border-indigo-400"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <input
                    type="search"
                    value={brandSearch}
                    onChange={(event) => setBrandSearch(event.target.value)}
                    placeholder={t("Search brands...")}
                    aria-label={t("Search brands...")}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-indigo-400"
                  />
                  <SelectField
                    label={t("Brand")}
                    value={form.brandId}
                    onChange={(value) => update("brandId", value)}
                  >
                  <option value="">{t("No brand")}</option>
                  {visibleBrands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                      {brand.active ? "" : t(" (Hidden)")}
                    </option>
                  ))}
                  </SelectField>
                </div>
                <div className="space-y-1.5">
                  <input
                    type="search"
                    value={categorySearch}
                    onChange={(event) => setCategorySearch(event.target.value)}
                    placeholder={t("Search categories...")}
                    aria-label={t("Search categories...")}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-indigo-400"
                  />
                  <SelectField
                  label={t("Category")}
                  value={form.categoryId}
                  onChange={changeCategory}
                >
                  <option value="">{t("No category")}</option>
                  {visibleCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                      {category.active ? "" : t(" (Hidden)")}
                    </option>
                  ))}
                  </SelectField>
                </div>
                <SelectField
                  label={t("Status")}
                  value={form.status}
                  onChange={(value) => update("status", value as ProductStatus)}
                >
                  <option value="Active">{t("Active")}</option>
                  <option value="Draft">{t("Draft")}</option>
                  <option value="Archived">{t("Archived")}</option>
                </SelectField>
              </div>
            </div>
          </Panel>

          <Panel
            title={t("Specifications")}
            subtitle={
              selectedCategory ? `${selectedCategory.name} template` : t("Select a category")
            }
          >
            <div className="p-5">
              <ProductSpecificationEditor
                template={specificationTemplate}
                values={specifications}
                query={form.title}
                aiContext={{
                  market: "Lebanon",
                  store: "Space Call",
                  entityId: id ?? existing?.id ?? "",
                  officialDomains: [
                    brands.find((brand) => brand.id === form.brandId)?.website ?? "",
                  ].filter(Boolean),
                }}
                aiGeneratedKeys={aiSpecificationKeys}
                onChange={changeSpecification}
                onAiApply={applyAiPatch}
              />
            </div>
          </Panel>

          <Panel title={t("Collections")} subtitle={collectionSummary}>
            <div className="p-5">
              <div className="mb-3 text-[10px] leading-4 text-slate-400">
                {t(
                  "A product can now belong to multiple collections. Saving synchronizes the complete membership list.",
                )}
              </div>
              <input
                type="search"
                value={collectionSearch}
                onChange={(event) => setCollectionSearch(event.target.value)}
                placeholder={t("Search collections...")}
                aria-label={t("Search collections...")}
                className="mb-3 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-indigo-400"
              />
              <div className="grid max-h-72 gap-2 overflow-y-auto rounded-xl border border-slate-100 p-2 sm:grid-cols-2">
                {visibleCollections.map((collection) => {
                  const checked = collectionIds.includes(collection.id);
                  return (
                    <label
                      key={collection.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-[11px] font-semibold transition ${checked ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-slate-100 text-slate-600 hover:bg-slate-50"}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSaved(false);
                          setCollectionIds((current) =>
                            checked
                              ? current.filter((id) => id !== collection.id)
                              : [...current, collection.id],
                          );
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate">{collection.title}</span>
                      {!collection.active ? (
                        <span className="text-[9px] text-slate-400">{t("Hidden")}</span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </div>
          </Panel>

          <Panel
            title={t("Pricing & inventory")}
            subtitle={variantLocked ? t("Managed per variant") : t("Default / single variant")}
          >
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field
                label={t("Price")}
                type="number"
                value={form.price}
                onChange={(value) => update("price", value)}
                disabled={variantLocked}
              />
              <Field
                label={t("Compare-at price")}
                type="number"
                value={form.compareAt}
                onChange={(value) => update("compareAt", value)}
                disabled={variantLocked}
              />
              <Field
                label={t("SKU")}
                value={form.sku}
                onChange={(value) => update("sku", value)}
                disabled={variantLocked}
              />
              <Field
                label={t("Barcode")}
                value={form.barcode}
                onChange={(value) => update("barcode", value)}
                disabled={variantLocked}
              />
              <Field
                label={t("Stock")}
                type="number"
                value={form.stock}
                onChange={(value) => update("stock", value)}
                disabled={variantLocked}
              />
            </div>
            {variantLocked ? (
              <div className="mx-5 mb-5 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-[10px] leading-5 text-indigo-700">
                {t("This product has")} {variantCount}{" "}
                {t(
                  "variants. Price, SKU, barcode and stock are controlled from Variant Manager below so one product-level save cannot overwrite them.",
                )}
              </div>
            ) : null}
          </Panel>

          <Panel
            title={t("Variant Manager")}
            subtitle={t("Color · storage · identifiers · price · stock · image")}
          >
            {id ? (
              <ProductVariantManager
                key={variantRevision}
                productId={id}
                onCountChange={setVariantCount}
                onSingleVariantChange={handleSingleVariantChange}
              />
            ) : (
              <div className="p-8 text-center text-[11px] text-slate-400">
                {t("Save the product first, then add or edit variants.")}
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          {!id ? (
            <ProductCreatePreview
              title={form.title}
              brand={brands.find((brand) => brand.id === form.brandId)?.name ?? ""}
              price={form.price}
              compareAt={form.compareAt}
              stock={form.stock}
              imageUrl={form.imageUrl}
            />
          ) : null}
          <Panel
            title={t("Media")}
            subtitle={id ? t("Live Supabase product gallery") : t("Save first to upload")}
          >
            {id ? (
              <ProductMediaManager
                productId={id}
                productTitle={form.title}
                onPrimaryChange={(url) => {
                  // Media Manager already persists primary-image changes independently.
                  // Keep the baseline in sync so the unsaved-changes guard does not
                  // mistakenly mark the product dirty after a successful media save.
                  setForm((current) =>
                    current.imageUrl === url ? current : { ...current, imageUrl: url },
                  );
                  setExisting((current) =>
                    current && current.image !== url ? { ...current, image: url } : current,
                  );
                }}
              />
            ) : (
              <div className="m-5 grid min-h-44 place-items-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-center">
                <div>
                  <UploadCloud className="mx-auto size-5 text-indigo-400" />
                  <div className="mt-2 text-[11px] font-bold text-slate-600">
                    {t("Save the product first")}
                  </div>
                  <div className="mt-1 text-[9px] text-slate-400">
                    {t("Then manage the real product gallery.")}
                  </div>
                </div>
              </div>
            )}
          </Panel>

          <Panel title={t("SEO")} subtitle={t("Product search metadata")}>
            <div className="space-y-4 p-5">
              <Field
                label={t("SEO title")}
                value={form.seoTitle}
                onChange={(value) => update("seoTitle", value)}
              />
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
                  {t("SEO description")}
                </span>
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
            <Panel title={t("Product record")}>
              <div className="space-y-2 p-5 text-[10px] text-slate-500">
                <div className="flex justify-between gap-4">
                  <span>{t("Handle")}</span>
                  <span className="truncate font-mono text-slate-700">{existing.handle}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>{t("Variants")}</span>
                  <span className="font-bold text-slate-700">{variantCount}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>{t("Collections")}</span>
                  <span className="font-bold text-slate-700">{collectionIds.length}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>{t("Current stock")}</span>
                  <span className="font-bold text-slate-700">{existing.stock}</span>
                </div>
              </div>
            </Panel>
          ) : null}
        </div>
      </div>

      <DashboardConfirmDialog
        open={confirmAction === "archive"}
        title={t("Archive this product?")}
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
        title={t("Permanently delete this product?")}
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

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(33,47,82,.04)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="text-[12px] font-bold text-[#14203a]">{t(title)}</div>
        {subtitle ? <div className="mt-0.5 text-[10px] text-slate-400">{t(subtitle)}</div> : null}
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
  const { t } = useLanguage();
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold text-slate-600">{t(label)}</span>
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
  const { t } = useLanguage();
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold text-slate-600">{t(label)}</span>
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
