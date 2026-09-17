import { adminCommerceService } from "@/commerce/services/adminCommerceService";
import type { OrderStatus, PaymentStatus, ProductStatus } from "@/commerce/core/models";

export type CatalogProductDto = {
  id: string;
  title: string;
  handle: string;
  brand_id: string | null;
  category_id: string | null;
  status: ProductStatus;
  currency: string;
  base_price: number;
  stock_quantity: number;
  updated_at: string;
};

export type CatalogVariantDto = {
  id: string;
  product_id: string;
  stock_quantity: number;
  track_inventory: boolean;
  is_active: boolean;
};

export type CatalogImageDto = {
  id: string;
  product_id: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
};

export type CatalogOverviewDto = {
  products: CatalogProductDto[];
  variants: CatalogVariantDto[];
  images: CatalogImageDto[];
  brands: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
};

export type InventoryProductDto = {
  id: string;
  title: string;
  handle: string;
  status: string;
  sku: string | null;
  barcode: string | null;
  stock_quantity: number;
  track_inventory: boolean;
};

export type InventoryVariantDto = {
  id: string;
  product_id: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  stock_quantity: number;
  track_inventory: boolean;
  is_active: boolean;
};

export type InventoryMovementDto = {
  id: string;
  product_id: string;
  variant_id: string | null;
  movement_type: string;
  quantity_delta: number;
  note: string | null;
  reference_type: string | null;
  created_at: string;
};

export type InventoryWorkspaceDto = {
  products: InventoryProductDto[];
  variants: InventoryVariantDto[];
  movements: InventoryMovementDto[];
};

export type OrderDto = {
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
  subtotal: number;
  shipping_total: number;
  discount_total: number;
  total: number;
  source: string;
  created_at: string;
  updated_at: string;
};

export type OrderItemDto = {
  id: string;
  order_id: string;
  title: string;
  variant_title: string | null;
  sku: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  options: Record<string, unknown>;
};

export type CustomerDto = {
  id: string;
  phone: string;
  phone_normalized: string;
  name: string;
  email: string | null;
  city: string | null;
  default_address: string | null;
  internal_notes: string | null;
  tags: string[];
  is_vip: boolean;
  is_blocked: boolean;
  total_orders: number;
  total_spent: number;
  last_order_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerOrderDto = {
  id: string;
  order_number: number;
  status: string;
  payment_status: string;
  total: number;
  currency: string;
  created_at: string;
};

export const adminCommerceUiService = {
  async getCatalogOverview(): Promise<CatalogOverviewDto> {
    const data = await adminCommerceService.getCatalogOverview();
    return {
      products: data.products.map((row) => ({
        id: row.id,
        title: row.title,
        handle: row.handle,
        brand_id: row.brandId,
        category_id: row.categoryId,
        status: row.status,
        currency: row.price.currency,
        base_price: row.price.amount,
        stock_quantity: row.stockQuantity,
        updated_at: row.updatedAt,
      })),
      variants: data.variants.map((row) => ({
        id: row.id,
        product_id: row.productId,
        stock_quantity: row.stockQuantity,
        track_inventory: row.trackInventory,
        is_active: row.isActive,
      })),
      images: data.images.map((row) => ({
        id: row.id,
        product_id: row.productId,
        url: row.url,
        is_primary: row.isPrimary,
        sort_order: row.sortOrder,
      })),
      brands: data.brands,
      categories: data.categories,
    };
  },

  async getInventoryWorkspace(): Promise<InventoryWorkspaceDto> {
    const data = await adminCommerceService.getInventoryWorkspace();
    return {
      products: data.products.map((row) => ({
        id: row.id,
        title: row.title,
        handle: row.handle,
        status: row.status,
        sku: row.sku,
        barcode: row.barcode,
        stock_quantity: row.stockQuantity,
        track_inventory: row.trackInventory,
      })),
      variants: data.variants.map((row) => ({
        id: row.id,
        product_id: row.productId,
        title: row.title,
        sku: row.sku,
        barcode: row.barcode,
        stock_quantity: row.stockQuantity,
        track_inventory: row.trackInventory,
        is_active: row.isActive,
      })),
      movements: data.movements.map((row) => ({
        id: row.id,
        product_id: row.productId,
        variant_id: row.variantId,
        movement_type: row.movementType,
        quantity_delta: row.quantityDelta,
        note: row.note,
        reference_type: row.referenceType,
        created_at: row.createdAt,
      })),
    };
  },

  adjustInventory: adminCommerceService.adjustInventory,

  async listOrders(limit?: number): Promise<OrderDto[]> {
    return (await adminCommerceService.listOrders(limit)).map((row) => ({
      id: row.id,
      order_number: row.orderNumber,
      status: row.status,
      payment_status: row.paymentStatus,
      payment_method: row.paymentMethod,
      customer_name: row.customerName,
      customer_phone: row.customerPhone,
      customer_email: row.customerEmail,
      delivery_address: row.deliveryAddress,
      city: row.city,
      notes: row.notes,
      customer_reference: row.customerReference,
      currency: row.currency,
      subtotal: row.subtotal,
      shipping_total: row.shippingTotal,
      discount_total: row.discountTotal,
      total: row.total,
      source: row.source,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    }));
  },

  async getOrderItems(orderId: string): Promise<OrderItemDto[]> {
    return (await adminCommerceService.getOrderItems(orderId)).map((row) => ({
      id: row.id,
      order_id: row.orderId,
      title: row.title,
      variant_title: row.variantTitle,
      sku: row.sku,
      unit_price: row.unitPrice,
      quantity: row.quantity,
      line_total: row.lineTotal,
      options: row.options,
    }));
  },

  updateOrderState: adminCommerceService.updateOrderState,

  async listCustomers(): Promise<CustomerDto[]> {
    return (await adminCommerceService.listCustomers()).map((row) => ({
      id: row.id,
      phone: row.phone,
      phone_normalized: row.phoneNormalized,
      name: row.name,
      email: row.email,
      city: row.city,
      default_address: row.defaultAddress,
      internal_notes: row.internalNotes,
      tags: row.tags,
      is_vip: row.isVip,
      is_blocked: row.isBlocked,
      total_orders: row.totalOrders,
      total_spent: row.totalSpent,
      last_order_at: row.lastOrderAt,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    }));
  },

  async getCustomerOrders(phone: string, limit?: number): Promise<CustomerOrderDto[]> {
    return (await adminCommerceService.getCustomerOrders(phone, limit)).map((row) => ({
      id: row.id,
      order_number: row.orderNumber,
      status: row.status,
      payment_status: row.paymentStatus,
      total: row.total,
      currency: row.currency,
      created_at: row.createdAt,
    }));
  },

  updateCustomerProfile: adminCommerceService.updateCustomerProfile,
};
