import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { looseSupabase } from "@/integrations/supabase/looseClient";

const MEDIA_BUCKET = "customer-address-media";

export type CustomerAddressType =
  | "apartment"
  | "house_villa"
  | "compound"
  | "office"
  | "hotel"
  | "other";

export type CustomerProfile = {
  userId: string;
  fullName: string;
  phone: string;
  email: string;
};

export type CustomerOrderSummary = {
  orderId: string;
  orderNumber: number;
  publicOrderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  currency: string;
  subtotal: number;
  shippingTotal: number;
  discountTotal: number;
  total: number;
  deliveryAddress: string;
  city: string;
  deliveryLocation: { latitude?: number; longitude?: number } | null;
  createdAt: string;
  completedAt: string;
};

export type CustomerOrderItem = {
  itemId: string;
  productId: string;
  variantId: string;
  title: string;
  variantTitle: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  options: Record<string, unknown>;
};

export type CustomerAddress = {
  id: string;
  userId: string;
  nickname: string;
  addressType: CustomerAddressType | null;
  formattedAddress: string;
  areaStreet: string;
  buildingName: string;
  buildingNumber: string;
  floor: string;
  unit: string;
  doorDetails: string;
  phone: string;
  deliveryInstructions: string;
  latitude: number | null;
  longitude: number | null;
  placeId: string;
  photoPaths: string[];
  voiceNotePath: string;
  editingAddressId: string;
  isDefault: boolean;
  isDraft: boolean;
  draftStep: number;
  createdAt: string;
  updatedAt: string;
};

export type AddressPatch = Partial<
  Pick<
    CustomerAddress,
    | "nickname"
    | "addressType"
    | "formattedAddress"
    | "areaStreet"
    | "buildingName"
    | "buildingNumber"
    | "floor"
    | "unit"
    | "doorDetails"
    | "phone"
    | "deliveryInstructions"
    | "latitude"
    | "longitude"
    | "placeId"
    | "photoPaths"
    | "voiceNotePath"
    | "draftStep"
  >
