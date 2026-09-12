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
          "press z-20 h-10 w-10 rounded-full border-border/70 bg-background/95 text-muted-foreground shadow-sm backdrop-blur hover:border-primary/40 hover:bg-background hover:text-primary [&_svg]:size-[18px]",
          selected && "border-primary bg-accent text-primary hover:bg-accent",
          className,
        )}
      >
        <Columns2 strokeWidth={1.9} />
      </Button>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        onClick={onToggle}
        aria-pressed={selected}
        className={cn("rounded-xl", selected && "border-primary bg-accent text-primary")}
      >
        <Columns2 className="h-4 w-4" />
        {selected ? "Added to compare" : "Compare"}
      </Button>
      {handles.length >= 2 && (
        <Button asChild variant="ghost" className="rounded-xl">
          <Link to="/compare" search={{ products: undefined }}>
            View comparison ({handles.length})
          </Link>
        </Button>
      )}
    </div>
  );
}
