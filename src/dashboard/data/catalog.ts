import { supabase } from "@/integrations/supabase/client";
import { assertDashboardPasswordNotPwned } from "@/dashboard/security/pwnedPassword";
import type { Tables } from "@/integrations/supabase/types";
import { invalidateNativeStoreCache } from "@/lib/nativeStore";
import { convertProductImageToWebp, type ProductImageConversionResult, type ProductImageResolution } from "@/dashboard/lib/imageProcessing";

type ProductRow = Tables<"store_products">;
type VariantRow = Tables<"store_product_variants">;
type ImageRow = Tables<"store_product_images">;

type ProductListRow = Pick<
  ProductRow,
  | "id"
  | "handle"
  | "title"
  | "description"
  | "brand_id"
  | "category_id"
  | "product_type"
  | "base_price"
  | "compare_at_price"
  | "stock_quantity"
  | "status"
  | "sku"
  | "barcode"
  | "seo_title"
  | "seo_description"
>;
type VariantListRow = Pick<
  VariantRow,
  "product_id" | "price" | "compare_at_price" | "sku" | "barcode" | "sort_order"
>;
type ImageListRow = Pick<ImageRow, "product_id" | "url" | "is_primary" | "sort_order">;
type ProductSearchRow = Pick<
  ProductRow,
  "id" | "title" | "brand_id" | "category_id" | "product_type" | "sku"
>;
type VariantSearchRow = Pick<VariantRow, "product_id" | "sku" | "sort_order">;

export type DashboardRole = "admin" | "editor";

export const dashboardTurnstileSiteKey =
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() ?? "";
export const isDashboardTurnstileConfigured = Boolean(dashboardTurnstileSiteKey);

export type DashboardSecurityEvent = {
  id: string;
  eventType: string;
  userAgent: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type DashboardSecuritySnapshot = {
  email: string;
  expiresAt: string | null;
  currentLevel: "aal1" | "aal2" | null;
  nextLevel: "aal1" | "aal2" | null;
  mfaRequired: boolean;
  mfaEnrolledAt: string | null;
  turnstileConfigured: boolean;
  events: DashboardSecurityEvent[];
};


export type DashboardMfaStatus = {
  role: DashboardRole;
  required: boolean;
  enrolledAt: string | null;
  authenticatedAt: string | null;
  currentLevel: "aal1" | "aal2" | null;
  nextLevel: "aal1" | "aal2" | null;
  verifiedFactorId: string | null;
  ready: boolean;
};

export type DashboardTotpEnrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
};

type DashboardMfaFactor = {
  id: string;
  status?: "verified" | "unverified";
  factor_type?: "totp" | "phone";
  friendly_name?: string | null;
};



export type DashboardBrand = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  logo: string | null;
};

export type DashboardCategory = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
};

export type DashboardCollection = {
  id: string;
  title: string;
  handle: string;
  active: boolean;
};

export type DashboardProduct = {
  id: string;
  handle: string;
  name: string;
  description: string;
  brand: string;
  brandId: string | null;
  category: string;
  categoryId: string | null;
  price: number;
  compareAt: number | null;
  stock: number;
  status: "Active" | "Draft" | "Archived";
  sku: string;
  barcode: string;
  image: string;
  seoTitle: string;
  seoDescription: string;
  variantCount: number;
};

export type DashboardProductSearchItem = {
  id: string;
  name: string;
  brand: string;
  category: string;
  sku: string;
};

export type DashboardProductInput = {
  id?: string;
  title: string;
  description: string;
  brandId: string | null;
  categoryId: string | null;
  status: DashboardProduct["status"];
  price: number;
  compareAt: number | null;
  sku: string;
  barcode: string;
  stock: number;
  imageUrl: string;
  seoTitle: string;
  seoDescription: string;
  collectionId: string | null;
};

function throwIfError(error: { message: string } | null, label: string) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

function statusFromDb(status: string): DashboardProduct["status"] {
  if (status === "active") return "Active";
  if (status === "archived") return "Archived";
  return "Draft";
}

function statusToDb(status: DashboardProduct["status"]) {
  return status.toLowerCase() as "active" | "draft" | "archived";
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "product";
}

const DASHBOARD_ROLE_CACHE_TTL_MS = 15_000;

let dashboardRoleCache:
  | { userId: string; role: DashboardRole; expiresAt: number }
  | null = null;
let dashboardRoleRequest:
  | { userId: string; promise: Promise<DashboardRole | null> }
  | null = null;

function clearDashboardRoleCache() {
  dashboardRoleCache = null;
  dashboardRoleRequest = null;
}

supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
    clearDashboardRoleCache();
  }
});

async function requireDashboardRole(): Promise<DashboardRole> {
  const role = await getDashboardRole();
  if (!role) throw new Error("Dashboard authentication is required.");
  return role;
}

export async function getDashboardRole(): Promise<DashboardRole | null> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    clearDashboardRoleCache();
    return null;
  }

  const userId = session.user.id;
  if (
    dashboardRoleCache?.userId === userId &&
    dashboardRoleCache.expiresAt > Date.now()
  ) {
    return dashboardRoleCache.role;
  }

  if (dashboardRoleRequest?.userId === userId) {
    return dashboardRoleRequest.promise;
  }

  const request = (async (): Promise<DashboardRole | null> => {
    // Validate the browser session with Supabase on cache misses. RLS remains the
    // authorization boundary for every data query; this only removes duplicate
    // role round-trips fired by parallel dashboard loaders.
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user || user.id !== userId) return null;

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;

    const role =
      data.role === "admin" || data.role === "editor" ? data.role : null;
    if (role) {
      dashboardRoleCache = {
        userId,
        role,
        expiresAt: Date.now() + DASHBOARD_ROLE_CACHE_TTL_MS,
      };
    }
    return role;
  })();

  dashboardRoleRequest = { userId, promise: request };
  try {
    return await request;
  } finally {
    if (dashboardRoleRequest?.promise === request) dashboardRoleRequest = null;
  }
}

