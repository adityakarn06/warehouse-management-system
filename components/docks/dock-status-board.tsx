"use client";

import { WarehouseIcon } from "lucide-react";

import { DockStatusAction } from "@/components/docks/dock-status-action";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDock, useSelectedDockId, useTruck, useUIStore } from "@/stores";
import type { YardDock } from "@/types";

function DockTile({ dock }: { dock: YardDock }) {
  const live = useDock(dock.id);
  const selectedDockId = useSelectedDockId();
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
        shipmentReference: restAssignment?.shipmentReference ?? null,
        scheduledStart: restAssignment?.scheduledStart ?? null,
      }
    : null;

  // Live reason first, snapshot second; never shown for a door back in service.
  const unavailableReason =
    status === "UNAVAILABLE" ? (live?.unavailableReason ?? dock.unavailableReason ?? null) : null;

  const isSelected = selectedDockId === dock.id;

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-lg border bg-card p-3 transition-colors",
        isSelected ? "border-primary ring-1 ring-primary/20" : "border-border",
      )}
    >
      {/* Selection is its own control so the action button below is not an
          interactive element nested inside another. */}
      <button
        type="button"
        onClick={() => selectDock(isSelected ? null : dock.id)}
        className="flex flex-col gap-1.5 text-left"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold tracking-tight">{dock.code}</span>
          <StatusBadge domain="dock" value={status} />
        </div>
        <span className="truncate text-2xs text-muted-foreground">{dock.name}</span>
        <span className="text-2xs text-muted-foreground">{dock.zone}</span>
      </button>

      <div className="flex flex-wrap gap-1">
        {dock.supportedLoadTypes.map((loadType) => (
          <span
            key={loadType}
            className="rounded-sm bg-muted px-1 py-0.5 text-2xs text-muted-foreground"
          >
            {loadType}
          </span>
        ))}
      </div>

      {assignment ? (
        <div className="flex flex-col gap-0.5 border-t border-border pt-1.5 text-2xs text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">{assignment.truckReference}</span>
            {assignment.scheduledStart ? <span>{" · "}{formatTime(assignment.scheduledStart)}</span> : null}
          </span>
          {assignment.shipmentReference ? <span>{assignment.shipmentReference}</span> : null}
        </div>
      ) : null}

      {unavailableReason ? (
        <div className="border-t border-border pt-1.5 text-2xs text-destructive">
          {unavailableReason}
        </div>
      ) : null}

      <DockStatusAction
        dockId={dock.id}
        code={dock.code}
        status={status}
        hasAssignment={Boolean(occupyingTruckId)}
        size="xs"
        className="mt-auto w-full"
      />
    </div>
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
