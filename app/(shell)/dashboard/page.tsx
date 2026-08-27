"use client";

import { AlertFeed } from "@/components/alerts/alert-feed";
import { DockStatusBoard } from "@/components/docks/dock-status-board";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { PageShell } from "@/components/layout/page-shell";
import { MapPlaceholder } from "@/components/map/map-placeholder";
import { SelectedTruckPanel } from "@/components/trucks/selected-truck-panel";
import { UpcomingArrivals } from "@/components/trucks/upcoming-arrivals";
import { CardSkeleton, TableSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import {
  useDashboardKpis,
  useDashboardSnapshot,
  useSnapshotInvalidation,
} from "@/features/yard";
import { useSelectedTruckId } from "@/stores";

export default function DashboardPage() {
  const { overview, isPending, isError, error, refetch } = useDashboardSnapshot();
  const kpis = useDashboardKpis(overview);
  useSnapshotInvalidation();

  const selectedTruckId = useSelectedTruckId();
  const selectedTruck = selectedTruckId
    ? overview?.activeTrucks.find((truck) => truck.id === selectedTruckId)
    : undefined;

  if (isError) {
    return (
      <PageShell title="Dashboard" description="Yard-wide overview of trucks, docks, and alerts.">
        <ErrorState
          message={error instanceof Error ? error.message : "Failed to load the yard overview."}
          onRetry={() => refetch()}
        />
      </PageShell>
    );
  }

  return (
    <PageShell title="Dashboard" description="Yard-wide overview of trucks, docks, and alerts.">
      <KpiStrip kpis={kpis} isPending={isPending} />

      <div className="grid flex-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <MapPlaceholder />

        <div className="flex min-h-0 flex-col gap-4 rounded-lg border border-border p-3">
          {isPending ? (
            <TableSkeleton rows={4} />
          ) : selectedTruck ? (
            <SelectedTruckPanel truck={selectedTruck} />
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-medium text-muted-foreground">Upcoming Arrivals</h3>
                <UpcomingArrivals trucks={overview?.upcomingArrivals ?? []} />
              </div>
              <div className="h-px bg-border" />
              <AlertFeed />
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-muted-foreground">Dock Status</h3>
        {isPending ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {Array.from({ length: 8 }).map((_, index) => (
              <CardSkeleton key={index} />
            ))}
          </div>
        ) : (
          <DockStatusBoard docks={overview?.docks ?? []} />
        )}
      </div>
    </PageShell>
  );
}
