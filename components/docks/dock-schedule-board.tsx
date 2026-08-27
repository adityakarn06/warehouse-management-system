"use client";

import { useState } from "react";
import { CalendarClockIcon } from "lucide-react";

import { DockScheduleRow } from "@/components/docks/dock-schedule-row";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { TableSkeleton } from "@/components/ui/loading-skeleton";
import { useDockSchedule } from "@/features/docks";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const HORIZON_PRESETS = [
  { label: "2h", minutes: 120 },
  { label: "4h", minutes: 240 },
  { label: "8h", minutes: 480 },
] as const;

/**
 * The dock-door assignment schedule (problem statement §7 output) — a
 * forward-looking timeline per door, rendered exactly as the backend grouped
 * and ordered it.
 *
 * `from` is pinned in state rather than recomputed from `new Date()` on every
 * render: a fresh instant in the query key would refetch on every render and
 * never settle. It only moves on an explicit preset click or Refresh —
 * `useSnapshotInvalidation` and the dock mutations keep the *content* current
 * for the pinned window without moving the window itself.
 */
export function DockScheduleBoard() {
  const [horizonMinutes, setHorizonMinutes] = useState<number>(HORIZON_PRESETS[1].minutes);
  const [includeRecommended, setIncludeRecommended] = useState(false);
  const [range, setRange] = useState(() => {
    const from = new Date();
    const to = new Date(from.getTime() + HORIZON_PRESETS[1].minutes * 60_000);
    return { from: from.toISOString(), to: to.toISOString() };
  });

  function applyPreset(minutes: number) {
    const from = new Date();
    const to = new Date(from.getTime() + minutes * 60_000);
    setHorizonMinutes(minutes);
    setRange({ from: from.toISOString(), to: to.toISOString() });
  }

  const query = useDockSchedule({ from: range.from, to: range.to, includeRecommended });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          {HORIZON_PRESETS.map((preset) => (
            <Button
              key={preset.minutes}
              size="xs"
              variant={horizonMinutes === preset.minutes ? "secondary" : "ghost"}
              onClick={() => applyPreset(preset.minutes)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <Button
          size="xs"
          variant={includeRecommended ? "secondary" : "ghost"}
          onClick={() => setIncludeRecommended((prev) => !prev)}
        >
          Include recommended
        </Button>
        <Button size="xs" variant="ghost" onClick={() => applyPreset(horizonMinutes)}>
          Refresh window
        </Button>
        {query.data ? (
          <span className="text-2xs text-muted-foreground">
            {formatDateTime(query.data.from)} – {formatDateTime(query.data.to)}
          </span>
        ) : null}
      </div>

      {query.isPending ? <TableSkeleton rows={4} /> : null}

      {query.isError ? (
        <ErrorState
          title="Could not load the dock schedule"
          message={query.error.message}
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.isSuccess && query.data.docks.length === 0 ? (
        <EmptyState icon={CalendarClockIcon} title="No doors" description="The backend returned no dock doors." />
      ) : null}

      {query.isSuccess && query.data.docks.length > 0 ? (
        <div className={cn("overflow-x-auto rounded-lg border border-border bg-card px-3")}>
          <div className="min-w-[36rem]">
            {query.data.docks.map((door) => (
              <DockScheduleRow
                key={door.dockId}
                door={door}
                fromMs={Date.parse(query.data.from)}
                toMs={Date.parse(query.data.to)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
