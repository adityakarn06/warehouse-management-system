"use client";

import { TruckIcon } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { RowSkeleton } from "@/components/ui/loading-skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTrucks } from "@/features/trucks";
import { cn } from "@/lib/utils";
import { useAssignmentForTruck, useSelectedTruckId } from "@/stores/selectors";
import { useUIStore } from "@/stores/use-ui-store";
import type { TruckListItem } from "@/types";

function TruckRow({ truck }: { truck: TruckListItem }) {
  const selectedTruckId = useSelectedTruckId();
  const selectTruck = useUIStore((s) => s.selectTruck);
  const assignment = useAssignmentForTruck(truck.id);
  const isSelected = selectedTruckId === truck.id;

  return (
    <button
      type="button"
      onClick={() => selectTruck(isSelected ? null : truck.id)}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left transition-colors",
        isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
      )}
    >
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-xs font-medium">{truck.reference}</span>
        <span className="truncate text-[0.65rem] text-muted-foreground">
          {assignment ? `Dock ${assignment.dockCode}` : "No dock assigned"}
        </span>
      </span>
      <StatusBadge domain="truck" value={truck.status} />
    </button>
  );
}

/**
 * Lets the yard page drive the recommendation panel, which keys off
 * `selectedTruckId`. Without it that panel is unreachable on this route — the
 * only other places that call `selectTruck` are dashboard-only.
 */
export function TruckPicker() {
  const query = useTrucks();

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <RowSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        title="Could not load trucks"
        message={query.error instanceof Error ? query.error.message : "Unknown error"}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const trucks = query.data.data;

  if (trucks.length === 0) {
    return <EmptyState icon={TruckIcon} title="No trucks" description="No trucks are in the yard." />;
  }

  return (
    <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
      {trucks.map((truck) => (
        <TruckRow key={truck.id} truck={truck} />
      ))}
    </div>
  );
}
