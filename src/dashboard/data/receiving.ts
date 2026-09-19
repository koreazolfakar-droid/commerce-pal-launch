import { getDashboardRole, type DashboardRole } from "@/dashboard/data/catalog";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { invalidateNativeStoreCache } from "@/lib/nativeStore";

type SupplierRow = Tables<"store_suppliers">;
type LocationRow = Tables<"store_procurement_locations">;
type ProcurementEventRow = Tables<"store_procurement_events">;
type ProcurementAttachmentRow = Tables<"store_procurement_attachments">;
type ReceivingSerialRow = Tables<"store_receiving_serials">;
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
  phone: string | null;
  email: string | null;
  notes: string | null;
  isActive: boolean;
};

export type ProcurementLocation = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  isActive: boolean;
};

export type ProcurementEventSummary = {
  id: string;
  purchaseOrderId: string | null;
  receivingId: string | null;
  type: string;
  details: Json;
  actorId: string | null;
  createdAt: string;
};

export type ProcurementAttachment = {
  id: string;
  purchaseOrderId: string | null;
  receivingId: string | null;
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number | null;
  attachmentType: string;
  createdAt: string;
  url: string;
};

export type ReceivingSerial = {
  id: string;
  receivingItemId: string;
  serialNumber: string;
  imei1: string;
  imei2: string;
  condition: "usable" | "damaged";
  inventoryStatus: string;
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
  locationId: string | null;
  locationName: string;
  expectedAt: string | null;
  orderedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  notes: string | null;
  discountAmount: number;
  taxAmount: number;
  shippingAmount: number;
  exchangeRate: number;
  subtotal: number;
  grandTotal: number;
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
  serials: ReceivingSerial[];
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
  role: DashboardRole;
  suppliers: ReceivingSupplier[];
  locations: ProcurementLocation[];
  purchaseOrders: PurchaseOrderSummary[];
  receivings: ReceivingSummary[];
  productOptions: ProcurementProductOption[];
  events: ProcurementEventSummary[];
  attachments: ProcurementAttachment[];
};

