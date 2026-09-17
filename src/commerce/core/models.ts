export type CommerceSource = "native" | "shopify";
export type ProductStatus = "draft" | "active" | "archived";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "refunded" | "partially_refunded";

export type Money = {
  amount: number;
  currency: string;
};

export type CommerceProductSummary = {
  id: string;
  source: CommerceSource;
  title: string;
  handle: string;
  brandId: string | null;
  categoryId: string | null;
  status: ProductStatus;
  price: Money;
  stockQuantity: number;
  updatedAt: string;
};

export type CommerceVariantSummary = {
  id: string;
  source: CommerceSource;
  productId: string;
  title?: string;
  sku?: string | null;
  barcode?: string | null;
  stockQuantity: number;
  trackInventory: boolean;
  isActive: boolean;
};

export type CommerceProductImage = {
  id: string;
  productId: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
};

export type CommerceBrand = {
  id: string;
  name: string;
};

export type CommerceCategory = {
  id: string;
  name: string;
};

export type CatalogOverviewSnapshot = {
  products: CommerceProductSummary[];
  variants: CommerceVariantSummary[];
  images: CommerceProductImage[];
  brands: CommerceBrand[];
  categories: CommerceCategory[];
};

export type InventoryProduct = {
  id: string;
  title: string;
  handle: string;
  status: string;
  sku: string | null;
  barcode: string | null;
  stockQuantity: number;
  trackInventory: boolean;
};

export type InventoryVariant = {
  id: string;
  productId: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  stockQuantity: number;
  trackInventory: boolean;
  isActive: boolean;
};

export type InventoryMovement = {
  id: string;
  productId: string;
  variantId: string | null;
  movementType: string;
  quantityDelta: number;
  note: string | null;
  referenceType: string | null;
  createdAt: string;
};

export type InventoryWorkspaceSnapshot = {
  products: InventoryProduct[];
  variants: InventoryVariant[];
  movements: InventoryMovement[];
};

export type CommerceOrder = {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: "cash" | "whish";
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  deliveryAddress: string | null;
  city: string | null;
  notes: string | null;
  customerReference: string | null;
  currency: string;
  subtotal: number;
  shippingTotal: number;
  discountTotal: number;
  total: number;
  source: string;
  createdAt: string;
  updatedAt: string;
};

export type CommerceOrderItem = {
  id: string;
  orderId: string;
  title: string;
  variantTitle: string | null;
  sku: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  options: Record<string, unknown>;
};

export type CommerceCustomer = {
  id: string;
  phone: string;
  phoneNormalized: string;
  name: string;
  email: string | null;
  city: string | null;
  defaultAddress: string | null;
  internalNotes: string | null;
  tags: string[];
  isVip: boolean;
  isBlocked: boolean;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerOrderSummary = {
  id: string;
  orderNumber: number;
  status: string;
  paymentStatus: string;
  total: number;
  currency: string;
  createdAt: string;
};