type DashboardThrottleDecision = {
  allowed: boolean;
  retryAfter: number;
  remainingBeforeBlock?: number;
};

async function dashboardLoginThrottle(
  email: string,
  outcome: "check" | "failure" | "success",
): Promise<DashboardThrottleDecision> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return { allowed: true, retryAfter: 0 };

  const { data, error } = await supabase.functions.invoke("dashboard-auth-throttle", {
    body: { email: normalizedEmail, outcome },
  });

  if (error) {
    console.warn("[dashboard-security] login throttle unavailable", error.message);
    return { allowed: true, retryAfter: 0 };
  }

  const payload = data as Partial<DashboardThrottleDecision> | null;
  return {
    allowed: payload?.allowed !== false,
    retryAfter:
      typeof payload?.retryAfter === "number" && Number.isFinite(payload.retryAfter)
        ? Math.max(0, payload.retryAfter)
        : 0,
    remainingBeforeBlock:
      typeof payload?.remainingBeforeBlock === "number"
        ? Math.max(0, payload.remainingBeforeBlock)
        : undefined,
  };
}

function throttleMessage(retryAfter: number) {
  const minutes = Math.max(1, Math.ceil(retryAfter / 60));
  return `Too many failed sign-in attempts. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

const DASHBOARD_SIGNIN_DENIED_MESSAGE = "Unable to sign in with those credentials.";

type DashboardAuthFailure = {
  code?: string;
  status?: number;
};

function dashboardSignInErrorMessage(error: DashboardAuthFailure) {
  const code = typeof error.code === "string" ? error.code.toLowerCase() : "";
  const status = typeof error.status === "number" ? error.status : 0;

  if (code === "captcha_failed") {
    return "Security verification expired or failed. Complete it again.";
  }
  if (status === 429 || code.includes("rate_limit")) {
    return "Too many authentication requests. Wait a moment and try again.";
  }
  if (status >= 500) {
    return "Sign-in service is temporarily unavailable. Try again shortly.";
  }

  return DASHBOARD_SIGNIN_DENIED_MESSAGE;
}

export async function signInDashboard(
  email: string,
  password: string,
  captchaToken?: string,
): Promise<DashboardRole> {
  if (isDashboardTurnstileConfigured && !captchaToken) {
    throw new Error("Complete the security verification before signing in.");
  }

  const throttle = await dashboardLoginThrottle(email, "check");
  if (!throttle.allowed) {
    throw new Error(throttleMessage(throttle.retryAfter));
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
    ...(captchaToken ? { options: { captchaToken } } : {}),
  });

  if (error) {
    const failed = await dashboardLoginThrottle(email, "failure");
    if (!failed.allowed) throw new Error(throttleMessage(failed.retryAfter));
    throw new Error(dashboardSignInErrorMessage(error));
  }

  clearDashboardRoleCache();
  const role = await getDashboardRole();
  if (!role) {
    await dashboardLoginThrottle(email, "failure");
    await supabase.auth.signOut({ scope: "local" });
    throw new Error(DASHBOARD_SIGNIN_DENIED_MESSAGE);
  }

  await dashboardLoginThrottle(email, "success");
  return role;
}


export type DashboardPasskey = {
  id: string;
  friendlyName: string | null;
  createdAt: string;
  lastUsedAt: string | null;
};

type DashboardPasskeyAction = "signin" | "register";

function dashboardPasskeyErrorMessage(
  error: DashboardAuthFailure,
  action: DashboardPasskeyAction,
) {
  const code = typeof error.code === "string" ? error.code.toLowerCase() : "";
  const status = typeof error.status === "number" ? error.status : 0;

  if (code === "passkey_disabled") {
    return "Passkey authentication is not available for this dashboard yet.";
  }
  if (code === "too_many_passkeys") {
    return "This account has reached the maximum number of registered passkeys.";
  }
  if (code === "webauthn_credential_exists") {
    return "This passkey is already registered to the account.";
  }
  if (code === "webauthn_credential_not_found") {
    return "No matching passkey could be verified.";
  }
  if (code === "webauthn_challenge_not_found" || code === "webauthn_challenge_expired") {
    return "The passkey request expired. Try again.";
  }
  if (code === "webauthn_verification_failed") {
    return "Passkey verification failed. Try again.";
  }
  if (status === 429 || code.includes("rate_limit")) {
    return "Too many passkey requests. Wait a moment and try again.";
  }
  if (status >= 500) {
    return "Passkey service is temporarily unavailable. Try again shortly.";
  }

  return action === "register"
    ? "Passkey could not be registered. Try again."
    : "Passkey sign-in could not be completed.";
}

function dashboardPasskeyThrownErrorMessage(
  cause: unknown,
  action: DashboardPasskeyAction,
) {
  if (cause instanceof DOMException) {
    if (cause.name === "NotAllowedError" || cause.name === "AbortError") {
      return "Passkey request was cancelled or timed out.";
    }
    if (cause.name === "SecurityError") {
      return "Passkey authentication is not available on this site origin.";
    }
  }

  return action === "register"
    ? "Passkey could not be registered. Try again."
    : "Passkey sign-in could not be completed.";
}

export function isDashboardPasskeySupported() {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext === true &&
    "PublicKeyCredential" in window &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.credentials)
  );
}

export async function signInDashboardWithPasskey(): Promise<DashboardRole> {
  if (!isDashboardPasskeySupported()) {
    throw new Error("Passkeys are not supported by this browser or secure context.");
  }

  let result: Awaited<ReturnType<typeof supabase.auth.signInWithPasskey>>;
  try {
    result = await supabase.auth.signInWithPasskey();
  } catch (cause) {
    throw new Error(dashboardPasskeyThrownErrorMessage(cause, "signin"));
  }

  if (result.error) {
    throw new Error(dashboardPasskeyErrorMessage(result.error, "signin"));
  }

  clearDashboardRoleCache();
  const role = await getDashboardRole();
  if (!role) {
    await supabase.auth.signOut({ scope: "local" });
    throw new Error(DASHBOARD_SIGNIN_DENIED_MESSAGE);
  }

  return role;
}

export async function registerDashboardPasskey(): Promise<DashboardPasskey> {
  if (!isDashboardPasskeySupported()) {
    throw new Error("Passkeys are not supported by this browser or secure context.");
  }

  const mfaStatus = await getDashboardMfaStatus();
  if (!mfaStatus?.ready) {
    throw new Error("Complete MFA verification before adding a passkey.");
  }

  let result: Awaited<ReturnType<typeof supabase.auth.registerPasskey>>;
  try {
    result = await supabase.auth.registerPasskey();
  } catch (cause) {
    throw new Error(dashboardPasskeyThrownErrorMessage(cause, "register"));
  }

  if (result.error) {
    throw new Error(dashboardPasskeyErrorMessage(result.error, "register"));
  }

  if (!result.data?.id) {
    throw new Error("Passkey could not be registered. Try again.");
  }

  return {
    id: result.data.id,
    friendlyName: result.data.friendly_name ?? null,
    createdAt: result.data.created_at,
    lastUsedAt: null,
  };
}


async function requireDashboardPasskeyManagementSession() {
  const status = await getDashboardMfaStatus();
  if (!status?.ready) {
    throw new Error("Complete MFA verification before managing passkeys.");
  }
  return status;
}

function mapDashboardPasskey(passkey: {
  id: string;
  friendly_name?: string | null;
  created_at: string;
  last_used_at?: string | null;
}): DashboardPasskey {
  return {
    id: passkey.id,
    friendlyName: passkey.friendly_name ?? null,
    createdAt: passkey.created_at,
    lastUsedAt: passkey.last_used_at ?? null,
  };
}

export async function listDashboardPasskeys(): Promise<DashboardPasskey[]> {
  await requireDashboardPasskeyManagementSession();
  const { data, error } = await supabase.auth.passkey.list();
  if (error) throw new Error(dashboardPasskeyErrorMessage(error, "register"));
  return (data ?? []).map(mapDashboardPasskey);
}

export async function renameDashboardPasskey(
  passkeyId: string,
  friendlyName: string,
): Promise<void> {
  await requireDashboardPasskeyManagementSession();
  const normalizedName = friendlyName.trim();
  if (!normalizedName || normalizedName.length > 120) {
    throw new Error("Passkey name must be between 1 and 120 characters.");
  }

  const { error } = await supabase.auth.passkey.update({
    passkeyId,
    friendlyName: normalizedName,
  });
  if (error) throw new Error(dashboardPasskeyErrorMessage(error, "register"));
  await logDashboardSecurityEvent("passkey_renamed", { passkeyId });
}

export async function deleteDashboardPasskey(passkeyId: string): Promise<void> {
  await requireDashboardPasskeyManagementSession();
  const { error } = await supabase.auth.passkey.delete({ passkeyId });
  if (error) throw new Error(dashboardPasskeyErrorMessage(error, "register"));
  await logDashboardSecurityEvent("passkey_deleted", { passkeyId });
}

export async function getDashboardMfaStatus(): Promise<DashboardMfaStatus | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data: roleRow, error: roleError } = await supabase
    .from("user_roles")
    .select("role,mfa_required,mfa_enrolled_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleError || !roleRow) return null;
  if (roleRow.role !== "admin" && roleRow.role !== "editor") return null;

  const [aalResult, factorsResult] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);

  throwIfError(aalResult.error, "Checking MFA assurance failed");
  throwIfError(factorsResult.error, "Loading MFA factors failed");

  const totpFactors = (factorsResult.data?.totp ?? []) as DashboardMfaFactor[];
  const verifiedFactor =
    totpFactors.find((factor) => factor.status === "verified") ??
    totpFactors.find((factor) => !factor.status) ??
    null;

  const currentLevel = aalResult.data?.currentLevel ?? null;
  const nextLevel = aalResult.data?.nextLevel ?? null;

  return {
    role: roleRow.role,
    required: roleRow.mfa_required,
    enrolledAt: roleRow.mfa_enrolled_at,
    authenticatedAt: user.last_sign_in_at ?? null,
    currentLevel,
    nextLevel,
    verifiedFactorId: verifiedFactor?.id ?? null,
    ready:
      currentLevel === "aal2" &&
      Boolean(verifiedFactor?.id) &&
      roleRow.mfa_required === true,
  };
}

export async function beginDashboardTotpEnrollment(): Promise<DashboardTotpEnrollment> {
  const role = await getDashboardRole();
  if (!role) throw new Error("Dashboard staff access is required before MFA enrollment.");

  const factorsResult = await supabase.auth.mfa.listFactors();
  throwIfError(factorsResult.error, "Loading MFA factors failed");

  const allFactors = (factorsResult.data?.all ?? []) as DashboardMfaFactor[];
  const verifiedTotp = allFactors.find(
    (factor) => factor.factor_type === "totp" && factor.status === "verified",
  );

  if (verifiedTotp) {
    throw new Error("A verified authenticator factor already exists for this account.");
  }

  const staleUnverified = allFactors.filter(
    (factor) => factor.factor_type === "totp" && factor.status === "unverified",
  );
  for (const factor of staleUnverified) {
    await supabase.auth.mfa.unenroll({ factorId: factor.id }).catch(() => undefined);
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Space Call Dashboard",
  });
  throwIfError(error, "Starting MFA enrollment failed");

  const totp = data?.totp as
    | { qr_code?: string; secret?: string; uri?: string }
    | undefined;

  if (!data?.id || !totp?.qr_code || !totp.secret || !totp.uri) {
    throw new Error("Supabase did not return a complete TOTP enrollment.");
  }

  return {
    factorId: data.id,
    qrCode: totp.qr_code,
    secret: totp.secret,
    uri: totp.uri,
  };
}

async function activateDashboardMfaRequirement() {
  const { error } = await supabase.rpc("activate_dashboard_mfa");
  throwIfError(error, "Activating dashboard MFA requirement failed");
}

export async function verifyDashboardTotp(
  factorId: string,
  code: string,
): Promise<DashboardMfaStatus> {
  const normalizedCode = code.replace(/\s+/g, "");
  if (!/^\d{6,10}$/.test(normalizedCode)) {
    throw new Error("Enter the numeric code from your authenticator app.");
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code: normalizedCode,
  });
  if (error) {
    const authError = error as { code?: string; status?: number };
    const codeValue = typeof authError.code === "string" ? authError.code.toLowerCase() : "";
    const status = typeof authError.status === "number" ? authError.status : 0;

    if (status === 429 || codeValue.includes("rate_limit")) {
      throw new Error("Too many verification attempts. Wait a moment and try again.");
    }
    if (status >= 500) {
      throw new Error("Verification service is temporarily unavailable. Try again shortly.");
    }
    throw new Error("Verification code could not be confirmed.");
  }

  const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  throwIfError(assurance.error, "Checking MFA assurance failed");
  if (assurance.data?.currentLevel !== "aal2") {
    throw new Error("MFA verification did not promote this session to AAL2.");
  }

  const beforeActivation = await getDashboardMfaStatus();
  await activateDashboardMfaRequirement();

  const status = await getDashboardMfaStatus();
  if (!status?.ready) {
    throw new Error("Dashboard MFA activation is incomplete.");
  }
  if (!beforeActivation?.required) {
    await logDashboardSecurityEvent("mfa_enabled", {
      aal: status.currentLevel,
    });
  }
  await logDashboardSecurityEvent("mfa_verified", {
    aal: status.currentLevel,
  });
  await logDashboardSecurityEvent("login_success", {
    aal: status.currentLevel,
    mfa: true,
  });
  return status;
}

export async function ensureDashboardMfaActivated(): Promise<DashboardMfaStatus> {
  const status = await getDashboardMfaStatus();
  if (!status) throw new Error("Dashboard authentication is required.");

  if (status.currentLevel === "aal2" && status.verifiedFactorId) {
    if (!status.required) await activateDashboardMfaRequirement();
    const refreshed = await getDashboardMfaStatus();
    if (refreshed?.ready) return refreshed;
  }

  throw new Error("Multi-factor authentication is required.");
}

async function logDashboardSecurityEvent(
  eventType: string,
  metadata: Record<string, unknown> = {},
) {
  const { error } = await supabase.rpc("log_dashboard_security_event", {
    p_event_type: eventType,
    p_metadata: metadata,
  });
  if (error) console.warn("[dashboard-security] event log failed", error.message);
}

export async function signOutDashboard() {
  clearDashboardRoleCache();
  await logDashboardSecurityEvent("signout_local");
  const { error } = await supabase.auth.signOut({ scope: "local" });
  throwIfError(error, "Sign out failed");
}

export async function signOutOtherDashboardSessions() {
  clearDashboardRoleCache();
  await logDashboardSecurityEvent("signout_others");
  const { error } = await supabase.auth.signOut({ scope: "others" });
  throwIfError(error, "Signing out other sessions failed");
}

export async function signOutAllDashboardSessions() {
  clearDashboardRoleCache();
  await logDashboardSecurityEvent("signout_global");
  const { error } = await supabase.auth.signOut({ scope: "global" });
  throwIfError(error, "Signing out all sessions failed");
}

export async function listDashboardSecurityEvents(limit = 30): Promise<DashboardSecurityEvent[]> {
  const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit)));
  const { data, error } = await supabase
    .from("dashboard_security_events")
    .select("id,event_type,user_agent,metadata,created_at")
    .order("created_at", { ascending: false })
    .limit(safeLimit);
  throwIfError(error, "Loading security activity failed");

  return (data ?? []).map((row) => ({
    id: row.id,
    eventType: row.event_type,
    userAgent: row.user_agent ?? "",
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    createdAt: row.created_at,
  }));
}

export async function getDashboardSecuritySnapshot(): Promise<DashboardSecuritySnapshot> {
  const [{ data: sessionData, error: sessionError }, mfaStatus, events] = await Promise.all([
    supabase.auth.getSession(),
    getDashboardMfaStatus(),
    listDashboardSecurityEvents(30),
  ]);
  throwIfError(sessionError, "Loading dashboard session failed");
  if (!sessionData.session || !mfaStatus) {
    throw new Error("Dashboard security session is unavailable.");
  }

  return {
    email: sessionData.session.user.email ?? "",
    expiresAt: sessionData.session.expires_at
      ? new Date(sessionData.session.expires_at * 1000).toISOString()
      : null,
    currentLevel: mfaStatus.currentLevel,
    nextLevel: mfaStatus.nextLevel,
    mfaRequired: mfaStatus.required,
    mfaEnrolledAt: mfaStatus.enrolledAt,
    turnstileConfigured: isDashboardTurnstileConfigured,
    events,
  };
}

export async function requestDashboardPasswordReset(
  email: string,
  captchaToken?: string,
) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) throw new Error("Enter your dashboard email first.");
  if (
    normalizedEmail.length > 320 ||
    !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(normalizedEmail)
  ) {
    throw new Error("Enter a valid dashboard email address.");
  }
  if (isDashboardTurnstileConfigured && !captchaToken) {
    throw new Error("Complete the security verification before requesting a reset.");
  }

  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/dashboard/login?mode=recovery`
      : undefined;

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    ...(redirectTo ? { redirectTo } : {}),
    ...(captchaToken ? { captchaToken } : {}),
  });
  throwIfError(error, "Password reset request failed");
}