export type ReceivingWorkspaceLoadOptions = {
  includeProductOptions?: boolean;
  includeAudit?: boolean;
  includeSerials?: boolean;
};

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function loadReceivingWorkspace(
  options: ReceivingWorkspaceLoadOptions = {},
): Promise<ReceivingWorkspace> {
  const role = await requireDashboardStaff();
  const includeProductOptions = options.includeProductOptions !== false;
  const includeAudit = options.includeAudit !== false;
  const includeSerials = options.includeSerials !== false;

  const [supplierResult, locationResult, poResult, receivingResult, productResult, variantResult, eventResult, attachmentResult] = await Promise.all([
    supabase
      .from("store_suppliers")
      .select("id,name,code,phone,email,notes,is_active")
      .order("name", { ascending: true }),
    supabase
      .from("store_procurement_locations")
      .select("id,name,code,address,is_active")
      .order("name", { ascending: true }),
    supabase
      .from("store_purchase_orders")
      .select("id,supplier_id,location_id,po_number,status,currency,expected_at,ordered_at,approved_at,rejected_at,rejection_reason,cancelled_at,cancellation_reason,discount_amount,tax_amount,shipping_amount,exchange_rate,created_at,notes")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("store_receivings")
      .select("id,receipt_number,purchase_order_id,invoice_number,status,receiving_employee_label,received_at,approved_at,notes")
      .order("received_at", { ascending: false })
      .limit(100),
    includeProductOptions
      ? supabase
          .from("store_products")
          .select("id,title,sku,stock_quantity,status,track_inventory")
          .neq("status", "archived")
          .order("title", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    includeProductOptions
      ? supabase
          .from("store_product_variants")
          .select("id,product_id,title,sku,stock_quantity,is_active,track_inventory,sort_order")
          .eq("is_active", true)
          .order("product_id", { ascending: true })
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    includeAudit
      ? supabase
          .from("store_procurement_events")
          .select("id,purchase_order_id,receiving_id,event_type,details,actor_id,created_at")
          .order("created_at", { ascending: false })
          .limit(300)
      : Promise.resolve({ data: [], error: null }),
    includeAudit
      ? supabase
          .from("store_procurement_attachments")
          .select("id,purchase_order_id,receiving_id,file_name,storage_path,mime_type,size_bytes,attachment_type,created_at")
          .order("created_at", { ascending: false })
          .limit(300)
      : Promise.resolve({ data: [], error: null }),
  ]);

  throwIfError(supplierResult.error, "Loading suppliers failed");
  throwIfError(locationResult.error, "Loading procurement locations failed");
  throwIfError(poResult.error, "Loading purchase orders failed");
  throwIfError(receivingResult.error, "Loading receivings failed");
  throwIfError(productResult.error, "Loading procurement products failed");
  throwIfError(variantResult.error, "Loading procurement variants failed");
  throwIfError(eventResult.error, "Loading procurement audit events failed");
  throwIfError(attachmentResult.error, "Loading procurement attachments failed");

  const suppliers = (supplierResult.data ?? []) as Pick<SupplierRow, "id" | "name" | "code" | "phone" | "email" | "notes" | "is_active">[];
  const locations = (locationResult.data ?? []) as Pick<LocationRow, "id" | "name" | "code" | "address" | "is_active">[];
  const purchaseOrders = (poResult.data ?? []) as Pick<
    PurchaseOrderRow,
    | "id"
    | "supplier_id"
    | "location_id"
    | "po_number"
    | "status"
    | "currency"
    | "expected_at"
    | "ordered_at"
    | "approved_at"
    | "rejected_at"
    | "rejection_reason"
    | "cancelled_at"
    | "cancellation_reason"
    | "discount_amount"
    | "tax_amount"
    | "shipping_amount"
    | "exchange_rate"
    | "created_at"
    | "notes"
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
  const events = (eventResult.data ?? []) as Pick<
    ProcurementEventRow,
    "id" | "purchase_order_id" | "receiving_id" | "event_type" | "details" | "actor_id" | "created_at"
  >[];
  const attachmentRows = (attachmentResult.data ?? []) as Pick<
    ProcurementAttachmentRow,
    "id" | "purchase_order_id" | "receiving_id" | "file_name" | "storage_path" | "mime_type" | "size_bytes" | "attachment_type" | "created_at"
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

  const receivingItemIds = receivingItems.map((row) => row.id);
  const serialResult = includeSerials && receivingItemIds.length
    ? await supabase
        .from("store_receiving_serials")
        .select("id,receiving_item_id,serial_number,imei1,imei2,condition,inventory_status")
        .in("receiving_item_id", receivingItemIds)
    : { data: [], error: null };
  throwIfError(serialResult.error, "Loading receiving serials failed");
  const serialRows = (serialResult.data ?? []) as Pick<
    ReceivingSerialRow,
    "id" | "receiving_item_id" | "serial_number" | "imei1" | "imei2" | "condition" | "inventory_status"
  >[];
  const serialsByReceivingItem = new Map<string, ReceivingSerial[]>();
  for (const serial of serialRows) {
    const rows = serialsByReceivingItem.get(serial.receiving_item_id) ?? [];
    rows.push({
      id: serial.id,
      receivingItemId: serial.receiving_item_id,
      serialNumber: serial.serial_number ?? "",
      imei1: serial.imei1 ?? "",
      imei2: serial.imei2 ?? "",
      condition: serial.condition === "damaged" ? "damaged" : "usable",
      inventoryStatus: serial.inventory_status,
    });
    serialsByReceivingItem.set(serial.receiving_item_id, rows);
  }

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
      serials: serialsByReceivingItem.get(line.id) ?? [],
    };
    const lines = receivingLinesByReceipt.get(line.receiving_id) ?? [];
    lines.push(summary);
    receivingLinesByReceipt.set(line.receiving_id, lines);
  }

  const locationById = new Map(locations.map((row) => [row.id, row]));
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

  const attachmentUrlByPath = new Map<string, string>();
  await Promise.all(
    attachmentRows.map(async (row) => {
      const { data, error } = await supabase.storage
        .from(PROCUREMENT_MEDIA_BUCKET)
        .createSignedUrl(row.storage_path, 60 * 60);
      if (!error && data?.signedUrl) attachmentUrlByPath.set(row.storage_path, data.signedUrl);
    }),
  );

  return {
    role,
    suppliers: suppliers.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      phone: row.phone,
      email: row.email,
      notes: row.notes,
      isActive: row.is_active,
    })),
    locations: locations.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      address: row.address,
      isActive: row.is_active,
    })),
    purchaseOrders: purchaseOrders.map((po) => {
      const lines = poLinesByPo.get(po.id) ?? [];
      const subtotal = lines.reduce((sum, line) => sum + line.expectedQuantity * line.unitCost, 0);
      const grandTotal = Math.max(
        0,
        subtotal - toNumber(po.discount_amount) + toNumber(po.tax_amount) + toNumber(po.shipping_amount),
      );
      return {
        id: po.id,
        supplierId: po.supplier_id,
        supplierName: supplierById.get(po.supplier_id)?.name ?? "Unknown supplier",
        poNumber: po.po_number,
        status: po.status,
        currency: po.currency,
        locationId: po.location_id,
        locationName: po.location_id ? locationById.get(po.location_id)?.name ?? "Unknown location" : "Unassigned",
        expectedAt: po.expected_at,
        orderedAt: po.ordered_at,
        approvedAt: po.approved_at,
        rejectedAt: po.rejected_at,
        rejectionReason: po.rejection_reason,
        cancelledAt: po.cancelled_at,
        cancellationReason: po.cancellation_reason,
        createdAt: po.created_at,
        notes: po.notes,
        discountAmount: toNumber(po.discount_amount),
        taxAmount: toNumber(po.tax_amount),
        shippingAmount: toNumber(po.shipping_amount),
        exchangeRate: toNumber(po.exchange_rate) || 1,
        subtotal,
        grandTotal,
        expectedUnits: lines.reduce((sum, line) => sum + line.expectedQuantity, 0),
        receivedUnits: lines.reduce((sum, line) => sum + line.approvedReceivedQuantity, 0),
        remainingUnits: lines.reduce((sum, line) => sum + line.remainingQuantity, 0),
        expectedCost: grandTotal,
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
    events: events.map((row) => ({
      id: row.id,
      purchaseOrderId: row.purchase_order_id,
      receivingId: row.receiving_id,
      type: row.event_type,
      details: row.details,
      actorId: row.actor_id,
      createdAt: row.created_at,
    })),
    attachments: attachmentRows.map((row) => ({
      id: row.id,
      purchaseOrderId: row.purchase_order_id,
      receivingId: row.receiving_id,
      fileName: row.file_name,
      storagePath: row.storage_path,
      mimeType: row.mime_type ?? "",
      sizeBytes: row.size_bytes,
      attachmentType: row.attachment_type,
      createdAt: row.created_at,
      url: attachmentUrlByPath.get(row.storage_path) ?? "",
    })),
  };
}

export async function createReceivingSupplier(input: {
  name: string;
  code?: string;
  phone?: string;
  email?: string;
  notes?: string;
}) {
  await requireDashboardStaff();
  const name = input.name.trim();
  if (!name) throw new Error("Supplier name is required.");

  const { data, error } = await supabase
    .from("store_suppliers")
    .insert({
      name,
      code: input.code?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      notes: input.notes?.trim() || null,
      is_active: true,
    })
    .select("id,name,code,phone,email,notes,is_active")
    .single();

  throwIfError(error, "Creating supplier failed");
  if (!data) throw new Error("Supplier creation returned no row.");
  return data;
}

export type CreatePurchaseOrderInput = {
  supplierId: string;
  poNumber: string;
  currency?: string;
  locationId?: string | null;
  expectedAt?: string | null;
  discountAmount?: number;
  taxAmount?: number;
  shippingAmount?: number;
  exchangeRate?: number;
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

  const { data, error } = await supabase.rpc("create_store_purchase_order_v2", {
    p_supplier_id: input.supplierId,
    p_location_id: input.locationId ?? null,
    p_po_number: input.poNumber.trim(),
    p_currency: (input.currency || "USD").trim().toUpperCase(),
    p_expected_at: input.expectedAt ?? null,
    p_discount_amount: input.discountAmount ?? 0,
    p_tax_amount: input.taxAmount ?? 0,
    p_shipping_amount: input.shippingAmount ?? 0,
    p_exchange_rate: input.exchangeRate ?? 1,
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

export type UpdateReceivingDraftInput = {
  receivingId: string;
  invoiceNumber: string;
  employeeLabel?: string;
  notes?: string;
  lines: Array<{
    receivingItemId: string;
    receivedQuantity: number;
    damagedQuantity: number;
    unitCost: number;
    overageConfirmed: boolean;
    overageReason?: string;
  }>;
};

export async function updateReceivingDraft(input: UpdateReceivingDraftInput) {
  await requireDashboardStaff();
  const payload: Json = input.lines.map((line) => ({
    receiving_item_id: line.receivingItemId,
    received_quantity: line.receivedQuantity,
    damaged_quantity: line.damagedQuantity,
    unit_cost: line.unitCost,
    overage_confirmed: line.overageConfirmed,
    overage_reason: line.overageReason?.trim() || null,
  }));

  const { data, error } = await supabase.rpc("update_store_receiving_draft", {
    p_receiving_id: input.receivingId,
    p_invoice_number: input.invoiceNumber.trim(),
    p_receiving_employee_label: input.employeeLabel?.trim() || null,
    p_notes: input.notes?.trim() || null,
    p_lines: payload,
  });
  throwIfError(error, "Updating receiving draft failed");
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


export type UpdatePurchaseOrderDraftInput = CreatePurchaseOrderInput & {
  purchaseOrderId: string;
};

function poItemsPayload(items: CreatePurchaseOrderInput["items"]): Json {
  return items.map((item) => ({
    product_id: item.productId,
    variant_id: item.variantId,
    expected_quantity: item.expectedQuantity,
    unit_cost: item.unitCost,
  }));
}

export async function updatePurchaseOrderDraft(input: UpdatePurchaseOrderDraftInput) {
  await requireDashboardStaff();
  if (!input.items.length) throw new Error("Add at least one PO item.");
  const { data, error } = await supabase.rpc("update_store_purchase_order_draft", {
    p_purchase_order_id: input.purchaseOrderId,
    p_supplier_id: input.supplierId,
    p_location_id: input.locationId ?? null,
    p_po_number: input.poNumber.trim(),
    p_currency: (input.currency || "USD").trim().toUpperCase(),
    p_expected_at: input.expectedAt ?? null,
    p_discount_amount: input.discountAmount ?? 0,
    p_tax_amount: input.taxAmount ?? 0,
    p_shipping_amount: input.shippingAmount ?? 0,
    p_exchange_rate: input.exchangeRate ?? 1,
    p_notes: input.notes?.trim() || null,
    p_items: poItemsPayload(input.items),
  });
  throwIfError(error, "Updating purchase order failed");
  return data;
}

export async function deletePurchaseOrderDraft(purchaseOrderId: string) {
  await requireDashboardStaff();
  const { data, error } = await supabase.rpc("delete_store_purchase_order_draft", {
    p_purchase_order_id: purchaseOrderId,
  });
  throwIfError(error, "Deleting purchase order draft failed");
  return data;
}

export async function approvePurchaseOrder(purchaseOrderId: string) {
  await requireDashboardStaff();
  const { data, error } = await supabase.rpc("approve_store_purchase_order", {
    p_purchase_order_id: purchaseOrderId,
  });
  throwIfError(error, "Approving purchase order failed");
  return data;
}

export async function issuePurchaseOrder(purchaseOrderId: string) {
  await requireDashboardStaff();
  const { data, error } = await supabase.rpc("issue_store_purchase_order", {
    p_purchase_order_id: purchaseOrderId,
  });
  throwIfError(error, "Issuing purchase order failed");
  return data;
}

export async function closePurchaseOrder(purchaseOrderId: string) {
  await requireDashboardStaff();
  const { data, error } = await supabase.rpc("close_store_purchase_order", {
    p_purchase_order_id: purchaseOrderId,
  });
  throwIfError(error, "Closing purchase order failed");
  return data;
}

export async function rejectPurchaseOrder(purchaseOrderId: string, reason: string) {
  await requireDashboardStaff();
  const cleanReason = reason.trim();
  if (!cleanReason) throw new Error("Rejection reason is required.");
  const { data, error } = await supabase.rpc("reject_store_purchase_order", {
    p_purchase_order_id: purchaseOrderId,
    p_reason: cleanReason,
  });
  throwIfError(error, "Rejecting purchase order failed");
  return data;
}

export async function reopenPurchaseOrder(purchaseOrderId: string) {
  await requireDashboardStaff();
  const { data, error } = await supabase.rpc("reopen_store_purchase_order", {
    p_purchase_order_id: purchaseOrderId,
  });
  throwIfError(error, "Reopening purchase order failed");
  return data;
}

export async function cancelPurchaseOrder(purchaseOrderId: string, reason: string) {
  await requireDashboardStaff();
  const cleanReason = reason.trim();
  if (!cleanReason) throw new Error("Cancellation reason is required.");
  const { data, error } = await supabase.rpc("cancel_store_purchase_order", {
    p_purchase_order_id: purchaseOrderId,
    p_reason: cleanReason,
  });
  throwIfError(error, "Cancelling purchase order failed");
  return data;
}

export async function voidReceiving(receivingId: string, reason: string) {
  await requireDashboardStaff();
  const cleanReason = reason.trim();
  if (!cleanReason) throw new Error("Void reason is required.");
  const { data, error } = await supabase.rpc("void_store_receiving", {
    p_receiving_id: receivingId,
    p_reason: cleanReason,
  });
  throwIfError(error, "Voiding receiving failed");
  return data;
}

export async function saveProcurementLocation(input: {
  id?: string;
  name: string;
  code: string;
  address?: string;
  isActive?: boolean;
}) {
  await requireDashboardStaff();
  const payload = {
    name: input.name.trim(),
    code: input.code.trim().toUpperCase(),
    address: input.address?.trim() || null,
    is_active: input.isActive ?? true,
  };
  if (!payload.name || !payload.code) throw new Error("Location name and code are required.");

  const query = input.id
    ? supabase.from("store_procurement_locations").update(payload).eq("id", input.id)
    : supabase.from("store_procurement_locations").insert(payload);

  const { data, error } = await query.select("id,name,code,address,is_active").single();
  throwIfError(error, input.id ? "Updating location failed" : "Creating location failed");
  return data;
}

export async function updateReceivingSupplier(input: {
  id: string;
  name: string;
  code?: string;
  phone?: string;
  email?: string;
  notes?: string;
  isActive?: boolean;
}) {
  await requireDashboardStaff();
  const { data, error } = await supabase
    .from("store_suppliers")
    .update({
      name: input.name.trim(),
      code: input.code?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      notes: input.notes?.trim() || null,
      is_active: input.isActive ?? true,
    })
    .eq("id", input.id)
    .select("id,name,code,phone,email,notes,is_active")
    .single();
  throwIfError(error, "Updating supplier failed");
  return data;
}

export type ReceivingSerialDraft = {
  serialNumber?: string;
  imei1?: string;
  imei2?: string;
  condition?: "usable" | "damaged";
};

export async function replaceReceivingSerials(
  receivingItemId: string,
  serials: ReceivingSerialDraft[],
) {
  await requireDashboardStaff();
  const payload: Json = serials
    .map((serial) => ({
      serial_number: serial.serialNumber?.trim() || null,
      imei1: serial.imei1?.trim() || null,
      imei2: serial.imei2?.trim() || null,
      condition: serial.condition ?? "usable",
    }))
    .filter((serial) => serial.serial_number || serial.imei1 || serial.imei2);

  const { data, error } = await supabase.rpc("replace_store_receiving_serials", {
    p_receiving_item_id: receivingItemId,
    p_serials: payload,
  });
  throwIfError(error, "Saving serial / IMEI data failed");
  return data;
}

const PROCUREMENT_MEDIA_BUCKET = "procurement-private";
const PROCUREMENT_MEDIA_PREFIX = "procurement";
const MAX_PROCUREMENT_FILE_BYTES = 20 * 1024 * 1024;

export async function uploadProcurementAttachment(input: {
  file: File;
  purchaseOrderId?: string | null;
  receivingId?: string | null;
  attachmentType: "purchase_order" | "supplier_invoice" | "packing_list" | "other";
}) {
  await requireDashboardStaff();
  if (!input.purchaseOrderId && !input.receivingId) throw new Error("Attachment must belong to a PO or receiving.");
  if (input.file.size <= 0) throw new Error("The selected file is empty.");
  if (input.file.size > MAX_PROCUREMENT_FILE_BYTES) throw new Error("Attachment must be 20 MB or smaller.");

  const unique =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const scope = input.purchaseOrderId ? `po/${input.purchaseOrderId}` : `receiving/${input.receivingId}`;
  const objectPath = `${PROCUREMENT_MEDIA_PREFIX}/${scope}/${unique}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(PROCUREMENT_MEDIA_BUCKET)
    .upload(objectPath, input.file, {
      upsert: false,
      contentType: input.file.type || "application/octet-stream",
    });
  throwIfError(uploadError, "Uploading procurement attachment failed");

  try {
    const { data, error } = await supabase
      .from("store_procurement_attachments")
      .insert({
        purchase_order_id: input.purchaseOrderId ?? null,
        receiving_id: input.receivingId ?? null,
        file_name: input.file.name,
        storage_path: objectPath,
        mime_type: input.file.type || null,
        size_bytes: input.file.size,
        attachment_type: input.attachmentType,
      })
      .select("*")
      .single();
    throwIfError(error, "Registering procurement attachment failed");
    return data;
  } catch (error) {
    await supabase.storage.from(PROCUREMENT_MEDIA_BUCKET).remove([objectPath]);
    throw error;
  }
}

export async function deleteProcurementAttachment(attachment: ProcurementAttachment) {
  const role = await requireDashboardStaff();
  if (role !== "admin") throw new Error("Only dashboard admins can delete procurement documents.");
  const { error } = await supabase
    .from("store_procurement_attachments")
    .delete()
    .eq("id", attachment.id);
  throwIfError(error, "Deleting procurement attachment failed");
  const { error: storageError } = await supabase.storage
    .from(PROCUREMENT_MEDIA_BUCKET)
    .remove([attachment.storagePath]);
  if (storageError) {
    console.warn("[procurement] attachment metadata deleted but storage cleanup failed", storageError.message);
  }
}

export type ProcurementAnalytics = {
  totalSpend: number;
  poCount: number;
  openPoCount: number;
  overduePoCount: number;
  receivedUnits: number;
  damagedUnits: number;
  damageRate: number;
  supplierSpend: Array<{
    supplierId: string;
    supplierName: string;
    spend: number;
    poCount: number;
    completedPoCount: number;
    onTimeCompletedCount: number;
    onTimeRate: number;
    damagedUnits: number;
  }>;
};

export function buildProcurementAnalytics(workspace: ReceivingWorkspace): ProcurementAnalytics {
  const now = Date.now();
  const totalSpend = workspace.purchaseOrders
    .filter((po) => !["cancelled", "rejected"].includes(po.status))
    .reduce((sum, po) => sum + po.grandTotal, 0);
  const openStatuses = new Set(["pending_approval", "approved", "ordered", "partially_received"]);
  const openPoCount = workspace.purchaseOrders.filter((po) => openStatuses.has(po.status)).length;
  const overduePoCount = workspace.purchaseOrders.filter((po) => {
    if (!po.expectedAt || !openStatuses.has(po.status)) return false;
    return new Date(po.expectedAt).getTime() < now;
  }).length;
  const receivedUnits = workspace.receivings
    .filter((receipt) => receipt.status === "approved")
    .reduce((sum, receipt) => sum + receipt.stockUnits, 0);
  const damagedUnits = workspace.receivings
    .filter((receipt) => receipt.status === "approved")
    .reduce((sum, receipt) => sum + receipt.damagedUnits, 0);

  const supplierMap = new Map<string, {
    supplierId: string;
    supplierName: string;
    spend: number;
    poCount: number;
    completedPoCount: number;
    onTimeCompletedCount: number;
    damagedUnits: number;
  }>();
  for (const po of workspace.purchaseOrders) {
    if (["cancelled", "rejected"].includes(po.status)) continue;
    const current = supplierMap.get(po.supplierId) ?? {
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      spend: 0,
      poCount: 0,
      completedPoCount: 0,
      onTimeCompletedCount: 0,
      damagedUnits: 0,
    };
    current.spend += po.grandTotal;
    current.poCount += 1;

    const poReceipts = workspace.receivings.filter(
      (receipt) => receipt.purchaseOrderId === po.id && receipt.status === "approved",
    );
    current.damagedUnits += poReceipts.reduce((sum, receipt) => sum + receipt.damagedUnits, 0);

    if (po.status === "received" || po.status === "closed") {
      current.completedPoCount += 1;
      const completedAt = poReceipts.reduce<string | null>((latest, receipt) => {
        const stamp = receipt.approvedAt ?? receipt.receivedAt;
        return !latest || new Date(stamp) > new Date(latest) ? stamp : latest;
      }, null);
      if (po.expectedAt && completedAt && new Date(completedAt) <= new Date(po.expectedAt)) {
        current.onTimeCompletedCount += 1;
      }
    }

    supplierMap.set(po.supplierId, current);
  }

  return {
    totalSpend,
    poCount: workspace.purchaseOrders.length,
    openPoCount,
    overduePoCount,
    receivedUnits,
    damagedUnits,
    damageRate: receivedUnits + damagedUnits > 0 ? damagedUnits / (receivedUnits + damagedUnits) : 0,
    supplierSpend: [...supplierMap.values()]
      .map((supplier) => ({
        ...supplier,
        onTimeRate:
          supplier.completedPoCount > 0
            ? supplier.onTimeCompletedCount / supplier.completedPoCount
            : 0,
      }))
      .sort((a, b) => b.spend - a.spend),
  };
}

export type ReorderSuggestion = {
  key: string;
  productId: string;
  variantId: string | null;
  title: string;
  sku: string;
  currentStock: number;
  onOrder: number;
  suggestedQuantity: number;
  recommendedSupplierId: string | null;
  recommendedSupplierName: string | null;
};

export function buildReorderSuggestions(
  workspace: ReceivingWorkspace,
  targetStock = 10,
): ReorderSuggestion[] {
  const onOrderByKey = new Map<string, number>();
  for (const po of workspace.purchaseOrders) {
    if (!["approved", "ordered", "partially_received"].includes(po.status)) continue;
    for (const line of po.items) {
      const key = line.variantId ?? line.productId;
      onOrderByKey.set(key, (onOrderByKey.get(key) ?? 0) + line.remainingQuantity);
    }
  }

  return workspace.productOptions
    .map((option) => {
      const onOrder = onOrderByKey.get(option.key) ?? 0;
      const projected = option.currentStock + onOrder;
      const lastPo = [...workspace.purchaseOrders]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .find((po) =>
          !["cancelled", "rejected"].includes(po.status) &&
          po.items.some((line) => (line.variantId ?? line.productId) === option.key),
        );
      return {
        key: option.key,
        productId: option.productId,
        variantId: option.variantId,
        title: option.title,
        sku: option.sku,
        currentStock: option.currentStock,
        onOrder,
        suggestedQuantity: Math.max(0, targetStock - projected),
        recommendedSupplierId: lastPo?.supplierId ?? null,
        recommendedSupplierName: lastPo?.supplierName ?? null,
      };
    })
    .filter((item) => item.suggestedQuantity > 0)
    .sort((a, b) => a.currentStock - b.currentStock);
}
