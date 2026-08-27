"use client";

import { Card, CardContent } from "@/components/ui/card";
import { FIELD_LABEL_CLASS } from "@/components/ui/field-label";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ShipmentStatus, TrackingResult, TruckStatus } from "@/types";
import type { TrackingResolvedBy } from "@/schemas/tracking.schema";

/** Copy for the arm `GET /tracking/:id` actually matched on, shown only when
 * it was not the tracking number itself — the plain, common case needs no
 * explanation. */
const RESOLVED_BY_LABEL: Record<Exclude<TrackingResolvedBy, "TRACKING_NUMBER">, string> = {
  SHIPMENT_REFERENCE: "shipment reference",
  SHIPMENT_ID: "shipment id",
  TRAILER_ID: "trailer ID",
};

/**
 * Identity and current standing. The shipment status is the REST row's — the
 * lifecycle value that alone carries CREATED and DELIVERED — while the truck
 * status is the live one, so the two badges can legitimately disagree for the
 * moment between a truck completing and the backend marking the shipment
 * delivered.
 */
export function TrackingSummaryCard({
  tracking,
  shipmentStatus,
  truckStatus,
}: {
  tracking: TrackingResult;
  shipmentStatus: ShipmentStatus;
  truckStatus: TruckStatus;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-lg font-semibold tracking-tight">
              {tracking.trackingNumber}
            </p>
            <p className="truncate text-sm text-muted-foreground">{tracking.customerName}</p>
            {tracking.resolvedBy !== "TRACKING_NUMBER" ? (
              <p className="truncate text-2xs text-muted-foreground">
                Matched by {RESOLVED_BY_LABEL[tracking.resolvedBy]}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <StatusBadge domain="shipment" value={shipmentStatus} showIcon />
            <StatusBadge domain="truck" value={truckStatus} />
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs sm:grid-cols-4">
          <Field label="Reference" value={tracking.reference} mono />
          <Field label="Trailer" value={tracking.trailerId} mono />
          <Field label="Priority" value={tracking.priority} />
          <Field label="Load type" value={tracking.loadType.replace(/_/g, " ")} />
        </dl>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className={FIELD_LABEL_CLASS}>{label}</dt>
      <dd className={mono ? "truncate font-mono text-sm" : "truncate text-sm capitalize"}>{value}</dd>
    </div>
  );
}
