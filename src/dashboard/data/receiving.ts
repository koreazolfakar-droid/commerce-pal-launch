import { getDashboardRole } from "@/dashboard/data/catalog";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { invalidateNativeStoreCache } from "@/lib/nativeStore";

type SupplierRow = Tables<"store_suppliers">;
type PurchaseOrderRow = Tables<"store_purchase_orders">;
type PurchaseOrderItemRow = Tables<"store_purchase_order_items">;
type ReceivingRow = Tables<"store_receivings">;
type ReceivingItemRow = Tables<"store_receiving_items">;
type ProductRow = Tables<"store_products">;
type VariantRow = Tables<"store_product_variants">;

function throwIfError(error: { message: string } | null, label: string) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function requireDashboardStaff() {
  const role = await getDashboardRole();
  if (!role) throw new Error("Dashboard authentication is required.");
  return role;
}

export type ReceivingSupplier = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
};

export type PurchaseOrderLine = {
  id: string;
  productId: string;
  variantId: string | null;
  title: string;
  sku: string;
  expectedQuantity: number;
  approvedReceivedQuantity: number;
  remainingQuantity: number;
  unitCost: number;
};

export type PurchaseOrderSummary = {
  id: string;
  supplierId: string;
  supplierName: string;
  poNumber: string;
  status: PurchaseOrderRow["status"];
  currency: string;
  orderedAt: string | null;
  createdAt: string;
  notes: string | null;
  expectedUnits: number;
  receivedUnits: number;
  remainingUnits: number;
  expectedCost: number;
  items: PurchaseOrderLine[];
};

export type ReceivingLineSummary = {
  id: string;
  purchaseOrderItemId: string;
  title: string;
  sku: string;
  expectedQuantity: number;
  remainingQuantityBefore: number;
  receivedQuantity: number;
  damagedQuantity: number;
  deliveredQuantity: number;
  missingQuantity: number;
  difference: number;
  overageQuantity: number;
  overageReason: string | null;
  unitCost: number;
};

export type ReceivingSummary = {
  id: string;
  receiptNumber: number;
  purchaseOrderId: string;
  poNumber: string;
  supplierName: string;
  invoiceNumber: string;
  status: ReceivingRow["status"];
  employee: string;
  receivedAt: string;
  approvedAt: string | null;
  notes: string | null;
  stockUnits: number;
  damagedUnits: number;
  items: ReceivingLineSummary[];
};

export type ProcurementProductOption = {
  key: string;
  productId: string;
  variantId: string | null;
  title: string;
  sku: string;
  currentStock: number;
};

