import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CmsAdminResource, CmsAdminRow, DashboardRole } from "@/lib/cmsAdmin.server";

const resourceSchema = z.enum(["settings", "hero", "sections", "navigation", "brands", "seo"]);
const payloadSchema = z.record(z.unknown());

const allowedPayloadKeys: Record<CmsAdminResource, ReadonlySet<string>> = {
  settings: new Set([
    "key",
    "value_text",
    "value_json",
    "value_type",
    "label",
    "group_name",
    "is_public",
  ]),
  hero: new Set([
    "title",
    "subtitle",
    "image_url",
    "mobile_image_url",
    "button_label",
    "target_type",
    "target_value",
    "sort_order",
    "is_published",
    "starts_at",
    "ends_at",
  ]),
  sections: new Set([
    "page_slug",
    "section_key",
    "section_type",
    "title",
    "subtitle",
    "content",
    "sort_order",
    "is_visible",
  ]),
  navigation: new Set([
    "area",
    "label",
    "icon_type",
    "icon_value",
    "href",
    "sort_order",
    "is_visible",
  ]),
  brands: new Set(["name", "slug", "logo_url", "href", "sort_order", "is_visible"]),
  seo: new Set([
    "page_slug",
    "title",
    "description",
    "og_image_url",
    "canonical_url",
    "robots",
    "json_ld",
    "is_public",
  ]),
};

function sanitizePayload(resource: CmsAdminResource, input: Record<string, unknown>) {
  const allowed = allowedPayloadKeys[resource];
  const clean: CmsAdminRow = {};
  for (const [key, value] of Object.entries(input)) {
    if (allowed.has(key)) clean[key] = value;
  }
  return clean;
}

function actorEmail(claims: Record<string, unknown> | undefined) {
  const email = claims?.["email"];
  return typeof email === "string" ? email : null;
}

const dashboardAccessFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getDashboardRole } = await import("@/lib/cmsAdmin.server");
    const role = await getDashboardRole(context.userId);
    return {
      authenticated: true,
      role: role as DashboardRole | null,
      email: actorEmail(context.claims as Record<string, unknown>),
      setupRequired: role === null,
    };
  });

export async function fetchDashboardAccess() {
  return dashboardAccessFn();
}

const listCmsResourceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ resource: resourceSchema }))
  .handler(async ({ data, context }) => {
    const { listCmsRows, requireDashboardRole } = await import("@/lib/cmsAdmin.server");
    await requireDashboardRole(context.userId);
    return listCmsRows(data.resource);
  });

export async function listCmsResource(resource: CmsAdminResource) {
  return listCmsResourceFn({ data: { resource } });
}

const createCmsResourceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ resource: resourceSchema, payload: payloadSchema }))
  .handler(async ({ data, context }) => {
    const { createCmsRow, requireDashboardRole, writeCmsAudit } = await import(
      "@/lib/cmsAdmin.server"
    );
    await requireDashboardRole(context.userId);
    const payload = sanitizePayload(data.resource, data.payload);
    const row = await createCmsRow(data.resource, payload);
    const identityKey =
      data.resource === "settings" ? "key" : data.resource === "seo" ? "page_slug" : "id";
    const entityId = String(row[identityKey] ?? "");
    await writeCmsAudit({
      email: actorEmail(context.claims as Record<string, unknown>),
      action: "create",
      resource: data.resource,
      entityId,
      details: { fields: Object.keys(payload) },
    });
    const { invalidateCmsCache } = await import("@/lib/cms");
    invalidateCmsCache();
    return row;
  });

export async function createCmsResource(resource: CmsAdminResource, payload: CmsAdminRow) {
  return createCmsResourceFn({ data: { resource, payload } });
}

const updateCmsResourceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      resource: resourceSchema,
      identity: z.string().min(1).max(240),
      payload: payloadSchema,
    }),
  )
  .handler(async ({ data, context }) => {
    const { requireDashboardRole, updateCmsRow, writeCmsAudit } = await import(
      "@/lib/cmsAdmin.server"
    );
    await requireDashboardRole(context.userId);
    const payload = sanitizePayload(data.resource, data.payload);
    const row = await updateCmsRow(data.resource, data.identity, payload);
    await writeCmsAudit({
      email: actorEmail(context.claims as Record<string, unknown>),
      action: "update",
      resource: data.resource,
      entityId: data.identity,
      details: { fields: Object.keys(payload) },
    });
    const { invalidateCmsCache } = await import("@/lib/cms");
    invalidateCmsCache();
    return row;
  });

export async function updateCmsResource(
  resource: CmsAdminResource,
  identity: string,
  payload: CmsAdminRow,
) {
  return updateCmsResourceFn({ data: { resource, identity, payload } });
}

const deleteCmsResourceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ resource: resourceSchema, identity: z.string().min(1).max(240) }))
  .handler(async ({ data, context }) => {
    const { deleteCmsRow, requireDashboardRole, writeCmsAudit } = await import(
      "@/lib/cmsAdmin.server"
    );
    await requireDashboardRole(context.userId);
    await deleteCmsRow(data.resource, data.identity);
    await writeCmsAudit({
      email: actorEmail(context.claims as Record<string, unknown>),
      action: "delete",
      resource: data.resource,
      entityId: data.identity,
    });
    const { invalidateCmsCache } = await import("@/lib/cms");
    invalidateCmsCache();
    return { ok: true };
  });

export async function deleteCmsResource(resource: CmsAdminResource, identity: string) {
  return deleteCmsResourceFn({ data: { resource, identity } });
}

const dashboardOverviewFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { dashboardOverview, requireDashboardRole } = await import("@/lib/cmsAdmin.server");
    await requireDashboardRole(context.userId);
    return dashboardOverview();
  });

export async function fetchDashboardOverview() {
  return dashboardOverviewFn();
}

const uploadCmsMediaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      fileName: z.string().trim().min(1).max(240),
      mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
      base64: z.string().min(1).max(8_000_000),
      folder: z
        .string()
        .trim()
        .min(1)
        .max(80)
        .regex(/^[a-z0-9/_-]+$/i),
    }),
  )
  .handler(async ({ data, context }) => {
    const { requireDashboardRole, uploadCmsMediaServer, writeCmsAudit } = await import(
      "@/lib/cmsAdmin.server"
    );
    await requireDashboardRole(context.userId);
    const result = await uploadCmsMediaServer(data);
    await writeCmsAudit({
      email: actorEmail(context.claims as Record<string, unknown>),
      action: "upload",
      resource: "media",
      entityId: result.path,
      details: {
        fileName: data.fileName,
        mimeType: data.mimeType,
        sizeBytes: result.sizeBytes,
      },
    });
    return result;
  });

export type DashboardUploadMime = "image/jpeg" | "image/png" | "image/webp" | "image/avif";

export async function uploadCmsMedia(input: {
  fileName: string;
  mimeType: DashboardUploadMime;
  base64: string;
  folder: string;
}) {
  return uploadCmsMediaFn({ data: input });
}
