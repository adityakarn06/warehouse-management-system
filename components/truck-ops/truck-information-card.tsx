"use client";

import Link from "next/link";
import { ArrowRightIcon, PhoneIcon, ExternalLinkIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FIELD_LABEL_CLASS } from "@/components/ui/field-label";
import { Separator } from "@/components/ui/separator";
import { formatDateTime } from "@/lib/format";
import type { TruckDetail } from "@/types";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className={FIELD_LABEL_CLASS}>{label}</span>
      <span className="truncate text-xs font-medium tabular-nums">{value}</span>
    </div>
  );
}

/**
 * Who and what this truck is — every identity, crew and route field
 * `GET /trucks/:id` returns (`flows/api.md` §Trucks).
 *
 * The reference's "Change driver" and "Edit route" buttons have no endpoint
 * behind them — this API exposes no driver or route mutation at all — so
 * rather than render dead controls, the two things an operator can actually do
 * from here take their place: call the driver on the `driverPhone` the backend
 * sent, and open the customer-facing tracking view for the same shipment.
 */
export function TruckInformationCard({ truck }: { truck: TruckDetail }) {
  const trackingNumber = truck.shipment?.trackingNumber;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Truck information</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className={FIELD_LABEL_CLASS}>Driver</span>
            <span className="truncate text-sm font-semibold">{truck.driverName}</span>
            <span className="truncate text-2xs text-muted-foreground tabular-nums">
              {truck.driverPhone}
            </span>
          </div>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label={`Call ${truck.driverName}`}
            nativeButton={false}
            render={<a href={`tel:${truck.driverPhone.replace(/\s/g, "")}`} />}
          >
            <PhoneIcon />
          </Button>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          <Field label="Truck ID" value={truck.reference} />
          <Field label="Trailer" value={truck.trailerId} />
          <Field label="Carrier" value={truck.carrier} />
          <Field label="Record id" value={truck.id} />
        </div>

        <Separator />

        {truck.route ? (
          <div className="flex flex-col gap-1">
            <span className={FIELD_LABEL_CLASS}>Route</span>
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <span className="min-w-0 truncate">{truck.route.originName}</span>
              <ArrowRightIcon className="size-3 shrink-0 text-muted-foreground" />
              <span className="min-w-0 truncate">{truck.route.destinationName}</span>
            </div>
            <span className="text-2xs text-muted-foreground tabular-nums">
              {truck.route.code} · {truck.route.distanceKm} km ·{" "}
              {truck.route.estimatedDurationMinutes} min at {truck.route.averageSpeedKmph} km/h
            </span>
          </div>
        ) : (
          <p className="text-2xs text-muted-foreground">No route on this truck.</p>
        )}

        <Separator />

        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          <Field label="Departed" value={formatDateTime(truck.departedAt)} />
          <Field label="Arrived" value={formatDateTime(truck.arrivedAt)} />
          <Field label="Last update" value={formatDateTime(truck.lastUpdatedAt)} />
          <Field label="Created" value={formatDateTime(truck.createdAt)} />
        </div>

        {trackingNumber ? (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            nativeButton={false}
            render={<Link href={`/track/${encodeURIComponent(trackingNumber)}`} />}
          >
            <ExternalLinkIcon />
            Track shipment
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
