import { useEffect, useMemo, useState } from "react";
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
import type { CmsAdminResource, CmsAdminRow } from "@/lib/cmsAdmin.server";

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

function jsonForEditor(value: unknown) {
  if (typeof value === "string") return value;
  if (value === undefined || value === null) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

function dateForEditor(value: unknown) {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function normalizeRow(row: Row, fields: EditorField[]) {
  const normalized = { ...row };
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
          payload[field.key] = JSON.parse(source) as unknown;
        } catch {
          throw new Error(`JSON غير صالح في حقل «${field.label}»`);
        }
      }
      continue;
    }

    if (field.type === "datetime") {
      const source = typeof value === "string" ? value.trim() : "";
      if (!source) payload[field.key] = null;
      else {
        const date = new Date(source);
        if (Number.isNaN(date.getTime())) throw new Error(`تاريخ غير صالح في «${field.label}»`);
        payload[field.key] = date.toISOString();
      }
      continue;
    }

    if (field.type === "number") {
      const number = Number(value ?? 0);
      if (!Number.isFinite(number)) throw new Error(`رقم غير صالح في «${field.label}»`);
      payload[field.key] = number;
      continue;
    }

    payload[field.key] = value ?? null;
  }
  return payload;
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

  const setValue = (identity: string, key: string, value: unknown) => {
    setRows((current) =>
      current.map((row) => (String(row[identityKey]) === identity ? { ...row, [key]: value } : row)),
    );
  };

  const saveRow = async (row: Row) => {
    const identity = String(row[identityKey] ?? "");
    if (!identity) return toast.error("تعذر تحديد العنصر للحفظ");

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
    <section className="space-y-5" dir="rtl">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">{title}</h1>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        <Button onClick={() => void addRow()} size="sm">
          <Plus className="me-1 size-4" /> إضافة
        </Button>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> جاري التحميل…
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          لا توجد عناصر بعد. اضغط «إضافة» للبدء.
        </p>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const identity = String(row[identityKey] ?? "");
            return (
              <article key={identity} className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="min-w-0 truncate text-sm font-bold text-foreground">
                    {String(row[labelKey] ?? identity ?? "بدون عنوان")}
                  </h2>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void saveRow(row)}
                      disabled={savingId === identity}
                    >
                      {savingId === identity ? (
                        <Loader2 className="me-1 size-4 animate-spin" />
                      ) : (
                        <Save className="me-1 size-4" />
                      )}
                      حفظ
                    </Button>
                    {allowDelete ? (
                      <Button size="sm" variant="ghost" onClick={() => void deleteRow(row)} aria-label="حذف">
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {fields.map((field) => {
                    const value = row[field.key];
                    const inputId = `${resource}-${identity}-${field.key}`;
                    const fullWidth = field.fullWidth || field.type === "textarea" || field.type === "json" || field.type === "image";
                    return (
                      <div key={field.key} className={fullWidth ? "sm:col-span-2" : undefined}>
                        <Label htmlFor={inputId} className="text-xs text-muted-foreground">
                          {field.label}
                        </Label>

                        {field.type === "boolean" ? (
                          <div className="mt-2 flex h-10 items-center">
                            <Switch
                              id={inputId}
                              checked={Boolean(value)}
                              onCheckedChange={(checked) => setValue(identity, field.key, checked)}
                            />
                          </div>
                        ) : field.type === "textarea" || field.type === "json" ? (
                          <Textarea
                            id={inputId}
                            className="mt-1 font-mono text-xs"
                            rows={field.type === "json" ? 7 : 3}
                            required={field.required}
                            value={String(value ?? "")}
                            placeholder={field.placeholder}
                            onChange={(event) => setValue(identity, field.key, event.target.value)}
                          />
                        ) : field.type === "select" ? (
                          <select
                            id={inputId}
                            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                            value={String(value ?? "")}
                            required={field.required}
                            onChange={(event) => setValue(identity, field.key, event.target.value)}
                          >
                            {(field.options ?? []).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : field.type === "image" ? (
                          <div className="mt-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Input
                                id={inputId}
                                value={String(value ?? "")}
                                placeholder={field.placeholder ?? "رابط الصورة"}
                                required={field.required}
                                onChange={(event) => setValue(identity, field.key, event.target.value)}
                              />
                              <label className="inline-flex h-10 cursor-pointer items-center gap-1 rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent">
                                {uploadingKey === `${identity}:${field.key}` ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Upload className="size-4" />
                                )}
                                رفع
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml"
                                  className="hidden"
                                  onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (file) void handleUpload(row, field, file);
                                    event.target.value = "";
                                  }}
                                />
                              </label>
                            </div>
                            {value ? (
                              <img
                                src={String(value)}
                                alt=""
                                className="max-h-40 w-auto rounded-xl border border-border bg-white object-contain p-2"
                              />
                            ) : null}
                          </div>
                        ) : (
                          <Input
                            id={inputId}
                            className="mt-1"
                            type={field.type === "number" ? "number" : field.type === "datetime" ? "datetime-local" : "text"}
                            required={field.required}
                            value={String(value ?? "")}
                            placeholder={field.placeholder}
                            onChange={(event) =>
                              setValue(
                                identity,
                                field.key,
                                field.type === "number" ? Number(event.target.value) : event.target.value,
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
