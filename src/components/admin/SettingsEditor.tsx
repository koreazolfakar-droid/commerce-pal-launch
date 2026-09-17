import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { uploadMedia } from "@/lib/adminMedia";
import { useDashboardLanguage } from "@/lib/dashboardI18n";

const SUGGESTED_KEYS = [
  "site_name",
  "whatsapp_number",
  "announcement_enabled",
  "announcement_text",
  "logo_url",
  "free_shipping_note",
  "support_hours",
  "home_ticker_heading_ar",
  "home_ticker_heading_en",
  "home_ticker_details_ar",
  "home_ticker_details_en",
];

type Setting = {
  originalKey: string;
  key: string;
  value: string;
  valueType: "text" | "json" | "boolean" | "number";
};

function settingValueType(value: Json): Setting["valueType"] {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (typeof value === "string") return "text";
  return "json";
}

function settingValueText(value: Json): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  return JSON.stringify(value, null, 2);
}

/** Editor for the live cms_settings key/value schema used by the storefront CMS. */
export function SettingsEditor() {
  const { text } = useDashboardLanguage();
  const [rows, setRows] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const queryClient = useQueryClient();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("cms_settings").select("key,value").order("key");
    if (error) toast.error(error.message);
    const nextRows = (data ?? []).map((row) => ({
      originalKey: row.key,
      key: row.key,
      value: settingValueText(row.value),
      valueType: settingValueType(row.value),
    }));
    setRows(nextRows);
    setExpandedIndex(nextRows.length ? 0 : null);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const patchRow = (index: number, patch: Partial<Setting>) => {
    setRows((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  };

  const refreshCms = async () => {
    await queryClient.invalidateQueries({ queryKey: ["cms", "snapshot"] });
  };

  const save = async (row: Setting, index: number) => {
    const key = row.key.trim();
    if (!key) {
      toast.error(text("أدخل اسم الإعداد", "Enter a setting key"));
      return;
    }

    let value: Json = row.value;
    if (row.valueType === "json") {
      try {
        value = JSON.parse(row.value || "{}") as Json;
      } catch {
        toast.error(text("تحقق من صيغة JSON قبل الحفظ", "Check the JSON format before saving"));
        return;
      }
    } else if (row.valueType === "boolean") {
      value = row.value === "true";
    } else if (row.valueType === "number") {
      const parsed = Number(row.value);
      if (!Number.isFinite(parsed)) {
        toast.error(text("أدخل رقماً صحيحاً", "Enter a valid number"));
        return;
      }
      value = parsed;
    }

    setSavingKey(row.originalKey || key);
    const payload = { key, value, updated_at: new Date().toISOString() };

    const result = row.originalKey
      ? await supabase.from("cms_settings").update(payload).eq("key", row.originalKey)
      : await supabase.from("cms_settings").insert(payload);

    setSavingKey(null);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    patchRow(index, { originalKey: key, key });
    await refreshCms();
    toast.success(text("تم الحفظ", "Saved"));
  };

  const remove = async (row: Setting) => {
    const key = row.originalKey || row.key.trim();
    if (!key) {
      setRows((current) => current.filter((item) => item !== row));
      setExpandedIndex(null);
      return;
    }
    if (!window.confirm(text("حذف هذا الإعداد؟", "Delete this setting?"))) return;
    const { error } = await supabase.from("cms_settings").delete().eq("key", key);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((current) => current.filter((item) => item !== row));
    setExpandedIndex(null);
    await refreshCms();
    toast.success(text("تم الحذف", "Deleted"));
  };

  const upload = async (row: Setting, index: number, file: File) => {
    const key = row.originalKey || row.key || `new-${index}`;
    setUploadingKey(key);
    try {
      const url = await uploadMedia(file, "settings");
      patchRow(index, { value: url, valueType: "text" });
      toast.success(text("تم الرفع، اضغط حفظ", "Uploaded. Click Save."));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : text("تعذّر رفع الصورة", "Image upload failed"),
      );
    } finally {
      setUploadingKey(null);
    }
  };

  const addSetting = () => {
    setRows((current) => [
      { originalKey: "", key: "", value: "", valueType: "text" },
      ...current,
    ]);
    setExpandedIndex(0);
  };

  return (
    <section className="admin-page space-y-5">
      <header className="admin-page-header flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground">
            {text("إعدادات المتجر", "Store Settings")}
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground">
            {text("إعدادات الموقع", "Site settings")}
          </h1>
          <p className="mt-1.5 max-w-2xl text-xs leading-5 text-muted-foreground">
            {text(
              "إعدادات الواجهة العامة، واتساب، الإعلانات، ومحتوى الصفحة الرئيسية.",
              "Public storefront, WhatsApp, announcements and homepage settings.",
            )}
          </p>
        </div>
        <Button
          size="sm"
          className="min-h-10 rounded-xl bg-foreground px-4 text-background hover:bg-foreground/90"
          onClick={addSetting}
        >
          <Plus className="me-1.5 size-4" /> {text("إضافة إعداد", "Add setting")}
        </Button>
      </header>

      {loading ? (
        <div className="admin-empty-state flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> {text("جاري التحميل…", "Loading…")}
        </div>
      ) : rows.length === 0 ? (
        <div className="admin-empty-state grid place-items-center p-8 text-center">
          <div>
            <p className="text-sm font-bold text-foreground">
              {text("لا توجد إعدادات بعد", "No settings yet")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {text("أضف أول إعداد للبدء.", "Add your first setting to get started.")}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row, index) => {
            const rowKey = row.originalKey || row.key || `new-${index}`;
            const expanded = expandedIndex === index;
            return (
              <article
                key={`${rowKey}-${index}`}
                className="admin-setting-card overflow-hidden rounded-2xl border border-border/70 bg-card"
              >
                <div className="flex items-center gap-2 border-b border-border/50 px-3.5 py-3 sm:px-4">
                  <button
                    type="button"
                    onClick={() => setExpandedIndex(expanded ? null : index)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    aria-expanded={expanded}
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted/60 text-muted-foreground">
                      <ChevronDown
                        className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-foreground">
                        {row.key || text("إعداد جديد", "New setting")}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                        {row.valueType}
                      </span>
                    </span>
                  </button>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-8 rounded-lg px-2.5"
                      onClick={() => void save(row, index)}
                      disabled={savingKey === rowKey}
                    >
                      {savingKey === rowKey ? (
                        <Loader2 className="me-1 size-3.5 animate-spin" />
                      ) : (
                        <Save className="me-1 size-3.5" />
                      )}
                      <span className="hidden sm:inline">{text("حفظ", "Save")}</span>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => void remove(row)}
                      aria-label={text("حذف الإعداد", "Delete setting")}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                {expanded ? (
                  <div className="grid gap-3 p-3.5 sm:grid-cols-4 sm:p-4">
                    <div>
                      <Label className="text-[10px] font-semibold text-muted-foreground">
                        {text("المفتاح", "Key")}
                      </Label>
                      <Input
                        className="mt-1.5 h-10 rounded-lg text-xs"
                        list="cms-setting-keys"
                        value={row.key}
                        onChange={(event) => patchRow(index, { key: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-semibold text-muted-foreground">
                        {text("الاسم الظاهر", "Display label")}
                      </Label>
                      <Input
                        className="mt-1.5 h-10 rounded-lg text-xs"
                        value={row.label}
                        onChange={(event) => patchRow(index, { label: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-semibold text-muted-foreground">
                        {text("المجموعة", "Group")}
                      </Label>
                      <Input
                        className="mt-1.5 h-10 rounded-lg text-xs"
                        value={row.groupName}
                        onChange={(event) => patchRow(index, { groupName: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-semibold text-muted-foreground">
                        {text("نوع القيمة", "Value type")}
                      </Label>
                      <select
                        className="mt-1.5 h-10 w-full rounded-lg border border-border/70 px-3 text-xs font-medium outline-none"
                        value={row.valueType}
                        onChange={(event) =>
                          patchRow(index, { valueType: event.target.value as Setting["valueType"] })
                        }
                      >
                        <option value="text">Text</option>
                        <option value="boolean">Boolean</option>
                        <option value="number">Number</option>
                        <option value="json">JSON</option>
                      </select>
                    </div>

                    <div className="sm:col-span-4">
                      <Label className="text-[10px] font-semibold text-muted-foreground">
                        {text("القيمة", "Value")}
                      </Label>
                      <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center">
                        {row.valueType === "boolean" ? (
                          <label className="flex min-h-10 flex-1 items-center justify-between rounded-lg border border-border/70 px-3.5 text-xs font-medium">
                            <span>
                              {row.value === "true"
                                ? text("مفعّل", "Enabled")
                                : text("غير مفعّل", "Disabled")}
                            </span>
                            <Switch
                              checked={row.value === "true"}
                              onCheckedChange={(checked) =>
                                patchRow(index, { value: checked ? "true" : "false" })
                              }
                            />
                          </label>
                        ) : row.valueType === "json" ? (
                          <Textarea
                            className="min-h-24 flex-1 rounded-lg font-mono text-xs"
                            value={row.value}
                            onChange={(event) => patchRow(index, { value: event.target.value })}
                          />
                        ) : (
                          <Input
                            className="h-10 flex-1 rounded-lg text-xs"
                            type={row.valueType === "number" ? "number" : "text"}
                            value={row.value}
                            onChange={(event) => patchRow(index, { value: event.target.value })}
                          />
                        )}
                        <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border/70 px-3 text-xs font-bold transition hover:bg-muted">
                          {uploadingKey === rowKey ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Upload className="size-4" />
                          )}
                          {text("رفع ملف", "Upload file")}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) void upload(row, index, file);
                              event.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="sm:col-span-4">
                      <label className="flex min-h-10 items-center justify-between rounded-lg border border-border/70 px-3.5 text-xs font-medium text-foreground">
                        <span>
                          {text("متاح للواجهة العامة", "Available to storefront")}
                          <span className="ms-2 text-[10px] font-normal text-muted-foreground">
                            {text("يظهر عبر public CMS", "Exposed through public CMS")}
                          </span>
                        </span>
                        <Switch
                          checked={row.isPublic}
                          onCheckedChange={(checked) => patchRow(index, { isPublic: checked })}
                        />
                      </label>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
      <datalist id="cms-setting-keys">
        {SUGGESTED_KEYS.map((key) => (
          <option key={key} value={key} />
        ))}
      </datalist>
    </section>
  );
}
