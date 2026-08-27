"use client";

import { ClockIcon } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { useLiveTruckFields } from "@/features/yard";
import { useNow } from "@/hooks/use-now";
import { formatCountdown, formatTime } from "@/lib/format";
import { useUIStore } from "@/stores";
import type { YardTruck } from "@/types";

function ArrivalRow({ truck }: { truck: YardTruck }) {
  const live = useLiveTruckFields(truck);
  const now = useNow();
  const selectTruck = useUIStore((s) => s.selectTruck);

  return (
    <button
      type="button"
      onClick={() => selectTruck(truck.id)}
      className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/60"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium">{truck.reference}</span>
          <StatusBadge domain="truck" value={live.status} />
        </div>
        <span className="truncate text-2xs text-muted-foreground">
          {truck.carrier}
          {truck.route ? ` · ${truck.route.destinationName}` : null}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs tabular-nums">{formatTime(live.eta)}</span>
          {/* The arrival instant only moves when the backend re-estimates it;
              this is the part that counts down in between. */}
          <span className="text-2xs tabular-nums text-muted-foreground">
            {formatCountdown(live.eta, now)}
          </span>
        </div>
        <span className="text-2xs tabular-nums text-muted-foreground">
          {Math.round(live.progress)}%
        </span>
      </div>
    </button>
  );
}

export function UpcomingArrivals({ trucks }: { trucks: YardTruck[] }) {
  if (trucks.length === 0) {
    return (
      <EmptyState
        icon={ClockIcon}
        title="No upcoming arrivals"
        description="Trucks arriving soon will appear here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {trucks.map((truck) => (
        <ArrivalRow key={truck.id} truck={truck} />
      ))}
    </div>
  );
}
