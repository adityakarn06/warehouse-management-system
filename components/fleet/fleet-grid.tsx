"use client";

import { useMemo } from "react";
import { TruckIcon } from "lucide-react";

import { FleetTruckCard } from "@/components/fleet/fleet-truck-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { FleetCardSkeleton } from "@/components/ui/loading-skeleton";
import { useFleet } from "@/features/fleet";
import type { TruckStatus } from "@/types";

interface FleetGridProps {
  search: string;
  status: TruckStatus | null;
}

export function FleetGrid({ search, status }: FleetGridProps) {
  const query = useFleet();

  const filtered = useMemo(() => {
    const trucks = query.data?.data ?? [];
    const term = search.trim().toLowerCase();

    return trucks.filter((truck) => {
      const matchesStatus = !status || truck.status === status;
      const matchesSearch =
        !term ||
        truck.reference.toLowerCase().includes(term) ||
        truck.trailerId.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [query.data, search, status]);

  if (query.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <FleetCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        title="Could not load the fleet"
        message={query.error instanceof Error ? query.error.message : "Unknown error"}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const trucks = query.data.data;

  if (trucks.length === 0) {
    return <EmptyState icon={TruckIcon} title="No trucks" description="No trucks are currently active." />;
  }

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={TruckIcon}
        title="No matching trucks"
        description="Try a different search term or status filter."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {filtered.map((truck) => (
        <FleetTruckCard key={truck.id} truck={truck} />
      ))}
    </div>
  );
}
