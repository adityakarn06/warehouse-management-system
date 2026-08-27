"use client";

import { ArrowRightIcon, DoorOpenIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime, formatTime } from "@/lib/format";
import type { LiveAssignmentEntry } from "@/stores";
import type { DockStatus, TrackingResult } from "@/types";

/**
 * The committed dock door. Renders nothing until there is one — `assignedDock`
 * on the REST row is an ASSIGNED assignment only, never a recommendation
 * (docs/api.md), and the live DOCK_ASSIGNED / DOCK_REASSIGNED payloads are
 * likewise commitments.
 *
 * `score` and `reasons` ride along on both the payload and the store entry and
 * are deliberately not rendered here: this page shows *where* the truck is
 * going, not how the scoring engine picked it. That explanation lives on the
 * dock board.
 *
 * The live entry wins on which door, since it arrives ~instantly; the door's
 * name, zone and scheduled window only exist on the REST row, so they are
 * shown only while the two agree on the door — `useTrackingInvalidation`
 * refetches to close that gap.
 */
export function TrackingDockCard({
  assignedDock,
  liveAssignment,
}: {
  assignedDock: TrackingResult["assignedDock"];
  liveAssignment: LiveAssignmentEntry | undefined;
}) {
  const dockCode = liveAssignment?.dockCode ?? assignedDock?.code ?? null;
  if (!dockCode) return null;

  const isSameDoor =
    assignedDock != null &&
    (liveAssignment == null || liveAssignment.dockDoorId === assignedDock.id);
  const details = isSameDoor ? assignedDock : null;
  const movedFrom = liveAssignment?.previousDockCode ?? null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <p className="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
          <DoorOpenIcon className="size-3" />
          Assigned dock
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {movedFrom ? (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground line-through">
              {movedFrom}
            </span>
          ) : null}
          {movedFrom ? <ArrowRightIcon className="size-3.5 text-muted-foreground" /> : null}
          <span className="font-mono text-lg font-semibold">{dockCode}</span>
          {details ? <StatusBadge domain="dock" value={details.status as DockStatus} /> : null}
        </div>

        {details ? (
          <p className="text-xs text-muted-foreground">
            {details.name} · {details.zone} zone
          </p>
        ) : null}

        {details?.scheduledStart ? (
          <p className="text-xs text-muted-foreground tabular-nums">
            Scheduled {formatDateTime(details.scheduledStart)}
            {details.scheduledEnd ? ` – ${formatTime(details.scheduledEnd)}` : null}
          </p>
        ) : null}

        {liveAssignment?.reason ? (
          <p className="text-xs text-muted-foreground">{liveAssignment.reason}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
