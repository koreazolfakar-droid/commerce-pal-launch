import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type DashboardRole = "admin" | "editor";
export type CmsAdminResource =
  | "settings"
  | "hero"
  | "sections"
  | "navigation"
  | "brands"
  | "seo";
export type CmsAdminValue =
  | string
  | number
  | boolean
  | null
  | CmsAdminValue[]
  | { [key: string]: CmsAdminValue };
export type CmsAdminRow = Record<string, CmsAdminValue>;

export const CMS_RESOURCE_CONFIG = {
  settings: { table: "cms_site_settings", identity: "key", orderBy: ["group_name", "key"] },
  hero: { table: "cms_hero_slides", identity: "id", orderBy: ["sort_order", "created_at"] },
  sections: { table: "cms_sections", identity: "id", orderBy: ["page_slug", "sort_order"] },
  navigation: { table: "cms_navigation_items", identity: "id", orderBy: ["area", "sort_order"] },
  brands: { table: "cms_brands", identity: "id", orderBy: ["sort_order", "name"] },
  seo: { table: "cms_seo_pages", identity: "page_slug", orderBy: ["page_slug"] },
} as const satisfies Record<
  CmsAdminResource,
  { table: string; identity: string; orderBy: readonly string[] }
>;

export async function getDashboardRole(userId: string): Promise<DashboardRole | null> {
  const { data, error } = await supabaseAdmin
    .from("dashboard_roles" as never)
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    if (error.code === "42P01" || /dashboard_roles/i.test(error.message)) return null;
    throw new Error(`Unable to verify dashboard access: ${error.message}`);
  }
  const role = (data as { role?: unknown } | null)?.role;
  return role === "admin" || role === "editor" ? role : null;
}

export async function requireDashboardRole(userId: string) {
  const role = await getDashboardRole(userId);
  if (!role) throw new Error("This account is not approved for the Space Call dashboard");
  return role;
}

export async function listCmsRows(resource: CmsAdminResource): Promise<CmsAdminRow[]> {
  const config = CMS_RESOURCE_CONFIG[resource];
  let query = supabaseAdmin.from(config.table as never).select("*");
  for (const column of config.orderBy) {
    query = query.order(column as never, { ascending: true });
  }
  const { data, error } = await query;
  if (error) throw new Error(`Unable to load ${resource}: ${error.message}`);
  return (data ?? []) as unknown as CmsAdminRow[];
}

export async function createCmsRow(
  resource: CmsAdminResource,
  payload: CmsAdminRow,
): Promise<CmsAdminRow> {
  const config = CMS_RESOURCE_CONFIG[resource];
  const { data, error } = await supabaseAdmin
    .from(config.table as never)
    .insert(payload as never)
    .select("*")
    .single();
  if (error) throw new Error(`Unable to create ${resource}: ${error.message}`);
  return data as unknown as CmsAdminRow;
}

export async function updateCmsRow(
  resource: CmsAdminResource,
  identity: string,
  payload: CmsAdminRow,
): Promise<CmsAdminRow> {
  const config = CMS_RESOURCE_CONFIG[resource];
  const { data, error } = await supabaseAdmin
    .from(config.table as never)
    .update(payload as never)
    .eq(config.identity as never, identity)
    .select("*")
    .single();
  if (error) throw new Error(`Unable to update ${resource}: ${error.message}`);
  return data as unknown as CmsAdminRow;
}

export async function deleteCmsRow(resource: CmsAdminResource, identity: string) {
  const config = CMS_RESOURCE_CONFIG[resource];
  const { error } = await supabaseAdmin
    .from(config.table as never)
    .delete()
    .eq(config.identity as never, identity);
  if (error) throw new Error(`Unable to delete ${resource}: ${error.message}`);
}

export async function writeCmsAudit(input: {
  email?: string | null;
  action: string;
  resource: CmsAdminResource | "media";
  entityId?: string | null;
  details?: Record<string, CmsAdminValue>;
}) {
  const { error } = await supabaseAdmin.from("cms_audit_log" as never).insert({
    actor_email: input.email ?? null,
    action: input.action,
    entity_type: input.resource,
    entity_id: input.entityId ?? null,
    details: input.details ?? {},
  } as never);
  if (error) console.warn("Dashboard audit log write failed", error.message);
}

export async function dashboardOverview() {
  const countsEntries = await Promise.all(
    (Object.keys(CMS_RESOURCE_CONFIG) as CmsAdminResource[]).map(async (resource) => {
      const table = CMS_RESOURCE_CONFIG[resource].table;
      const { count, error } = await supabaseAdmin
        .from(table as never)
        .select("*", { count: "exact", head: true });
      if (error) throw new Error(`Unable to count ${resource}: ${error.message}`);
      return [resource, count ?? 0] as const;
    }),
  );

  const { data: activity, error } = await supabaseAdmin
    .from("cms_audit_log" as never)
    .select("id,actor_email,action,entity_type,entity_id,created_at")
    .order("created_at" as never, { ascending: false })
    .limit(8);
  if (error) console.warn("Unable to read dashboard activity", error.message);

  return {
    counts: Object.fromEntries(countsEntries) as Record<CmsAdminResource, number>,
    recentActivity: (activity ?? []) as unknown as Array<{
      id: string;
      actor_email: string | null;
      action: string;
      entity_type: string;
      entity_id: string | null;
      created_at: string;
    }>,
  };
}

export async function uploadCmsMediaServer(input: {
  fileName: string;
  mimeType: string;
  base64: string;
  folder: string;
}) {
  const binary = Uint8Array.from(atob(input.base64), (character) => character.charCodeAt(0));
  if (binary.byteLength > 5 * 1024 * 1024) throw new Error("Image is larger than 5 MB");

  const extensionByMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
  };
  const extension = extensionByMime[input.mimeType];
  if (!extension) throw new Error("Unsupported image type");

  const path = `${input.folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabaseAdmin.storage.from("cms-media").upload(path, binary, {
    contentType: input.mimeType,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(`Unable to upload image: ${error.message}`);

  const publicUrl = supabaseAdmin.storage.from("cms-media").getPublicUrl(path).data.publicUrl;
  const { error: metadataError } = await supabaseAdmin.from("cms_media_assets" as never).insert({
    bucket_id: "cms-media",
    object_path: path,
    file_name: input.fileName,
    mime_type: input.mimeType,
    size_bytes: binary.byteLength,
  } as never);
  if (metadataError) console.warn("Unable to record CMS media metadata", metadataError.message);

  return { url: publicUrl, path, sizeBytes: binary.byteLength };
}
