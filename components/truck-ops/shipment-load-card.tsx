"use client";

import { PackageIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { FIELD_LABEL_CLASS } from "@/components/ui/field-label";
import { CardSkeleton } from "@/components/ui/loading-skeleton";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import { useShipment } from "@/features/shipments";
import { useLiveTruckFields } from "@/features/yard";
import { formatDateTime, formatTime, formatWeightKg } from "@/lib/format";
import type { TruckDetail } from "@/types";

import { LoadDonut } from "./load-donut";
import { toMapTruck } from "./live-truck";

/**
 * The cargo on board, and the slot it is booked into.
 *
 * Two sources, because the truck row carries only a trimmed shipment: the
 * identity/priority/appointment fields come from `GET /trucks/:id`'s embedded
 * `shipment` (which is `shipmentSummarySchema` + `customerName` +
 * `appointment`), while `weightKg`, `palletCount`, `description` and the
 * origin/destination names only exist on `GET /shipments/:id`.
 *
 * The dial is route progress, live-overlaid — see `LoadDonut` for why it is not
 * a percentage of capacity.
 */
export function ShipmentLoadCard({ truck }: { truck: TruckDetail }) {
  const summary = truck.shipment;
  const detail = useShipment(summary?.id);
  const live = useLiveTruckFields(toMapTruck(truck));

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Shipment &amp; load</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {!summary ? (
          <EmptyState
            icon={PackageIcon}
            title="No shipment"
            description="This truck is not carrying a shipment."
          />
        ) : (
          <>
            <div className="flex items-center gap-4">
              <LoadDonut value={live.progress} label="Route" />

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className={FIELD_LABEL_CLASS}>Current load</span>
                  {detail.isPending ? (
                    <span className="text-sm text-muted-foreground">…</span>
                  ) : (
                    <span className="text-lg font-semibold leading-none tabular-nums">
                      {formatWeightKg(detail.data?.weightKg)}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className={FIELD_LABEL_CLASS}>Pallets</span>
                  {detail.isPending ? (
                    <span className="text-sm text-muted-foreground">…</span>
                  ) : (
                    <span className="text-lg font-semibold leading-none tabular-nums">
                      {detail.data?.palletCount ?? "—"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold">{summary.reference}</span>
                <StatusBadge domain="shipment" value={summary.status} />
              </div>
              <span className="truncate text-2xs text-muted-foreground tabular-nums">
                {summary.trackingNumber} · {summary.customerName}
              </span>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline">{summary.priority}</Badge>
                <Badge variant="outline">{summary.loadType}</Badge>
              </div>
            </div>

            {/* The two fields only the shipment detail carries. Rendered as its
                own state ladder rather than blocking the card: the truck row
                above is already useful without them. */}
            {detail.isError ? (
              <ErrorState
                title="Could not load shipment detail"
                message="Weight, pallet count and description are unavailable."
                onRetry={() => void detail.refetch()}
              />
            ) : detail.isPending ? (
              <CardSkeleton size="sm" />
            ) : (
              <>
                <div className="flex flex-col gap-0.5">
                  <span className={FIELD_LABEL_CLASS}>Lane</span>
                  <span className="text-xs">
                    {detail.data.originName} → {detail.data.destinationName}
                  </span>
                </div>
                {detail.data.description ? (
                  <div className="flex flex-col gap-0.5">
                    <span className={FIELD_LABEL_CLASS}>Description</span>
                    <span className="text-xs">{detail.data.description}</span>
                  </div>
                ) : null}
              </>
            )}

            <Separator />

            <div className="flex flex-col gap-0.5">
              <span className={FIELD_LABEL_CLASS}>Appointment window</span>
              {summary.appointment ? (
                <>
                  <span className="text-xs font-medium tabular-nums">
                    {formatTime(summary.appointment.windowStart)}–
                    {formatTime(summary.appointment.windowEnd)} ·{" "}
                    {summary.appointment.expectedDurationMinutes} min
                  </span>
                  <span className="text-2xs text-muted-foreground tabular-nums">
                    {summary.appointment.reference} ·{" "}
                    {formatDateTime(summary.appointment.windowStart)}
                  </span>
                  {summary.appointment.notes ? (
                    <span className="text-2xs text-muted-foreground">
                      {summary.appointment.notes}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="text-xs text-muted-foreground">
                  No appointment booked — the scorer treats this as neutral.
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
