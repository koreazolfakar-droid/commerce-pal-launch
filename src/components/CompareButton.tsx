import { Link } from "@tanstack/react-router";
import { Columns2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MAX_COMPARE_PRODUCTS, useCompareStore } from "@/stores/compareStore";

export function CompareButton({
  handle,
  compact = false,
  className,
}: {
  handle: string;
  compact?: boolean;
  className?: string;
}) {
  const handles = useCompareStore((state) => state.handles);
  const toggle = useCompareStore((state) => state.toggle);
  const selected = handles.includes(handle);

  const onToggle = () => {
    const result = toggle(handle);
    if (result === "full") toast.error(`Compare up to ${MAX_COMPARE_PRODUCTS} phones at a time.`);
    else toast.success(result === "added" ? "Added to comparison" : "Removed from comparison");
  };

  if (compact) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onToggle}
        aria-label={selected ? "Remove from comparison" : "Add to comparison"}
        aria-pressed={selected}
        className={cn(
          "h-9 w-9 rounded-full bg-background/90",
          selected && "border-primary text-primary",
          className,
        )}
      >
        <Columns2 className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        onClick={onToggle}
        aria-pressed={selected}
        className="rounded-full"
      >
        <Columns2 className="h-4 w-4" />
        {selected ? "Added to compare" : "Compare"}
      </Button>
      {handles.length >= 2 && (
        <Button asChild variant="ghost" className="rounded-full">
          <Link to="/compare" search={{ products: undefined }}>
            View comparison ({handles.length})
          </Link>
        </Button>
      )}
    </div>
  );
}
