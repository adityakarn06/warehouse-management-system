"use client";

import Image from "next/image";
import { ArrowRightIcon, GaugeIcon, TimerIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useLiveTruckFields } from "@/features/yard";
import { useNow } from "@/hooks/use-now";
import { formatCountdown, formatTime } from "@/lib/format";
import { useAssignmentForTruck } from "@/stores";
import type { TruckDetail } from "@/types";

import { toMapTruck } from "./live-truck";

/**
 * The truck render, with this truck's live figures floated over it.
 *
 * Nothing is drawn *onto* the trailer. The supplied reference sketches a cargo
 * slot grid (`A1 · 500kg · SHP-5839`), but this backend carries one shipment per
 * truck and no box- or slot-level manifest anywhere in `flows/api.md` — slot
 * ids and per-slot weights would all have to be invented, which AGENTS.md
 * forbids. So the image stays a fixed illustration, exactly as
 * `/new-yard` treats `dock-background.png`, and the space around it carries
 * values the backend actually sends.
 *
 * Every one of those values is live: `useLiveTruckFields` prefers the truck
 * store's socket-fed `status` / `eta` / `progress` / `speedKmph` over the REST
 * row, and `useAssignmentForTruck` is the dock store's current-assignment fact.
 * The panel therefore moves on a `TRUCK_POSITION_UPDATED` or `DOCK_ASSIGNED`
 * tick with no refetch.
 */
export function TruckCanvas({ truck }: { truck: TruckDetail }) {
  const live = useLiveTruckFields(toMapTruck(truck));
  const now = useNow();
  const assignment = useAssignmentForTruck(truck.id);

  const progress = Math.round(Math.min(100, Math.max(0, live.progress)));
  const dockCode = assignment?.dockCode ?? null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted p-4">
      {/* Top rail — what the truck is doing, and when it lands. */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge domain="truck" value={live.status} showIcon />
          {live.activeDelay !== "NORMAL" ? (
            <Badge variant="destructive">{live.activeDelay.replace(/_/g, " ")}</Badge>
          ) : null}
          {dockCode ? (
            <Badge variant="outline">
              Door {dockCode}
              {assignment?.status ? ` · ${assignment.status}` : ""}
            </Badge>
          ) : (
            <Badge variant="outline">No door assigned</Badge>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end gap-0.5">
            <span className="flex items-center gap-1 text-2xs text-muted-foreground">
              <TimerIcon className="size-3" />
              ETA
            </span>
            {/* The countdown is a display format of the backend's `eta`
                instant, never a second opinion about it. */}
            <span className="text-sm font-semibold tabular-nums">
              {formatCountdown(live.eta, now)}
            </span>
            <span className="text-2xs text-muted-foreground tabular-nums">
              {formatTime(live.eta)}
            </span>
          </div>

          <div className="flex flex-col items-end gap-0.5">
            <span className="flex items-center gap-1 text-2xs text-muted-foreground">
              <GaugeIcon className="size-3" />
              Speed
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {live.speedKmph}
              <span className="text-2xs font-normal text-muted-foreground"> km/h</span>
            </span>
          </div>
        </div>
      </div>

      {/* `active-truck.png` is ~2 MB, so it goes through the optimiser with an
          explicit `sizes` — same treatment as `YardBackdrop`. `priority`
          because it is this page's largest contentful paint. */}
      <div className="relative h-44 w-full sm:h-56 lg:h-64">
        <Image
          src="/active-truck.png"
          alt=""
          aria-hidden
          fill
          priority
          className="object-contain object-center"
          sizes="(min-width: 1024px) 60vw, 100vw"
        />
      </div>

      {/* Bottom rail — the journey, as the backend measures it. */}
      <div className="flex flex-col gap-1.5 rounded-md bg-card p-3">
        <div className="flex items-center justify-between gap-2 text-xs font-medium">
          <span className="min-w-0 truncate">{truck.route?.originName ?? "—"}</span>
          <ArrowRightIcon className="size-3 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate text-right">
            {truck.route?.destinationName ?? "—"}
          </span>
        </div>

        <ProgressBar
          value={live.progress}
          label="Route progress"
          indicatorClassName="bg-success"
        />

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-2xs text-muted-foreground">
          <span className="tabular-nums">{progress}% complete</span>
          {truck.route ? (
            <span className="tabular-nums">
              {truck.route.distanceKm} km · {truck.route.estimatedDurationMinutes} min planned
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
