import { supabase } from "@/integrations/supabase/client";
import type {
  CatalogOverviewSnapshot,
  CommerceCustomer,
  CommerceOrder,
  CommerceOrderItem,
  CustomerOrderSummary,
  InventoryWorkspaceSnapshot,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
} from "@/commerce/core/models";
import type {
  AdminCommerceRepository,
  CustomerProfilePatch,
  InventoryAdjustmentCommand,
} from "@/commerce/core/ports";

type CatalogProductRow = {
  id: string;
  title: string;
  handle: string;
  brand_id: string | null;
  category_id: string | null;
  status: ProductStatus;
  currency: string;
  base_price: number | string;
  stock_quantity: number;
  updated_at: string;
};

type CatalogVariantRow = {
  id: string;
  product_id: string;
  stock_quantity: number;
  track_inventory: boolean;
  is_active: boolean;
};

type CatalogImageRow = {
  id: string;
  product_id: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
};

type InventoryProductRow = {
  id: string;
  title: string;
  handle: string;
  status: string;
  sku: string | null;
  barcode: string | null;
  stock_quantity: number;
  track_inventory: boolean;
};

type InventoryVariantRow = {
  id: string;
  product_id: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  stock_quantity: number;
  track_inventory: boolean;
  is_active: boolean;
};

type InventoryMovementRow = {
  id: string;
  product_id: string;
  variant_id: string | null;
  movement_type: string;
  quantity_delta: number;
  note: string | null;
  reference_type: string | null;
  created_at: string;
};

type OrderRow = {
  id: string;
  order_number: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: "cash" | "whish";
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  delivery_address: string | null;
  city: string | null;
  notes: string | null;
  customer_reference: string | null;
  currency: string;
  subtotal: number | string;
  shipping_total: number | string;
  discount_total: number | string;
  total: number | string;
  source: string;
  created_at: string;
  updated_at: string;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  title: string;
  variant_title: string | null;
  sku: string | null;
  unit_price: number | string;
  quantity: number;
  line_total: number | string;
  options: Record<string, unknown> | null;
};

type CustomerRow = {
  id: string;
  phone: string;
  phone_normalized: string;
  name: string;
  email: string | null;
  city: string | null;
  default_address: string | null;
  internal_notes: string | null;
  tags: string[] | null;
  is_vip: boolean;
  is_blocked: boolean;
  total_orders: number;
  total_spent: number | string;
  last_order_at: string | null;
  created_at: string;
  updated_at: string;
};

