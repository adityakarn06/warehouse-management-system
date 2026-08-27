import { DockingQueueEntry } from "@/components/yard/docking-queue-entry";
import { formatTime } from "@/lib/format";
import type { DockingQueueWindow as DockingQueueWindowType } from "@/types";

/**
 * `windowStart`/`windowEnd` are both null only for the `UNSCHEDULED` bucket —
 * rendered as its own label, never as a blank heading. A window whose end has
 * already passed never reaches this component: the backend drops it from the
 * queue rather than pinning a stuck truck in it, so there is no "window
 * closed" state to render here.
 */
export function DockingQueueWindow({ window }: { window: DockingQueueWindowType }) {
  const label =
    window.windowStart || window.windowEnd
      ? `${formatTime(window.windowStart)}–${formatTime(window.windowEnd)}`
      : "Unscheduled";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold">{label}</h4>
        <span className="text-2xs text-muted-foreground">
          {window.entries.length} {window.entries.length === 1 ? "truck" : "trucks"}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {window.entries.map((entry) => (
          <DockingQueueEntry key={entry.truckId} entry={entry} />
        ))}
      </div>
    </div>
  );
}
