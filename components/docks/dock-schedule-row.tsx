"use client";

import { AssignmentStateBadge } from "@/components/ui/assignment-state-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DockScheduleAssignment, DockScheduleDoor } from "@/types";

interface DockScheduleRowProps {
  door: DockScheduleDoor;
  /** The response's own window bound, in epoch ms — never a locally
   * recomputed "now". Every bar is positioned as a percentage of this range. */
  fromMs: number;
  toMs: number;
}

/** `RECOMMENDED` reads as a dashed, unfilled bar — the same visual rule
 * `AssignmentStateBadge` uses — so a proposal can never be mistaken for a
 * booking on a board an operator reads at a glance. */
const BAR_CLASS: Record<DockScheduleAssignment["status"], string> = {
  RECOMMENDED: "border border-dashed border-info/50 bg-transparent",
  ASSIGNED: "border border-success/40 bg-success/20",
};

function ScheduleBar({
  assignment,
  fromMs,
  toMs,
}: {
  assignment: DockScheduleAssignment;
  fromMs: number;
  toMs: number;
}) {
  const startMs = assignment.scheduledStart ? Date.parse(assignment.scheduledStart) : NaN;
  const endMs = assignment.scheduledEnd ? Date.parse(assignment.scheduledEnd) : NaN;
  const span = toMs - fromMs;
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || span <= 0) return null;
  // Entirely outside the requested window — not just clipped at an edge —
  // must render nothing rather than a 1%-wide phantom sliver at the boundary.
  if (endMs <= fromMs || startMs >= toMs) return null;

  const clippedStart = startMs < fromMs;
  const clippedEnd = endMs > toMs;
  const leftPct = Math.min(100, Math.max(0, ((startMs - fromMs) / span) * 100));
  const rightBoundPct = Math.min(100, Math.max(0, ((endMs - fromMs) / span) * 100));
  const widthPct = Math.max(1, rightBoundPct - leftPct);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            className={cn(
              "absolute top-1 bottom-1 rounded-sm",
              BAR_CLASS[assignment.status],
              clippedStart && "rounded-l-none",
              clippedEnd && "rounded-r-none",
            )}
            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
          />
        }
      />
      <TooltipContent>
        <div className="flex flex-col gap-0.5 text-left">
          <span className="font-medium">
            {assignment.truckReference} · {assignment.trailerId}
          </span>
          <span>
            {formatTime(assignment.scheduledStart)}–{formatTime(assignment.scheduledEnd)}
          </span>
          {assignment.score !== null && assignment.score !== undefined ? (
            <span>Score {assignment.score}</span>
          ) : null}
          {assignment.reasons?.length ? <span>{assignment.reasons.join(" · ")}</span> : null}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function DockScheduleRow({ door, fromMs, toMs }: DockScheduleRowProps) {
  // "No window does not mean no booking" (docs/api.md) — the backend always
  // includes these regardless of `from`/`to`, and they cannot be placed on a
  // time axis, so they must not silently vanish from the row.
  const windowless = door.assignments.filter((a) => !a.scheduledStart || !a.scheduledEnd);
  const windowed = door.assignments.filter((a) => a.scheduledStart && a.scheduledEnd);

  return (
    <div className="grid grid-cols-[10rem_1fr] items-center gap-3 border-b border-border py-2 last:border-0">
      <div className="flex flex-col gap-0.5 pr-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold">{door.dockCode}</span>
          <StatusBadge domain="dock" value={door.status} />
        </div>
        <span className="truncate text-2xs text-muted-foreground">{door.dockName}</span>
        <span className="text-2xs text-muted-foreground">{door.zone}</span>
      </div>

      <div className="flex flex-col gap-1">
        <div className="relative h-6 w-full rounded-md bg-muted/50">
          {windowed.map((assignment) => (
            <ScheduleBar key={assignment.id} assignment={assignment} fromMs={fromMs} toMs={toMs} />
          ))}
        </div>
        {windowless.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1">
            {windowless.map((assignment) => (
              <span
                key={assignment.id}
                className="flex items-center gap-1 rounded-sm border border-dashed border-border px-1.5 py-0.5 text-2xs text-muted-foreground"
              >
                <AssignmentStateBadge
                  state={assignment.status === "RECOMMENDED" ? "RECOMMENDED" : "ASSIGNED"}
                />
                {assignment.truckReference} · No window
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
