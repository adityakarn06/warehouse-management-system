"use client";

import dynamic from "next/dynamic";

import { AlertFeed } from "@/components/alerts/alert-feed";
import { DockStatusBoard } from "@/components/docks/dock-status-board";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { PageShell } from "@/components/layout/page-shell";
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

/** Mapbox GL touches `window` at construction — never initialise it on the server. */
const LiveMap = dynamic(() => import("@/components/map/live-map").then((mod) => mod.LiveMap), {
  ssr: false,
  loading: () => (
    <div className="min-h-80 flex-1 animate-pulse rounded-lg border border-border bg-muted/20" />
  ),
});

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

      <div className="grid min-h-[32rem] flex-1 gap-4 lg:min-h-0 lg:max-h-[38rem] lg:grid-cols-[3fr_1fr]">
        <LiveMap trucks={overview?.activeTrucks ?? []} />

        <div className="flex min-h-0 flex-col gap-4 overflow-hidden rounded-lg border border-border p-3">
          {isPending ? (
            <TableSkeleton rows={4} />
          ) : (
            <>
              {selectedTruck ? (
                <SelectedTruckPanel truck={selectedTruck} />
              ) : (
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-medium text-muted-foreground">Upcoming Arrivals</h3>
                  <UpcomingArrivals trucks={overview?.upcomingArrivals ?? []} />
                </div>
              )}
              <div className="h-px bg-border" />
              {/* Selecting a truck used to hide the feed entirely, which meant a
                  dock takedown's alerts were invisible exactly when an operator
                  was looking at a truck. The full history is on /alerts. */}
              <AlertFeed limit={20} />
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
