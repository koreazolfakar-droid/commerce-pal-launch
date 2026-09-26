import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

import { compareHandles, setCompareHandles } from "@/components/CompareButton";
import { StoreLayout } from "@/components/StoreLayout";
import { EMPTY_SPECS, EMPTY_TEMPLATE } from "@/lib/specifications";
import { fetchProductByHandle } from "@/lib/storefrontData";
import type { StoreProduct } from "@/lib/storeTypes";

export const Route = createFileRoute("/compare")({ component: ComparePage });

type CompareSpecRow = {
  key: string;
  label: string;
  section: string;
  value: string;
};

function productRows(product: StoreProduct): CompareSpecRow[] {
  const specs = product.node.specifications ?? EMPTY_SPECS;
  const template = product.node.specTemplate ?? EMPTY_TEMPLATE;

  return template.sections.flatMap((section) =>
    section.fields.flatMap((field) =>
      specs.values[field.key]
        ? [
            {
              key: field.key,
              label: field.label,
              section: section.title,
              value: specs.values[field.key],
            },
          ]
        : [],
    ),
  );
}

function ComparePage() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError("");

      try {
        const rows = await Promise.all(compareHandles().map(fetchProductByHandle));
        if (cancelled || requestId !== requestIdRef.current) return;
        setProducts(rows.filter((row): row is StoreProduct => row !== null));
      } catch {
        if (cancelled || requestId !== requestIdRef.current) return;
        setError("Comparison is unavailable. Please try again.");
      } finally {
        if (!cancelled && requestId === requestIdRef.current) setLoading(false);
      }
    };

    void load();
    window.addEventListener("space-call:compare", load);
    return () => {
      cancelled = true;
      requestIdRef.current += 1;
      window.removeEventListener("space-call:compare", load);
    };
  }, []);

  const comparisonRows = useMemo(() => {
    const byKey = new Map<string, { label: string; section: string }>();
    const labelKeys = new Map<string, Set<string>>();

    for (const product of products) {
      for (const row of productRows(product)) {
        if (!byKey.has(row.key)) byKey.set(row.key, { label: row.label, section: row.section });
        const keys = labelKeys.get(row.label) ?? new Set<string>();
        keys.add(row.key);
        labelKeys.set(row.label, keys);
      }
    }

    return [...byKey].map(([key, meta]) => ({
      key,
      displayLabel:
        (labelKeys.get(meta.label)?.size ?? 0) > 1
          ? `${meta.label} · ${meta.section}`
          : meta.label,
    }));
  }, [products]);

  return (
    <StoreLayout>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-5 text-2xl font-semibold">Compare products</h1>

        {loading ? (
          <p>Loading comparison…</p>
        ) : error ? (
          <p role="alert">{error}</p>
        ) : products.length === 0 ? (
          <p>Select products to compare from a product page.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="p-3 text-start">Specification</th>
                  {products.map((product) => (
                    <th
                      key={product.node.id}
                      className="min-w-40 border-s p-3 text-start"
                    >
                      <Link
                        to="/product/$handle"
                        params={{ handle: product.node.handle }}
                        className="text-primary"
                      >
                        {product.node.title}
                      </Link>
                      <button
                        type="button"
                        className="mt-1 block text-xs text-muted-foreground"
                        onClick={() =>
                          setCompareHandles(
                            compareHandles().filter(
                              (handle) => handle !== product.node.handle,
                            ),
                          )
                        }
                      >
                        Remove
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.key} className="border-t">
                    <th className="p-3 text-start font-medium">{row.displayLabel}</th>
                    {products.map((product) => (
                      <td key={product.node.id} className="border-s p-3">
                        {productRows(product).find((item) => item.key === row.key)?.value ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </StoreLayout>
  );
}