export type ReceivingWorkspace = {
  suppliers: ReceivingSupplier[];
  purchaseOrders: PurchaseOrderSummary[];
  receivings: ReceivingSummary[];
  productOptions: ProcurementProductOption[];
};

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function loadReceivingWorkspace(): Promise<ReceivingWorkspace> {
  await requireDashboardStaff();

  const [supplierResult, poResult, receivingResult, productResult, variantResult] = await Promise.all([
    supabase
      .from("store_suppliers")
      .select("id,name,code,is_active")
      .order("name", { ascending: true }),
    supabase
      .from("store_purchase_orders")
      .select("id,supplier_id,po_number,status,currency,ordered_at,created_at,notes")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("store_receivings")
      .select("id,receipt_number,purchase_order_id,invoice_number,status,receiving_employee_label,received_at,approved_at,notes")
      .order("received_at", { ascending: false })
      .limit(100),
    supabase
      .from("store_products")
      .select("id,title,sku,stock_quantity,status,track_inventory")
      .neq("status", "archived")
      .order("title", { ascending: true }),
    supabase
      .from("store_product_variants")
      .select("id,product_id,title,sku,stock_quantity,is_active,track_inventory,sort_order")
      .eq("is_active", true)
      .order("product_id", { ascending: true })
      .order("sort_order", { ascending: true }),
  ]);

  throwIfError(supplierResult.error, "Loading suppliers failed");
  throwIfError(poResult.error, "Loading purchase orders failed");
  throwIfError(receivingResult.error, "Loading receivings failed");
  throwIfError(productResult.error, "Loading procurement products failed");
  throwIfError(variantResult.error, "Loading procurement variants failed");

  const suppliers = (supplierResult.data ?? []) as Pick<SupplierRow, "id" | "name" | "code" | "is_active">[];
  const purchaseOrders = (poResult.data ?? []) as Pick<
    PurchaseOrderRow,
    "id" | "supplier_id" | "po_number" | "status" | "currency" | "ordered_at" | "created_at" | "notes"
  >[];
  const receivings = (receivingResult.data ?? []) as Pick<
    ReceivingRow,
    "id" | "receipt_number" | "purchase_order_id" | "invoice_number" | "status" | "receiving_employee_label" | "received_at" | "approved_at" | "notes"
  >[];
  const products = (productResult.data ?? []) as Pick<
    ProductRow,
    "id" | "title" | "sku" | "stock_quantity" | "status" | "track_inventory"
  >[];
  const variants = (variantResult.data ?? []) as Pick<
    VariantRow,
    "id" | "product_id" | "title" | "sku" | "stock_quantity" | "is_active" | "track_inventory" | "sort_order"
  >[];

  const poIds = purchaseOrders.map((row) => row.id);
  const receivingIds = receivings.map((row) => row.id);

  const [poItemResult, receivingItemResult] = await Promise.all([
    poIds.length
      ? supabase
          .from("store_purchase_order_items")
          .select("id,purchase_order_id,product_id,variant_id,sku_snapshot,title_snapshot,expected_quantity,unit_cost")
          .in("purchase_order_id", poIds)
      : Promise.resolve({ data: [], error: null }),
    receivingIds.length
      ? supabase
          .from("store_receiving_items")
          .select("id,receiving_id,purchase_order_item_id,expected_quantity_snapshot,remaining_quantity_before,received_quantity,damaged_quantity,unit_cost,delivered_quantity,difference,missing_quantity,overage_quantity,overage_reason")
          .in("receiving_id", receivingIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  throwIfError(poItemResult.error, "Loading purchase order items failed");
  throwIfError(receivingItemResult.error, "Loading receiving lines failed");

  const poItems = (poItemResult.data ?? []) as Pick<
    PurchaseOrderItemRow,
    "id" | "purchase_order_id" | "product_id" | "variant_id" | "sku_snapshot" | "title_snapshot" | "expected_quantity" | "unit_cost"
  >[];
  const receivingItems = (receivingItemResult.data ?? []) as Pick<
    ReceivingItemRow,
    | "id"
    | "receiving_id"
    | "purchase_order_item_id"
    | "expected_quantity_snapshot"
    | "remaining_quantity_before"
    | "received_quantity"
    | "damaged_quantity"
    | "unit_cost"
    | "delivered_quantity"
    | "difference"
    | "missing_quantity"
    | "overage_quantity"
    | "overage_reason"
  >[];

  const supplierById = new Map(suppliers.map((row) => [row.id, row]));
  const poById = new Map(purchaseOrders.map((row) => [row.id, row]));
  const poItemById = new Map(poItems.map((row) => [row.id, row]));
  const receivingById = new Map(receivings.map((row) => [row.id, row]));

  const approvedReceivedByPoItem = new Map<string, number>();
  for (const line of receivingItems) {
    const receipt = receivingById.get(line.receiving_id);
    if (receipt?.status !== "approved") continue;
    approvedReceivedByPoItem.set(
      line.purchase_order_item_id,
      (approvedReceivedByPoItem.get(line.purchase_order_item_id) ?? 0) + line.received_quantity,
    );
  }

  const poLinesByPo = new Map<string, PurchaseOrderLine[]>();
  for (const item of poItems) {
    const approved = approvedReceivedByPoItem.get(item.id) ?? 0;
    const line: PurchaseOrderLine = {
      id: item.id,
      productId: item.product_id,
      variantId: item.variant_id,
      title: item.title_snapshot,
      sku: item.sku_snapshot ?? "",
      expectedQuantity: item.expected_quantity,
      approvedReceivedQuantity: approved,
      remainingQuantity: Math.max(0, item.expected_quantity - approved),
      unitCost: toNumber(item.unit_cost),
    };
    const lines = poLinesByPo.get(item.purchase_order_id) ?? [];
    lines.push(line);
    poLinesByPo.set(item.purchase_order_id, lines);
  }

  const receivingLinesByReceipt = new Map<string, ReceivingLineSummary[]>();
  for (const line of receivingItems) {
    const poItem = poItemById.get(line.purchase_order_item_id);
    const summary: ReceivingLineSummary = {
      id: line.id,
      purchaseOrderItemId: line.purchase_order_item_id,
      title: poItem?.title_snapshot ?? "Unknown item",
      sku: poItem?.sku_snapshot ?? "",
      expectedQuantity: line.expected_quantity_snapshot,
      remainingQuantityBefore: line.remaining_quantity_before,
      receivedQuantity: line.received_quantity,
      damagedQuantity: line.damaged_quantity,
      deliveredQuantity: line.delivered_quantity,
      missingQuantity: line.missing_quantity,
      difference: line.difference,
      overageQuantity: line.overage_quantity,
      overageReason: line.overage_reason,
      unitCost: toNumber(line.unit_cost),
    };
    const lines = receivingLinesByReceipt.get(line.receiving_id) ?? [];
    lines.push(summary);
    receivingLinesByReceipt.set(line.receiving_id, lines);
  }

  const productById = new Map(products.map((row) => [row.id, row]));
  const variantsByProduct = new Map<string, typeof variants>();
  for (const variant of variants) {
    const rows = variantsByProduct.get(variant.product_id) ?? [];
    rows.push(variant);
    variantsByProduct.set(variant.product_id, rows);
  }

  const productOptions: ProcurementProductOption[] = [];
  for (const product of products) {
    if (!product.track_inventory) continue;
    const productVariants = variantsByProduct.get(product.id) ?? [];
    if (productVariants.length) {
      for (const variant of productVariants) {
        if (!variant.track_inventory) continue;
        productOptions.push({
          key: variant.id,
          productId: product.id,
          variantId: variant.id,
          title: `${product.title} · ${variant.title}`,
          sku: variant.sku ?? product.sku ?? "",
          currentStock: variant.stock_quantity,
        });
      }
    } else {
      productOptions.push({
        key: product.id,
        productId: product.id,
        variantId: null,
        title: product.title,
        sku: product.sku ?? "",
        currentStock: product.stock_quantity,
      });
    }
  }

  return {
    suppliers: suppliers.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      isActive: row.is_active,
    })),
    purchaseOrders: purchaseOrders.map((po) => {
      const lines = poLinesByPo.get(po.id) ?? [];
      return {
        id: po.id,
        supplierId: po.supplier_id,
        supplierName: supplierById.get(po.supplier_id)?.name ?? "Unknown supplier",
        poNumber: po.po_number,
        status: po.status,
        currency: po.currency,
        orderedAt: po.ordered_at,
        createdAt: po.created_at,
        notes: po.notes,
        expectedUnits: lines.reduce((sum, line) => sum + line.expectedQuantity, 0),
        receivedUnits: lines.reduce((sum, line) => sum + line.approvedReceivedQuantity, 0),
        remainingUnits: lines.reduce((sum, line) => sum + line.remainingQuantity, 0),
        expectedCost: lines.reduce((sum, line) => sum + line.expectedQuantity * line.unitCost, 0),
        items: lines,
      };
    }),
    receivings: receivings.map((receipt) => {
      const po = poById.get(receipt.purchase_order_id);
      const lines = receivingLinesByReceipt.get(receipt.id) ?? [];
      return {
        id: receipt.id,
        receiptNumber: receipt.receipt_number,
        purchaseOrderId: receipt.purchase_order_id,
        poNumber: po?.po_number ?? "—",
        supplierName: po ? supplierById.get(po.supplier_id)?.name ?? "Unknown supplier" : "Unknown supplier",
        invoiceNumber: receipt.invoice_number,
        status: receipt.status,
        employee: receipt.receiving_employee_label?.trim() || "Authenticated staff",
        receivedAt: receipt.received_at,
        approvedAt: receipt.approved_at,
        notes: receipt.notes,
        stockUnits: lines.reduce((sum, line) => sum + line.receivedQuantity, 0),
        damagedUnits: lines.reduce((sum, line) => sum + line.damagedQuantity, 0),
        items: lines,
      };
    }),
    productOptions: productOptions.sort((a, b) => a.title.localeCompare(b.title)),
  };
}

