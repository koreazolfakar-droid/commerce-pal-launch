import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Package, RefreshCw, Save, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

const LOW_STOCK_THRESHOLD = 5;

type Product = {
  id: string;
  title: string;
  handle: string;
  status: string;
  sku: string | null;
  barcode: string | null;
  stock_quantity: number;
  track_inventory: boolean;
};

type Variant = {
  id: string;
  product_id: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  stock_quantity: number;
  track_inventory: boolean;
  is_active: boolean;
};

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

type Movement = {
  id: string;
  product_id: string;
  variant_id: string | null;
  movement_type: string;
  quantity_delta: number;
  note: string | null;
  reference_type: string | null;
  created_at: string;
};

export function InventoryEditor() {
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [adjustments, setAdjustments] = useState<Record<string, { delta: string; note: string }>>({});

  const load = async () => {
    setLoading(true);
    const [productsResult, variantsResult, movementResult] = await Promise.all([
      supabase
        .from("store_products" as never)
        .select("id,title,handle,status,sku,barcode,stock_quantity,track_inventory")
        .order("title"),
      supabase
        .from("store_product_variants" as never)
        .select("id,product_id,title,sku,barcode,stock_quantity,track_inventory,is_active")
        .order("sort_order"),
      supabase
        .from("store_inventory_movements" as never)
        .select("id,product_id,variant_id,movement_type,quantity_delta,note,reference_type,created_at")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    setLoading(false);
    const error = productsResult.error || variantsResult.error || movementResult.error;
    if (error) {
      toast.error(error.message);
      return;
    }

    setProducts((productsResult.data ?? []) as Product[]);
    setVariants((variantsResult.data ?? []) as Variant[]);
    setMovements((movementResult.data ?? []) as Movement[]);
  };

  useEffect(() => {
    void load();
  }, []);

  const rows = useMemo<InventoryRow[]>(() => {
    const byProduct = new Map<string, Variant[]>();
    variants.forEach((variant) => {
      const list = byProduct.get(variant.product_id) ?? [];
      list.push(variant);
      byProduct.set(variant.product_id, list);
    });

    return products.flatMap((product) => {
      const productVariants = byProduct.get(product.id) ?? [];
      if (productVariants.length === 0) {
        return [{
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
        }];
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

  const stats = useMemo(() => ({
    tracked: rows.filter((row) => row.tracked).length,
    units: rows.reduce((sum, row) => sum + row.stock, 0),
    low: rows.filter((row) => row.tracked && row.stock > 0 && row.stock <= LOW_STOCK_THRESHOLD).length,
    out: rows.filter((row) => row.tracked && row.stock === 0).length,
  }), [rows]);

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
      toast.error("أدخل كمية صحيحة موجبة أو سالبة، مثل 5 أو -2");
      return;
    }
    if (row.stock + delta < 0) {
      toast.error("لا يمكن أن يصبح المخزون أقل من صفر");
      return;
    }

    setSavingKey(row.key);
    const { error } = await supabase.rpc(
      "adjust_store_inventory" as never,
      {
        p_product_id: row.productId,
        p_variant_id: row.variantId,
        p_quantity_delta: delta,
        p_note: entry.note.trim() || null,
      } as never,
    );
    setSavingKey(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    setAdjustments((current) => ({ ...current, [row.key]: { delta: "", note: "" } }));
    toast.success(`تم تعديل المخزون ${delta > 0 ? `+${delta}` : delta}`);
    await load();
  };

  const productName = (id: string) => products.find((product) => product.id === id)?.title ?? "منتج";
  const variantName = (id: string | null) => id ? variants.find((variant) => variant.id === id)?.title ?? null : null;

  if (loading) {
    return <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> جاري تحميل المخزون…</div>;
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground">Inventory Center</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">إدارة المخزون</h1>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">مخزون المنتجات والـVariants مع تعديل آمن وسجل كامل لكل حركة.</p>
        </div>
        <Button variant="outline" className="rounded-xl" onClick={() => void load()}>
          <RefreshCw className="me-2 size-4" /> تحديث
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="عناصر متتبعة" value={stats.tracked} />
        <Metric label="إجمالي الوحدات" value={stats.units} />
        <Metric label="Low Stock" value={stats.low} warning={stats.low > 0} />
        <Metric label="نفد المخزون" value={stats.out} warning={stats.out > 0} />
      </div>

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card">
        <div className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اسم المنتج، SKU أو Barcode…" className="h-10 rounded-xl pe-9" />
          </div>
          <button
            type="button"
            onClick={() => setLowOnly((value) => !value)}
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition ${lowOnly ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300" : "border-border bg-background hover:bg-muted"}`}
          >
            <AlertTriangle className="size-4" /> Low stock فقط
          </button>
        </div>

        {filteredRows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground"><Package className="mx-auto mb-3 size-7" />لا توجد عناصر مخزون مطابقة.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-right">
              <thead className="bg-muted/25 text-[10px] font-semibold text-muted-foreground">
                <tr><th className="px-4 py-3">المنتج</th><th className="px-3 py-3">SKU / Barcode</th><th className="px-3 py-3">المخزون</th><th className="px-3 py-3">التعديل</th><th className="px-3 py-3">ملاحظة</th><th className="px-4 py-3 text-left">حفظ</th></tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const entry = adjustments[row.key] ?? { delta: "", note: "" };
                  const low = row.tracked && row.stock <= LOW_STOCK_THRESHOLD;
                  return (
                    <tr key={row.key} className="border-t border-border/50">
                      <td className="px-4 py-3.5"><p className="text-xs font-bold">{row.productTitle}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{row.variantTitle || "Default product"} • {row.status}</p></td>
                      <td className="px-3 py-3.5"><p className="text-[11px] font-semibold">{row.sku || "—"}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{row.barcode || "No barcode"}</p></td>
                      <td className="px-3 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${low ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-muted text-foreground"}`}>{row.stock}</span></td>
                      <td className="px-3 py-3.5"><Input type="number" value={entry.delta} onChange={(event) => patchAdjustment(row.key, { delta: event.target.value })} placeholder="+5 / -2" className="h-9 w-24 rounded-lg text-xs" /></td>
                      <td className="px-3 py-3.5"><Input value={entry.note} onChange={(event) => patchAdjustment(row.key, { note: event.target.value })} placeholder="سبب التعديل…" className="h-9 min-w-48 rounded-lg text-xs" /></td>
                      <td className="px-4 py-3.5 text-left"><Button size="sm" variant="outline" className="rounded-lg" disabled={savingKey === row.key} onClick={() => void adjustStock(row)}>{savingKey === row.key ? <Loader2 className="me-1.5 size-3.5 animate-spin" /> : <Save className="me-1.5 size-3.5" />} تعديل</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card">
        <div className="border-b border-border/60 px-4 py-4"><h2 className="text-sm font-black">سجل حركات المخزون</h2><p className="mt-1 text-[10px] text-muted-foreground">آخر 100 حركة شراء، بيع، إرجاع أو تعديل.</p></div>
        {movements.length === 0 ? <p className="p-8 text-center text-xs text-muted-foreground">لا توجد حركات مخزون بعد.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-right"><thead className="bg-muted/25 text-[10px] text-muted-foreground"><tr><th className="px-4 py-3">المنتج</th><th className="px-3 py-3">النوع</th><th className="px-3 py-3">الكمية</th><th className="px-3 py-3">الملاحظة</th><th className="px-4 py-3">الوقت</th></tr></thead><tbody>{movements.map((movement) => <tr key={movement.id} className="border-t border-border/50 text-xs"><td className="px-4 py-3"><span className="font-bold">{productName(movement.product_id)}</span>{variantName(movement.variant_id) ? <span className="text-muted-foreground"> • {variantName(movement.variant_id)}</span> : null}</td><td className="px-3 py-3 text-muted-foreground">{movement.movement_type}</td><td className={`px-3 py-3 font-black ${movement.quantity_delta > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>{movement.quantity_delta > 0 ? "+" : ""}{movement.quantity_delta}</td><td className="px-3 py-3 text-muted-foreground">{movement.note || movement.reference_type || "—"}</td><td className="px-4 py-3 text-[10px] text-muted-foreground">{new Date(movement.created_at).toLocaleString("ar-LB")}</td></tr>)}</tbody></table></div>
        )}
      </section>
    </section>
  );
}

function Metric({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return <div className="rounded-2xl border border-border/70 bg-card p-4"><p className="text-[10px] font-semibold text-muted-foreground">{label}</p><p className={`mt-2 text-2xl font-black ${warning ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>{value}</p></div>;
}
