import { FormEvent, useState } from "react";
import {
  AdminApiError,
  type AdminProduct,
  type ProductWriteInput,
  createProduct,
  updateProduct,
} from "./api";

type ProductFilter = "ALL" | "ACTIVE" | "LOW" | "OUT";

type ProductsViewProps = {
  products: AdminProduct[];
  query: string;
  setQuery: (value: string) => void;
  productFilter: ProductFilter;
  setProductFilter: (value: ProductFilter) => void;
  onRefresh: () => Promise<void>;
};

function money(value: number | null) {
  return value === null ? "—" : `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function inventoryTone(value: number | null) {
  if (value === null) return "muted";
  if (value <= 0) return "danger";
  if (value <= 5) return "warning";
  return "success";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ar-LB", { month: "short", day: "numeric" });
}

export function ProductsView({
  products,
  query,
  setQuery,
  productFilter,
  setProductFilter,
  onRefresh,
}: ProductsViewProps) {
  const [editorProduct, setEditorProduct] = useState<AdminProduct | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [mutationError, setMutationError] = useState("");

  const filters: Array<[ProductFilter, string]> = [
    ["ALL", "الكل"],
    ["ACTIVE", "نشط"],
    ["LOW", "مخزون منخفض"],
    ["OUT", "نفد المخزون"],
  ];

  async function saveProduct(input: ProductWriteInput) {
    setSaving(true);
    setMutationError("");
    setNotice("");
    try {
      if (editorProduct) {
        await updateProduct({
          ...input,
          id: editorProduct.id,
          variantId: editorProduct.variants.nodes[0]?.id,
        });
        setNotice("تم تحديث المنتج على Shopify بنجاح.");
      } else {
        await createProduct(input);
        setNotice("تم إنشاء المنتج على Shopify بنجاح.");
      }
      setEditorProduct(undefined);
      await onRefresh();
    } catch (error) {
      setMutationError(error instanceof AdminApiError ? error.message : "تعذر حفظ المنتج على Shopify.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="panel products-panel">
        <div className="section-toolbar">
          <div><span className="eyebrow">CATALOG</span><h2>إدارة المنتجات</h2></div>
          <div className="toolbar-actions">
            <button className="quick-action primary" onClick={() => { setMutationError(""); setEditorProduct(null); }}>
              ＋ منتج جديد
            </button>
          </div>
        </div>

        {notice ? <div className="alert success-alert product-notice">{notice}</div> : null}
        {mutationError && editorProduct === undefined ? <div className="alert error-alert product-notice">{mutationError}</div> : null}

        <div className="section-toolbar">
          <div className="toolbar-actions">
            {filters.map(([id, label]) => (
              <button
                key={id}
                className={productFilter === id ? "filter-chip active" : "filter-chip"}
                onClick={() => setProductFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            className="search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="بحث بالاسم، البراند أو النوع…"
          />
        </div>
        <ProductTable products={products} onEdit={(product) => { setMutationError(""); setEditorProduct(product); }} />
      </section>

      {editorProduct !== undefined ? (
        <ProductEditor
          key={editorProduct?.id || "new-product"}
          product={editorProduct}
          saving={saving}
          error={mutationError}
          onClose={() => { if (!saving) setEditorProduct(undefined); }}
          onSave={saveProduct}
        />
      ) : null}
    </>
  );
}

function ProductEditor({
  product,
  saving,
  error,
  onClose,
  onSave,
}: {
  product: AdminProduct | null;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (input: ProductWriteInput) => Promise<void>;
}) {
  const variant = product?.variants.nodes[0];
  const [title, setTitle] = useState(product?.title || "");
  const [vendor, setVendor] = useState(product?.vendor || "");
  const [productType, setProductType] = useState(product?.productType || "");
  const [status, setStatus] = useState<ProductWriteInput["status"]>(
    product?.status === "ACTIVE" || product?.status === "ARCHIVED" ? product.status : "DRAFT",
  );
  const [price, setPrice] = useState(variant?.price || "");
  const [sku, setSku] = useState(variant?.sku || "");
  const [barcode, setBarcode] = useState(variant?.barcode || "");
  const [descriptionHtml, setDescriptionHtml] = useState(product?.descriptionHtml || "");
  const [tags, setTags] = useState(product?.tags?.join(", ") || "");
  const [validationError, setValidationError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setValidationError("اسم المنتج مطلوب.");
      return;
    }
    if (price.trim()) {
      const parsedPrice = Number(price);
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        setValidationError("السعر يجب أن يكون رقمًا صحيحًا.");
        return;
      }
    }

    setValidationError("");
    await onSave({
      title: cleanTitle,
      vendor: vendor.trim(),
      productType: productType.trim(),
      status,
      descriptionHtml,
      tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      price: price.trim() ? Number(price) : null,
      sku,
      barcode,
    });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="product-editor" role="dialog" aria-modal="true" aria-labelledby="product-editor-title">
        <header className="product-editor-header">
          <div>
            <span className="eyebrow">SHOPIFY PRODUCT</span>
            <h2 id="product-editor-title">{product ? "تعديل المنتج" : "إضافة منتج جديد"}</h2>
            <p>{product ? "التغييرات تحفظ مباشرة في Shopify." : "سيتم إنشاء المنتج مباشرة في Shopify."}</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} disabled={saving} aria-label="إغلاق">×</button>
        </header>

        <form className="product-form" onSubmit={submit}>
          <div className="form-grid">
            <label className="field full-field">
              <span>اسم المنتج *</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: iPhone 18 Pro Max" autoFocus />
            </label>

            <label className="field">
              <span>البراند / Vendor</span>
              <input value={vendor} onChange={(event) => setVendor(event.target.value)} placeholder="Apple" />
            </label>

            <label className="field">
              <span>نوع المنتج</span>
              <input value={productType} onChange={(event) => setProductType(event.target.value)} placeholder="Smartphones" />
            </label>

            <label className="field">
              <span>الحالة</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as ProductWriteInput["status"])}>
                <option value="DRAFT">Draft — غير ظاهر</option>
                <option value="ACTIVE">Active — ظاهر</option>
                <option value="ARCHIVED">Archived — مؤرشف</option>
              </select>
            </label>

            <label className="field">
              <span>السعر USD</span>
              <input inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="999.00" />
            </label>

            <label className="field">
              <span>SKU</span>
              <input value={sku} onChange={(event) => setSku(event.target.value)} placeholder="APL-IP18PM-256" />
            </label>

            <label className="field">
              <span>Barcode</span>
              <input value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder="EAN / UPC" />
            </label>

            <label className="field full-field">
              <span>Tags</span>
              <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="iphone, flagship, new-arrival" />
              <small>افصل الكلمات بفاصلة.</small>
            </label>

            <label className="field full-field">
              <span>الوصف (HTML اختياري)</span>
              <textarea rows={7} value={descriptionHtml} onChange={(event) => setDescriptionHtml(event.target.value)} placeholder="<p>وصف المنتج...</p>" />
            </label>
          </div>

          {validationError || error ? <div className="alert error-alert editor-alert">{validationError || error}</div> : null}

          <footer className="editor-actions">
            <button type="button" className="ghost-button" onClick={onClose} disabled={saving}>إلغاء</button>
            <button type="submit" className="quick-action primary" disabled={saving || !title.trim()}>
              {saving ? "جاري الحفظ…" : product ? "حفظ التعديلات" : "إنشاء المنتج"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function ProductTable({ products, onEdit }: { products: AdminProduct[]; onEdit: (product: AdminProduct) => void }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>المنتج</th><th>الحالة</th><th>السعر</th><th>المخزون</th><th>Variants</th><th>آخر تحديث</th><th>إجراء</th></tr>
        </thead>
        <tbody>
          {products.length ? products.map((product) => (
            <tr key={product.id}>
              <td><div className="product-name"><strong>{product.title}</strong><span>{product.vendor || product.productType || product.handle}</span></div></td>
              <td><span className={product.status === "ACTIVE" ? "pill success" : product.status === "ARCHIVED" ? "pill danger" : "pill muted"}>{product.status}</span></td>
              <td>{money(product.minPrice)}</td>
              <td><span className={`inventory ${inventoryTone(product.totalInventory)}`}>{product.totalInventory ?? "—"}</span></td>
              <td>{product.variantsCount}</td>
              <td>{formatDate(product.updatedAt)}</td>
              <td><button type="button" className="table-action" onClick={() => onEdit(product)}>تعديل</button></td>
            </tr>
          )) : <tr><td colSpan={7} className="empty-table">لا توجد منتجات لعرضها.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}