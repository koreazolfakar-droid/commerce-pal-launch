import { LayoutGrid } from "lucide-react";
import { categoryIconMap } from "@/dashboard/components/categories/category-icons";

export function CategoryIcon({ name, className = "size-5" }: { name: string; className?: string }) {
  const Icon = categoryIconMap[name] || LayoutGrid;
  return <Icon className={className} />;
}
