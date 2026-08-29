"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DockStatus } from "@/types";

import { DOCK_STATUS_ORDER, dockStatusFill, dockStatusLabel } from "./dock-status-fill";
import { YardPanel } from "./yard-panel";

interface DockMixPanelProps {
  docksByStatus: Partial<Record<DockStatus, number>>;
  isPending: boolean;
}

/**
 * The whole door board as one proportional bar — the shape of the yard in a
 * glance, where the 8-up dock board answers "which door".
 *
 * Zero-count statuses are dropped from the bar (a 0%-wide segment renders as a
 * hairline of the wrong colour) but kept in the legend, so a status going to
 * zero is still visible as a number.
 */
export function DockMixPanel({ docksByStatus, isPending }: DockMixPanelProps) {
  const counts = DOCK_STATUS_ORDER.map((status) => ({
    status,
    count: docksByStatus[status] ?? 0,
  }));
  const total = counts.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <YardPanel title="Door status mix" contentClassName="gap-3">
      <div className="flex items-baseline gap-1.5">
        {isPending ? (
          <Skeleton className="h-6 w-12" />
        ) : (
          <span className="text-xl font-semibold leading-none tabular-nums">{total}</span>
        )}
        <span className="text-2xs text-muted-foreground">doors</span>
      </div>

      {isPending ? (
        <Skeleton className="h-2.5 w-full rounded-full" />
      ) : (
        <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-background/60">
          {counts
            .filter((entry) => entry.count > 0)
            .map((entry) => (
              <span
                key={entry.status}
                className={cn("h-full first:rounded-l-full last:rounded-r-full", dockStatusFill[entry.status])}
                style={{ width: `${total === 0 ? 0 : (entry.count / total) * 100}%` }}
                title={`${dockStatusLabel(entry.status)}: ${entry.count}`}
              />
            ))}
        </div>
      )}

      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {counts.map((entry) => (
          <li key={entry.status} className="flex items-center justify-between gap-2 text-2xs">
            <span className="flex min-w-0 items-center gap-1.5">
              <span aria-hidden className={cn("size-2 shrink-0 rounded-full", dockStatusFill[entry.status])} />
              <span className="truncate text-muted-foreground">{dockStatusLabel(entry.status)}</span>
            </span>
            {isPending ? (
              <Skeleton className="h-3 w-5" />
            ) : (
              <span className="font-medium tabular-nums">{entry.count}</span>
            )}
          </li>
        ))}
      </ul>
    </YardPanel>
  );
}
