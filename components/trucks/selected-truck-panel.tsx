"use client";

import { XIcon } from "lucide-react";

import { TruckSimulationControls } from "@/components/trucks/truck-simulation-controls";
import { Button } from "@/components/ui/button";
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
          <span className="text-[0.65rem] text-muted-foreground">
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
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[0.625rem] font-medium text-destructive">
            {live.activeDelay.replace(/_/g, " ")}
          </span>
        ) : null}
      </div>

      {truck.shipment ? (
        <div className="flex flex-col gap-0.5 rounded-md border border-border p-2 text-xs">
          <span className="font-medium">{truck.shipment.reference}</span>
          <span className="text-[0.65rem] text-muted-foreground">
            {truck.shipment.trackingNumber} · {truck.shipment.loadType}
          </span>
        </div>
      ) : null}

      {truck.route ? (
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="text-muted-foreground">Route</span>
          <span>
            {truck.route.originName} → {truck.route.destinationName}
          </span>
          <span className="text-[0.65rem] text-muted-foreground">
            {truck.route.distanceKm} km
          </span>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground">ETA</span>
          <span className="tabular-nums">{formatDateTime(live.eta)}</span>
          <span className="text-[0.65rem] tabular-nums text-muted-foreground">
            {formatCountdown(live.eta, now)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground">Progress</span>
          <span className="tabular-nums">{Math.round(live.progress)}%</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground">Speed</span>
          <span className="tabular-nums">{Math.round(live.speedKmph)} km/h</span>
        </div>
      </div>

      {assignment ? (
        <div className="flex flex-col gap-1 rounded-md border border-border p-2 text-xs">
          <span className="text-muted-foreground">Dock assignment</span>
          <span className="font-medium">{assignment.dockCode}</span>
          {assignment.reasons.length > 0 ? (
            <ul className="list-disc pl-4 text-[0.65rem] text-muted-foreground">
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
