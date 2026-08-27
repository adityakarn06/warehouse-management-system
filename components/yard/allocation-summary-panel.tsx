"use client";

import { ClipboardListIcon } from "lucide-react";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { AssignmentStateBadge } from "@/components/ui/assignment-state-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { KpiSkeleton, TableSkeleton } from "@/components/ui/loading-skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAllocationSummary } from "@/features/yard";
import { formatTime } from "@/lib/format";
import { useUIStore } from "@/stores/use-ui-store";
import type { DockStatus } from "@/types";

const DOCK_STATUSES: DockStatus[] = ["AVAILABLE", "RESERVED", "OCCUPIED", "UNAVAILABLE"];

/**
 * The trailer-to-door allocation summary (problem statement §7 output), plus
 * the trailer-side yard state (§7b) — which trailers are on-site, waiting and
 * unassigned — that the dock-only board on this page never showed.
 */
export function AllocationSummaryPanel() {
  const query = useAllocationSummary();
  const selectTruck = useUIStore((s) => s.selectTruck);

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <KpiSkeleton key={index} />
          ))}
        </div>
        <TableSkeleton rows={4} />
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        title="Could not load the allocation summary"
        message={query.error.message}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const { totals, allocations, unallocated } = query.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Allocated trailers" value={totals.allocatedTrailers} tone="success" />
        <KpiCard label="Unallocated trailers" value={totals.unallocatedTrailers} tone="warning" />
        {DOCK_STATUSES.map((status) => (
          <KpiCard
            key={status}
            label={`${status.charAt(0)}${status.slice(1).toLowerCase()} docks`}
            // A status with no doors in it may be absent from the object
            // entirely — default to 0 rather than assume all four are present.
            value={totals.docksByStatus[status] ?? 0}
          />
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold">Allocated</h4>
        {allocations.length === 0 ? (
          <EmptyState title="No committed allocations" description="No trailer currently holds a door." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trailer</TableHead>
                <TableHead>Truck</TableHead>
                <TableHead>Shipment</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Load</TableHead>
                <TableHead>Dock</TableHead>
                <TableHead>Window</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allocations.map((allocation) => (
                <TableRow key={allocation.assignmentId}>
                  <TableCell className="font-mono">{allocation.trailerId}</TableCell>
                  <TableCell>{allocation.truckReference}</TableCell>
                  <TableCell>{allocation.shipmentReference}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{allocation.priority}</Badge>
                  </TableCell>
                  <TableCell>{allocation.loadType}</TableCell>
                  <TableCell>
                    {allocation.dockCode}{" "}
                    <span className="text-2xs text-muted-foreground">{allocation.zone}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span>
                        {formatTime(allocation.scheduledStart)}–{formatTime(allocation.scheduledEnd)}
                      </span>
                      {allocation.chainedFrom ? (
                        <span className="flex items-center gap-1 text-2xs text-muted-foreground">
                          <AssignmentStateBadge state="REASSIGNED" />
                          reassigned from {allocation.chainedFrom}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold">Unallocated</h4>
        {unallocated.length === 0 ? (
          <EmptyState
            icon={ClipboardListIcon}
            title="Every active trailer holds a door"
            description="Nothing is waiting for an allocation right now."
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            {unallocated.map((truck) => (
              <div
                key={truck.truckId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5 text-2xs"
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono">{truck.trailerId}</span>
                  <span className="font-medium text-foreground">{truck.truckReference}</span>
                  <StatusBadge domain="truck" value={truck.status} />
                  <span className="text-muted-foreground">{truck.shipmentReference}</span>
                  <Badge variant="outline">{truck.priority}</Badge>
                </span>
                <Button size="xs" variant="outline" onClick={() => selectTruck(truck.truckId)}>
                  Review
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