function numeric(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function throwIfError(error: { message: string } | null | undefined) {
  if (error) throw error;
}

export const supabaseAdminCommerceRepository: AdminCommerceRepository = {
  async getCatalogOverview(): Promise<CatalogOverviewSnapshot> {
    const [productsResult, variantsResult, imagesResult, brandsResult, categoriesResult] =
      await Promise.all([
        supabase
          .from("store_products" as never)
          .select(
            "id,title,handle,brand_id,category_id,status,currency,base_price,stock_quantity,updated_at",
          )
          .order("updated_at", { ascending: false }),
        supabase
          .from("store_product_variants" as never)
          .select("id,product_id,stock_quantity,track_inventory,is_active")
          .order("sort_order"),
        supabase
          .from("store_product_images" as never)
          .select("id,product_id,url,is_primary,sort_order")
          .order("sort_order"),
        supabase
          .from("cms_brands" as never)
          .select("id,name")
          .order("name"),
        supabase
          .from("store_categories" as never)
          .select("id,name")
          .order("sort_order"),
      ]);

    throwIfError(
      productsResult.error ||
        variantsResult.error ||
        imagesResult.error ||
        brandsResult.error ||
        categoriesResult.error,
    );

    return {
      products: ((productsResult.data ?? []) as CatalogProductRow[]).map((row) => ({
        id: row.id,
        source: "native",
        title: row.title,
        handle: row.handle,
        brandId: row.brand_id,
        categoryId: row.category_id,
        status: row.status,
        price: { amount: numeric(row.base_price), currency: row.currency || "USD" },
        stockQuantity: row.stock_quantity,
        updatedAt: row.updated_at,
      })),
      variants: ((variantsResult.data ?? []) as CatalogVariantRow[]).map((row) => ({
        id: row.id,
        source: "native",
        productId: row.product_id,
        stockQuantity: row.stock_quantity,
        trackInventory: row.track_inventory,
        isActive: row.is_active,
      })),
      images: ((imagesResult.data ?? []) as CatalogImageRow[]).map((row) => ({
        id: row.id,
        productId: row.product_id,
        url: row.url,
        isPrimary: row.is_primary,
        sortOrder: row.sort_order,
      })),
      brands: ((brandsResult.data ?? []) as Array<{ id: string; name: string }>).map((row) => ({
        id: row.id,
        name: row.name,
      })),
      categories: ((categoriesResult.data ?? []) as Array<{ id: string; name: string }>).map(
        (row) => ({ id: row.id, name: row.name }),
      ),
    };
  },

  async getInventoryWorkspace(): Promise<InventoryWorkspaceSnapshot> {
    const [productsResult, variantsResult, movementsResult] = await Promise.all([
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
        .select(
          "id,product_id,variant_id,movement_type,quantity_delta,note,reference_type,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    throwIfError(productsResult.error || variantsResult.error || movementsResult.error);

    return {
      products: ((productsResult.data ?? []) as InventoryProductRow[]).map((row) => ({
        id: row.id,
        title: row.title,
        handle: row.handle,
        status: row.status,
        sku: row.sku,
        barcode: row.barcode,
        stockQuantity: row.stock_quantity,
        trackInventory: row.track_inventory,
      })),
      variants: ((variantsResult.data ?? []) as InventoryVariantRow[]).map((row) => ({
        id: row.id,
        productId: row.product_id,
        title: row.title,
        sku: row.sku,
        barcode: row.barcode,
        stockQuantity: row.stock_quantity,
        trackInventory: row.track_inventory,
        isActive: row.is_active,
      })),
      movements: ((movementsResult.data ?? []) as InventoryMovementRow[]).map((row) => ({
        id: row.id,
        productId: row.product_id,
        variantId: row.variant_id,
        movementType: row.movement_type,
        quantityDelta: row.quantity_delta,
        note: row.note,
        referenceType: row.reference_type,
        createdAt: row.created_at,
      })),
    };
  },

  async adjustInventory(command: InventoryAdjustmentCommand) {
    const { error } = await supabase.rpc(
      "adjust_store_inventory" as never,
      {
        p_product_id: command.productId,
        p_variant_id: command.variantId,
        p_quantity_delta: command.quantityDelta,
        p_note: command.note,
      } as never,
    );
    throwIfError(error);
  },

  async listOrders(limit = 200): Promise<CommerceOrder[]> {
    const { data, error } = await supabase
      .from("store_orders" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    throwIfError(error);

    return ((data ?? []) as OrderRow[]).map((row) => ({
      id: row.id,
      orderNumber: row.order_number,
      status: row.status,
      paymentStatus: row.payment_status,
      paymentMethod: row.payment_method,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      customerEmail: row.customer_email,
      deliveryAddress: row.delivery_address,
      city: row.city,
      notes: row.notes,
      customerReference: row.customer_reference,
      currency: row.currency,
      subtotal: numeric(row.subtotal),
      shippingTotal: numeric(row.shipping_total),
      discountTotal: numeric(row.discount_total),
      total: numeric(row.total),
      source: row.source,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  async getOrderItems(orderId: string): Promise<CommerceOrderItem[]> {
    const { data, error } = await supabase
      .from("store_order_items" as never)
      .select("id,order_id,title,variant_title,sku,unit_price,quantity,line_total,options")
      .eq("order_id", orderId)
      .order("created_at");
    throwIfError(error);

    return ((data ?? []) as OrderItemRow[]).map((row) => ({
      id: row.id,
      orderId: row.order_id,
      title: row.title,
      variantTitle: row.variant_title,
      sku: row.sku,
      unitPrice: numeric(row.unit_price),
      quantity: row.quantity,
      lineTotal: numeric(row.line_total),
      options: row.options ?? {},
    }));
  },

  async updateOrderState(
    orderId: string,
    state: { status: OrderStatus; paymentStatus: PaymentStatus },
  ) {
    const { error } = await supabase
      .from("store_orders" as never)
      .update({ status: state.status, payment_status: state.paymentStatus } as never)
      .eq("id", orderId);
    throwIfError(error);
  },

  async listCustomers(): Promise<CommerceCustomer[]> {
    const { data, error } = await supabase
      .from("store_customers" as never)
      .select("*")
      .order("last_order_at", { ascending: false, nullsFirst: false });
    throwIfError(error);

    return ((data ?? []) as CustomerRow[]).map((row) => ({
      id: row.id,
      phone: row.phone,
      phoneNormalized: row.phone_normalized,
      name: row.name,
      email: row.email,
      city: row.city,
      defaultAddress: row.default_address,
      internalNotes: row.internal_notes,
      tags: row.tags ?? [],
      isVip: row.is_vip,
      isBlocked: row.is_blocked,
      totalOrders: row.total_orders,
      totalSpent: numeric(row.total_spent),
      lastOrderAt: row.last_order_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  async getCustomerOrders(phone: string, limit = 100): Promise<CustomerOrderSummary[]> {
    const { data, error } = await supabase
      .from("store_orders" as never)
      .select("id,order_number,status,payment_status,total,currency,created_at")
      .eq("customer_phone", phone)
      .order("created_at", { ascending: false })
      .limit(limit);
    throwIfError(error);

    return (
      (data ?? []) as Array<{
        id: string;
        order_number: number;
        status: string;
        payment_status: string;
        total: number | string;
        currency: string;
        created_at: string;
      }>
    ).map((row) => ({
      id: row.id,
      orderNumber: row.order_number,
      status: row.status,
      paymentStatus: row.payment_status,
      total: numeric(row.total),
      currency: row.currency,
      createdAt: row.created_at,
    }));
  },

  async updateCustomerProfile(customerId: string, patch: CustomerProfilePatch) {
    const { error } = await supabase
      .from("store_customers" as never)
      .update({
        internal_notes: patch.internalNotes,
        tags: patch.tags,
        is_vip: patch.isVip,
        is_blocked: patch.isBlocked,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", customerId);
    throwIfError(error);
  },
};
