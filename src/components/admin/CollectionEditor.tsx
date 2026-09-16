import { useEffect, useMemo, useState } from "react";
import {
  Image as ImageIcon,
  Layers3,
  Loader2,
  Plus,
  Save,
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
import type {
  CmsAdminResource,
  CmsAdminRow,
  CmsAdminValue,
} from "@/lib/cmsAdmin.server";

export type EditorFieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "image"
  | "json"
  | "datetime";

export type EditorField = {
  key: string;
  label: string;
  type: EditorFieldType;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  required?: boolean;
  fullWidth?: boolean;
};

type Row = CmsAdminRow;

export type CollectionEditorProps = {
  resource: CmsAdminResource;
  title: string;
  description?: string;
  fields: EditorField[];
  newRow: Row;
  labelKey: string;
  identityKey?: string;
  allowDelete?: boolean;
};

function jsonForEditor(value: CmsAdminValue | undefined) {
  if (typeof value === "string") return value;
  if (value === undefined || value === null) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

function dateForEditor(value: CmsAdminValue | undefined) {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function normalizeRow(row: Row, fields: EditorField[]) {
  const normalized: Row = { ...row };
  for (const field of fields) {
    if (field.type === "json") normalized[field.key] = jsonForEditor(row[field.key]);
    if (field.type === "datetime") normalized[field.key] = dateForEditor(row[field.key]);
  }
  return normalized;
}

function payloadFromRow(row: Row, fields: EditorField[]) {
  const payload: Row = {};
  for (const field of fields) {
    const value = row[field.key];

    if (field.type === "json") {
      const source = typeof value === "string" ? value.trim() : "";
      if (!source) {
        payload[field.key] = null;
      } else {
        try {
          payload[field.key] = JSON.parse(source) as CmsAdminValue;
        } catch {
          throw new Error(`JSON غير صالح في حقل «${field.label}»`);
        }
      }
      continue;
    }

    if (field.type === "datetime") {
      const source = typeof value === "string" ? value.trim() : "";
      if (!source) {
        payload[field.key] = null;
      } else {
        const date = new Date(source);
        if (Number.isNaN(date.getTime())) {
          throw new Error(`تاريخ غير صالح في «${field.label}»`);
        }
        payload[field.key] = date.toISOString();
      }
      continue;
    }

    if (field.type === "number") {
      const number = Number(value ?? 0);
      if (!Number.isFinite(number)) {
        throw new Error(`رقم غير صالح في «${field.label}»`);
      }
      payload[field.key] = number;
      continue;
    }

    payload[field.key] = value ?? null;
  }
  return payload;
}

function rowStatus(row: Row) {
  const keys = ["is_published", "is_visible", "is_public"] as const;
  const key = keys.find((candidate) => candidate in row);
  if (!key) return null;
  return Boolean(row[key]);
}

/** Reusable CMS editor backed only by the authenticated server boundary. */
export function CollectionEditor({
  resource,
  title,
  description,
  fields,
  newRow,
  labelKey,
  identityKey = "id",
  allowDelete = true,
}: CollectionEditorProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const normalizedNewRow = useMemo(() => normalizeRow(newRow, fields), [fields, newRow]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listCmsResource(resource);
      setRows(data.map((row) => normalizeRow(row, fields)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // The field definitions are static route configuration; resource is the reload boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource]);

  const setValue = (identity: string, key: string, value: CmsAdminValue) => {
    setRows((current) =>
      current.map((row) =>
        String(row[identityKey]) === identity ? { ...row, [key]: value } : row,
      ),
    );
  };

  const saveRow = async (row: Row) => {
    const identity = String(row[identityKey] ?? "");
    if (!identity) {
      toast.error("تعذر تحديد العنصر للحفظ");
      return;
    }

    setSavingId(identity);
    try {
      const payload = payloadFromRow(row, fields);
      const updated = await updateCmsResource(resource, identity, payload);
      setRows((current) =>
        current.map((item) =>
          String(item[identityKey]) === identity ? normalizeRow(updated, fields) : item,
        ),
      );
      toast.success("تم الحفظ");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر الحفظ");
    } finally {
      setSavingId(null);
    }
  };

  const addRow = async () => {
    try {
      const created = await createCmsResource(resource, payloadFromRow(normalizedNewRow, fields));
      setRows((current) => [...current, normalizeRow(created, fields)]);
      toast.success("تمت الإضافة");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذرت الإضافة");
    }
  };

  const deleteRow = async (row: Row) => {
    const identity = String(row[identityKey] ?? "");
    if (!identity || !window.confirm("هل تريد حذف هذا العنصر نهائياً؟")) return;

    try {
      await deleteCmsResource(resource, identity);
      setRows((current) => current.filter((item) => String(item[identityKey]) !== identity));
      toast.success("تم الحذف");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر الحذف");
    }
  };

  const handleUpload = async (row: Row, field: EditorField, file: File) => {
    const identity = String(row[identityKey] ?? "new");
    const uploadKey = `${identity}:${field.key}`;
    setUploadingKey(uploadKey);
    try {
      const url = await uploadMedia(file, resource);
      setValue(identity, field.key, url);
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
                <Layers3 className="size-3.5" /> CMS Manager
              </span>
              <span className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                {loading ? "…" : rows.length} عنصر
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">{title}</h1>
            {description ? (
              <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <Button
            onClick={() => void addRow()}
            className="h-11 shrink-0 rounded-xl px-5 shadow-sm"
          >
            <Plus className="me-2 size-4" /> إضافة عنصر جديد
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="grid min-h-56 place-items-center rounded-[28px] border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> جاري تحميل البيانات…
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="grid min-h-64 place-items-center rounded-[28px] border border-dashed border-border bg-card px-6 text-center shadow-sm">
          <div>
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Layers3 className="size-6" />
            </div>
            <h2 className="mt-4 text-lg font-black">لا توجد عناصر حتى الآن</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              أضف أول عنصر وسيظهر هنا ضمن واجهة الإدارة.
            </p>
            <Button className="mt-5" onClick={() => void addRow()}>
              <Plus className="me-2 size-4" /> إضافة أول عنصر
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {rows.map((row, rowIndex) => {
            const identity = String(row[identityKey] ?? "");
            const status = rowStatus(row);
            return (
              <article
                key={identity}
                className="overflow-hidden rounded-[28px] border border-border bg-card shadow-sm"
              >
                <div className="flex flex-col gap-4 border-b border-border bg-muted/25 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-lg border border-border bg-background text-xs font-black text-muted-foreground">
                        {rowIndex + 1}
                      </span>
                      <h2 className="max-w-xl truncate text-base font-black text-foreground">
                        {String(row[labelKey] ?? identity ?? "بدون عنوان")}
                      </h2>
                      {status !== null ? (
                        <span
                          className={
                            status
                              ? "rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300"
                              : "rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground"
                          }
                        >
                          {status ? "مفعّل" : "غير مفعّل"}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate ps-10 font-mono text-[11px] text-muted-foreground">
                      {identity}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => void saveRow(row)}
                      disabled={savingId === identity}
                      className="rounded-xl"
                    >
                      {savingId === identity ? (
                        <Loader2 className="me-1.5 size-4 animate-spin" />
                      ) : (
                        <Save className="me-1.5 size-4" />
                      )}
                      حفظ
                    </Button>
                    {allowDelete ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void deleteRow(row)}
                        aria-label="حذف"
                        className="rounded-xl text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
                  {fields.map((field) => {
                    const value = row[field.key];
                    const inputId = `${resource}-${identity}-${field.key}`;
                    const fullWidth =
                      field.fullWidth ||
                      field.type === "textarea" ||
                      field.type === "json" ||
                      field.type === "image";

                    return (
                      <div
                        key={field.key}
                        className={
                          fullWidth
                            ? "rounded-2xl border border-border bg-background/60 p-4 sm:col-span-2"
                            : "rounded-2xl border border-border bg-background/60 p-4"
                        }
                      >
                        <Label htmlFor={inputId} className="text-xs font-bold text-foreground">
                          {field.label}
                        </Label>

                        {field.type === "boolean" ? (
                          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
                            <span className="text-xs font-medium text-muted-foreground">
                              {Boolean(value) ? "مفعّل" : "متوقف"}
                            </span>
                            <Switch
                              id={inputId}
                              checked={Boolean(value)}
                              onCheckedChange={(checked) => setValue(identity, field.key, checked)}
                            />
                          </div>
                        ) : field.type === "textarea" || field.type === "json" ? (
                          <Textarea
                            id={inputId}
                            className="mt-2 min-h-24 resize-y rounded-xl border-border bg-card font-mono text-xs"
                            rows={field.type === "json" ? 8 : 4}
                            required={field.required}
                            value={String(value ?? "")}
                            placeholder={field.placeholder}
                            onChange={(event) =>
                              setValue(identity, field.key, event.target.value)
                            }
                          />
                        ) : field.type === "select" ? (
                          <select
                            id={inputId}
                            className="mt-2 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                            value={String(value ?? "")}
                            required={field.required}
                            onChange={(event) =>
                              setValue(identity, field.key, event.target.value)
                            }
                          >
                            {(field.options ?? []).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : field.type === "image" ? (
                          <div className="mt-2 grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px]">
                            <div className="space-y-3">
                              <Input
                                id={inputId}
                                className="h-11 rounded-xl bg-card"
                                value={String(value ?? "")}
                                placeholder={field.placeholder ?? "رابط الصورة"}
                                required={field.required}
                                onChange={(event) =>
                                  setValue(identity, field.key, event.target.value)
                                }
                              />
                              <label className="flex min-h-24 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/35 bg-primary/5 px-4 text-sm font-bold text-primary transition hover:bg-primary/10">
                                {uploadingKey === `${identity}:${field.key}` ? (
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
                                    if (file) void handleUpload(row, field, file);
                                    event.target.value = "";
                                  }}
                                />
                              </label>
                            </div>
                            <div className="grid min-h-36 place-items-center overflow-hidden rounded-2xl border border-border bg-white p-3">
                              {value ? (
                                <img
                                  src={String(value)}
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
                        ) : (
                          <Input
                            id={inputId}
                            className="mt-2 h-11 rounded-xl bg-card"
                            type={
                              field.type === "number"
                                ? "number"
                                : field.type === "datetime"
                                  ? "datetime-local"
                                  : "text"
                            }
                            required={field.required}
                            value={String(value ?? "")}
                            placeholder={field.placeholder}
                            onChange={(event) =>
                              setValue(
                                identity,
                                field.key,
                                field.type === "number"
                                  ? Number(event.target.value)
                                  : event.target.value,
                              )
                            }
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