export async function updateDashboardPassword(password: string) {
  if (password.length < 10) {
    throw new Error("Use at least 10 characters for the new password.");
  }

  const mfaStatus = await getDashboardMfaStatus();
  if (!mfaStatus?.ready || mfaStatus.currentLevel !== "aal2") {
    throw new Error("AAL2 multi-factor verification is required before changing the password.");
  }

  // Keep the browser-side k-anonymity check for fast UX, but do not trust it as
  // the security boundary. The Edge Function repeats HIBP screening server-side.
  await assertDashboardPasswordNotPwned(password);

  const { data, error } = await supabase.functions.invoke("dashboard-update-password", {
    body: { password },
  });
  if (error) {
    throw new Error("Secure password update was rejected. Verify MFA and try a different password.");
  }

  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) {
    if (payload?.error === "compromised_password") {
      throw new Error(
        "This password appears in known breach data. Choose a unique password that you have never used elsewhere.",
      );
    }
    if (payload?.error === "breach_screening_unavailable") {
      throw new Error(
        "Security check is temporarily unavailable. Your password was not changed. Try again shortly.",
      );
    }
    throw new Error("Secure password update failed.");
  }

  // The Edge Function records the authoritative password_changed security event.

  // Supabase may already revoke sessions after a security-sensitive password
  // change. Still request a global sign-out, then always clear the local session.
  const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });
  if (signOutError) {
    console.warn("[dashboard-security] global sign out after password change failed", signOutError.message);
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  }
}


