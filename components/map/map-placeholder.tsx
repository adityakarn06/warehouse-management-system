import { MapIcon } from "lucide-react";

export function MapPlaceholder() {
  return (
    <div className="flex min-h-80 flex-1 items-center justify-center rounded-lg border border-border bg-muted/20 text-sm text-muted-foreground">
      <div className="flex flex-col items-center gap-2">
        <MapIcon className="size-6" />
        Yard map
      </div>
    </div>
  );
}
