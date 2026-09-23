import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("customer login is visible in desktop and mobile store chrome", async () => {
  const [desktop, mobile] = await Promise.all([
    read("src/components/SiteHeader.tsx"),
    read("src/components/MobileTopBar.tsx"),
  ]);

  assert.match(desktop, /CustomerAccountButton/);
  assert.match(desktop, /variant="utility"/);
  assert.match(mobile, /CustomerAccountButton/);
  assert.match(mobile, /variant="icon"/);
});

test("customer auth supports Google PKCE and passwordless phone OTP", async () => {
  const [dialog, client, provider] = await Promise.all([
    read("src/components/customer-auth/CustomerAuthDialog.tsx"),
    read("src/integrations/supabase/client.ts"),
    read("src/components/customer-auth/CustomerAuthProvider.tsx"),
  ]);

  assert.match(dialog, /signInWithOAuth/);
  assert.match(dialog, /provider:\s*"google"/);
  assert.match(dialog, /redirectTo:\s*window\.location\.origin/);
  assert.match(client, /flowType:\s*"pkce"/);
  assert.match(client, /detectSessionInUrl:\s*false/);
  assert.match(provider, /exchangeCodeForSession/);
  assert.match(provider, /clearOAuthQueryParams/);
  assert.match(provider, /access_denied/);
  assert.match(dialog, /signInWithOtp/);
  assert.match(dialog, /verifyOtp/);
  assert.match(dialog, /type:\s*"sms"/);
  assert.match(dialog, /OTP_COOLDOWN_SECONDS\s*=\s*60/);
  assert.match(dialog, /shouldCreateUser:\s*true/);
  assert.doesNotMatch(dialog, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("customer session is shared at the root and cleaned up safely", async () => {
  const [root, provider] = await Promise.all([
    read("src/routes/__root.tsx"),
    read("src/components/customer-auth/CustomerAuthProvider.tsx"),
  ]);

  assert.match(root, /CustomerAuthProvider/);
  assert.match(root, /CustomerAuthDialog/);
  assert.match(provider, /onAuthStateChange/);
  assert.match(provider, /subscription\?\.unsubscribe\(\)/);
  assert.match(provider, /supabase\.auth\.signOut\(\)/);
  assert.doesNotMatch(provider, /service_role/i);
});


test("mobile drawer exposes the real customer account and avoids duplicated discovery blocks", async () => {
  const mobileMenu = await read("src/components/MobileMenu.tsx");

  assert.match(mobileMenu, /useCustomerAuth/);
  assert.match(mobileMenu, /useCustomerAccount/);
  assert.match(mobileMenu, /cmsQueryOptions/);
  assert.match(mobileMenu, /cms\?\.settings\["logo_url"\]/);
  assert.match(mobileMenu, /data-testid="mobile-menu-brand"/);
  assert.match(mobileMenu, /src=\{logoUrl\}/);
  assert.match(mobileMenu, /My Profile/);
  assert.match(mobileMenu, /to="\/my-orders"/);
  assert.match(mobileMenu, /to="\/wishlist"/);
  assert.match(mobileMenu, /openAccountHub/);
  assert.match(mobileMenu, /to="\/brands"/);
  assert.match(mobileMenu, /to="\/contact"/);
  assert.match(mobileMenu, /to="\/shipping"/);
  assert.match(mobileMenu, /to="\/returns"/);
  assert.doesNotMatch(mobileMenu, /collectionsQueryOptions/);
  assert.doesNotMatch(mobileMenu, /displayCollections/);
  assert.doesNotMatch(mobileMenu, /SHOP_ACCOUNT_URL/);
  assert.match(mobileMenu, /overflow-x-hidden overflow-y-auto overscroll-x-none/);
  assert.match(mobileMenu, /data-testid="mobile-menu-brand-rail"/);
  assert.match(mobileMenu, /overscroll-x-contain/);
  assert.match(mobileMenu, /touch-pan-x/);
});