export async function listDashboardBrands(): Promise<DashboardBrand[]> {
  await requireDashboardRole();
  const { data, error } = await supabase
    .from("cms_brands")
    .select("id,name,slug,is_visible,logo_url")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  throwIfError(error, "Loading brands failed");
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    active: row.is_visible,
    logo: row.logo_url,
  }));
}

export async function listDashboardCategories(): Promise<DashboardCategory[]> {
  await requireDashboardRole();
  const { data, error } = await supabase
    .from("store_categories")
    .select("id,name,slug,is_active")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  throwIfError(error, "Loading categories failed");
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    active: row.is_active,
  }));
}

export async function listDashboardCollections(): Promise<DashboardCollection[]> {
  await requireDashboardRole();
  const { data, error } = await supabase
    .from("store_collections")
    .select("id,title,handle,is_active")
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });
  throwIfError(error, "Loading collections failed");
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    handle: row.handle,
    active: row.is_active,
  }));
}

function firstImage(images: ImageListRow[]) {
  return [...images].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
  )[0];
}

export async function listDashboardProducts(): Promise<DashboardProduct[]> {
  await requireDashboardRole();
  const [productResult, variantResult, imageResult, brandResult, categoryResult] = await Promise.all([
    supabase
      .from("store_products")
      .select(
        "id,handle,title,description,brand_id,category_id,product_type,base_price,compare_at_price,stock_quantity,status,sku,barcode,seo_title,seo_description",
      )
      .order("updated_at", { ascending: false }),
    supabase
      .from("store_product_variants")
      .select("product_id,price,compare_at_price,sku,barcode,sort_order")
      .order("sort_order", { ascending: true }),
    supabase
      .from("store_product_images")
      .select("product_id,url,is_primary,sort_order")
      .order("sort_order", { ascending: true }),
    supabase.from("cms_brands").select("id,name"),
    supabase.from("store_categories").select("id,name"),
  ]);
  throwIfError(productResult.error, "Loading products failed");
  throwIfError(variantResult.error, "Loading variants failed");
  throwIfError(imageResult.error, "Loading product images failed");
  throwIfError(brandResult.error, "Loading product brands failed");
  throwIfError(categoryResult.error, "Loading product categories failed");

  const variants = (variantResult.data ?? []) as VariantListRow[];
  const images = (imageResult.data ?? []) as ImageListRow[];
  const variantsByProduct = new Map<string, VariantListRow[]>();
  const imagesByProduct = new Map<string, ImageListRow[]>();
  for (const variant of variants) {
    const current = variantsByProduct.get(variant.product_id) ?? [];
    current.push(variant);
    variantsByProduct.set(variant.product_id, current);
  }
  for (const image of images) {
    const current = imagesByProduct.get(image.product_id) ?? [];
    current.push(image);
    imagesByProduct.set(image.product_id, current);
  }
  const brands = new Map((brandResult.data ?? []).map((row) => [row.id, row.name]));
  const categories = new Map((categoryResult.data ?? []).map((row) => [row.id, row.name]));

  return ((productResult.data ?? []) as ProductListRow[]).map((row) => {
    const productVariants = variantsByProduct.get(row.id) ?? [];
    const primary = productVariants[0];
    const image = firstImage(imagesByProduct.get(row.id) ?? []);
    return {
      id: row.id,
      handle: row.handle,
      name: row.title,
      description: row.description,
      brand: row.brand_id ? brands.get(row.brand_id) ?? "" : "",
      brandId: row.brand_id,
      category: row.category_id
        ? categories.get(row.category_id) ?? row.product_type ?? ""
        : row.product_type ?? "",
      categoryId: row.category_id,
      price: primary ? Number(primary.price) : Number(row.base_price),
      compareAt:
        primary?.compare_at_price == null
          ? row.compare_at_price == null
            ? null
            : Number(row.compare_at_price)
          : Number(primary.compare_at_price),
      stock: row.stock_quantity,
      status: statusFromDb(row.status),
      sku: primary?.sku ?? row.sku ?? "",
      barcode: primary?.barcode ?? row.barcode ?? "",
      image: image?.url ?? "",
      seoTitle: row.seo_title ?? "",
      seoDescription: row.seo_description ?? "",
      variantCount: productVariants.length,
    };
  });
}

