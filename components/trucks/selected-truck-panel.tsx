"use client";

import { XIcon } from "lucide-react";

import { TruckSimulationControls } from "@/components/trucks/truck-simulation-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FIELD_LABEL_CLASS } from "@/components/ui/field-label";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useLiveTruckFields } from "@/features/yard";
import { useNow } from "@/hooks/use-now";
import { formatCountdown, formatDateTime } from "@/lib/format";
import { useAssignmentForTruck, useUIStore } from "@/stores";
import type { YardTruck } from "@/types";

export function SelectedTruckPanel({ truck }: { truck: YardTruck }) {
  const live = useLiveTruckFields(truck);
  const now = useNow();
  const assignment = useAssignmentForTruck(truck.id);
  const selectTruck = useUIStore((s) => s.selectTruck);

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold">{truck.reference}</span>
          <span className="text-2xs text-muted-foreground">
            {truck.carrier} · Trailer {truck.trailerId}
          </span>
        </div>
        <Button size="icon-xs" variant="ghost" onClick={() => selectTruck(null)}>
          <XIcon />
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <StatusBadge domain="truck" value={live.status} showIcon />
        {live.activeDelay !== "NORMAL" ? (
          <Badge variant="destructive">{live.activeDelay.replace(/_/g, " ")}</Badge>
        ) : null}
      </div>

      {truck.shipment ? (
        <div className="flex flex-col gap-0.5 rounded-md border border-border p-2 text-xs">
          <span className="font-medium">{truck.shipment.reference}</span>
          <span className="text-2xs text-muted-foreground">
            {truck.shipment.trackingNumber} · {truck.shipment.loadType}
          </span>
        </div>
      ) : null}

      {truck.route ? (
        <div className="flex flex-col gap-0.5 text-xs">
          <span className={FIELD_LABEL_CLASS}>Route</span>
          <span>
            {truck.route.originName} → {truck.route.destinationName}
          </span>
          <span className="text-2xs text-muted-foreground">
            {truck.route.distanceKm} km
          </span>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-0.5">
            <span className={FIELD_LABEL_CLASS}>ETA</span>
            <span className="text-xs tabular-nums">{formatDateTime(live.eta)}</span>
            <span className="text-2xs tabular-nums text-muted-foreground">
              {formatCountdown(live.eta, now)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className={FIELD_LABEL_CLASS}>Speed</span>
            <span className="text-xs tabular-nums">{Math.round(live.speedKmph)} km/h</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className={FIELD_LABEL_CLASS}>Progress</span>
            <span className="text-xs tabular-nums">{Math.round(live.progress)}%</span>
          </div>
          <ProgressBar value={live.progress} className="h-1.5" label="Route progress" />
        </div>
      </div>

      {assignment ? (
        <div className="flex flex-col gap-1 rounded-md border border-border p-2 text-xs">
          <span className={FIELD_LABEL_CLASS}>Dock assignment</span>
          <span className="font-medium">{assignment.dockCode}</span>
          {assignment.reasons.length > 0 ? (
            <ul className="list-disc pl-4 text-2xs text-muted-foreground">
              {assignment.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <TruckSimulationControls truckId={truck.id} reference={truck.reference} live={live} />
    </div>
  );
}
