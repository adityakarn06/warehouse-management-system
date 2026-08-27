"use client";

import { WarehouseIcon } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDock, useTruck, useUIStore } from "@/stores";
import type { YardDock } from "@/types";

function DockTile({ dock }: { dock: YardDock }) {
  const live = useDock(dock.id);
  const selectDock = useUIStore((s) => s.selectDock);
  const status = live?.status ?? dock.status;

  // A live dock event (DOCK_ASSIGNED/REASSIGNED/STATUS_CHANGED) can update who
  // occupies this door well before the debounced overview refetch catches
  // up — overlay that occupancy immediately rather than showing the stale
  // REST assignment (or none) until the refetch lands.
  const occupyingTruckId = live ? live.occupyingTruckId : (dock.currentAssignment?.truckId ?? null);
  const liveTruck = useTruck(occupyingTruckId);
  const restAssignment =
    dock.currentAssignment?.truckId === occupyingTruckId ? dock.currentAssignment : null;
  const assignment = occupyingTruckId
    ? {
        truckReference: liveTruck?.reference ?? restAssignment?.truckReference ?? occupyingTruckId,
        scheduledStart: restAssignment?.scheduledStart ?? null,
      }
    : null;

  return (
    <button
      type="button"
      onClick={() => selectDock(dock.id)}
      className={cn(
        "flex flex-col gap-1.5 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/40",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold">{dock.code}</span>
        <StatusBadge domain="dock" value={status} />
      </div>
      <span className="text-[0.65rem] text-muted-foreground">{dock.zone}</span>
      <div className="flex flex-wrap gap-1">
        {dock.supportedLoadTypes.map((loadType) => (
          <span
            key={loadType}
            className="rounded-sm bg-muted px-1 py-0.5 text-[0.6rem] text-muted-foreground"
          >
            {loadType}
          </span>
        ))}
      </div>
      {assignment ? (
        <div className="mt-1 border-t border-border pt-1.5 text-[0.65rem] text-muted-foreground">
          <span className="font-medium text-foreground">{assignment.truckReference}</span>
          {assignment.scheduledStart ? <span>{" · "}{formatTime(assignment.scheduledStart)}</span> : null}
        </div>
      ) : dock.unavailableReason ? (
        <div className="mt-1 border-t border-border pt-1.5 text-[0.65rem] text-destructive">
          {dock.unavailableReason}
        </div>
      ) : null}
    </button>
  );
}

export function DockStatusBoard({ docks }: { docks: YardDock[] }) {
  if (docks.length === 0) {
    return (
      <EmptyState
        icon={WarehouseIcon}
        title="No dock data"
        description="Dock status will appear here once the yard data loads."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
      {docks.map((dock) => (
        <DockTile key={dock.id} dock={dock} />
      ))}
    </div>
  );
}
