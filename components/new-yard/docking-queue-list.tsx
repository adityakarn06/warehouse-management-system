"use client";

import { TruckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { RowSkeleton } from "@/components/ui/loading-skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDockingQueue } from "@/features/yard";
import { useNow } from "@/hooks/use-now";
import { formatCountdown } from "@/lib/format";
import { cn } from "@/lib/utils";

import { glassRow } from "./glass-surface";
import { useSelectedTruckId, useUIStore } from "@/stores";

/**
 * The arrival order, flattened to one ranked list.
 *
 * Windows arrive pre-grouped and pre-sorted (window, then priority, then ETA)
 * and are rendered in the order received — the row number is the position the
 * backend put the truck in, not a ranking computed here. Selecting a row is
 * the map's selection, so clicking a queue position flies the hero to it.
 */
export function DockingQueueList() {
  const query = useDockingQueue();
  const now = useNow();
  const selectedTruckId = useSelectedTruckId();
  const selectTruck = useUIStore((s) => s.selectTruck);

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-1">
        {Array.from({ length: 4 }).map((_, index) => (
          <RowSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        title="Could not load the docking queue"
        message={query.error.message}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const entries = query.data.windows.flatMap((window) => window.entries);

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={TruckIcon}
        title="Nothing queued"
        description={`No trailer is due a door in the next ${query.data.horizonMinutes} minutes.`}
      />
    );
  }

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="flex flex-col gap-1 pr-2">
        {entries.map((entry, index) => {
          const isSelected = selectedTruckId === entry.truckId;
          return (
            <button
              key={entry.truckId}
              type="button"
              onClick={() => selectTruck(isSelected ? null : entry.truckId)}
              aria-pressed={isSelected}
              className={cn(
                glassRow,
                "flex items-center gap-2.5 border border-transparent px-2 py-2 text-left transition-colors hover:bg-background/80",
                isSelected && "border-primary bg-background/85",
              )}
            >
              <span className="grid size-5 shrink-0 place-items-center rounded-sm bg-background text-2xs font-medium tabular-nums text-muted-foreground">
                {index + 1}
              </span>

              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-1.5 truncate text-xs font-medium">
                  {entry.truckReference}
                  <span className="font-mono text-2xs font-normal text-muted-foreground">
                    {entry.trailerId}
                  </span>
                </span>
                <span className="truncate text-2xs text-muted-foreground">
                  {/* A recommendation is a proposal, never a booking — the arrow
                      reads as "proposed for", and committing it still happens on
                      the recommendations panel. */}
                  {entry.topRecommendation
                    ? `→ ${entry.topRecommendation.dockCode}`
                    : "No dock recommendation"}
                </span>
              </span>

              <span className="flex shrink-0 flex-col items-end gap-0.5">
                <Badge variant="outline">{entry.priority}</Badge>
                <span className="text-2xs tabular-nums text-muted-foreground">
                  {formatCountdown(entry.eta, now)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
