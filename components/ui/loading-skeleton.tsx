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

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2 rounded-lg border border-border p-4", className)}>
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-6 w-1/3" />
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
