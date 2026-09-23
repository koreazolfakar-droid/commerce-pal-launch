import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

test("customer address ownership is protected by RLS and private media paths", async () => {
  const sql = await read("supabase/migrations/20260922210000_customer_profile_saved_addresses.sql");

  assert.match(sql, /store_customer_profiles/);
  assert.match(sql, /store_customer_addresses/);
  assert.match(sql, /auth\.uid\(\)\s*=\s*user_id/);
  assert.match(sql, /store_customer_addresses_one_default_uidx/);
  assert.match(sql, /store_customer_addresses_one_draft_uidx/);
  assert.match(sql, /finalize_customer_address/);
  assert.match(sql, /address location required/);
  assert.match(sql, /customer-address-media/);
  assert.match(sql, /storage\.foldername\(name\)/);
  assert.match(sql, /auth\.uid\(\)::text/);
  assert.doesNotMatch(sql, /to\s+anon\s+using\s*\(\s*true\s*\)/i);
});

test("root exposes one shared account and address state", async () => {
  const [root, provider] = await Promise.all([
    read("src/routes/__root.tsx"),
    read("src/components/customer-account/CustomerAccountProvider.tsx"),
  ]);

  assert.match(root, /CustomerAccountProvider/);
  assert.match(root, /CustomerAddressHub/);
  assert.match(provider, /getOrCreateAddressDraft/);
  assert.match(provider, /selected-address/);
  assert.match(provider, /setDefaultAddress/);
  assert.match(provider, /resumeAfterAuth/);
});

test("address flow implements map, type, details, autosave and optional media", async () => {
  const [hub, map] = await Promise.all([
    read("src/components/customer-account/CustomerAddressHub.tsx"),
    read("src/components/customer-account/GoogleDeliveryMap.tsx"),
  ]);

  for (const type of ["apartment", "house_villa", "compound", "office", "hotel", "other"]) {
    assert.match(hub, new RegExp('"' + type + '"'));
  }

  assert.match(hub, /scheduleSave/);
  assert.match(hub, /650/);
  assert.match(hub, /MediaRecorder/);
  assert.match(hub, /30_000/);
  assert.match(hub, /uploadAddressMedia/);
  assert.match(hub, /accept="image\/\*"/);
  assert.match(hub, /completeDraft/);

  assert.match(map, /VITE_GOOGLE_MAPS_API_KEY/);
  assert.match(map, /draggable:\s*true/);
  assert.match(map, /Geocoder/);
  assert.match(map, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(map, /reverseGeocode/);
  assert.match(map, /region:\s*"LB"/);
});

test("saved address selector is available in mobile and desktop chrome", async () => {
  const [desktop, mobile] = await Promise.all([
    read("src/components/SiteHeader.tsx"),
    read("src/components/MobileTopBar.tsx"),
  ]);

  assert.match(desktop, /CustomerAddressSelector/);
  assert.match(desktop, /variant="desktop"/);
  assert.match(mobile, /CustomerAddressSelector/);
  assert.match(mobile, /variant="mobile"/);
});

test("checkout consumes the selected saved address and immutable map snapshot", async () => {
  const [checkout, orderCheckout] = await Promise.all([
    read("src/components/CheckoutDetailsForm.tsx"),
    read("src/lib/orderCheckout.ts"),
  ]);

  assert.match(checkout, /useCustomerAccount/);
  assert.match(checkout, /selectedAddress/);
  assert.match(checkout, /addressCheckoutText/);
  assert.match(checkout, /selectedAddress\.latitude/);
  assert.match(checkout, /selectedAddress\.longitude/);
  assert.match(orderCheckout, /delivery_location/);
});


test("customer can only read order history through verified auth identity", async () => {
  const [sql, data, hub, checkout] = await Promise.all([
    read("supabase/migrations/20260922210000_customer_profile_saved_addresses.sql"),
    read("src/lib/customerAccount.ts"),
    read("src/components/customer-account/CustomerAddressHub.tsx"),
    read("src/components/CheckoutDetailsForm.tsx"),
  ]);

  assert.match(sql, /get_my_store_orders/);
  assert.match(sql, /get_my_store_order_items/);
  assert.match(sql, /from auth\.users/);
  assert.match(sql, /where id = auth\.uid\(\)/);
  assert.match(sql, /customer_email/);
  assert.match(sql, /customer_phone/);
  assert.doesNotMatch(sql, /store_customer_profiles[\s\S]{0,400}get_my_store_orders/i);

  assert.match(data, /loadMyOrders/);
  assert.match(data, /loadMyOrderItems/);
  assert.match(hub, /view === "orders"/);
  assert.match(hub, /My orders/);
  assert.match(hub, /View delivery location/);
  assert.match(checkout, /email: profile\?\.email\?\.trim\(\) \|\| undefined/);
});
