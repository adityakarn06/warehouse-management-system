"use client";

import Link from "next/link";
import { ChevronRightIcon, TruckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { RowSkeleton } from "@/components/ui/loading-skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { useFleet } from "@/features/fleet";
import { useNow } from "@/hooks/use-now";
import { formatCountdown, formatWeightKg } from "@/lib/format";
import type { TruckStatus } from "@/types";

interface TruckRosterProps {
  search: string;
  status: TruckStatus | null;
}

/**
 * The way in to a truck's operations page.
 *
 * Sourced from `GET /fleet` rather than `GET /trucks`: it is one denormalized
 * row per truck already carrying the shipment and the committed door, which is
 * exactly what a roster line needs, and `useFleet` polls it (`refetchInterval`)
 * rather than subscribing — `docs/fleet.md`'s own rule for this endpoint.
 *
 * Rows link by `reference`, which `GET /trucks/:id` resolves alongside the id
 * and the trailer id (`flows/api.md`, "Lookup by id or human reference"), so
 * the resulting URL is a readable `/truck-ops/TRK-101`.
 */
export function TruckRoster({ search, status }: TruckRosterProps) {
  const query = useFleet({ search: search || undefined, status: status ?? undefined });
  const now = useNow();

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-2">
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        title="Could not load the fleet"
        message="The truck roster is unavailable."
        onRetry={() => void query.refetch()}
      />
    );
  }

  const trucks = query.data.data;

  if (trucks.length === 0) {
    return (
      <EmptyState
        icon={TruckIcon}
        title="No trucks match"
        description="Clear the search or the status filter to see the whole fleet."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {trucks.map((truck) => (
        <li key={truck.id}>
          <Link
            href={`/truck-ops/${encodeURIComponent(truck.reference)}`}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-muted/50"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="truncate text-xs font-semibold">{truck.reference}</span>
                <StatusBadge domain="truck" value={truck.status} />
                {truck.activeDelay !== "NORMAL" ? (
                  <Badge variant="destructive">{truck.activeDelay.replace(/_/g, " ")}</Badge>
                ) : null}
                {truck.shipment ? (
                  <Badge variant="outline">{truck.shipment.priority}</Badge>
                ) : null}
              </div>
              <span className="truncate text-2xs text-muted-foreground">
                Trailer {truck.trailerId} · {truck.driverName} ·{" "}
                {truck.route ? `${truck.route.originName} → ${truck.route.destinationName}` : "No route"}
              </span>
            </div>

            <div className="hidden shrink-0 flex-col items-end gap-0.5 sm:flex">
              <span className="text-xs font-medium tabular-nums">
                {formatCountdown(truck.eta, now)}
              </span>
              <span className="text-2xs text-muted-foreground tabular-nums">
                {formatWeightKg(truck.shipment?.weightKg)} ·{" "}
                {truck.dock ? `Door ${truck.dock.code}` : "No door"}
              </span>
            </div>

            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
