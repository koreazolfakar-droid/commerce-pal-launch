import { useEffect, useMemo, useState } from "react";
import {
  Globe2,
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  Settings2,
  Trash2,
  Upload,
} from "lucide-react";
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

  const publicCount = useMemo(() => rows.filter((row) => row.is_public).length, [rows]);
  const groupsCount = useMemo(
    () => new Set(rows.map((row) => row.group_name || "general")).size,
    [rows],
  );

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
    <section className="space-y-6" dir="rtl">
      <header className="overflow-hidden rounded-[28px] border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">
                <Settings2 className="size-3.5" /> Site Settings
              </span>
              <span className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                {loading ? "…" : rows.length} إعداد
              </span>
              <span className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                {groupsCount} مجموعة
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">إعدادات الموقع</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              تحكم باسم المتجر، واتساب، النصوص العامة والقيم التي يقرأها الموقع من CMS.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <div className="rounded-2xl border border-border bg-background px-4 py-3 text-center sm:min-w-28">
              <p className="text-lg font-black tabular-nums">{loading ? "—" : publicCount}</p>
              <p className="text-[11px] text-muted-foreground">إعداد عام</p>
            </div>
            <div className="rounded-2xl border border-border bg-background px-4 py-3 text-center sm:min-w-28">
              <p className="text-lg font-black tabular-nums">{loading ? "—" : rows.length}</p>
              <p className="text-[11px] text-muted-foreground">إجمالي الإعدادات</p>
            </div>
          </div>
        </div>
      </header>

      <div className="rounded-[28px] border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black">إضافة إعداد جديد</p>
            <p className="mt-1 text-xs text-muted-foreground">
              استخدم مفتاحاً ثابتاً بالإنجليزية مثل store_phone أو homepage_title.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-xl">
            <Input
              value={newKey}
              onChange={(event) => setNewKey(event.target.value)}
              placeholder="setting_key"
              dir="ltr"
              className="h-11 rounded-xl bg-background"
            />
            <Button className="h-11 shrink-0 rounded-xl px-5" onClick={() => void add()}>
              <Plus className="me-2 size-4" /> إضافة إعداد
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid min-h-56 place-items-center rounded-[28px] border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> جاري تحميل الإعدادات…
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {rows.map((row, index) => {
            const key = row.key ?? "";
            return (
              <article
                key={key}
                className="overflow-hidden rounded-[28px] border border-border bg-card shadow-sm"
              >
                <div className="flex flex-col gap-4 border-b border-border bg-muted/25 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-lg border border-border bg-background text-xs font-black text-muted-foreground">
                        {index + 1}
                      </span>
                      <h2 className="truncate text-base font-black">{row.label || key}</h2>
                      <span
                        className={
                          row.is_public
                            ? "rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300"
                            : "rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground"
                        }
                      >
                        {row.is_public ? "ظاهر للموقع" : "خاص"}
                      </span>
                    </div>
                    <code className="mt-1 block truncate ps-10 text-[11px] text-muted-foreground">
                      {key}
                    </code>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      onClick={() => void save(row)}
                      disabled={savingKey === key}
                      className="rounded-xl"
                    >
                      {savingKey === key ? (
                        <Loader2 className="me-1.5 size-4 animate-spin" />
                      ) : (
                        <Save className="me-1.5 size-4" />
                      )}
                      حفظ
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void remove(key)}
                      aria-label="حذف"
                      className="rounded-xl text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
                  <div className="rounded-2xl border border-border bg-background/60 p-4">
                    <Label htmlFor={`${key}-label`} className="text-xs font-bold">
                      الاسم الظاهر
                    </Label>
                    <Input
                      id={`${key}-label`}
                      className="mt-2 h-11 rounded-xl bg-card"
                      value={String(row.label ?? "")}
                      onChange={(event) => patch(key, "label", event.target.value)}
                    />
                  </div>

                  <div className="rounded-2xl border border-border bg-background/60 p-4">
                    <Label htmlFor={`${key}-group`} className="text-xs font-bold">
                      المجموعة
                    </Label>
                    <Input
                      id={`${key}-group`}
                      className="mt-2 h-11 rounded-xl bg-card"
                      value={String(row.group_name ?? "general")}
                      onChange={(event) => patch(key, "group_name", event.target.value)}
                    />
                  </div>

                  <div className="rounded-2xl border border-border bg-background/60 p-4">
                    <Label htmlFor={`${key}-type`} className="text-xs font-bold">
                      نوع القيمة
                    </Label>
                    <select
                      id={`${key}-type`}
                      className="mt-2 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none transition focus:border-primary"
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

                  <div className="rounded-2xl border border-border bg-background/60 p-4">
                    <Label className="text-xs font-bold">الظهور</Label>
                    <div className="mt-2 flex h-11 items-center justify-between rounded-xl bg-card px-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Globe2 className="size-3.5" />
                        {row.is_public ? "متاح للموقع" : "خاص باللوحة"}
                      </span>
                      <Switch
                        checked={Boolean(row.is_public)}
                        onCheckedChange={(checked) => patch(key, "is_public", checked)}
                      />
                    </div>
                  </div>

                  {row.value_type === "json" ? (
                    <div className="rounded-2xl border border-border bg-background/60 p-4 sm:col-span-2">
                      <Label htmlFor={`${key}-json`} className="text-xs font-bold">
                        JSON
                      </Label>
                      <Textarea
                        id={`${key}-json`}
                        className="mt-2 min-h-44 rounded-xl bg-card font-mono text-xs"
                        rows={8}
                        value={String(row.value_json ?? "")}
                        onChange={(event) => patch(key, "value_json", event.target.value)}
                      />
                    </div>
                  ) : row.value_type === "boolean" ? (
                    <div className="rounded-2xl border border-border bg-background/60 p-4 sm:col-span-2">
                      <Label className="text-xs font-bold">القيمة</Label>
                      <div className="mt-2 flex min-h-14 items-center justify-between rounded-xl bg-card px-4">
                        <span className="text-sm font-semibold">
                          {String(row.value_text) === "true" ? "مفعّل" : "متوقف"}
                        </span>
                        <Switch
                          checked={String(row.value_text) === "true"}
                          onCheckedChange={(checked) =>
                            patch(key, "value_text", checked ? "true" : "false")
                          }
                        />
                      </div>
                    </div>
                  ) : row.value_type === "image" ? (
                    <div className="rounded-2xl border border-border bg-background/60 p-4 sm:col-span-2">
                      <Label htmlFor={`${key}-value`} className="text-xs font-bold">
                        الصورة
                      </Label>
                      <div className="mt-2 grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px]">
                        <div className="space-y-3">
                          <Textarea
                            id={`${key}-value`}
                            className="min-h-20 rounded-xl bg-card"
                            rows={2}
                            value={String(row.value_text ?? "")}
                            onChange={(event) => patch(key, "value_text", event.target.value)}
                          />
                          <label className="flex min-h-24 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/35 bg-primary/5 px-4 text-sm font-bold text-primary transition hover:bg-primary/10">
                            {uploadingKey === key ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Upload className="size-4" />
                            )}
                            رفع صورة جديدة
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
                        </div>
                        <div className="grid min-h-36 place-items-center overflow-hidden rounded-2xl border border-border bg-white p-3">
                          {row.value_text ? (
                            <img
                              src={row.value_text}
                              alt=""
                              className="max-h-40 w-full object-contain"
                            />
                          ) : (
                            <div className="text-center text-muted-foreground">
                              <ImageIcon className="mx-auto size-6" />
                              <p className="mt-2 text-[11px]">معاينة الصورة</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-border bg-background/60 p-4 sm:col-span-2">
                      <Label htmlFor={`${key}-value`} className="text-xs font-bold">
                        القيمة
                      </Label>
                      <Textarea
                        id={`${key}-value`}
                        className="mt-2 min-h-24 rounded-xl bg-card"
                        rows={3}
                        value={String(row.value_text ?? "")}
                        onChange={(event) => patch(key, "value_text", event.target.value)}
                      />
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
