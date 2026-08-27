"use client";

import { ArrowRightIcon, ShuffleIcon } from "lucide-react";

import { AssignmentStateBadge } from "@/components/ui/assignment-state-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useNow } from "@/hooks/use-now";
import { formatRelativeTime } from "@/lib/format";
import type { RealtimeAlert } from "@/stores";
import { useNoDockAvailableAlerts, useReassignments, useTruck } from "@/stores/selectors";
import type { LiveAssignmentEntry } from "@/stores/use-dock-store";

/**
 * What the dock-failure cascade did, live.
 *
 * Every value on screen is a field the backend sent — the score it computed,
 * the sentences it wrote, the door it chose. This panel does not score, rank,
 * or pick anything, and it never renders a stand-in dock for a truck the
 * backend could not place.
 *
 * It reads the Zustand store rather than a command response, so an operator on
 * another machine sees the same cascade as the one who pressed the button.
 */
function ReassignmentRow({ entry, now }: { entry: LiveAssignmentEntry; now: number }) {
  // Prefer the live roster's reference; fall back to the raw id rather than
  // inventing a display name for a truck the store has not seen yet.
  const truck = useTruck(entry.truckId);
  const reference = truck?.reference ?? entry.truckId;

  return (
    <li className="flex flex-col gap-1 rounded-md border border-warning/30 bg-warning/5 px-2.5 py-2 text-[0.65rem]">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-medium text-foreground">{reference} reassigned</span>
        <AssignmentStateBadge state="REASSIGNED" />
      </div>

      <div className="flex items-center gap-1 font-medium text-foreground">
        <span>{entry.previousDockCode}</span>
        <ArrowRightIcon className="size-2.5 shrink-0 text-muted-foreground" />
        <span>{entry.dockCode}</span>
      </div>

      {entry.reason ? (
        /* Why the old door was abandoned — the backend's sentence, unedited. */
        <p className="text-muted-foreground">Reason: {entry.reason}</p>
      ) : null}

      {entry.score !== null ? (
        <p className="text-muted-foreground">
          New dock score: <span className="font-medium text-foreground">{entry.score}</span>
        </p>
      ) : null}

      {entry.reasons.length > 0 ? (
        /* The scoring engine's explanation of the *new* door. */
        <p className="text-muted-foreground">{entry.reasons.join(" · ")}</p>
      ) : null}

      <span className="text-[0.6rem] text-muted-foreground">
        {formatRelativeTime(entry.serverTimestamp, now)}
      </span>
    </li>
  );
}

function NoDockRow({ alert, now }: { alert: RealtimeAlert; now: number }) {
  // Only the REST-seeded row carries `metadata`; a socket-pushed alert has
  // none, so the exclusions are shown when present and never fabricated.
  const excluded = Array.isArray(alert.metadata?.excluded) ? alert.metadata.excluded : null;

  return (
    <li className="flex flex-col gap-1 rounded-md border border-destructive/40 bg-destructive/5 px-2.5 py-2 text-[0.65rem]">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-medium text-foreground">{alert.title}</span>
        <AssignmentStateBadge state="NO_DOCK_AVAILABLE" />
      </div>

      <p className="text-destructive">{alert.message}</p>

      {excluded ? (
        <ul className="flex flex-col gap-0.5 pt-0.5">
          {excluded.map((sentence, index) => (
            <li key={index} className="text-muted-foreground">
              — {String(sentence)}
            </li>
          ))}
        </ul>
      ) : null}

      <span className="text-[0.6rem] text-muted-foreground">
        {formatRelativeTime(alert.createdAt, now)}
      </span>
    </li>
  );
}

export function ReassignmentPanel() {
  const reassignments = useReassignments();
  const stranded = useNoDockAvailableAlerts();
  const now = useNow();

  if (reassignments.length === 0 && stranded.length === 0) {
    return (
      <EmptyState
        icon={ShuffleIcon}
        title="No reassignments"
        description="Taking a booked door out of service moves its trucks. What the backend decided will appear here."
      />
    );
  }

  return (
    <ul className="flex max-h-96 flex-col gap-1.5 overflow-y-auto">
      {/* Stranded trucks first — they are the ones needing a human. */}
      {stranded.map((alert) => (
        <NoDockRow key={alert.id} alert={alert} now={now} />
      ))}
      {reassignments.map((entry) => (
        <ReassignmentRow key={entry.truckId} entry={entry} now={now} />
      ))}
    </ul>
  );
}
