"use client";

import { PackageIcon, TruckIcon } from "lucide-react";

import { DockStatusAction } from "@/components/docks/dock-status-action";
import { AssignmentStateBadge } from "@/components/ui/assignment-state-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  useAssignmentForTruck,
  useDock as useLiveDock,
  useSelectedDockId,
  useTruck,
} from "@/stores/selectors";
import { useUIStore } from "@/stores/use-ui-store";
import type { DockListItem } from "@/types";

/**
 * One door on the yard board.
 *
 * The REST row is the snapshot; the live store overlays it, so a status change
 * (and its reason) shows the moment the command returns or the socket event
 * lands, without refetching the board.
 */
export function DockCard({ dock }: { dock: DockListItem }) {
  const live = useLiveDock(dock.id);
  const selectedDockId = useSelectedDockId();
  const selectDock = useUIStore((s) => s.selectDock);

  const status = live?.status ?? dock.status;

  // `assignments` on a list row is the ASSIGNED assignment only (docs/api.md),
  // so this is the truck genuinely holding the door, not a proposal.
  const restAssignment = dock.assignments?.find((entry) => entry.status === "ASSIGNED") ?? null;
  const occupyingTruckId = live ? live.occupyingTruckId : (restAssignment?.truck.id ?? null);
  const liveTruck = useTruck(occupyingTruckId);

  const assignment = restAssignment?.truck.id === occupyingTruckId ? restAssignment : null;

  // Was this truck *moved* here by the failure cascade? Only a DOCK_REASSIGNED
  // entry carries `previousDockCode`. The `dockDoorId` check keeps a stale
  // entry — the truck has since moved on again — from labelling the wrong door.
  const liveAssignment = useAssignmentForTruck(occupyingTruckId);
  const reassignedFrom =
    liveAssignment?.previousDockCode !== undefined && liveAssignment.dockDoorId === dock.id
      ? liveAssignment.previousDockCode
      : null;
  const truckReference = occupyingTruckId
    ? (liveTruck?.reference ?? assignment?.truck.reference ?? occupyingTruckId)
    : null;

  // Prefer the live reason; fall back to the snapshot. Never show a reason for
  // a door that is not out of service.
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
      {/* A plain button wrapper would make the action button below a nested
          interactive element, so selection is its own control. */}
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

      {truckReference ? (
        <div className="flex flex-col gap-0.5 border-t border-border pt-1.5 text-2xs">
          <span className="flex items-center gap-1">
            <TruckIcon className="size-2.5 shrink-0 text-muted-foreground" />
            <span className="font-medium text-foreground">{truckReference}</span>
            {assignment?.scheduledStart ? (
              <span className="text-muted-foreground">
                · {formatTime(assignment.scheduledStart)}
              </span>
            ) : null}
          </span>
          {reassignedFrom ? (
            <span className="flex items-center gap-1">
              <AssignmentStateBadge state="REASSIGNED" />
              <span className="text-muted-foreground">from {reassignedFrom}</span>
            </span>
          ) : null}
          {assignment?.shipment ? (
            <span className="flex items-center gap-1 text-muted-foreground">
              <PackageIcon className="size-2.5 shrink-0" />
              {assignment.shipment.reference} · {assignment.shipment.loadType}
            </span>
          ) : null}
        </div>
      ) : null}

      {unavailableReason ? (
        <p className="border-t border-border pt-1.5 text-2xs text-destructive">
          {unavailableReason}
        </p>
      ) : null}

      <DockStatusAction
        dockId={dock.id}
        code={dock.code}
        status={status}
        hasAssignment={Boolean(occupyingTruckId)}
        className="mt-auto w-full"
      />
    </div>
  );
}
