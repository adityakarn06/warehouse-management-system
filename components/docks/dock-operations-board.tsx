"use client";

import { useEffect } from "react";
import { WarehouseIcon } from "lucide-react";

import { DockCard } from "@/components/docks/dock-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { CardSkeleton } from "@/components/ui/loading-skeleton";
import { useDocks } from "@/features/docks";
import { dockCommandError } from "@/features/docks/errors";
import { useOperationsSubscription } from "@/hooks/use-realtime";
import { useDockStore } from "@/stores/use-dock-store";

/**
 * The full dock board.
 *
 * Seeds via `mergeFromSnapshot`, never `hydrateFromSnapshot` — the latter
 * *replaces* the whole map and would clobber live state the dashboard
 * established. Seeding at all is necessary because `DOCK_STATUS_CHANGED`
 * creates an entry for a door the store has not seen with
 * `occupyingTruckId: null`; a card that trusts the live entry over its REST row
 * would then drop the truck holding that door, and stop warning that a
 * takedown will trigger the reassignment cascade.
 */
export function DockOperationsBoard() {
  useOperationsSubscription();
  const query = useDocks();
  const docksData = query.data?.data;

  useEffect(() => {
    if (!docksData) return;
    useDockStore.getState().mergeFromSnapshot(
      docksData.map((dock) => {
        const assigned = dock.assignments?.find((entry) => entry.status === "ASSIGNED") ?? null;
        return {
          dockId: dock.id,
          code: dock.code,
          status: dock.status,
          occupyingTruckId: assigned?.truck.id ?? null,
          activeAssignmentId: assigned?.id ?? null,
          unavailableReason:
            dock.status === "UNAVAILABLE" ? (dock.unavailableReason ?? null) : null,
          // These rows are only ever used to fill a gap, so the timestamp just
          // has to be old enough that any real event supersedes it.
          updatedAt: new Date(0).toISOString(),
        };
      }),
    );
  }, [docksData]);

  if (query.isPending) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        title="Could not load docks"
        message={dockCommandError(query.error, "Could not load the dock board.").message}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const docks = query.data.data;

  if (docks.length === 0) {
    return (
      <EmptyState
        icon={WarehouseIcon}
        title="No docks"
        description="The backend returned no dock doors for this warehouse."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {docks.map((dock) => (
        <DockCard key={dock.id} dock={dock} />
      ))}
    </div>
  );
}
