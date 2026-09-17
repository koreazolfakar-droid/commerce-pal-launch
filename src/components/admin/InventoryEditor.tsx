import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Package, RefreshCw, Save, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminCommerceUiService,
  type InventoryMovementDto,
  type InventoryProductDto,
  type InventoryVariantDto,
} from "@/commerce/services/adminCommerceUiService";
import { useDashboardLanguage } from "@/lib/dashboardI18n";

const LOW_STOCK_THRESHOLD = 5;

type InventoryRow = {
  key: string;
  productId: string;
  variantId: string | null;
  productTitle: string;
  variantTitle: string | null;
  sku: string | null;
  barcode: string | null;
  stock: number;
  tracked: boolean;
  status: string;
};

export function InventoryEditor() {
  const { language, text } = useDashboardLanguage();
  const [products, setProducts] = useState<InventoryProductDto[]>([]);
  const [variants, setVariants] = useState<InventoryVariantDto[]>([]);
  const [movements, setMovements] = useState<InventoryMovementDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [adjustments, setAdjustments] = useState<Record<string, { delta: string; note: string }>>(
    {},
  );

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminCommerceUiService.getInventoryWorkspace();
      setProducts(data.products);
      setVariants(data.variants);
      setMovements(data.movements);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text("تعذر تحميل المخزون", "Unable to load inventory"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const rows = useMemo<InventoryRow[]>(() => {
    const byProduct = new Map<string, InventoryVariantDto[]>();
    variants.forEach((variant) => {
      const list = byProduct.get(variant.product_id) ?? [];
      list.push(variant);
      byProduct.set(variant.product_id, list);
    });

    return products.flatMap<InventoryRow>((product) => {
      const productVariants = byProduct.get(product.id) ?? [];
      if (productVariants.length === 0) {
        return [
          {
            key: `product:${product.id}`,
            productId: product.id,
            variantId: null,
            productTitle: product.title,
            variantTitle: null,
            sku: product.sku,
            barcode: product.barcode,
            stock: product.stock_quantity,
            tracked: product.track_inventory,
            status: product.status,
          },
        ];
      }

      return productVariants.map((variant) => ({
        key: `variant:${variant.id}`,
        productId: product.id,
        variantId: variant.id,
        productTitle: product.title,
        variantTitle: variant.title,
        sku: variant.sku,
        barcode: variant.barcode,
        stock: variant.stock_quantity,
        tracked: variant.track_inventory,
        status: variant.is_active ? product.status : "inactive",
      }));
    });
  }, [products, variants]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (lowOnly && row.stock > LOW_STOCK_THRESHOLD) return false;
      if (!q) return true;
      return `${row.productTitle} ${row.variantTitle ?? ""} ${row.sku ?? ""} ${row.barcode ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [lowOnly, rows, search]);

  const stats = useMemo(
    () => ({
      tracked: rows.filter((row) => row.tracked).length,
      units: rows.reduce((sum, row) => sum + row.stock, 0),
      low: rows.filter((row) => row.tracked && row.stock > 0 && row.stock <= LOW_STOCK_THRESHOLD)
        .length,
      out: rows.filter((row) => row.tracked && row.stock === 0).length,
    }),
    [rows],
  );

  const patchAdjustment = (key: string, patch: Partial<{ delta: string; note: string }>) => {
    setAdjustments((current) => ({
      ...current,
      [key]: { delta: current[key]?.delta ?? "", note: current[key]?.note ?? "", ...patch },
    }));
  };

  const adjustStock = async (row: InventoryRow) => {
    const entry = adjustments[row.key] ?? { delta: "", note: "" };
    const delta = Number.parseInt(entry.delta, 10);
    if (!Number.isInteger(delta) || delta === 0) {
      toast.error(
        text(
          "أدخل كمية صحيحة موجبة أو سالبة، مثل 5 أو -2",
          "Enter a valid positive or negative quantity, such as 5 or -2",
        ),
      );
      return;
    }
    if (row.stock + delta < 0) {
      toast.error(text("لا يمكن أن يصبح المخزون أقل من صفر", "Stock cannot go below zero"));
      return;
    }

    setSavingKey(row.key);
    try {
      await adminCommerceUiService.adjustInventory({
        productId: row.productId,
        variantId: row.variantId,
        quantityDelta: delta,
        note: entry.note.trim() || null,
      });
      setAdjustments((current) => ({ ...current, [row.key]: { delta: "", note: "" } }));
      toast.success(
        text(
          `تم تعديل المخزون ${delta > 0 ? `+${delta}` : delta}`,
          `Inventory adjusted ${delta > 0 ? `+${delta}` : delta}`,
        ),
      );
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text("فشل تعديل المخزون", "Inventory adjustment failed"));
    } finally {
      setSavingKey(null);
    }
  };

  const productName = (id: string) =>
    products.find((product) => product.id === id)?.title ?? text("منتج", "Product");
  const variantName = (id: string | null) =>
    id ? (variants.find((variant) => variant.id === id)?.title ?? null) : null;

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {text("جاري تحميل المخزون…", "Loading inventory…")}
      </div>
    );
  }

  return (
    <section className="admin-page space-y-5">
      <header className="admin-page-header flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground">
            {text("مركز المخزون", "Inventory Center")}
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">
            {text("إدارة المخزون", "Inventory management")}
          </h1>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
            {text(
              "مخزون المنتجات والـVariants مع تعديل آمن وسجل كامل لكل حركة.",
              "Product and variant inventory with safe adjustments and a complete movement history.",
            )}
          </p>
        </div>
        <Button variant="outline" className="rounded-xl" onClick={() => void load()}>
          <RefreshCw className="me-2 size-4" /> {text("تحديث", "Refresh")}
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label={text("عناصر متتبعة", "Tracked items")} value={stats.tracked} />
        <Metric label={text("إجمالي الوحدات", "Total units")} value={stats.units} />
        <Metric label={text("مخزون منخفض", "Low stock")} value={stats.low} warning={stats.low > 0} />
        <Metric label={text("نفد المخزون", "Out of stock")} value={stats.out} warning={stats.out > 0} />
      </div>

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card">
        <div className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={text("اسم المنتج، SKU أو Barcode…", "Product name, SKU or barcode…")}
              className="h-10 rounded-xl ps-9"
            />
          </div>
          <button
            type="button"
            onClick={() => setLowOnly((value) => !value)}
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition ${lowOnly ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300" : "border-border bg-background hover:bg-muted"}`}
          >
            <AlertTriangle className="size-4" /> {text("المخزون المنخفض فقط", "Low stock only")}
          </button>
        </div>

        {filteredRows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <Package className="mx-auto mb-3 size-7" />
            {text("لا توجد عناصر مخزون مطابقة.", "No matching inventory items.")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-start">
              <thead className="bg-muted/25 text-[10px] font-semibold text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{text("المنتج", "Product")}</th>
                  <th className="px-3 py-3">SKU / Barcode</th>
                  <th className="px-3 py-3">{text("المخزون", "Stock")}</th>
                  <th className="px-3 py-3">{text("التعديل", "Adjustment")}</th>
                  <th className="px-3 py-3">{text("ملاحظة", "Note")}</th>
                  <th className="px-4 py-3 text-end">{text("حفظ", "Save")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const entry = adjustments[row.key] ?? { delta: "", note: "" };
                  const low = row.tracked && row.stock <= LOW_STOCK_THRESHOLD;
                  return (
                    <tr key={row.key} className="border-t border-border/50">
                      <td className="px-4 py-3.5">
                        <p className="text-xs font-bold">{row.productTitle}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {row.variantTitle || text("المنتج الافتراضي", "Default product")} • {row.status}
                        </p>
                      </td>
                      <td className="px-3 py-3.5">
                        <p className="text-[11px] font-semibold">{row.sku || "—"}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{row.barcode || text("لا يوجد باركود", "No barcode")}</p>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${low ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-muted text-foreground"}`}>
                          {row.stock}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <Input
                          type="number"
                          value={entry.delta}
                          onChange={(event) => patchAdjustment(row.key, { delta: event.target.value })}
                          placeholder="+5 / -2"
                          className="h-9 w-24 rounded-lg text-xs"
                        />
                      </td>
                      <td className="px-3 py-3.5">
                        <Input
                          value={entry.note}
                          onChange={(event) => patchAdjustment(row.key, { note: event.target.value })}
                          placeholder={text("سبب التعديل…", "Reason for adjustment…")}
                          className="h-9 min-w-48 rounded-lg text-xs"
                        />
                      </td>
                      <td className="px-4 py-3.5 text-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg"
                          disabled={savingKey === row.key}
                          onClick={() => void adjustStock(row)}
                        >
                          {savingKey === row.key ? (
                            <Loader2 className="me-1.5 size-3.5 animate-spin" />
                          ) : (
                            <Save className="me-1.5 size-3.5" />
                          )}{" "}
                          {text("تعديل", "Adjust")}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card">
        <div className="border-b border-border/60 px-4 py-4">
          <h2 className="text-sm font-black">{text("سجل حركات المخزون", "Inventory movement history")}</h2>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {text("آخر 100 حركة شراء، بيع، إرجاع أو تعديل.", "The latest 100 purchase, sale, return or adjustment movements.")}
          </p>
        </div>
        {movements.length === 0 ? (
          <p className="p-8 text-center text-xs text-muted-foreground">{text("لا توجد حركات مخزون بعد.", "No inventory movements yet.")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-start">
              <thead className="bg-muted/25 text-[10px] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{text("المنتج", "Product")}</th>
                  <th className="px-3 py-3">{text("النوع", "Type")}</th>
                  <th className="px-3 py-3">{text("الكمية", "Quantity")}</th>
                  <th className="px-3 py-3">{text("الملاحظة", "Note")}</th>
                  <th className="px-4 py-3">{text("الوقت", "Time")}</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id} className="border-t border-border/50 text-xs">
                    <td className="px-4 py-3">
                      <span className="font-bold">{productName(movement.product_id)}</span>
                      {variantName(movement.variant_id) ? (
                        <span className="text-muted-foreground"> • {variantName(movement.variant_id)}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{movement.movement_type}</td>
                    <td className={`px-3 py-3 font-black ${movement.quantity_delta > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                      {movement.quantity_delta > 0 ? "+" : ""}{movement.quantity_delta}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{movement.note || movement.reference_type || "—"}</td>
                    <td className="px-4 py-3 text-[10px] text-muted-foreground">
                      {new Date(movement.created_at).toLocaleString(language === "ar" ? "ar-LB" : "en-LB")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

function Metric({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      <p className="text-[10px] font-semibold text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-black ${warning ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
