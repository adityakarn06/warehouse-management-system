"use client";

import { ClockIcon, DoorOpenIcon, MapPinIcon } from "lucide-react";

import { AssignmentStateBadge, isAssignmentState } from "@/components/ui/assignment-state-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNow } from "@/hooks/use-now";
import { truckStatusSchema } from "@/schemas/common.schema";
import { formatDateTime, formatRelativeTime, formatTime } from "@/lib/format";
import { useAlertsForTruck } from "@/stores/selectors";
import type { RealtimeAlert } from "@/stores/alert-helpers";
import type { TruckDetail, TruckDockAssignment } from "@/types";

/**
 * One line on the operations timeline. `at` is always a timestamp the backend
 * wrote — no event is dated by when the frontend noticed it.
 */
interface OperationsEvent {
  key: string;
  at: string;
  title: string;
  detail: string | null;
  reasons: string[];
  badge: React.ReactNode;
}

/**
 * Expands one assignment row into the events it records.
 *
 * `GET /trucks/:id` returns `dockAssignments[]` newest-first, each carrying up
 * to three instants — `assignedAt`, `releasedAt`, `reassignedAt`. A single row
 * is therefore several things that happened at different times, and flattening
 * it is the only way the timeline reads in order. Nothing is inferred: a null
 * instant produces no event.
 */
function assignmentEvents(assignment: TruckDockAssignment): OperationsEvent[] {
  const door = assignment.dockDoor;
  const score = assignment.score != null ? ` · score ${assignment.score}/100` : "";
  const window =
    assignment.scheduledStart && assignment.scheduledEnd
      ? `${formatTime(assignment.scheduledStart)}–${formatTime(assignment.scheduledEnd)}`
      : null;

  const events: OperationsEvent[] = [];

  if (assignment.assignedAt) {
    events.push({
      key: `${assignment.id}-assigned`,
      at: assignment.assignedAt,
      title: `Assigned to ${door.code}`,
      detail: `${door.name} · ${door.zone}${score}${window ? ` · ${window}` : ""}`,
      // The backend's own sentences for why this door won, verbatim.
      reasons: assignment.reasons ?? [],
      // `truckDockAssignmentSchema` types `status` as a plain string, so it is
      // narrowed rather than assumed — `COMPLETED` and `CANCELLED` are both
      // valid here and neither is an `AssignmentState`.
      badge: isAssignmentState(assignment.status) ? (
        <AssignmentStateBadge state={assignment.status} />
      ) : (
        <Badge variant="outline">{assignment.status}</Badge>
      ),
    });
  }

  if (assignment.reassignedAt) {
    events.push({
      key: `${assignment.id}-reassigned`,
      at: assignment.reassignedAt,
      title: `Reassigned off ${door.code}`,
      detail: "The yard forced this truck to move.",
      reasons: [],
      badge: <Badge variant="warning">REASSIGNED</Badge>,
    });
  }

  if (assignment.releasedAt) {
    events.push({
      key: `${assignment.id}-released`,
      at: assignment.releasedAt,
      title: `${door.code} released`,
      detail: `Assignment ${assignment.id} closed as ${assignment.status}.`,
      reasons: [],
      badge: <Badge variant="outline">{assignment.status}</Badge>,
    });
  }

  return events;
}

/** `locationHistoryEntrySchema` types its `status` as a plain string — the
 * history table is not constrained to the live truck-status enum — so it is
 * parsed before being handed to `StatusBadge`, and printed as-is when it is
 * something that enum does not cover. */
function HistoryStatusBadge({ status }: { status: string }) {
  const parsed = truckStatusSchema.safeParse(status);
  return parsed.success ? (
    <StatusBadge domain="truck" value={parsed.data} />
  ) : (
    <Badge variant="outline">{status}</Badge>
  );
}

function alertEvent(alert: RealtimeAlert): OperationsEvent {
  return {
    key: `alert-${alert.id}`,
    at: alert.createdAt,
    title: alert.title,
    detail: alert.message,
    reasons: [],
    badge: <StatusBadge domain="alertSeverity" value={alert.severity} />,
  };
}

function TimelineRow({ event, now }: { event: OperationsEvent; now: number }) {
  return (
    <li className="flex gap-2">
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <ClockIcon className="size-3 shrink-0 text-muted-foreground" />
        <span className="w-px flex-1 bg-border" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pb-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-2xs text-muted-foreground tabular-nums">
            {formatDateTime(event.at)} · {formatRelativeTime(event.at, now)}
          </span>
          {event.badge}
        </div>
        <span className="text-xs font-medium">{event.title}</span>
        {event.detail ? (
          <span className="text-2xs text-muted-foreground">{event.detail}</span>
        ) : null}
        {event.reasons.length > 0 ? (
          <ul className="flex flex-col gap-0.5 pt-0.5">
            {event.reasons.map((reason) => (
              <li key={reason} className="text-2xs text-muted-foreground">
                · {reason}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

/**
 * The reference's "Loading activity log", filled with the two histories
 * `GET /trucks/:id` actually returns.
 *
 * **Operations** merges every dock-assignment instant with this truck's alerts.
 * The alerts come from the Zustand store (seeded app-wide by `AlertProvider`,
 * then pushed over `ALERT_CREATED`), so a delay or a reassignment appears here
 * with no refetch; the assignment rows come from the REST detail, which
 * `useAssignDock` now invalidates on commit.
 *
 * **Movement** is the 20 most recent `LocationHistory` snapshots, rendered as
 * sent — including the backend's own `reason` string for each tick.
 */
export function TruckActivityCard({ truck }: { truck: TruckDetail }) {
  const now = useNow();
  const alerts = useAlertsForTruck(truck.id);

  const events = [
    ...(truck.dockAssignments ?? []).flatMap(assignmentEvents),
    ...alerts.map(alertEvent),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const history = truck.locationHistory ?? [];

  return (
    <Card size="sm" className="min-h-0">
      <CardHeader>
        <CardTitle>Activity</CardTitle>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-col">
        <Tabs defaultValue="operations" className="flex min-h-0 flex-col gap-3">
          <TabsList>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="movement">Movement</TabsTrigger>
          </TabsList>

          <TabsContent value="operations" className="min-h-0">
            {events.length === 0 ? (
              <EmptyState
                icon={DoorOpenIcon}
                title="Nothing recorded yet"
                description="No dock assignment or alert has named this truck."
              />
            ) : (
              <div className="max-h-80 overflow-y-auto pr-1">
                <ul className="flex flex-col">
                  {events.map((event) => (
                    <TimelineRow key={event.key} event={event} now={now} />
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>

          <TabsContent value="movement" className="min-h-0">
            {history.length === 0 ? (
              <EmptyState
                icon={MapPinIcon}
                title="No movement recorded"
                description="This truck has no location history snapshots yet."
              />
            ) : (
              <div className="max-h-80 overflow-y-auto pr-1">
                <ul className="flex flex-col gap-1.5">
                  {history.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-col gap-0.5 rounded-md border border-border p-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-2xs text-muted-foreground tabular-nums">
                          {formatDateTime(entry.recordedAt)}
                        </span>
                        <HistoryStatusBadge status={entry.status} />
                      </div>
                      <span className="text-xs tabular-nums">
                        {Math.round(entry.progress)}% · {entry.speedKmph} km/h · ETA{" "}
                        {formatTime(entry.eta)}
                      </span>
                      {/* The backend's own note for this tick ("rain", "tick"). */}
                      <span className="text-2xs text-muted-foreground">{entry.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