export async function createReceivingSupplier(input: { name: string; code?: string }) {
  await requireDashboardStaff();
  const name = input.name.trim();
  if (!name) throw new Error("Supplier name is required.");

  const { data, error } = await supabase
    .from("store_suppliers")
    .insert({
      name,
      code: input.code?.trim() || null,
      is_active: true,
    })
    .select("id,name,code,is_active")
    .single();

  throwIfError(error, "Creating supplier failed");
  if (!data) throw new Error("Supplier creation returned no row.");
  return data;
}

export type CreatePurchaseOrderInput = {
  supplierId: string;
  poNumber: string;
  currency?: string;
  notes?: string;
  items: Array<{
    productId: string;
    variantId: string | null;
    expectedQuantity: number;
    unitCost: number;
  }>;
};

export async function createPurchaseOrder(input: CreatePurchaseOrderInput) {
  await requireDashboardStaff();
  if (!input.items.length) throw new Error("Add at least one PO item.");

  const payload: Json = input.items.map((item) => ({
    product_id: item.productId,
    variant_id: item.variantId,
    expected_quantity: item.expectedQuantity,
    unit_cost: item.unitCost,
  }));

  const { data, error } = await supabase.rpc("create_store_purchase_order", {
    p_supplier_id: input.supplierId,
    p_po_number: input.poNumber.trim(),
    p_currency: (input.currency || "USD").trim().toUpperCase(),
    p_notes: input.notes?.trim() || null,
    p_items: payload,
  });
  throwIfError(error, "Creating purchase order failed");
  if (!data) throw new Error("Purchase order creation returned no id.");
  return data;
}

