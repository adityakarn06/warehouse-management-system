"use client";

import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ShipmentStatus, TruckStatus } from "@/types";

/**
 * The shipment lifecycle, driven by the *shipment* status.
 *
 * It has to be the shipment's rather than the truck's: `ShipmentStatus` is the
 * only enum carrying CREATED and DELIVERED, and mapping the truck's terminal
 * COMPLETED onto DELIVERED would be the frontend deciding a shipment had been
 * delivered (AGENTS.md). `useTrackingInvalidation` refetches the REST row on a
 * terminal truck transition so the backend supplies that value instead.
 *
 * The live truck status still advances this view through the five stages the
 * two enums share — see `resolveTimelineStatus` — so a customer does not wait
 * out the refetch debounce to see "Arriving".
 */
const BASE_STAGES = [
  { status: "CREATED", label: "Created", caption: "Shipment booked" },
  { status: "IN_TRANSIT", label: "In transit", caption: "On the road" },
  { status: "ARRIVING", label: "Arriving", caption: "Approaching the facility" },
  { status: "ARRIVED", label: "Arrived", caption: "At the facility" },
  { status: "DOCKED", label: "Docked", caption: "At the dock door" },
  { status: "DELIVERED", label: "Delivered", caption: "Unloaded and complete" },
] as const satisfies readonly { status: ShipmentStatus; label: string; caption: string }[];

const DELAYED_STAGE = {
  status: "DELAYED",
  label: "Delayed",
  caption: "Running behind schedule",
} as const;

/** Where each status sits on the line. DELAYED shares IN_TRANSIT's rank — it
 * is a state the truck is in *while* in transit, not a step beyond it. */
const RANK: Record<ShipmentStatus, number> = {
  CREATED: 0,
  IN_TRANSIT: 1,
  DELAYED: 1,
  ARRIVING: 2,
  ARRIVED: 3,
  DOCKED: 4,
  DELIVERED: 5,
};

/**
 * Picks the fresher of the two server-sent statuses for the timeline.
 *
 * This chooses between values the backend sent; it never synthesises one. The
 * REST shipment status can be seconds stale (its refetch is debounced), so a
 * live truck status is preferred whenever it is *ahead* on the same line —
 * except at the truck's terminal COMPLETED, which is not DELIVERED and is left
 * for the backend to confirm on the refetch.
 */
export function resolveTimelineStatus(
  shipmentStatus: ShipmentStatus,
  truckStatus: TruckStatus | undefined,
): ShipmentStatus {
  if (!truckStatus || truckStatus === "COMPLETED") return shipmentStatus;
  if (truckStatus === "DELAYED") return "DELAYED";
  return RANK[truckStatus] > RANK[shipmentStatus] ? truckStatus : shipmentStatus;
}

export function TrackingTimeline({ status }: { status: ShipmentStatus }) {
  // The delayed step is inserted rather than always present: a shipment that
  // never ran late should not show a greyed-out "Delayed" it will never reach.
  const stages: readonly { status: ShipmentStatus; label: string; caption: string }[] =
    status === "DELAYED"
      ? [BASE_STAGES[0], BASE_STAGES[1], DELAYED_STAGE, ...BASE_STAGES.slice(2)]
      : BASE_STAGES;

  const currentRank = RANK[status];

  return (
    <ol className="flex flex-col">
      {stages.map((stage, index) => {
        const isDelayStage = stage.status === "DELAYED";
        const isCurrent = isDelayStage
          ? status === "DELAYED"
          : status !== "DELAYED" && stage.status === status;
        // The delay step is only ever "current" — never ticked off behind you.
        const isComplete = !isDelayStage && RANK[stage.status] < currentRank;
        const isLast = index === stages.length - 1;

        return (
          <li key={stage.status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                aria-hidden
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full border text-background transition-colors",
                  isComplete && "border-primary bg-primary",
                  isCurrent && !isDelayStage && "border-primary bg-primary ring-4 ring-primary/15",
                  isCurrent && isDelayStage &&
                    "border-destructive bg-destructive ring-4 ring-destructive/15",
                  !isComplete && !isCurrent && "border-border bg-background",
                )}
              >
                {isComplete ? <CheckIcon className="size-3" strokeWidth={3} /> : null}
              </span>
              {!isLast ? (
                <span
                  aria-hidden
                  className={cn(
                    "w-px flex-1 transition-colors",
                    isComplete ? "bg-primary" : "bg-border",
                  )}
                />
              ) : null}
            </div>

            <div className={cn("min-w-0 pb-5", isLast && "pb-0")}>
              <p
                className={cn(
                  "text-sm leading-5",
                  isCurrent && "font-semibold",
                  isCurrent && isDelayStage && "text-destructive",
                  !isComplete && !isCurrent && "text-muted-foreground",
                )}
              >
                {stage.label}
                {isCurrent ? <span className="sr-only"> (current)</span> : null}
              </p>
              <p className="text-xs text-muted-foreground">{stage.caption}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
