"use client";

import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DockStatus } from "@/types";

import { DOCK_STATUS_ORDER, dockStatusFill, dockStatusLabel } from "./dock-status-fill";
import { glassRow } from "./glass-surface";
import { OverlayCard, OverlayMetric } from "./overlay-card";

interface DockMixOverlayProps {
  /** `totals.docksByStatus` exactly as `GET /yard/allocation-summary` sent it —
   * a status with no doors in it may be absent from the object entirely. */
  docksByStatus: Partial<Record<DockStatus, number>>;
  isPending: boolean;
  /** Opens the door board. Owned by the page, not this card: `YardHero`
   * renders this overlay twice (stacked below `lg`, floating above it), so
   * state held here would exist as two independent copies. */
  onManage: () => void;
}

/**
 * Door capacity at a glance, floating over the north-west corner of the map:
 * how many doors are free out of the whole board, then the full status split.
 *
 * Every number here is a backend count rendered as sent; the bar is a
 * proportion of those counts for reading, not a computed utilisation figure.
 * "Manage" opens the board where those doors are actually acted on.
 */
export function DockMixOverlay({ docksByStatus, isPending, onManage }: DockMixOverlayProps) {
  const counts = DOCK_STATUS_ORDER.map((status) => ({
    status,
    count: docksByStatus[status] ?? 0,
  }));
  const total = counts.reduce((sum, entry) => sum + entry.count, 0);
  const available = docksByStatus.AVAILABLE ?? 0;

  return (
    <OverlayCard
      title="Dock doors"
      action={
        <Button size="xs" variant="outline" onClick={onManage}>
          Manage
        </Button>
      }
    >
      {isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-2 w-full" />
        </div>
      ) : (
        <>
          <OverlayMetric
            value={String(available)}
            suffix={`/ ${total} doors`}
            hint={`${docksByStatus.UNAVAILABLE ?? 0} out of service`}
          />
          <ProgressBar
            value={total === 0 ? 0 : (available / total) * 100}
            label="Doors available"
            className="bg-background/60"
            indicatorClassName="bg-success"
          />
        </>
      )}

      <div className="flex flex-col gap-1">
        {counts.map((entry) => (
          <div
            key={entry.status}
            className={cn(glassRow, "flex items-center justify-between gap-2 px-2 py-1.5")}
          >
            <span className="flex items-center gap-2 text-2xs">
              <span
                aria-hidden
                className={cn("size-2 rounded-full", dockStatusFill[entry.status])}
              />
              {dockStatusLabel(entry.status)}
            </span>
            {isPending ? (
              <Skeleton className="h-3 w-6" />
            ) : (
              <span className="text-2xs font-medium tabular-nums text-muted-foreground">
                {entry.count}
              </span>
            )}
          </div>
        ))}
      </div>
    </OverlayCard>
  );
}
