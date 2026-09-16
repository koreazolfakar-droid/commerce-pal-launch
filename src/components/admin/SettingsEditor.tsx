import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { uploadMedia } from "@/lib/adminMedia";

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
  label: string;
  groupName: string;
  isPublic: boolean;
};

function settingValue(row: { value_type: string; value_text: string | null; value_json: unknown }) {
  if (row.value_type === "json") return JSON.stringify(row.value_json ?? {}, null, 2);
  return row.value_text ?? "";
}

/** Editor for the live cms_site_settings schema used by public-cms. */
export function SettingsEditor() {
  const [rows, setRows] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cms_site_settings")
      .select("key,value_text,value_json,value_type,label,group_name,is_public")
      .order("key");
    if (error) toast.error(error.message);
    setRows(
      (data ?? []).map((row) => ({
        originalKey: row.key,
        key: row.key,
        value: settingValue(row),
        valueType: ["json", "boolean", "number"].includes(row.value_type)
          ? (row.value_type as Setting["valueType"])
          : "text",
        label: row.label ?? "",
        groupName: row.group_name,
        isPublic: row.is_public,
      })),
    );
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
      toast.error("أدخل اسم الإعداد");
      return;
    }

    let valueJson: Json | null = null;
    if (row.valueType === "json") {
      try {
        valueJson = JSON.parse(row.value || "{}") as Json;
      } catch {
        toast.error("تحقق من صيغة JSON قبل الحفظ");
        return;
      }
    }

    setSavingKey(row.originalKey || key);
    const payload = {
      key,
      value_text: row.valueType === "json" ? null : row.value,
      value_json: valueJson,
      value_type: row.valueType,
      label: row.label.trim() || null,
      group_name: row.groupName.trim() || "general",
      is_public: row.isPublic,
      updated_at: new Date().toISOString(),
    };

    const result = row.originalKey
      ? await supabase.from("cms_site_settings").update(payload).eq("key", row.originalKey)
      : await supabase.from("cms_site_settings").insert(payload);

    setSavingKey(null);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    patchRow(index, { originalKey: key, key });
    await refreshCms();
    toast.success("تم الحفظ");
  };

  const remove = async (row: Setting) => {
    const key = row.originalKey || row.key.trim();
    if (!key) {
      setRows((current) => current.filter((item) => item !== row));
      return;
    }
    if (!window.confirm("حذف هذا الإعداد؟")) return;
    const { error } = await supabase.from("cms_site_settings").delete().eq("key", key);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((current) => current.filter((item) => item !== row));
    await refreshCms();
    toast.success("تم الحذف");
  };

  const upload = async (row: Setting, index: number, file: File) => {
    const key = row.originalKey || row.key || `new-${index}`;
    setUploadingKey(key);
    try {
      const url = await uploadMedia(file, "settings");
      patchRow(index, { value: url, valueType: "text" });
      toast.success("تم الرفع، اضغط حفظ");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر رفع الصورة");
    } finally {
      setUploadingKey(null);
    }
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground">Store Settings</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground">إعدادات الموقع</h1>
          <p className="mt-1.5 max-w-2xl text-xs leading-5 text-muted-foreground">
            إعدادات الواجهة العامة، واتساب، الإعلانات، ومحتوى الصفحة الرئيسية.
          </p>
        </div>
        <Button
          size="sm"
          className="min-h-10 rounded-xl bg-foreground px-4 text-background hover:bg-foreground/90"
          onClick={() =>
            setRows((current) => [
              {
                originalKey: "",
                key: "",
                value: "",
                valueType: "text",
                label: "",
                groupName: "general",
                isPublic: true,
              },
              ...current,
            ])
          }
        >
          <Plus className="me-1.5 size-4" /> إضافة إعداد
        </Button>
      </header>

      {loading ? (
        <div className="flex min-h-32 items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> جاري التحميل…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm font-bold text-foreground">لا توجد إعدادات بعد</p>
          <p className="mt-1 text-xs text-muted-foreground">أضف أول إعداد للبدء.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row, index) => {
            const rowKey = row.originalKey || row.key || `new-${index}`;
            return (
              <article
                key={`${rowKey}-${index}`}
                className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgb(0_0_0/0.02)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-muted-foreground">Setting</p>
                    <h2 className="mt-0.5 truncate text-sm font-black text-foreground">
                      {row.label || row.key || "إعداد جديد"}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-9 rounded-xl"
                      onClick={() => void save(row, index)}
                      disabled={savingKey === rowKey}
                    >
                      {savingKey === rowKey ? (
                        <Loader2 className="me-1.5 size-3.5 animate-spin" />
                      ) : (
                        <Save className="me-1.5 size-3.5" />
                      )}
                      حفظ
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-9 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => void remove(row)}
                      aria-label="حذف الإعداد"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
                  <div>
                    <Label className="text-[11px] font-semibold text-muted-foreground">المفتاح</Label>
                    <Input
                      className="mt-1.5 h-11 rounded-xl border-border/70 bg-muted/20 text-xs"
                      list="cms-setting-keys"
                      value={row.key}
                      onChange={(event) => patchRow(index, { key: event.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-muted-foreground">الاسم الظاهر</Label>
                    <Input
                      className="mt-1.5 h-11 rounded-xl border-border/70 bg-muted/20 text-xs"
                      value={row.label}
                      onChange={(event) => patchRow(index, { label: event.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-muted-foreground">المجموعة</Label>
                    <Input
                      className="mt-1.5 h-11 rounded-xl border-border/70 bg-muted/20 text-xs"
                      value={row.groupName}
                      onChange={(event) => patchRow(index, { groupName: event.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-muted-foreground">نوع القيمة</Label>
                    <select
                      className="mt-1.5 h-11 w-full rounded-xl border border-border/70 bg-muted/20 px-3 text-xs font-medium outline-none"
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

                  <div className="sm:col-span-2 xl:col-span-4">
                    <Label className="text-[11px] font-semibold text-muted-foreground">القيمة</Label>
                    <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center">
                      {row.valueType === "boolean" ? (
                        <label className="flex min-h-11 flex-1 items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-3.5 text-xs font-medium">
                          <span>{row.value === "true" ? "مفعّل" : "غير مفعّل"}</span>
                          <Switch
                            checked={row.value === "true"}
                            onCheckedChange={(checked) =>
                              patchRow(index, { value: checked ? "true" : "false" })
                            }
                          />
                        </label>
                      ) : row.valueType === "json" ? (
                        <Textarea
                          className="min-h-28 flex-1 rounded-xl border-border/70 bg-muted/20 font-mono text-xs"
                          value={row.value}
                          onChange={(event) => patchRow(index, { value: event.target.value })}
                        />
                      ) : (
                        <Input
                          className="h-11 flex-1 rounded-xl border-border/70 bg-muted/20 text-xs"
                          type={row.valueType === "number" ? "number" : "text"}
                          value={row.value}
                          onChange={(event) => patchRow(index, { value: event.target.value })}
                        />
                      )}
                      <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-bold transition hover:bg-muted">
                        {uploadingKey === rowKey ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Upload className="size-4" />
                        )}
                        رفع ملف
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

                  <div className="sm:col-span-2 xl:col-span-4">
                    <label className="flex min-h-11 items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-3.5 text-xs font-medium text-foreground">
                      <span>
                        متاح للواجهة العامة
                        <span className="ms-2 text-[10px] font-normal text-muted-foreground">يظهر عبر public CMS</span>
                      </span>
                      <Switch
                        checked={row.isPublic}
                        onCheckedChange={(checked) => patchRow(index, { isPublic: checked })}
                      />
                    </label>
                  </div>
                </div>
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