>;

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function nullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toAddress(row: Record<string, unknown>): CustomerAddress {
  return {
    id: text(row.id),
    userId: text(row.user_id),
    nickname: text(row.nickname),
    addressType:
      row.address_type === "apartment" ||
      row.address_type === "house_villa" ||
      row.address_type === "compound" ||
      row.address_type === "office" ||
      row.address_type === "hotel" ||
      row.address_type === "other"
        ? row.address_type
        : null,
    formattedAddress: text(row.formatted_address),
    areaStreet: text(row.area_street),
    buildingName: text(row.building_name),
    buildingNumber: text(row.building_number),
    floor: text(row.floor),
    unit: text(row.unit),
    doorDetails: text(row.door_details),
    phone: text(row.phone),
    deliveryInstructions: text(row.delivery_instructions),
    latitude: nullableNumber(row.latitude),
    longitude: nullableNumber(row.longitude),
    placeId: text(row.place_id),
    photoPaths: Array.isArray(row.photo_paths)
      ? row.photo_paths.filter((value): value is string => typeof value === "string")
      : [],
    voiceNotePath: text(row.voice_note_path),
    editingAddressId: text(row.editing_address_id),
    isDefault: row.is_default === true,
    isDraft: row.is_draft !== false,
    draftStep:
      typeof row.draft_step === "number" && Number.isFinite(row.draft_step)
        ? row.draft_step
        : 1,
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

function toProfile(row: Record<string, unknown>, userId: string): CustomerProfile {
  return {
    userId,
    fullName: text(row.full_name),
    phone: text(row.phone),
    email: text(row.email),
  };
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toOrder(row: Record<string, unknown>): CustomerOrderSummary {
  const deliveryLocation =
    row.delivery_location && typeof row.delivery_location === "object"
      ? (row.delivery_location as { latitude?: number; longitude?: number })
      : null;

  return {
    orderId: text(row.order_id),
    orderNumber: number(row.order_number),
    publicOrderNumber: text(row.public_order_number) || String(number(row.order_number)),
    status: text(row.status),
    paymentStatus: text(row.payment_status),
    paymentMethod: text(row.payment_method),
    currency: text(row.currency) || "USD",
    subtotal: number(row.subtotal),
    shippingTotal: number(row.shipping_total),
    discountTotal: number(row.discount_total),
    total: number(row.total),
    deliveryAddress: text(row.delivery_address),
    city: text(row.city),
    deliveryLocation,
    createdAt: text(row.created_at),
    completedAt: text(row.completed_at),
  };
}

function toOrderItem(row: Record<string, unknown>): CustomerOrderItem {
  return {
    itemId: text(row.item_id),
    productId: text(row.product_id),
    variantId: text(row.variant_id),
    title: text(row.title),
    variantTitle: text(row.variant_title),
    sku: text(row.sku),
    unitPrice: number(row.unit_price),
    quantity: number(row.quantity),
    lineTotal: number(row.line_total),
    options:
      row.options && typeof row.options === "object" && !Array.isArray(row.options)
        ? (row.options as Record<string, unknown>)
        : {},
  };
}

function metadataName(user: User) {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const candidate =
    (typeof metadata?.["full_name"] === "string" && metadata["full_name"]) ||
    (typeof metadata?.["name"] === "string" && metadata["name"]) ||
    "";
  return candidate.trim();
}

function mapAddressPatch(patch: AddressPatch): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if ("nickname" in patch) payload.nickname = patch.nickname || null;
  if ("addressType" in patch) payload.address_type = patch.addressType;
  if ("formattedAddress" in patch) payload.formatted_address = patch.formattedAddress || null;
  if ("areaStreet" in patch) payload.area_street = patch.areaStreet || null;
  if ("buildingName" in patch) payload.building_name = patch.buildingName || null;
  if ("buildingNumber" in patch) payload.building_number = patch.buildingNumber || null;
  if ("floor" in patch) payload.floor = patch.floor || null;
  if ("unit" in patch) payload.unit = patch.unit || null;
  if ("doorDetails" in patch) payload.door_details = patch.doorDetails || null;
  if ("phone" in patch) payload.phone = patch.phone || null;
  if ("deliveryInstructions" in patch) {
    payload.delivery_instructions = patch.deliveryInstructions || null;
  }
  if ("latitude" in patch) payload.latitude = patch.latitude;
  if ("longitude" in patch) payload.longitude = patch.longitude;
  if ("placeId" in patch) payload.place_id = patch.placeId || null;
  if ("photoPaths" in patch) payload.photo_paths = patch.photoPaths ?? [];
  if ("voiceNotePath" in patch) payload.voice_note_path = patch.voiceNotePath || null;
  if ("draftStep" in patch) payload.draft_step = patch.draftStep;
  return payload;
}

function throwError(error: { message?: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback);
}

export async function ensureCustomerProfile(user: User): Promise<CustomerProfile> {
  const { data: current, error: readError } = await looseSupabase
    .from("store_customer_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  throwError(readError, "Loading customer profile failed");

  if (current && typeof current === "object") {
    const row = current as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    if (!text(row.full_name) && metadataName(user)) patch.full_name = metadataName(user);
    if (!text(row.phone) && user.phone) patch.phone = user.phone;
    if (!text(row.email) && user.email) patch.email = user.email;
    if (Object.keys(patch).length > 0) {
      const { data: updated, error } = await looseSupabase
        .from("store_customer_profiles")
        .update(patch)
        .eq("user_id", user.id)
        .select("*")
        .single();
      throwError(error, "Updating customer profile failed");
      return toProfile(updated as Record<string, unknown>, user.id);
    }
    return toProfile(row, user.id);
  }

  const { data, error } = await looseSupabase
    .from("store_customer_profiles")
    .insert({
      user_id: user.id,
      full_name: metadataName(user) || null,
      phone: user.phone || null,
      email: user.email || null,
    })
    .select("*")
    .single();
  throwError(error, "Creating customer profile failed");
  return toProfile(data as Record<string, unknown>, user.id);
}

export async function updateCustomerProfile(
  userId: string,
  patch: Partial<Pick<CustomerProfile, "fullName" | "phone" | "email">>,
) {
  const payload: Record<string, unknown> = {};
  if ("fullName" in patch) payload.full_name = patch.fullName?.trim() || null;
  if ("phone" in patch) payload.phone = patch.phone?.trim() || null;
  if ("email" in patch) payload.email = patch.email?.trim() || null;

  const { data, error } = await looseSupabase
    .from("store_customer_profiles")
    .update(payload)
    .eq("user_id", userId)
    .select("*")
    .single();
  throwError(error, "Saving customer profile failed");
  return toProfile(data as Record<string, unknown>, userId);
}

type CustomerOrdersEdgeResponse = {
  ok?: boolean;
  orders?: Record<string, unknown>[];
  items?: Record<string, unknown>[];
  error?: string;
};

export async function loadMyOrders(limit = 30): Promise<CustomerOrderSummary[]> {
  const { data, error } = await supabase.functions.invoke<CustomerOrdersEdgeResponse>(
    "customer-orders",
    {
      body: {
        action: "list",
        limit: Math.max(1, Math.min(limit, 100)),
      },
    },
  );
  throwError(error, "Loading customer orders failed");
  if (!data?.ok) throw new Error(data?.error || "Loading customer orders failed");
  return Array.isArray(data.orders) ? data.orders.map((row) => toOrder(row)) : [];
}

export async function loadMyOrderItems(orderId: string): Promise<CustomerOrderItem[]> {
  const { data, error } = await supabase.functions.invoke<CustomerOrdersEdgeResponse>(
    "customer-orders",
    {
      body: {
        action: "items",
        order_id: orderId,
      },
    },
  );
  throwError(error, "Loading order items failed");
  if (!data?.ok) throw new Error(data?.error || "Loading order items failed");
  return Array.isArray(data.items) ? data.items.map((row) => toOrderItem(row)) : [];
}

export async function loadCustomerAddresses(userId: string): Promise<CustomerAddress[]> {
  const { data, error } = await looseSupabase
    .from("store_customer_addresses")
    .select("*")
    .eq("user_id", userId)
    .eq("is_draft", false)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });
  throwError(error, "Loading saved addresses failed");

  return Array.isArray(data)
    ? data.map((row) => toAddress(row as Record<string, unknown>))
    : [];
}

async function loadAddressDraft(userId: string): Promise<CustomerAddress | null> {
  const { data, error } = await looseSupabase
    .from("store_customer_addresses")
    .select("*")
    .eq("user_id", userId)
    .eq("is_draft", true)
    .maybeSingle();
  throwError(error, "Loading address draft failed");
  return data && typeof data === "object"
    ? toAddress(data as Record<string, unknown>)
    : null;
}

async function discardAddressDraft(userId: string, draft: CustomerAddress) {
  const draftPrefix = userId + "/" + draft.id + "/";
  const ownedPaths = [...draft.photoPaths, draft.voiceNotePath].filter(
    (path) => path && path.startsWith(draftPrefix),
  );
  if (ownedPaths.length) {
    const { error: mediaError } = await supabase.storage.from(MEDIA_BUCKET).remove(ownedPaths);
    throwError(mediaError, "Removing abandoned address media failed");
  }

  const { error } = await looseSupabase
    .from("store_customer_addresses")
    .delete()
    .eq("id", draft.id)
    .eq("user_id", userId)
    .eq("is_draft", true);
  throwError(error, "Discarding address draft failed");
}

export async function getOrCreateAddressDraft(userId: string): Promise<CustomerAddress> {
  const existing = await loadAddressDraft(userId);
  if (existing && !existing.editingAddressId) return existing;
  if (existing) await discardAddressDraft(userId, existing);

  const { data, error } = await looseSupabase
    .from("store_customer_addresses")
    .insert({ user_id: userId, is_draft: true, draft_step: 1 })
    .select("*")
    .single();
  throwError(error, "Creating address draft failed");
  return toAddress(data as Record<string, unknown>);
}

export async function startAddressEdit(
  userId: string,
  addressId: string,
): Promise<CustomerAddress> {
  const existing = await loadAddressDraft(userId);
  if (existing?.editingAddressId === addressId) return existing;
  if (existing) await discardAddressDraft(userId, existing);

  const { data, error } = await looseSupabase.rpc("start_customer_address_edit", {
    p_address_id: addressId,
  });
  throwError(error, "Starting address edit failed");
  return toAddress(data as Record<string, unknown>);
}

export async function saveAddressDraft(
  userId: string,
  addressId: string,
  patch: AddressPatch,
): Promise<CustomerAddress> {
  const { data, error } = await looseSupabase
    .from("store_customer_addresses")
    .update(mapAddressPatch(patch))
    .eq("id", addressId)
    .eq("user_id", userId)
    .eq("is_draft", true)
    .select("*")
    .single();
  throwError(error, "Saving address draft failed");
  return toAddress(data as Record<string, unknown>);
}

export async function finalizeAddress(addressId: string): Promise<CustomerAddress> {
  const { data, error } = await looseSupabase.rpc("finalize_customer_address", {
    p_address_id: addressId,
  });
  throwError(error, "Finalizing address failed");
  return toAddress(data as Record<string, unknown>);
}

export async function setDefaultAddress(addressId: string): Promise<CustomerAddress> {
  const { data, error } = await looseSupabase.rpc("set_customer_default_address", {
    p_address_id: addressId,
  });
  throwError(error, "Updating default address failed");
  return toAddress(data as Record<string, unknown>);
}

export async function deleteAddress(userId: string, address: CustomerAddress) {
  for (const path of [...address.photoPaths, address.voiceNotePath].filter(Boolean)) {
    const { error: mediaError } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    throwError(mediaError, "Deleting address media failed");
  }
  const { error } = await looseSupabase
    .from("store_customer_addresses")
    .delete()
    .eq("id", address.id)
    .eq("user_id", userId);
  throwError(error, "Deleting address failed");
}

function extensionFromFile(file: File) {
  const nameExtension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (nameExtension && nameExtension.length <= 8) return nameExtension;
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "audio/webm") return "webm";
  if (file.type === "audio/mp4") return "m4a";
  return "bin";
}

