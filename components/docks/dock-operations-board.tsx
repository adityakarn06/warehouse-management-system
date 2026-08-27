"use client";

import { WarehouseIcon } from "lucide-react";

import { DockCard } from "@/components/docks/dock-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { CardSkeleton } from "@/components/ui/loading-skeleton";
import { useDocks } from "@/features/docks";
import { dockCommandError } from "@/features/docks/errors";
import { useOperationsSubscription } from "@/hooks/use-realtime";

/**
 * The full dock board.
 *
 * Deliberately does not seed the dock store: `hydrateFromSnapshot` *replaces*
 * the whole map, which would clobber live state the dashboard seeded. Cards
 * simply fall back to their REST row until an event arrives for that door.
 */
export function DockOperationsBoard() {
  useOperationsSubscription();
  const query = useDocks();

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
