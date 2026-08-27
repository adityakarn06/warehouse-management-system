import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function RowSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 p-2", className)}>
      <Skeleton className="size-8 rounded-full" />
      <div className="flex flex-1 flex-col gap-1.5">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
    </div>
  );
}

/**
 * Matches `Card`'s own surface exactly — `rounded-lg border border-border` plus
 * the `--card-spacing` padding — so the skeleton→loaded swap does not shift by
 * a hairline. `size="sm"` mirrors `Card`'s `data-[size=sm]` (p-3 rather than p-4).
 */
export function CardSkeleton({
  className,
  size = "default",
}: {
  className?: string;
  size?: "default" | "sm";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-border",
        size === "sm" ? "p-3" : "p-4",
        className,
      )}
    >
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-6 w-1/3" />
    </div>
  );
}

/** The KPI strip's own shape: a short label over a large tabular value. */
export function KpiSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5 rounded-lg border border-border p-3", className)}>
      <Skeleton className="h-2.5 w-2/3" />
      <Skeleton className="h-6 w-10" />
    </div>
  );
}

/**
 * The dock tile's shape — code + status badge, name, zone, load-type chips and
 * the action button — so the 8-up board does not reflow when the snapshot lands.
 */
export function DockTileSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5 rounded-lg border border-border p-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-4 w-14 rounded-full" />
      </div>
      <Skeleton className="h-2.5 w-3/4" />
      <Skeleton className="h-2.5 w-1/2" />
      <div className="flex gap-1 pt-0.5">
        <Skeleton className="h-3 w-8 rounded-sm" />
        <Skeleton className="h-3 w-8 rounded-sm" />
      </div>
      <Skeleton className="mt-auto h-5 w-full rounded-sm" />
    </div>
  );
}

/** An alert feed row: title + severity badge, message, then type and timestamp. */
export function AlertRowSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-md border border-border border-l-2 px-2 py-1.5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-4 w-12 rounded-full" />
      </div>
      <Skeleton className="h-2.5 w-4/5" />
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-2.5 w-10" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col divide-y divide-border rounded-lg border border-border", className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <RowSkeleton key={index} />
      ))}
    </div>
  );
}
