"use client";

import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";

import { OverlayCard, OverlayMetric } from "./overlay-card";

interface AllocationOverlayProps {
  /** `totals.allocatedTrailers` / `totals.unallocatedTrailers` from
   * `GET /yard/allocation-summary`, rendered as sent. */
  allocated: number;
  unallocated: number;
  isPending: boolean;
}

/**
 * The allocation counterpart to `DockMixOverlay`, floating over the north-east
 * corner: how much of the yard currently holds a door.
 */
export function AllocationOverlay({ allocated, unallocated, isPending }: AllocationOverlayProps) {
  const total = allocated + unallocated;

  return (
    <OverlayCard title="Trailer allocation">
      {isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-2 w-full" />
        </div>
      ) : (
        <>
          <OverlayMetric
            value={String(allocated)}
            suffix={`/ ${total} trailers`}
            hint={
              unallocated === 0
                ? "Every trailer holds a door"
                : `${unallocated} still waiting on a door`
            }
          />
          <ProgressBar
            value={total === 0 ? 0 : (allocated / total) * 100}
            label="Trailers allocated"
            className="bg-background/60"
            indicatorClassName="bg-info"
          />
        </>
      )}
    </OverlayCard>
  );
}
