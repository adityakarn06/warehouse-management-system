"use client";

import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";

import { DockStatusAction } from "@/components/docks/dock-status-action";
import { AssignmentStateBadge } from "@/components/ui/assignment-state-badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { alertSeverityBorder, StatusBadge } from "@/components/ui/status-badge";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  useAlertsForDock,
  useAssignmentForTruck,
  useDock as useLiveDock,
  useTruck,
} from "@/stores/selectors";
import type { DockListItem } from "@/types";

/** A door's alert history is unbounded — one taken down every morning collects
 * one a day. Only the newest few belong in a card; `/alerts` holds the rest. */
const MAX_ALERTS = 5;

/**
 * One door in the manage sheet.
 *
 * The REST row is the snapshot and the live dock store overlays it, exactly as
 * `components/docks/dock-card.tsx` does on `/yard` — a status change and its
 * reason land the moment the command returns or the socket event arrives,
 * without refetching the list. Every field below is rendered as the backend
 * sent it; nothing here derives a value neither side supplied.
 */
export function DockDoorCard({ dock }: { dock: DockListItem }) {
  const [showMore, setShowMore] = useState(false);

  const live = useLiveDock(dock.id);
  const status = live?.status ?? dock.status;

  // `assignments` on a list row is the ASSIGNED assignment only (docs/api.md),
  // so this is the truck genuinely holding the door, not a proposal.
  const restAssignment = dock.assignments?.find((entry) => entry.status === "ASSIGNED") ?? null;

  // Once the store holds this door it is authoritative about who is on it —
  // including "nobody", which is why this reads `live.occupyingTruckId` rather
  // than falling through to the snapshot whenever it is null.
  const occupyingTruckId = live ? live.occupyingTruckId : (restAssignment?.truck.id ?? null);
  const liveTruck = useTruck(occupyingTruckId);

  // Drop the snapshot's assignment once the live store says a different truck
  // (or no truck) holds the door, so the detail never describes a booking that
  // has already moved on.
  const assignment = restAssignment?.truck.id === occupyingTruckId ? restAssignment : null;

  // Was this truck *moved* here by the failure cascade? Only a DOCK_REASSIGNED
  // entry carries `previousDockCode`. The `dockDoorId` check keeps a stale
  // entry — the truck has since moved on again — from labelling the wrong door.
  const liveAssignment = useAssignmentForTruck(occupyingTruckId);
  const reassignedFrom =
    liveAssignment?.previousDockCode !== undefined && liveAssignment.dockDoorId === dock.id
      ? liveAssignment.previousDockCode
      : null;

  const truckReference = occupyingTruckId
    ? (liveTruck?.reference ?? assignment?.truck.reference ?? occupyingTruckId)
    : null;

  // Prefer the live reason; fall back to the snapshot. Never show a reason for
  // a door that is not out of service.
  const unavailableReason =
    status === "UNAVAILABLE" ? (live?.unavailableReason ?? dock.unavailableReason ?? null) : null;

  const alerts = useAlertsForDock(dock.id);
  const reasons = assignment?.reasons ?? [];
  const hasMore = alerts.length > 0 || reasons.length > 0 || assignment?.score != null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-xs font-semibold tracking-tight">{dock.code}</span>
          <span className="truncate text-2xs text-muted-foreground">
            {dock.name} · {dock.zone}
          </span>
        </div>
        <StatusBadge domain="dock" value={status} />
      </div>

      <div className="flex flex-wrap gap-1">
        {dock.supportedLoadTypes.map((loadType) => (
          <span
            key={loadType}
            className="rounded-sm bg-muted px-1 py-0.5 text-2xs text-muted-foreground"
          >
            {loadType}
          </span>
        ))}
      </div>

      {/* The backend's own "free from" time. Shown whatever the status: on a
          door still holding a booking it is when that booking ends, which is
          the more useful of the two readings. */}
      {dock.availableFrom ? (
        <DetailGrid>
          <DetailRow label="Free from" value={formatTime(dock.availableFrom)} />
        </DetailGrid>
      ) : null}

      {assignment && truckReference ? (
        <DetailGrid className="border-t border-border pt-2">
          <DetailRow
            label="Truck"
            value={
              <>
                <span className="font-medium text-foreground">{truckReference}</span>
                {/* A free-form string on this endpoint, not the truck-status
                    union `StatusBadge` renders — printed as sent. */}
                {assignment.truck.status ? ` · ${assignment.truck.status}` : ""}
              </>
            }
          />
          <DetailRow label="Trailer" value={assignment.truck.trailerId} />
          <DetailRow
            label="Shipment"
            value={`${assignment.shipment.reference} · ${assignment.shipment.priority}`}
          />
          <DetailRow label="Load" value={assignment.shipment.loadType} />
          {assignment.scheduledStart ? (
            <DetailRow
              label="Window"
              value={`${formatTime(assignment.scheduledStart)}${
                assignment.scheduledEnd ? ` – ${formatTime(assignment.scheduledEnd)}` : ""
              }`}
            />
          ) : null}
          {assignment.truck.eta ? (
            <DetailRow label="ETA" value={formatTime(assignment.truck.eta)} />
          ) : null}
          {assignment.assignedAt ? (
            <DetailRow label="Assigned" value={formatTime(assignment.assignedAt)} />
          ) : null}
          {reassignedFrom ? (
            <DetailRow
              label="Moved"
              value={
                <span className="flex items-center gap-1">
                  <AssignmentStateBadge state="REASSIGNED" />
                  <span>from {reassignedFrom}</span>
                </span>
              }
            />
          ) : null}
        </DetailGrid>
      ) : null}

      {unavailableReason ? (
        <p className="border-t border-border pt-2 text-2xs text-destructive">{unavailableReason}</p>
      ) : null}

      {hasMore ? (
        <Collapsible open={showMore} onOpenChange={setShowMore}>
          <CollapsibleTrigger
            render={
              <button
                type="button"
                className="flex w-full items-center gap-1 border-t border-border pt-2 text-2xs text-muted-foreground hover:text-foreground"
              >
                <ChevronDownIcon
                  aria-hidden
                  className={cn("size-2.5 transition-transform", showMore ? "" : "-rotate-90")}
                />
                <span>
                  {showMore ? "Less" : "More"}
                  {alerts.length > 0
                    ? ` · ${alerts.length} alert${alerts.length === 1 ? "" : "s"}`
                    : ""}
                </span>
              </button>
            }
          />

          <CollapsibleContent>
            <div className="flex flex-col gap-2 pt-2">
              {/* The backend's own ranking for the booking that won this door,
                  quoted rather than recomputed or re-worded. */}
              {assignment?.score != null ? (
                <DetailGrid>
                  <DetailRow label="Score" value={`${assignment.score} / 100`} />
                </DetailGrid>
              ) : null}

              {reasons.length > 0 ? (
                <ul className="flex flex-col gap-0.5">
                  {reasons.map((reason) => (
                    <li key={reason} className="text-2xs text-muted-foreground">
                      · {reason}
                    </li>
                  ))}
                </ul>
              ) : null}

              {alerts.slice(0, MAX_ALERTS).map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "flex items-baseline gap-1.5 border-l-2 pl-1.5 text-2xs",
                    alertSeverityBorder[alert.severity],
                  )}
                >
                  <span className="truncate font-medium">{alert.title}</span>
                  <span className="ml-auto shrink-0 text-muted-foreground">
                    {formatTime(alert.createdAt)}
                  </span>
                </div>
              ))}
              {alerts.length > MAX_ALERTS ? (
                <span className="text-2xs text-muted-foreground">
                  {alerts.length - MAX_ALERTS} older on the alerts page
                </span>
              ) : null}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      <DockStatusAction
        dockId={dock.id}
        code={dock.code}
        status={status}
        hasAssignment={Boolean(occupyingTruckId)}
        className="mt-auto w-full"
      />
    </div>
  );
}

/** Label/value pairs on one aligned column pair, so every card's detail reads
 * down the same gutter regardless of which rows it happens to have. */
function DetailGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-[5rem_1fr] gap-x-2 gap-y-1 text-2xs", className)}>
      {children}
    </dl>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate">{value}</dd>
    </>
  );
}
