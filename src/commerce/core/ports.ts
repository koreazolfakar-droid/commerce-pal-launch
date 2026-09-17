import type {
  CatalogOverviewSnapshot,
  CommerceCustomer,
  CommerceOrder,
  CommerceOrderItem,
  CustomerOrderSummary,
  InventoryWorkspaceSnapshot,
  OrderStatus,
  PaymentStatus,
} from "@/commerce/core/models";

export type InventoryAdjustmentCommand = {
  productId: string;
  variantId: string | null;
  quantityDelta: number;
  note: string | null;
};

export type CustomerProfilePatch = {
  internalNotes: string | null;
  tags: string[];
  isVip: boolean;
  isBlocked: boolean;
};

export interface AdminCommerceRepository {
  getCatalogOverview(): Promise<CatalogOverviewSnapshot>;
  getInventoryWorkspace(): Promise<InventoryWorkspaceSnapshot>;
  adjustInventory(command: InventoryAdjustmentCommand): Promise<void>;

  listOrders(limit?: number): Promise<CommerceOrder[]>;
  getOrderItems(orderId: string): Promise<CommerceOrderItem[]>;
  updateOrderState(
    orderId: string,
    state: { status: OrderStatus; paymentStatus: PaymentStatus },
  ): Promise<void>;

  listCustomers(): Promise<CommerceCustomer[]>;
  getCustomerOrders(phone: string, limit?: number): Promise<CustomerOrderSummary[]>;
  updateCustomerProfile(customerId: string, patch: CustomerProfilePatch): Promise<void>;
}
