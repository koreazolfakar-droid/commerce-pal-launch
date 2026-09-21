import { supabase } from "@/integrations/supabase/client";
import type { CartItem } from "@/stores/cartStore";

const CHECKOUT_ATTEMPT_KEY = "space-call-checkout-attempt-v2";
const CHECKOUT_ATTEMPT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type CheckoutAttempt = {
  fingerprint: string;
  idempotencyKey: string;
  createdAt: number;
};

let volatileAttempt: CheckoutAttempt | null = null;

export type CreatedStoreOrder = {
  order_id: string;
  order_number: number;
  currency: string;
  subtotal: number;
  shipping_total: number;
  delivery_type: "paid" | "free" | "pending";
  total: number;
  status: string;
  version: number;
  replayed: boolean;
};

type CreateStoreOrderResponse = {
  ok: boolean;
  order?: CreatedStoreOrder;
  error?: string;
};

export class StoreOrderError extends Error {
  code: string;

  constructor(code: string) {
    super(code);
    this.name = "StoreOrderError";
    this.code = code;
  }
}

function randomIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function cartFingerprint(items: CartItem[]) {
  return items
    .map((item) => `${item.product.node.id}:${item.variantId}:${item.quantity}`)
    .sort()
    .join("|");
}

export function checkoutIdempotencyKey(items: CartItem[]) {
  const fingerprint = cartFingerprint(items);
  const now = Date.now();

  if (
    volatileAttempt?.fingerprint === fingerprint &&
    now - volatileAttempt.createdAt < CHECKOUT_ATTEMPT_MAX_AGE_MS
  ) {
    return volatileAttempt.idempotencyKey;
  }

  try {
    const raw = window.localStorage.getItem(CHECKOUT_ATTEMPT_KEY);
    if (raw) {
      const existing = JSON.parse(raw) as Partial<CheckoutAttempt>;
      if (
        existing.fingerprint === fingerprint &&
        typeof existing.idempotencyKey === "string" &&
        existing.idempotencyKey.length >= 16 &&
        typeof existing.createdAt === "number" &&
        now - existing.createdAt < CHECKOUT_ATTEMPT_MAX_AGE_MS
      ) {
        volatileAttempt = existing as CheckoutAttempt;
        return existing.idempotencyKey;
      }
    }
  } catch {
    // Checkout still works when storage is unavailable.
  }

  const idempotencyKey = randomIdempotencyKey();
  const attempt = { fingerprint, idempotencyKey, createdAt: now } satisfies CheckoutAttempt;
  volatileAttempt = attempt;
  try {
    window.localStorage.setItem(CHECKOUT_ATTEMPT_KEY, JSON.stringify(attempt));
  } catch {
    // Idempotency still protects double-clicks in the current submit call.
  }
  return idempotencyKey;
}

export function clearCheckoutAttempt() {
  volatileAttempt = null;
  try {
    window.localStorage.removeItem(CHECKOUT_ATTEMPT_KEY);
  } catch {
    // Storage is optional.
  }
}

async function edgeErrorCode(error: unknown) {
  const context = (error as { context?: unknown } | null)?.context;
  if (typeof Response !== "undefined" && context instanceof Response) {
    try {
      const payload = (await context.clone().json()) as { error?: unknown };
      if (typeof payload.error === "string" && payload.error) return payload.error;
    } catch {
      // Fall through to the generic function error below.
    }
  }

  const message = error instanceof Error ? error.message : "";
  return message || "order_failed";
}

export async function createStorefrontOrder(input: {
  items: CartItem[];
  customer: {
    name: string;
    phone: string;
    address: string;
    city: string;
    email?: string;
  };
  paymentMethod: "cash" | "whish";
  expectedSubtotal: number;
  expectedDeliveryFee: number;
  notes?: string;
  reference?: string;
  deliveryLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null;
}): Promise<CreatedStoreOrder> {
  const body = {
    idempotency_key: checkoutIdempotencyKey(input.items),
    customer: {
      name: input.customer.name,
      phone: input.customer.phone,
      address: input.customer.address,
      city: input.customer.city,
      ...(input.customer.email ? { email: input.customer.email } : {}),
    },
    items: input.items.map((item) => ({
      product_id: item.product.node.id,
      variant_id: item.variantId,
      quantity: item.quantity,
    })),
    payment_method: input.paymentMethod,
    expected_subtotal: Number(input.expectedSubtotal.toFixed(2)),
    expected_delivery_fee: Number(input.expectedDeliveryFee.toFixed(2)),
    notes: input.notes || undefined,
    reference: input.reference || undefined,
    delivery_location: input.deliveryLocation || undefined,
  };

  const { data, error } = await supabase.functions.invoke<CreateStoreOrderResponse>("create-order", {
    body,
  });

  if (error) throw new StoreOrderError(await edgeErrorCode(error));
  if (!data?.ok || !data.order) throw new StoreOrderError(data?.error || "order_failed");

  const order = data.order;
  if (
    typeof order.order_id !== "string" ||
    !Number.isFinite(Number(order.order_number)) ||
    !Number.isFinite(Number(order.subtotal)) ||
    !Number.isFinite(Number(order.shipping_total)) ||
    !Number.isFinite(Number(order.total))
  ) {
    throw new StoreOrderError("invalid_order_response");
  }

  return {
    ...order,
    order_number: Number(order.order_number),
    subtotal: Number(order.subtotal),
    shipping_total: Number(order.shipping_total),
    total: Number(order.total),
    version: Number(order.version) || 1,
    replayed: Boolean(order.replayed),
  };
}