export async function listDashboardProductSearchIndex(): Promise<DashboardProductSearchItem[]> {
  await requireDashboardRole();
  const [productResult, variantResult, brandResult, categoryResult] = await Promise.all([
    supabase
      .from("store_products")
      .select("id,title,brand_id,category_id,product_type,sku")
      .order("updated_at", { ascending: false }),
    supabase
      .from("store_product_variants")
      .select("product_id,sku,sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase.from("cms_brands").select("id,name"),
    supabase.from("store_categories").select("id,name"),
  ]);
  throwIfError(productResult.error, "Loading product search index failed");
  throwIfError(variantResult.error, "Loading product search variants failed");
  throwIfError(brandResult.error, "Loading product search brands failed");
  throwIfError(categoryResult.error, "Loading product search categories failed");

  const variants = (variantResult.data ?? []) as VariantSearchRow[];
  const firstVariantSku = new Map<string, string>();
  for (const variant of variants) {
    if (!firstVariantSku.has(variant.product_id) && variant.sku) {
      firstVariantSku.set(variant.product_id, variant.sku);
    }
  }

  const brands = new Map((brandResult.data ?? []).map((row) => [row.id, row.name]));
  const categories = new Map((categoryResult.data ?? []).map((row) => [row.id, row.name]));

  return ((productResult.data ?? []) as ProductSearchRow[]).map((row) => ({
    id: row.id,
    name: row.title,
    brand: row.brand_id ? brands.get(row.brand_id) ?? "" : "",
    category: row.category_id
      ? categories.get(row.category_id) ?? row.product_type ?? ""
      : row.product_type ?? "",
    sku: firstVariantSku.get(row.id) ?? row.sku ?? "",
  }));
}

export async function getDashboardProduct(id: string): Promise<DashboardProduct | null> {
  await requireDashboardRole();

  const productResult = await supabase
    .from("store_products")
    .select(
      "id,handle,title,description,brand_id,category_id,product_type,base_price,compare_at_price,stock_quantity,status,sku,barcode,seo_title,seo_description",
    )
    .eq("id", id)
    .maybeSingle();

  throwIfError(productResult.error, "Loading product failed");
  if (!productResult.data) return null;

  const row = productResult.data as ProductListRow;
  const [variantResult, imageResult, brandResult, categoryResult] = await Promise.all([
    supabase
      .from("store_product_variants")
      .select("product_id,price,compare_at_price,sku,barcode,sort_order")
      .eq("product_id", id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("store_product_images")
      .select("product_id,url,is_primary,sort_order")
      .eq("product_id", id)
      .order("sort_order", { ascending: true }),
    row.brand_id
      ? supabase.from("cms_brands").select("name").eq("id", row.brand_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    row.category_id
      ? supabase.from("store_categories").select("name").eq("id", row.category_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  throwIfError(variantResult.error, "Loading product variants failed");
  throwIfError(imageResult.error, "Loading product images failed");
  throwIfError(brandResult.error, "Loading product brand failed");
  throwIfError(categoryResult.error, "Loading product category failed");

  const variants = (variantResult.data ?? []) as VariantListRow[];
  const images = (imageResult.data ?? []) as ImageListRow[];
  const primary = variants[0];
  const image = firstImage(images);

  return {
    id: row.id,
    handle: row.handle,
    name: row.title,
    description: row.description,
    brand: row.brand_id ? brandResult.data?.name ?? "" : "",
    brandId: row.brand_id,
    category: row.category_id
      ? categoryResult.data?.name ?? row.product_type ?? ""
      : row.product_type ?? "",
    categoryId: row.category_id,
    price: primary ? Number(primary.price) : Number(row.base_price),
    compareAt:
      primary?.compare_at_price == null
        ? row.compare_at_price == null
          ? null
          : Number(row.compare_at_price)
        : Number(primary.compare_at_price),
    stock: row.stock_quantity,
    status: statusFromDb(row.status),
    sku: primary?.sku ?? row.sku ?? "",
    barcode: primary?.barcode ?? row.barcode ?? "",
    image: image?.url ?? "",
    seoTitle: row.seo_title ?? "",
    seoDescription: row.seo_description ?? "",
    variantCount: variants.length,
  };
}

async function uniqueHandle(title: string, existingId?: string) {
  const base = slugify(title);
  let candidate = base;
  let suffix = 2;
  while (true) {
    const { data, error } = await supabase
      .from("store_products")
      .select("id")
      .eq("handle", candidate)
      .maybeSingle();
    throwIfError(error, "Checking product handle failed");
    if (!data || data.id === existingId) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function saveDashboardProduct(input: DashboardProductInput) {
  await requireDashboardRole();

  const [brands, categories] = await Promise.all([
    listDashboardBrands(),
    listDashboardCategories(),
  ]);
  const brand = input.brandId ? brands.find((item) => item.id === input.brandId) : undefined;
  const category = input.categoryId
    ? categories.find((item) => item.id === input.categoryId)
    : undefined;

  let existingProduct: Pick<ProductRow, "id" | "handle" | "published_at"> | null = null;
  if (input.id) {
    const { data, error } = await supabase
      .from("store_products")
      .select("id,handle,published_at")
      .eq("id", input.id)
      .maybeSingle();
    throwIfError(error, "Loading product before save failed");
    if (!data) throw new Error("Product not found.");
    existingProduct = data;
  }

  let preexistingVariants: VariantRow[] = [];
  if (input.id) {
    const { data, error } = await supabase
      .from("store_product_variants")
      .select("*")
      .eq("product_id", input.id)
      .order("sort_order", { ascending: true });
    throwIfError(error, "Loading product variants before save failed");
    preexistingVariants = (data ?? []) as VariantRow[];
  }

  let variantManagedSeparately = preexistingVariants.length > 1;
  const handle = existingProduct?.handle ?? (await uniqueHandle(input.title));
  const productPayload = {
    title: input.title.trim(),
    handle,
    description: input.description.trim(),
    brand_id: input.brandId,
    category_id: input.categoryId,
    product_type: category?.name ?? null,
    status: statusToDb(input.status),
    currency: "USD",
    track_inventory: true,
    seo_title: input.seoTitle.trim() || null,
    seo_description: input.seoDescription.trim() || null,
    published_at:
      input.status === "Active"
        ? existingProduct?.published_at ?? new Date().toISOString()
        : null,
    ...(variantManagedSeparately
      ? {}
      : {
          base_price: input.price,
          compare_at_price: input.compareAt,
          sku: input.sku.trim() || null,
          barcode: input.barcode.trim() || null,
          stock_quantity: Math.max(0, Math.trunc(input.stock)),
        }),
  };

  let productId = input.id;
  if (input.id) {
    const { error } = await supabase.from("store_products").update(productPayload).eq("id", input.id);
    throwIfError(error, "Updating product failed");
  } else {
    const { data, error } = await supabase
      .from("store_products")
      .insert(productPayload)
      .select("id")
      .single();
    throwIfError(error, "Creating product failed");
    productId = data?.id;
  }
  if (!productId) throw new Error("Product save completed without an id.");

  const { data: existingVariants, error: variantReadError } = await supabase
    .from("store_product_variants")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
  throwIfError(variantReadError, "Loading product variants failed");

  const variantRows = (existingVariants ?? []) as VariantRow[];
  variantManagedSeparately = variantRows.length > 1;
  if (variantRows.length <= 1) {
    const variantPayload = {
      title: variantRows[0]?.title ?? "Default",
      sku: input.sku.trim() || null,
      barcode: input.barcode.trim() || null,
      price: input.price,
      compare_at_price: input.compareAt,
      stock_quantity: Math.max(0, Math.trunc(input.stock)),
      track_inventory: true,
      options: variantRows[0]?.options ?? {},
      is_active: true,
      sort_order: 0,
    };
    if (variantRows[0]) {
      const { error } = await supabase
        .from("store_product_variants")
        .update(variantPayload)
        .eq("id", variantRows[0].id);
      throwIfError(error, "Updating product variant failed");
    } else {
      const { error } = await supabase
        .from("store_product_variants")
        .insert({ ...variantPayload, product_id: productId });
      throwIfError(error, "Creating product variant failed");
    }
  }

  if (input.imageUrl.trim()) {
    const { data: existingImage, error: imageReadError } = await supabase
      .from("store_product_images")
      .select("id")
      .eq("product_id", productId)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    throwIfError(imageReadError, "Loading product image failed");
    if (existingImage) {
      const { error } = await supabase
        .from("store_product_images")
        .update({ url: input.imageUrl.trim(), alt_text: input.title.trim(), is_primary: true })
        .eq("id", existingImage.id);
      throwIfError(error, "Updating product image failed");
    } else {
      const { error } = await supabase.from("store_product_images").insert({
        product_id: productId,
        url: input.imageUrl.trim(),
        alt_text: input.title.trim(),
        is_primary: true,
        sort_order: 0,
      });
      throwIfError(error, "Creating product image failed");
    }
  }

  if (input.collectionId) {
    const { error } = await supabase.from("store_collection_products").upsert(
      {
        collection_id: input.collectionId,
        product_id: productId,
        sort_order: 0,
      },
      { onConflict: "collection_id,product_id" },
    );
    throwIfError(error, "Assigning collection failed");
  }

  invalidateNativeStoreCache();
  return { id: productId, handle, variantManagedSeparately, brandName: brand?.name ?? "" };
}


export type DashboardProductImage = {
  id: string;
  productId: string;
  url: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
};

const PRODUCT_IMAGE_BUCKET = "cms-media";
const PRODUCT_IMAGE_PREFIX = "products";
const MAX_PRODUCT_IMAGE_BYTES = 10 * 1024 * 1024;

function mapProductImage(row: ImageRow): DashboardProductImage {
  return {
    id: row.id,
    productId: row.product_id,
    url: row.url,
    altText: row.alt_text ?? "",
    sortOrder: row.sort_order,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
  };
}

export async function listDashboardProductImages(productId: string): Promise<DashboardProductImage[]> {
  await requireDashboardRole();
  const { data, error } = await supabase
    .from("store_product_images")
    .select("*")
    .eq("product_id", productId)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  throwIfError(error, "Loading product images failed");
  return ((data ?? []) as ImageRow[]).map(mapProductImage);
}

function productStoragePathFromUrl(url: string) {
  const marker = `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index < 0) return null;
  const path = decodeURIComponent(url.slice(index + marker.length));
  return path.startsWith(`${PRODUCT_IMAGE_PREFIX}/`) ? path : null;
}

async function uploadProductImageFile(
  productId: string,
  source: File,
  resolution: ProductImageResolution,
) {
  const conversion = await convertProductImageToWebp(source, resolution);
  const file = conversion.file;
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    throw new Error("Converted product image must be 10 MB or smaller.");
  }

  const unique =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const objectPath = `${PRODUCT_IMAGE_PREFIX}/${productId}/${unique}.webp`;

  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(objectPath, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: "image/webp",
  });
  throwIfError(error, "Uploading product image failed");

  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(objectPath);
  return { url: data.publicUrl, objectPath, conversion };
}

async function removeOwnedProductImageFile(url: string) {
  const objectPath = productStoragePathFromUrl(url);
  if (!objectPath) return;
  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([objectPath]);
  throwIfError(error, "Deleting product image file failed");
}

export async function uploadDashboardProductImage(
  productId: string,
  source: File,
  resolution: ProductImageResolution,
  altText = "",
): Promise<{ images: DashboardProductImage[]; conversion: ProductImageConversionResult }> {
  await requireDashboardRole();

  const current = await listDashboardProductImages(productId);
  const nextOrder = current.reduce((max, image) => Math.max(max, image.sortOrder), -1) + 1;
  const shouldBePrimary = !current.some((image) => image.isPrimary);
  const uploaded = await uploadProductImageFile(productId, source, resolution);

  try {
    const { error } = await supabase.from("store_product_images").insert({
      product_id: productId,
      url: uploaded.url,
      alt_text: altText.trim() || source.name.replace(/\.[^.]+$/, ""),
      sort_order: nextOrder,
      is_primary: shouldBePrimary,
    });
    throwIfError(error, "Saving product image failed");
  } catch (error) {
    await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([uploaded.objectPath]);
    throw error;
  }

  invalidateNativeStoreCache();
  return {
    images: await listDashboardProductImages(productId),
    conversion: uploaded.conversion,
  };
}

export async function replaceDashboardProductImage(
  image: DashboardProductImage,
  source: File,
  resolution: ProductImageResolution,
): Promise<{ images: DashboardProductImage[]; conversion: ProductImageConversionResult }> {
  await requireDashboardRole();
  const uploaded = await uploadProductImageFile(image.productId, source, resolution);

  try {
    const { error } = await supabase
      .from("store_product_images")
      .update({
        url: uploaded.url,
        alt_text: source.name.replace(/\.[^.]+$/, ""),
      })
      .eq("id", image.id)
      .eq("product_id", image.productId);
    throwIfError(error, "Replacing product image failed");
  } catch (error) {
    await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([uploaded.objectPath]);
    throw error;
  }

  await removeOwnedProductImageFile(image.url).catch(() => undefined);
  invalidateNativeStoreCache();
  return {
    images: await listDashboardProductImages(image.productId),
    conversion: uploaded.conversion,
  };
}

export async function setDashboardPrimaryProductImage(
  productId: string,
  imageId: string,
): Promise<DashboardProductImage[]> {
  await requireDashboardRole();

  const { error: resetError } = await supabase
    .from("store_product_images")
    .update({ is_primary: false })
    .eq("product_id", productId);
  throwIfError(resetError, "Resetting primary product image failed");

  const { error } = await supabase
    .from("store_product_images")
    .update({ is_primary: true })
    .eq("id", imageId)
    .eq("product_id", productId);
  throwIfError(error, "Setting primary product image failed");

  invalidateNativeStoreCache();
  return listDashboardProductImages(productId);
}

export async function deleteDashboardProductImage(
  image: DashboardProductImage,
): Promise<DashboardProductImage[]> {
  await requireDashboardRole();

  const { error } = await supabase
    .from("store_product_images")
    .delete()
    .eq("id", image.id)
    .eq("product_id", image.productId);
  throwIfError(error, "Deleting product image failed");

  await removeOwnedProductImageFile(image.url).catch(() => undefined);

  const remaining = await listDashboardProductImages(image.productId);
  if (image.isPrimary && remaining[0]) {
    return setDashboardPrimaryProductImage(image.productId, remaining[0].id);
  }

  invalidateNativeStoreCache();
  return remaining;
}

export async function reorderDashboardProductImages(
  productId: string,
  orderedIds: string[],
): Promise<DashboardProductImage[]> {
  await requireDashboardRole();

  for (let index = 0; index < orderedIds.length; index += 1) {
    const { error } = await supabase
      .from("store_product_images")
      .update({ sort_order: index })
      .eq("id", orderedIds[index])
      .eq("product_id", productId);
    throwIfError(error, "Reordering product images failed");
  }

  invalidateNativeStoreCache();
  return listDashboardProductImages(productId);
}
