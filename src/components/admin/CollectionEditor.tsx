import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/adminMedia";

export type EditorFieldType = "text" | "textarea" | "number" | "boolean" | "select" | "image";

export type EditorField = {
  key: string;
  label: string;
  type: EditorFieldType;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  required?: boolean;
};

type Row = Record<string, unknown>;

export type CollectionEditorProps = {
  table: string;
  title: string;
  description?: string;
  fields: EditorField[];
  newRow: Row;
  orderBy?: string;
  labelKey: string;
};

/**
 * Reusable dashboard editor: lists, creates, updates and deletes rows for one
 * content table. Access is enforced by the database policies, not the UI.
 */
export function CollectionEditor({
  table,
  title,
  description,
  fields,
  newRow,
  orderBy = "sort_order",
  labelKey,
}: CollectionEditorProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const client = useMemo(() => supabase, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await client
      .from(table as never)
      .select("*")
      .order(orderBy, { ascending: true });
    if (error) toast.error(error.message);
    setRows(((data ?? []) as Row[]).map((row) => ({ ...row })));
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  const setValue = (id: string, key: string, value: unknown) => {
    setRows((current) =>
      current.map((row) => (String(row["id"]) === id ? { ...row, [key]: value } : row)),
    );
  };

  const saveRow = async (row: Row) => {
    const id = String(row["id"]);
    setSavingId(id);
    const payload: Row = {};
    for (const field of fields) payload[field.key] = row[field.key] ?? null;
    const { error } = await client
      .from(table as never)
      .update(payload as never)
      .eq("id", id);
    setSavingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم الحفظ");
  };

  const addRow = async () => {
    const { error } = await client.from(table as never).insert(newRow as never);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تمت الإضافة");
    await load();
  };

  const deleteRow = async (row: Row) => {
    if (!window.confirm("هل تريد الحذف نهائياً؟")) return;
    const { error } = await client
      .from(table as never)
      .delete()
      .eq("id", String(row["id"]));
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((current) => current.filter((item) => item["id"] !== row["id"]));
    toast.success("تم الحذف");
  };

  const handleUpload = async (row: Row, field: EditorField, file: File) => {
    const uploadKey = `${String(row["id"])}:${field.key}`;
    setUploadingKey(uploadKey);
    try {
      const url = await uploadMedia(file, table);
      setValue(String(row["id"]), field.key, url);
      toast.success("تم رفع الصورة، اضغط حفظ");
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
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <Button onClick={() => void addRow()} size="sm">
          <Plus className="me-1 size-4" /> إضافة
        </Button>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> جاري التحميل…
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          لا توجد عناصر بعد. اضغط «إضافة» للبدء.
        </p>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const id = String(row["id"]);
            return (
              <article key={id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="truncate text-sm font-semibold text-foreground">
                    {String(row[labelKey] ?? "بدون عنوان")}
                  </h2>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void saveRow(row)}
                      disabled={savingId === id}
                    >
                      {savingId === id ? (
                        <Loader2 className="me-1 size-4 animate-spin" />
                      ) : (
                        <Save className="me-1 size-4" />
                      )}
                      حفظ
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void deleteRow(row)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {fields.map((field) => {
                    const value = row[field.key];
                    const inputId = `${id}-${field.key}`;
                    return (
                      <div
                        key={field.key}
                        className={field.type === "textarea" ? "sm:col-span-2" : undefined}
                      >
                        <Label htmlFor={inputId} className="text-xs text-muted-foreground">
                          {field.label}
                        </Label>

                        {field.type === "boolean" ? (
                          <div className="mt-2">
                            <Switch
                              id={inputId}
                              checked={Boolean(value)}
                              onCheckedChange={(checked) => setValue(id, field.key, checked)}
                            />
                          </div>
                        ) : field.type === "textarea" ? (
                          <Textarea
                            id={inputId}
                            className="mt-1"
                            rows={3}
                            value={String(value ?? "")}
                            onChange={(event) => setValue(id, field.key, event.target.value)}
                          />
                        ) : field.type === "select" ? (
                          <select
                            id={inputId}
                            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                            value={String(value ?? "")}
                            onChange={(event) => setValue(id, field.key, event.target.value)}
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
                                placeholder="رابط الصورة"
                                onChange={(event) => setValue(id, field.key, event.target.value)}
                              />
                              <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-input px-2 py-2 text-xs">
                                {uploadingKey === `${id}:${field.key}` ? (
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
                                className="h-20 w-auto rounded-md border border-border bg-white object-contain p-1"
                              />
                            ) : null}
                          </div>
                        ) : (
                          <Input
                            id={inputId}
                            className="mt-1"
                            type={field.type === "number" ? "number" : "text"}
                            value={String(value ?? "")}
                            placeholder={field.placeholder ?? ""}
                            onChange={(event) =>
                              setValue(
                                id,
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
