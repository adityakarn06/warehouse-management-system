"use client";

import { PackageSearchIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { FieldLabel } from "@/components/ui/field-label";
import { CardSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { useTracking, useTrackingInvalidation } from "@/features/tracking";
import { useShipmentTracking } from "@/hooks/use-realtime";
import { isApiError } from "@/lib/api/errors";
import { useAssignmentForTruck, useTruck } from "@/stores";

import { TrackingAppointmentCard } from "./tracking-appointment-card";
import { TrackingDelayBanner } from "./tracking-delay-banner";
import { TrackingDockCard } from "./tracking-dock-card";
import { TrackingEtaCard } from "./tracking-eta-card";
import { TrackingMap } from "./tracking-map";
import { TrackingProgress } from "./tracking-progress";
import { TrackingSearchForm } from "./tracking-search-form";
import { TrackingSummaryCard } from "./tracking-summary-card";
import { TrackingTimeline, resolveTimelineStatus } from "./tracking-timeline";

/**
 * Owns the two data sources and nothing else.
 *
 * REST (`GET /tracking/:trackingNumber`) is the snapshot: identity, customer,
 * origin/destination names, priority, load type, appointment window, dock
 * details. The `shipment:{id}` room is the live truth: position, ETA,
 * progress, status, active delay, dock commitments. Where both carry a field,
 * the live one wins and the REST one is the fallback for before the ack lands
 * — the same overlay rule `useLiveTruckFields` applies on the dashboard.
 */
export function TrackingView({ trackingNumber }: { trackingNumber: string }) {
  const query = useTracking(trackingNumber);

  // Joins `shipment:{id}` and reports what the backend resolved the tracking
  // number into. This ack is the only source of the truck id — the REST row
  // has none (its `trailerId` is a trailer, not a truck).
  const resolution = useShipmentTracking(trackingNumber);
  const truckId = resolution?.truckId ?? null;

  const live = useTruck(truckId);
  const liveAssignment = useAssignmentForTruck(truckId);
  useTrackingInvalidation(trackingNumber, truckId);

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (query.isError) {
    const isNotFound = isApiError(query.error) && query.error.status === 404;

    return (
      <div className="flex flex-col items-center gap-4">
        {isNotFound ? (
          <EmptyState
            icon={PackageSearchIcon}
            title="No shipment found"
            description={`We couldn't find a shipment for ${trackingNumber}. Check the number and try again.`}
            className="w-full"
          />
        ) : (
          <ErrorState
            title="Couldn't load this shipment"
            message={query.error.message}
            onRetry={() => query.refetch()}
            className="w-full"
          />
        )}
        <TrackingSearchForm />
      </div>
    );
  }

  const tracking = query.data;

  // Live where the socket has it, REST where it does not.
  const truckStatus = live?.status ?? tracking.truckStatus;
  const activeDelay = live?.activeDelay ?? tracking.activeDelay;
  const eta = live?.eta ?? tracking.eta ?? null;
  const progress = live?.progress ?? tracking.progress;
  const timelineStatus = resolveTimelineStatus(tracking.status, live?.status);

  return (
    <div className="flex flex-col gap-4">
      {activeDelay !== "NORMAL" ? (
        <TrackingDelayBanner scenario={activeDelay} eta={eta} />
      ) : null}

      <TrackingSummaryCard
        tracking={tracking}
        shipmentStatus={timelineStatus}
        truckStatus={truckStatus}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <TrackingEtaCard eta={eta} isDelayed={activeDelay !== "NORMAL"} />
            {tracking.appointmentWindow ? (
              <TrackingAppointmentCard appointmentWindow={tracking.appointmentWindow} />
            ) : null}
          </div>

          <TrackingProgress
            origin={tracking.origin}
            destination={tracking.destination}
            progress={progress}
          />

          {/* A fixed height on small screens: the map is one block in a
              scrolling column there, not the page's flex-filled centrepiece. */}
          <div className="h-[45vh] min-h-64 lg:h-auto lg:min-h-96 lg:flex-1">
            <TrackingMap live={live} resolution={resolution} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <TrackingDockCard
            assignedDock={tracking.assignedDock}
            liveAssignment={liveAssignment}
          />

          <Card>
            <CardContent>
              <FieldLabel className="mb-4">Progress</FieldLabel>
              <TrackingTimeline status={timelineStatus} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
