import { supabaseAdminCommerceRepository } from "@/commerce/adapters/supabaseAdminCommerceRepository";
import type { OrderStatus, PaymentStatus } from "@/commerce/core/models";
import type {
  AdminCommerceRepository,
  CustomerProfilePatch,
  InventoryAdjustmentCommand,
} from "@/commerce/core/ports";

export function createAdminCommerceService(repository: AdminCommerceRepository) {
  return {
    getCatalogOverview: () => repository.getCatalogOverview(),
    getInventoryWorkspace: () => repository.getInventoryWorkspace(),
    adjustInventory: (command: InventoryAdjustmentCommand) => repository.adjustInventory(command),

    listOrders: (limit?: number) => repository.listOrders(limit),
    getOrderItems: (orderId: string) => repository.getOrderItems(orderId),
    updateOrderState: (
      orderId: string,
      state: { status: OrderStatus; paymentStatus: PaymentStatus },
    ) => repository.updateOrderState(orderId, state),

    listCustomers: () => repository.listCustomers(),
    getCustomerOrders: (phone: string, limit?: number) =>
      repository.getCustomerOrders(phone, limit),
    updateCustomerProfile: (customerId: string, patch: CustomerProfilePatch) =>
      repository.updateCustomerProfile(customerId, patch),
  };
}

export const adminCommerceService = createAdminCommerceService(supabaseAdminCommerceRepository);
