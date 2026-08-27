"use client";

import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ShipmentStatus, TrackingResult, TruckStatus } from "@/types";

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
      <dt className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={mono ? "truncate font-mono text-sm" : "truncate text-sm capitalize"}>{value}</dd>
    </div>
  );
}
