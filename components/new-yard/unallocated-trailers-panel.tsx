"use client";

import { CheckCircle2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { RowSkeleton } from "@/components/ui/loading-skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAllocationSummary } from "@/features/yard";
import { cn } from "@/lib/utils";

import { glassRow } from "./glass-surface";

import { YardPanel } from "./yard-panel";

/**
 * The trailers holding no door — `unallocated[]` from the allocation summary,
 * in the order the backend returned it. The queue panel next to it answers
 * "what is coming"; this answers "what is still waiting".
 */
export function UnallocatedTrailersPanel() {
  const query = useAllocationSummary();

  return (
    <YardPanel
      title="Awaiting a door"
      action={
        query.data ? (
          <Badge variant="outline">{query.data.totals.unallocatedTrailers}</Badge>
        ) : null
      }
      contentClassName="gap-1"
    >
      {query.isPending ? (
        Array.from({ length: 3 }).map((_, index) => <RowSkeleton key={index} />)
      ) : query.isError ? (
        <ErrorState
          title="Could not load the allocation summary"
          message={query.error.message}
          onRetry={() => void query.refetch()}
        />
      ) : query.data.unallocated.length === 0 ? (
        <EmptyState
          icon={CheckCircle2Icon}
          title="Every trailer has a door"
          description="Nothing in the yard is waiting on an allocation."
        />
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-1 pr-2">
            {query.data.unallocated.map((trailer) => (
              <div
                key={trailer.truckId}
                className={cn(glassRow, "flex items-center justify-between gap-2 px-2 py-1.5")}
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-xs font-medium">{trailer.truckReference}</span>
                  <span className="truncate font-mono text-2xs text-muted-foreground">
                    {trailer.trailerId}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <Badge variant="outline">{trailer.priority}</Badge>
                  <StatusBadge domain="truck" value={trailer.status} />
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </YardPanel>
  );
}