export async function createAddressMediaUrls(paths: string[]) {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  if (!uniquePaths.length) return {} as Record<string, string>;

  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrls(uniquePaths, 60 * 60);
  throwError(error, "Loading address media failed");

  const urls: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
  }
  return urls;
}

export async function removeAddressMedia(path: string) {
  if (!path) return;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
  throwError(error, "Removing address media failed");
}

export async function uploadAddressMedia(args: {
  userId: string;
  addressId: string;
  file: File;
  kind: "photo" | "voice";
}) {
  const extension = extensionFromFile(args.file);
  const path =
    args.userId +
    "/" +
    args.addressId +
    "/" +
    args.kind +
    "-" +
    crypto.randomUUID() +
    "." +
    extension;
  const contentType = args.file.type?.split(";")[0] || undefined;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, args.file, {
    cacheControl: "3600",
    upsert: false,
    contentType,
  });
  throwError(error, "Uploading address media failed");
  return path;
}

export function addressDisplayLine(address: CustomerAddress) {
  return (
    address.areaStreet ||
    address.formattedAddress ||
    [address.buildingName, address.buildingNumber].filter(Boolean).join(" ") ||
    address.nickname
  );
}

export function addressCheckoutText(address: CustomerAddress) {
  return [
    address.formattedAddress || address.areaStreet,
    address.buildingName
      ? address.buildingName + (address.buildingNumber ? " " + address.buildingNumber : "")
      : address.buildingNumber,
    address.floor ? "Floor: " + address.floor : "",
    address.unit ? "Unit: " + address.unit : "",
    address.doorDetails,
    address.deliveryInstructions,
  ]
    .filter(Boolean)
    .join(", ");
}
