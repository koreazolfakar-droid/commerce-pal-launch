import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { compareHandles, setCompareHandles } from "@/components/CompareButton";
import { StoreLayout } from "@/components/StoreLayout";
import { fetchProductByHandle } from "@/lib/storefrontData";
import type { StoreProduct } from "@/lib/storeTypes";
import { specificationGroups } from "@/lib/specifications";

export const Route = createFileRoute("/compare")({ component: ComparePage });

function ComparePage() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      setLoading(true);
      setError("");
      Promise.all(compareHandles().map(fetchProductByHandle)).then((rows) => {
        if (!cancelled) setProducts(rows.filter((row): row is StoreProduct => row !== null));
      }).catch(() => { if (!cancelled) setError("Comparison is unavailable. Please try again."); })
        .finally(() => { if (!cancelled) setLoading(false); });
    };
    load();
    window.addEventListener("space-call:compare", load);
    return () => { cancelled = true; window.removeEventListener("space-call:compare", load); };
  }, []);
  const rows = (product: StoreProduct) => specificationGroups(
    product.node.specifications ?? { values: {}, keySpecs: [] },
    product.node.specTemplate ?? { sections: [] },
  ).flatMap((group) => group.rows);
  const labels = [...new Set(products.flatMap((product) => rows(product).map((row) => row.label)))];
  return <StoreLayout><main className="mx-auto max-w-6xl px-4 py-8">
    <h1 className="mb-5 text-2xl font-semibold">Compare products</h1>
    {loading ? <p>Loading comparison…</p> : error ? <p role="alert">{error}</p> :
      products.length === 0 ? <p>Select products to compare from a product page.</p> :
      <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[560px] border-collapse text-sm">
        <thead><tr><th className="p-3 text-start">Specification</th>{products.map((product) =>
          <th key={product.node.id} className="min-w-40 border-s p-3 text-start">
            <Link to="/product/$handle" params={{ handle: product.node.handle }} className="text-primary">{product.node.title}</Link>
            <button type="button" className="mt-1 block text-xs text-muted-foreground" onClick={() =>
              setCompareHandles(compareHandles().filter((handle) => handle !== product.node.handle))}>Remove</button>
          </th>)}</tr></thead>
        <tbody>{labels.map((label) => <tr key={label} className="border-t"><th className="p-3 text-start font-medium">{label}</th>
          {products.map((product) => <td key={product.node.id} className="border-s p-3">
            {rows(product).find((row) => row.label === label)?.value ?? "—"}
          </td>)}</tr>)}</tbody>
      </table></div>}
  </main></StoreLayout>;
}
