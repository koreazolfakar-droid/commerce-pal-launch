import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

test("customer address ownership is protected by RLS and private media paths", async () => {
  const sql = await read("supabase/migrations/20260922210000_customer_profile_saved_addresses.sql");

  assert.match(sql, /store_customer_profiles/);
  assert.match(sql, /store_customer_addresses/);
  assert.match(sql, /auth\.uid\(\).*user_id/);
  assert.match(sql, /store_customer_addresses_one_default_uidx/);
  assert.match(sql, /store_customer_addresses_one_draft_uidx/);
  assert.match(sql, /finalize_customer_address/);
  assert.match(sql, /start_customer_address_edit/);
  assert.match(sql, /editing_address_id/);
  assert.match(sql, /address location required/);
  assert.match(sql, /customer-address-media/);
  assert.match(sql, /storage\.foldername\(name\)/);
  assert.match(sql, /auth\.uid\(\).*::text/);
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

test("saved address selector is available in desktop chrome and as a compact mobile header action", async () => {
  const [desktop, mobile, uiOverhaul] = await Promise.all([
    read("src/components/SiteHeader.tsx"),
    read("src/components/MobileTopBar.tsx"),
    read("src/ui-overhaul.css"),
  ]);

  assert.match(desktop, /CustomerAddressSelector/);
  assert.match(desktop, /variant="desktop"/);
  assert.match(mobile, /useCustomerAccount/);
  assert.match(mobile, /openAddressBook/);
  assert.match(mobile, /data-testid="mobile-header-location"/);
  assert.match(mobile, /<MapPin/);
  assert.match(mobile, /mobile-header-action/);
  assert.match(mobile, /grid-cols-\[2\.75rem_minmax\(0,1fr\)_5\.75rem\]/);
  assert.match(mobile, /CustomerAccountButton[\s\S]*variant="icon"/);
  assert.match(mobile, /ThemeToggle className="mobile-header-action h-11 w-11/);
  assert.match(mobile, /data-testid="mobile-header-location"[\s\S]*Deliver to/);
  assert.match(uiOverhaul, /\.mobile-header-action/);
  assert.match(uiOverhaul, /background:\s*transparent/);
  assert.match(uiOverhaul, /box-shadow:\s*none/);
  assert.match(mobile, /rounded-none bg-transparent shadow-none/);
  assert.doesNotMatch(mobile, /CustomerAddressSelector/);
  assert.doesNotMatch(mobile, /space-cell:open-cart/);
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


test("customer order history is isolated behind the JWT-verified edge function", async () => {
  const [edge, cleanup, data, hub, checkout] = await Promise.all([
    read("supabase/functions/customer-orders/index.ts"),
    read("supabase/migrations/20260923023000_customer_order_history_edge_only.sql"),
    read("src/lib/customerAccount.ts"),
    read("src/components/customer-account/CustomerAddressHub.tsx"),
    read("src/components/CheckoutDetailsForm.tsx"),
  ]);

  assert.match(edge, /db\.auth\.getUser\(token\)/);
  assert.match(edge, /customer_user_id/);
  assert.match(edge, /customer_email/);
  assert.match(edge, /customer_phone/);
  assert.match(edge, /orderIdentityMatches/);
  assert.match(edge, /action === "items"/);
  assert.match(cleanup, /drop function if exists public\.get_my_store_orders/);
  assert.match(cleanup, /drop function if exists public\.get_my_store_order_items/);

  assert.match(data, /functions\.invoke<CustomerOrdersEdgeResponse>/);
  assert.match(data, /"customer-orders"/);
  assert.match(hub, /view === "orders"/);
  assert.match(hub, /My orders/);
  assert.match(hub, /View delivery location/);
  assert.match(checkout, /email: user\?\.email\?\.trim\(\) \|\| undefined/);
});


test("authenticated checkouts are linked server-side and guest checkout remains supported", async () => {
  const edge = await read("supabase/functions/create-order/index.ts");

  assert.match(edge, /authenticatedBearerToken/);
  assert.match(edge, /db\.auth\.getUser\(userToken\)/);
  assert.match(edge, /customer_user_id: accountUserId/);
  assert.match(edge, /\.is\("customer_user_id", null\)/);
  assert.match(edge, /if \(userToken\)/);
  assert.match(edge, /const userToken = authenticatedBearerToken\(req\)/);
});
