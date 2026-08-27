"use client";

import { MapPinIcon, WarehouseIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { TrackingResult } from "@/types";

/**
 * Origin → destination with the backend's own route progress. `progress` is
 * rendered, never advanced: the client interpolates position for animation
 * smoothness on the map, but no part of that ever feeds back into this number.
 */
export function TrackingProgress({
  origin,
  destination,
  progress,
}: {
  origin: TrackingResult["origin"];
  destination: TrackingResult["destination"];
  progress: number;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <MapPinIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">From</p>
              <p className="truncate text-sm">{origin.name}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-start gap-2 text-right">
            <div className="min-w-0">
              <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">To</p>
              <p className="truncate text-sm">{destination.name}</p>
            </div>
            <WarehouseIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ProgressBar value={progress} label="Route progress" className="flex-1" />
          <span className="shrink-0 text-xs font-medium tabular-nums">
            {Math.round(progress)}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
