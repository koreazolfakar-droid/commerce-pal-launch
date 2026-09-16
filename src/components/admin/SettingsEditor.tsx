import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/adminMedia";

const SUGGESTED_KEYS = [
  "store_name",
  "whatsapp_number",
  "announcement_text",
  "logo_url",
  "free_shipping_note",
  "support_hours",
];

type Setting = { key: string; value: string };

/** Free-form key/value editor for global storefront settings. */
export function SettingsEditor() {
  const [rows, setRows] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("cms_settings").select("key, value").order("key");
    if (error) toast.error(error.message);
    setRows(
      (data ?? []).map((row) => ({
        key: row.key,
        value: typeof row.value === "string" ? row.value : JSON.stringify(row.value ?? ""),
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async (row: Setting) => {
    if (!row.key.trim()) {
      toast.error("أدخل اسم الإعداد");
      return;
    }
    setSavingKey(row.key);
    const { error } = await supabase
      .from("cms_settings")
      .upsert({ key: row.key.trim(), value: row.value }, { onConflict: "key" });
    setSavingKey(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم الحفظ");
  };

  const remove = async (row: Setting) => {
    if (!window.confirm("حذف هذا الإعداد؟")) return;
    const { error } = await supabase.from("cms_settings").delete().eq("key", row.key);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((current) => current.filter((item) => item.key !== row.key));
    toast.success("تم الحذف");
  };

  const upload = async (row: Setting, file: File) => {
    setUploadingKey(row.key);
    try {
      const url = await uploadMedia(file, "settings");
      setRows((current) =>
        current.map((item) => (item.key === row.key ? { ...item, value: url } : item)),
      );
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
            اسم المتجر، رقم واتساب، الشعار، الشريط الإعلاني وغيرها.
          </p>
        </div>
        <Button size="sm" onClick={() => setRows((current) => [{ key: "", value: "" }, ...current])}>
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
          {rows.map((row, index) => (
            <article
              key={`${row.key}-${index}`}
              className="grid gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:grid-cols-[1fr_2fr_auto] sm:items-end"
            >
              <div>
                <Label className="text-xs text-muted-foreground">الاسم</Label>
                <Input
                  className="mt-1"
                  list="cms-setting-keys"
                  value={row.key}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, key: event.target.value } : item,
                      ),
                    )
                  }
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">القيمة</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    value={row.value}
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((item, i) =>
                          i === index ? { ...item, value: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <label className="inline-flex cursor-pointer items-center rounded-md border border-input px-2 py-2">
                    {uploadingKey === row.key ? (
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
                        if (file) void upload(row, file);
                        event.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void save(row)}
                  disabled={savingKey === row.key}
                >
                  {savingKey === row.key ? (
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
            </article>
          ))}
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
