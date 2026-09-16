import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { uploadMedia } from "@/lib/adminMedia";

const SUGGESTED_KEYS = [
  "store_name",
  "whatsapp_number",
  "announcement_text",
  "logo_url",
  "free_shipping_note",
  "support_hours",
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

function settingValue(row: {
  value_type: string;
  value_text: string | null;
  value_json: unknown;
}) {
  if (row.value_type === "json") return JSON.stringify(row.value_json ?? {}, null, 2);
  return row.value_text ?? "";
}

/** Editor for the live cms_site_settings schema used by public-cms. */
export function SettingsEditor() {
  const [rows, setRows] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

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
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">إعدادات الموقع</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            اسم المتجر، واتساب، الشعار، الشريط الإعلاني والإعدادات العامة.
          </p>
        </div>
        <Button
          size="sm"
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
          <Plus className="me-1 size-4" /> إضافة إعداد
        </Button>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> جاري التحميل…
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          لا توجد إعدادات بعد.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row, index) => {
            const rowKey = row.originalKey || row.key || `new-${index}`;
            return (
              <article
                key={`${rowKey}-${index}`}
                className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">المفتاح</Label>
                    <Input
                      className="mt-1"
                      list="cms-setting-keys"
                      value={row.key}
                      onChange={(event) => patchRow(index, { key: event.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">الاسم الظاهر</Label>
                    <Input
                      className="mt-1"
                      value={row.label}
                      onChange={(event) => patchRow(index, { label: event.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">المجموعة</Label>
                    <Input
                      className="mt-1"
                      value={row.groupName}
                      onChange={(event) => patchRow(index, { groupName: event.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">نوع القيمة</Label>
                    <select
                      className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">القيمة</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Input
                      value={row.value}
                      onChange={(event) => patchRow(index, { value: event.target.value })}
                    />
                    <label className="inline-flex cursor-pointer items-center rounded-md border border-input px-2 py-2">
                      {uploadingKey === rowKey ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Upload className="size-4" />
                      )}
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

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Switch
                      checked={row.isPublic}
                      onCheckedChange={(checked) => patchRow(index, { isPublic: checked })}
                    />
                    متاح للواجهة العامة
                  </label>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void save(row, index)}
                      disabled={savingKey === rowKey}
                    >
                      {savingKey === rowKey ? (
                        <Loader2 className="me-1 size-4 animate-spin" />
                      ) : (
                        <Save className="me-1 size-4" />
                      )}
                      حفظ
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void remove(row)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
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