export async function submitPurchaseOrder(purchaseOrderId: string) {
  await requireDashboardStaff();
  const { data, error } = await supabase.rpc("submit_store_purchase_order", {
    p_purchase_order_id: purchaseOrderId,
  });
  throwIfError(error, "Submitting purchase order failed");
  return data;
}

export type CreateReceivingInput = {
  purchaseOrderId: string;
  invoiceNumber: string;
  employeeLabel?: string;
  notes?: string;
  lines: Array<{
    purchaseOrderItemId: string;
    receivedQuantity: number;
    damagedQuantity: number;
    unitCost: number;
    overageConfirmed: boolean;
    overageReason?: string;
  }>;
};

export async function createReceiving(input: CreateReceivingInput) {
  await requireDashboardStaff();
  if (!input.lines.length) throw new Error("Add at least one receiving line.");

  const payload: Json = input.lines.map((line) => ({
    purchase_order_item_id: line.purchaseOrderItemId,
    received_quantity: line.receivedQuantity,
    damaged_quantity: line.damagedQuantity,
    unit_cost: line.unitCost,
    overage_confirmed: line.overageConfirmed,
    overage_reason: line.overageReason?.trim() || null,
  }));

  const { data, error } = await supabase.rpc("create_store_receiving", {
    p_purchase_order_id: input.purchaseOrderId,
    p_invoice_number: input.invoiceNumber.trim(),
    p_receiving_employee_label: input.employeeLabel?.trim() || null,
    p_notes: input.notes?.trim() || null,
    p_lines: payload,
  });
  throwIfError(error, "Creating receiving draft failed");
  if (!data) throw new Error("Receiving creation returned no id.");
  return data;
}

export async function approveReceiving(receivingId: string) {
  await requireDashboardStaff();
  const { data, error } = await supabase.rpc("approve_store_receiving", {
    p_receiving_id: receivingId,
  });
  throwIfError(error, "Approving receiving failed");
  const result = data?.[0];
  if (!result) throw new Error("Receiving approval returned no result.");
  invalidateNativeStoreCache();
  return result;
}
