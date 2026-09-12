import { FormEvent, useMemo, useState } from "react";
import {
  AdminApiError,
  type AdminProduct,
  type InventoryLocation,
  type InventoryReceipt,
  fetchInventoryLocations,
  receiveInventory,
} from "./api";
import "./phase2.css";

type InventoryManagerProps = {
  products: AdminProduct[];
  onRefresh: () => Promise<void>;
};

function inventoryTone(value: number | null) {
  if (value === null) return "muted";
  if (value <= 0) return "danger";
  if (value <= 5) return "warning";
  return "success";
}

export function InventoryManager({ products, onRefresh }: InventoryManagerProps) {
  const [receiving, setReceiving] = useState(false);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<InventoryReceipt | null>(null);

  const total = products.reduce((sum, product) => sum + (product.totalInventory ?? 0), 0);
  const low = products.filter((product) => product.totalInventory !== null && product.totalInventory > 0 && product.totalInventory <= 5).length;
  const out = products.filter((product) => product.totalInventory !== null && product.totalInventory <= 0).length;
  const maxStock = Math.max(...products.map((product) => product.totalInventory ?? 0), 1);

  async function openReceiving() {
    setError("");
    setReceiving(true);
    if (locations.length) return;
    setLoadingLocations(true);
    try {
      const result = await fetchInventoryLocations();
      setLocations(result.locations);
    } catch (caught) {
      setError(caught instanceof AdminApiError ? caught.message : "تعذر تحميل فروع المخزون من Shopify.");
    } finally {
      setLoadingLocations(false);
    }
  }

  async function receive(input: { variantId: string; locationId: string; quantity: number; reference: string }) {
    setSaving(true);
    setError("");
    try {
      const result = await receiveInventory(input);
      setReceipt(result.receipt);
      setReceiving(false);
      await onRefresh();
    } catch (caught) {
      setError(caught instanceof AdminApiError ? caught.message : "تعذر استلام المخزون على Shopify.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="inventory-layout">
      <section className="summary-strip">
        <Summary label="إجمالي الوحدات" value={String(total)} />
        <Summary label="منتجات منخفضة" value={String(low)} />
        <Summary label="نفد المخزون" value={String(out)} />
        <Summary label="SKU محملة" value={String(products.reduce((sum, product) => sum + product.variantsCount, 0))} />
      </section>

      <section className="panel products-panel">
        <div className="section-toolbar">
          <div><span className="eyebrow">INVENTORY CONTROL</span><h2>المخزون</h2></div>
          <div className="toolbar-actions">
            <button className="quick-action primary" onClick={() => void openReceiving()}>▤ استلام بضاعة</button>
          </div>
        </div>

        {receipt ? (
          <div className="alert success-alert product-notice">
            تم استلام {receipt.quantity} قطعة من {receipt.product}{receipt.variant && receipt.variant !== "Default Title" ? ` — ${receipt.variant}` : ""} وتحديث Shopify.
            {receipt.reference ? ` المرجع: ${receipt.reference}` : ""}
          </div>
        ) : null}
        {error && !receiving ? <div className="alert error-alert product-notice">{error}</div> : null}

        <div className="table-wrap"><table><thead><tr><th>المنتج</th><th>الحالة</th><th>المتوفر</th><th>المستوى</th><th>SKU</th></tr></thead><tbody>
          {products.map((product) => {
            const stock = product.totalInventory ?? 0;
            return <tr key={product.id}><td><div className="product-name"><strong>{product.title}</strong><span>{product.vendor || product.productType}</span></div></td><td><span className={`inventory ${inventoryTone(stock)}`}>{stock <= 0 ? "OUT" : stock <= 5 ? "LOW" : "OK"}</span></td><td>{stock}</td><td><div className="inventory-progress"><span style={{ width: `${Math.max(3, (stock / maxStock) * 100)}%` }} /></div></td><td>{product.variants.nodes[0]?.sku || "—"}</td></tr>;
          })}
          {!products.length ? <tr><td colSpan={5} className="empty-table">لا توجد بيانات مخزون متاحة.</td></tr> : null}
        </tbody></table></div>
      </section>

      {receiving ? (
        <ReceivingModal
          products={products}
          locations={locations}
          loadingLocations={loadingLocations}
          saving={saving}
          error={error}
          onClose={() => { if (!saving) setReceiving(false); }}
          onReceive={receive}
        />
      ) : null}
    </div>
  );
}

function ReceivingModal({
  products,
  locations,
  loadingLocations,
  saving,
  error,
  onClose,
  onReceive,
}: {
  products: AdminProduct[];
  locations: InventoryLocation[];
  loadingLocations: boolean;
  saving: boolean;
  error: string;
  onClose: () => void;
  onReceive: (input: { variantId: string; locationId: string; quantity: number; reference: string }) => Promise<void>;
}) {
  const variantOptions = useMemo(
    () => products.flatMap((product) => product.variants.nodes.map((variant) => ({
      id: variant.id,
      productTitle: product.title,
      variantTitle: variant.title,
      sku: variant.sku,
      stock: variant.inventoryQuantity,
    }))),
    [products],
  );
  const [variantId, setVariantId] = useState(variantOptions[0]?.id || "");
  const [locationId, setLocationId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [reference, setReference] = useState("");
  const [validationError, setValidationError] = useState("");

  const effectiveLocation = locationId || locations[0]?.id || "";

  async function submit(event: FormEvent) {
    event.preventDefault();
    const amount = Number(quantity);
    if (!variantId) {
      setValidationError("اختر المنتج أو الـVariant.");
      return;
    }
    if (!effectiveLocation) {
      setValidationError("لا يوجد Shopify Location متاح. تحقق من صلاحية read_locations.");
      return;
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      setValidationError("الكمية يجب أن تكون عددًا صحيحًا أكبر من صفر.");
      return;
    }
    setValidationError("");
    await onReceive({ variantId, locationId: effectiveLocation, quantity: amount, reference: reference.trim() });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="product-editor" role="dialog" aria-modal="true" aria-labelledby="receiving-title">
        <header className="product-editor-header">
          <div>
            <span className="eyebrow">SHOPIFY INVENTORY</span>
            <h2 id="receiving-title">استلام بضاعة</h2>
            <p>الكمية تضاف مباشرة إلى Available inventory في Shopify.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} disabled={saving} aria-label="إغلاق">×</button>
        </header>

        <form className="product-form" onSubmit={submit}>
          <div className="form-grid">
            <label className="field full-field">
              <span>المنتج / Variant *</span>
              <select value={variantId} onChange={(event) => setVariantId(event.target.value)}>
                {variantOptions.map((variant) => (
                  <option value={variant.id} key={variant.id}>
                    {variant.productTitle}{variant.variantTitle !== "Default Title" ? ` — ${variant.variantTitle}` : ""}{variant.sku ? ` • ${variant.sku}` : ""} • stock {variant.stock ?? "—"}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Location *</span>
              <select value={effectiveLocation} onChange={(event) => setLocationId(event.target.value)} disabled={loadingLocations || !locations.length}>
                {loadingLocations ? <option value="">جاري التحميل…</option> : null}
                {!loadingLocations && !locations.length ? <option value="">لا يوجد Location متاح</option> : null}
                {locations.map((location) => <option value={location.id} key={location.id}>{location.name}</option>)}
              </select>
            </label>

            <label className="field">
              <span>الكمية المستلمة *</span>
              <input type="number" min="1" step="1" inputMode="numeric" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            </label>

            <label className="field full-field">
              <span>مرجع الاستلام / PO / Invoice</span>
              <input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="مثال: PO-2026-0913-001" />
              <small>يُحفظ المرجع داخل inventory adjustment في Shopify لتسهيل التدقيق.</small>
            </label>
          </div>

          {validationError || error ? <div className="alert error-alert editor-alert">{validationError || error}</div> : null}

          <footer className="editor-actions">
            <button type="button" className="ghost-button" onClick={onClose} disabled={saving}>إلغاء</button>
            <button type="submit" className="quick-action primary" disabled={saving || loadingLocations || !variantOptions.length}>
              {saving ? "جاري الاستلام…" : "تأكيد الاستلام"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <article className="summary-card"><span>{label}</span><strong>{value}</strong></article>;
}