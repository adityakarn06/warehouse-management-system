"use client";

import { PageShell } from "@/components/layout/page-shell";
import { ErrorState } from "@/components/ui/error-state";
import { CardSkeleton } from "@/components/ui/loading-skeleton";
import { useTruck } from "@/features/trucks";
import { useOperationsSubscription, useTruckSubscription } from "@/hooks/use-realtime";
import { isApiError } from "@/lib/api/errors";

import { DockRecommendationRail } from "./dock-recommendation-rail";
import { ShipmentLoadCard } from "./shipment-load-card";
import { TruckActivityCard } from "./truck-activity-card";
import { TruckCanvas } from "./truck-canvas";
import { TruckInformationCard } from "./truck-information-card";
import { TruckOpsActions } from "./truck-ops-actions";

/**
 * One truck's operations screen.
 *
 * Two rooms, deliberately. `subscribe:truck` carries this truck's position,
 * ETA, status and its `DOCK_ASSIGNED` / `DOCK_REASSIGNED` events, but
 * `docs/realtime.md` is explicit that `DOCK_STATUS_CHANGED` goes to the
 * `operations` room **only** — a truck room learns about a door failure through
 * the alert and the reassignment that follow it, not the status change itself.
 * This page shows a door's live status, so it needs both. Both subscriptions
 * are ref-counted in `lib/socket/subscriptions.ts`, so joining a room another
 * mounted view already holds costs nothing.
 *
 * `identifier` may be a truck id, its `reference` or its `trailerId` — the
 * backend resolves all three (`flows/api.md`, "Lookup by id or human
 * reference"). Every child keys off the resolved `truck.id` rather than the URL
 * segment, so the store lookups and the assignment command always use the
 * canonical id.
 */
export function TruckOpsView({ identifier }: { identifier: string }) {
  const query = useTruck(identifier);

  // Subscribe with the canonical id once we have it. The server accepts a
  // reference too, but the room is always named with the canonical id, and the
  // truck store is keyed the same way.
  useTruckSubscription(query.data?.id);
  useOperationsSubscription();

  if (query.isPending) {
    return (
      <PageShell title="Truck operations" description="Loading this truck…">
        <div className="grid gap-3 lg:grid-cols-[20rem_1fr]">
          <div className="flex flex-col gap-3">
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <div className="flex flex-col gap-3">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </PageShell>
    );
  }

  if (query.isError) {
    const notFound = isApiError(query.error) && query.error.status === 404;
    return (
      <PageShell title="Truck operations" description={identifier}>
        <ErrorState
          title={notFound ? "No such truck" : "Could not load this truck"}
          message={
            notFound
              ? `Nothing matched "${identifier}" as a truck id, reference or trailer id.`
              : "The truck detail endpoint did not answer."
          }
          onRetry={notFound ? undefined : () => void query.refetch()}
        />
      </PageShell>
    );
  }

  const truck = query.data;

  return (
    <PageShell
      title={`${truck.reference} operations`}
      description={`${truck.carrier} · Trailer ${truck.trailerId}`}
      actions={<TruckOpsActions truck={truck} />}
    >
      <div className="grid min-h-0 gap-3 lg:grid-cols-[20rem_1fr]">
        {/* Left — every detail the truck and its shipment carry. */}
        <div className="flex min-w-0 flex-col gap-3">
          <TruckInformationCard truck={truck} />
          <ShipmentLoadCard truck={truck} />
          <TruckActivityCard truck={truck} />
        </div>

        {/* Right — the truck, and the doors it could take, underneath it. */}
        <div className="flex min-w-0 flex-col gap-3">
          <TruckCanvas truck={truck} />
          <DockRecommendationRail truckId={truck.id} />
        </div>
      </div>
    </PageShell>
  );
}

