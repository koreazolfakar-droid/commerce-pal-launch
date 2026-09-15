import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { uploadMedia } from "@/lib/adminMedia";
import {
  createCmsResource,
  deleteCmsResource,
  listCmsResource,
  updateCmsResource,
} from "@/lib/cmsAdmin.functions";
import type { CmsAdminRow, CmsAdminValue } from "@/lib/cmsAdmin.server";

type SettingRow = {
  [key: string]: CmsAdminValue | undefined;
  key?: string;
  label?: string | null;
  group_name?: string;
  value_type?: string;
  value_text?: string | null;
  value_json?: CmsAdminValue;
  is_public?: boolean;
};

const valueTypes = ["text", "number", "boolean", "json", "image", "icon", "url"] as const;

function normalize(row: CmsAdminRow): SettingRow {
  const setting = { ...row } as SettingRow;
  if (setting.value_type === "json") {
    setting.value_json =
      typeof setting.value_json === "string"
        ? setting.value_json
        : JSON.stringify(setting.value_json ?? {}, null, 2);
  }
  return setting;
}

function payload(row: SettingRow): CmsAdminRow {
  let valueJson: CmsAdminValue = row.value_json ?? null;
  if (row.value_type === "json" && typeof valueJson === "string") {
    try {
      valueJson = valueJson.trim() ? (JSON.parse(valueJson) as CmsAdminValue) : {};
    } catch {
      throw new Error(`JSON غير صالح في الإعداد ${row.key ?? ""}`);
    }
  }

  return {
    label: row.label ?? null,
    group_name: row.group_name || "general",
    value_type: row.value_type || "text",
    value_text: row.value_text ?? "",
    value_json: valueJson,
    is_public: row.is_public ?? true,
  };
}

export function SettingsEditor() {
  const [rows, setRows] = useState<SettingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [newKey, setNewKey] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await listCmsResource("settings");
      setRows(data.map(normalize));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحميل الإعدادات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const patch = (key: string, field: string, value: CmsAdminValue) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );
  };

  const save = async (row: SettingRow) => {
    const key = row.key?.trim();
    if (!key) return;
    setSavingKey(key);
    try {
      const updated = await updateCmsResource("settings", key, payload(row));
      setRows((current) =>
        current.map((item) => (item.key === key ? normalize(updated) : item)),
      );
      toast.success("تم حفظ الإعداد");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر الحفظ");
    } finally {
      setSavingKey(null);
    }
  };

  const add = async () => {
    const key = newKey
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (!key) {
      toast.error("أدخل مفتاحاً صالحاً للإعداد");
      return;
    }
    try {
      const created = await createCmsResource("settings", {
        key,
        label: key,
        group_name: "general",
        value_type: "text",
        value_text: "",
        value_json: null,
        is_public: true,
      });
      setRows((current) => [...current, normalize(created)]);
      setNewKey("");
      toast.success("تمت إضافة الإعداد");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذرت الإضافة");
    }
  };

  const remove = async (key: string) => {
    if (!window.confirm(`حذف الإعداد ${key}؟`)) return;
    try {
      await deleteCmsResource("settings", key);
      setRows((current) => current.filter((row) => row.key !== key));
      toast.success("تم حذف الإعداد");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر الحذف");
    }
  };

  const upload = async (row: SettingRow, file: File) => {
    const key = row.key ?? "general";
    setUploadingKey(key);
    try {
      const url = await uploadMedia(file, "settings");
      patch(key, "value_text", url);
      toast.success("تم رفع الصورة. اضغط حفظ لتثبيت الرابط.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر رفع الصورة");
    } finally {
      setUploadingKey(null);
    }
  };

  return (
    <section className="space-y-5" dir="rtl">
      <header>
        <h1 className="text-2xl font-black">إعدادات الموقع</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          النصوص العامة، اسم المتجر، واتساب والقيم التي يقرأها الموقع من CMS.
        </p>
      </header>

      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 sm:flex-row">
        <Input
          value={newKey}
          onChange={(event) => setNewKey(event.target.value)}
          placeholder="setting_key"
          dir="ltr"
        />
        <Button onClick={() => void add()}>
          <Plus className="me-1 size-4" /> إضافة إعداد
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> جاري التحميل…
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const key = row.key ?? "";
            return (
              <article
                key={key}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold">{row.label || key}</h2>
                    <code className="text-xs text-muted-foreground">{key}</code>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void save(row)}
                      disabled={savingKey === key}
                    >
                      {savingKey === key ? (
                        <Loader2 className="me-1 size-4 animate-spin" />
                      ) : (
                        <Save className="me-1 size-4" />
                      )}
                      حفظ
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void remove(key)}
                      aria-label="حذف"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor={`${key}-label`}>الاسم الظاهر</Label>
                    <Input
                      id={`${key}-label`}
                      className="mt-1"
                      value={String(row.label ?? "")}
                      onChange={(event) => patch(key, "label", event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`${key}-group`}>المجموعة</Label>
                    <Input
                      id={`${key}-group`}
                      className="mt-1"
                      value={String(row.group_name ?? "general")}
                      onChange={(event) => patch(key, "group_name", event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`${key}-type`}>نوع القيمة</Label>
                    <select
                      id={`${key}-type`}
                      className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={String(row.value_type ?? "text")}
                      onChange={(event) => patch(key, "value_type", event.target.value)}
                    >
                      {valueTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>ظاهر للموقع</Label>
                    <div className="mt-2 flex h-10 items-center">
                      <Switch
                        checked={Boolean(row.is_public)}
                        onCheckedChange={(checked) => patch(key, "is_public", checked)}
                      />
                    </div>
                  </div>

                  {row.value_type === "json" ? (
                    <div className="sm:col-span-2">
                      <Label htmlFor={`${key}-json`}>JSON</Label>
                      <Textarea
                        id={`${key}-json`}
                        className="mt-1 font-mono text-xs"
                        rows={7}
                        value={String(row.value_json ?? "")}
                        onChange={(event) => patch(key, "value_json", event.target.value)}
                      />
                    </div>
                  ) : row.value_type === "boolean" ? (
                    <div className="sm:col-span-2">
                      <Label>القيمة</Label>
                      <div className="mt-2 flex items-center gap-3">
                        <Switch
                          checked={String(row.value_text) === "true"}
                          onCheckedChange={(checked) =>
                            patch(key, "value_text", checked ? "true" : "false")
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          {String(row.value_text) === "true" ? "مفعّل" : "متوقف"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="sm:col-span-2">
                      <Label htmlFor={`${key}-value`}>القيمة</Label>
                      <div className="mt-1 flex items-start gap-2">
                        <Textarea
                          id={`${key}-value`}
                          rows={row.value_type === "image" ? 2 : 3}
                          value={String(row.value_text ?? "")}
                          onChange={(event) => patch(key, "value_text", event.target.value)}
                        />
                        {row.value_type === "image" ? (
                          <label className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-1 rounded-md border border-input px-3 text-xs font-medium hover:bg-accent">
                            {uploadingKey === key ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Upload className="size-4" />
                            )}
                            رفع
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/avif"
                              className="hidden"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) void upload(row, file);
                                event.target.value = "";
                              }}
                            />
                          </label>
                        ) : null}
                      </div>
                      {row.value_type === "image" && row.value_text ? (
                        <img
                          src={row.value_text}
                          alt=""
                          className="mt-3 max-h-40 rounded-xl border border-border bg-white p-2 object-contain"
                        />
                      ) : null}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
